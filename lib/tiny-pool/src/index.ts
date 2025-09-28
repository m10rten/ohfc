// worker-pool.ts
import { Worker, WorkerOptions } from "node:worker_threads";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { Task, TaskQueue } from "./queue.js";
import { availableParallelism } from "node:os";

interface WorkerPoolOptions extends WorkerOptions {
  threads: number;
  maxMemory?: number;
  maxQueueSize?: number; // configurable queue size
}

class PooledWorker<T> {
  public currentTask: Task<T> | null = null;
  constructor(public worker: Worker) {}
}

export class WorkerPool<T = unknown> extends EventEmitter {
  private workers: PooledWorker<T>[] = [];
  private idleWorkers: PooledWorker<T>[] = [];
  private queue: TaskQueue<T> = new TaskQueue();
  private destroyed = false;
  private maxQueueSize: number;
  private lastResult: unknown;
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly workerScript: string,
    private readonly options?: Partial<WorkerPoolOptions>,
  ) {
    super();
    this.maxQueueSize = options?.maxQueueSize ?? Infinity;
    this.initWorkers();
    this.startMonitor();
    console.log(`
      maxQueueSize: ${this.maxQueueSize}
      threads: ${this.options?.threads ?? "not set"}
      `);
  }

  private initWorkers(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of Array.from({ length: this.options?.threads ?? availableParallelism() - 1 })) {
      this.createWorker();
    }
  }

  private createWorker(): void {
    const worker = new Worker(this.workerScript, {
      ...this.options,
      resourceLimits: { maxOldGenerationSizeMb: this.options?.maxMemory },
    });

    const pooled = new PooledWorker<T>(worker);

    worker.on("message", (result) => {
      if (pooled.currentTask) {
        pooled.currentTask.resolve(result);
        pooled.currentTask = null;
        this.lastResult = result;
      }
      this.idleWorkers.push(pooled);
      this.processQueue();
    });

    worker.on("error", (err) => {
      if (pooled.currentTask) {
        pooled.currentTask.reject(err);
        pooled.currentTask = null;
      } else {
        this.emit("error", err);
      }
      this.idleWorkers.push(pooled);
      this.processQueue();
    });

    worker.on("exit", (code) => {
      if (!this.destroyed && code !== 0) {
        console.error(`[WorkerPool] Worker ${worker.threadId} exited with code ${code}, restarting...`);
        this.createWorker();
      }
    });

    this.idleWorkers.push(pooled);
    this.workers.push(pooled);
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get isQueueFull(): boolean {
    return this.queue.length >= this.maxQueueSize;
  }

  // simple helper for user-side polling
  async waitForSpace(intervalMs = 25): Promise<void> {
    while (this.isQueueFull) {
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }

  private waitingResolvers: (() => void)[] = [];

  private async waitForQueueSpace(): Promise<void> {
    if (this.queue.length < this.maxQueueSize) return;
    await new Promise<void>((resolve) => this.waitingResolvers.push(resolve));
  }

  private releaseWaiting(): void {
    if (this.waitingResolvers.length > 0 && this.queue.length < this.maxQueueSize) {
      const resolve = this.waitingResolvers.shift();
      if (resolve) resolve();
    }
  }

  async run(taskData: T): Promise<unknown> {
    if (this.destroyed) throw new Error("WorkerPool has been destroyed");
    await this.waitForQueueSpace();

    return new Promise((resolve, reject) => {
      this.queue.enqueue({ data: taskData, resolve, reject });
      this.processQueue();
      this.releaseWaiting();
    });
  }

  private processQueue(): void {
    while (this.idleWorkers.length > 0 && this.queue.length > 0) {
      const pooled = this.idleWorkers.shift();
      const task = this.queue.dequeue();
      if (pooled && task) {
        pooled.currentTask = task;
        pooled.worker.postMessage(task.data);
      }
    }
  }

  attachStream(stream: Readable): void {
    let processing = Promise.resolve(); // chain chunks sequentially
    let paused = false;

    stream.on("data", (chunk: T) => {
      // If queue is full, synchronously pause the stream
      if (!paused && this.queue.length >= this.maxQueueSize) {
        stream.pause();
        paused = true;
        console.log(`[WorkerPool] Queue full (${this.maxQueueSize}), stream paused`);
      }

      // Chain chunk processing sequentially
      processing = processing.then(async () => {
        // Wait if queue is still full (external throttling)
        while (this.queue.length >= this.maxQueueSize) {
          await new Promise((res) => setTimeout(res, 50));
        }

        // Enqueue current chunk
        await this.run(chunk);

        // If stream is paused and queue is now below limit, resume stream
        if (paused && this.queue.length < this.maxQueueSize) {
          paused = false;
          stream.resume();
          console.log(`[WorkerPool] Queue under limit, stream resumed`);
        }
      });
    });
  }

  private startMonitor(): void {
    this.interval = setInterval(() => {
      console.clear();
      const mem = process.memoryUsage();
      console.log("=== WorkerPool Monitor ===");
      console.log(`Workers: ${this.workers.length}`);
      console.log(`Idle Workers: ${this.idleWorkers.length}`);
      console.log(`Queue length: ${this.queue.length}`);
      console.log(
        `Memory: RSS ${(mem.rss / 1024 / 1024).toFixed(1)} MB, Heap ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      );
      if (this.lastResult !== undefined) {
        console.log(`Last Result: ${JSON.stringify(this.lastResult)}`);
      }
      console.log("===========================");
    }, 1000);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    if (this.interval) clearInterval(this.interval);
    this.queue.clear();
    await Promise.all(this.workers.map((pw) => pw.worker.terminate()));
    this.workers = [];
    this.idleWorkers = [];
  }
}
