// worker-pool.ts
import { Worker, WorkerOptions } from "node:worker_threads";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";

import { Task, TaskQueue } from "./queue.js";

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

  constructor(
    private readonly workerScript: string,
    private options: WorkerPoolOptions,
  ) {
    super();
    this.maxQueueSize = options.maxQueueSize ?? Infinity;
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.options.threads; i++) {
      this.createWorker();
    }
  }

  private createWorker(): void {
    const worker = new Worker(this.workerScript, {
      eval: this.options.eval,
      execArgv: this.options.execArgv,
      stdout: this.options.stdout,
      stderr: this.options.stderr,
      workerData: this.options.workerData,
      resourceLimits: {
        maxOldGenerationSizeMb: this.options.maxMemory,
      },
    });

    const pooled = new PooledWorker<T>(worker);

    worker.on("message", (result) => {
      if (pooled.currentTask) {
        pooled.currentTask.resolve(result);
        pooled.currentTask = null;
      }
      this.idleWorkers.push(pooled);
      console.log(`[WorkerPool] Worker ${worker.threadId} finished task. Queue length: ${this.queue.length}`);
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
      console.error(`[WorkerPool] Worker ${worker.threadId} error:`, err);
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
    console.log(`[WorkerPool] Started worker ${worker.threadId}`);
  }

  private async waitForQueueSpace(intervalMs = 25): Promise<void> {
    while (this.queue.length >= this.maxQueueSize) {
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }

  async run(taskData: T): Promise<unknown> {
    if (this.destroyed) {
      return Promise.reject(new Error("WorkerPool has been destroyed"));
    }

    // wait until there is space in the queue instead of rejecting
    if (this.queue.length >= this.maxQueueSize) {
      console.log(`[WorkerPool] Queue full (${this.maxQueueSize}), waiting...`);
      await this.waitForQueueSpace();
    }

    return new Promise((resolve, reject) => {
      this.queue.enqueue({ data: taskData, resolve, reject });
      console.log(`[WorkerPool] Task enqueued. Queue length: ${this.queue.length}`);
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.idleWorkers.length > 0 && this.queue.length > 0) {
      const pooled = this.idleWorkers.shift();
      const task = this.queue.dequeue();
      if (pooled && task) {
        pooled.currentTask = task;
        pooled.worker.postMessage(task.data);
        console.log(`[WorkerPool] Sent task to worker ${pooled.worker.threadId}`);
      }
    }
  }

  attachStream(stream: Readable): void {
    stream.on("data", async (chunk: T) => {
      if (this.queue.length < this.maxQueueSize) {
        console.log(`[WorkerPool] Stream chunk received. Queue length: ${this.queue.length}`);
        await this.run(chunk);
      } else {
        console.log(`[WorkerPool] Queue full (${this.maxQueueSize}), pausing stream...`);
        stream.pause();
        const interval = setInterval(() => {
          if (this.queue.length < this.maxQueueSize) {
            console.log(`[WorkerPool] Resuming stream...`);
            stream.resume();
            clearInterval(interval);
          }
        }, 50);
      }
    });
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.queue.clear();
    await Promise.all(this.workers.map((pw) => pw.worker.terminate()));
    this.workers = [];
    this.idleWorkers = [];
    console.log(`[WorkerPool] Destroyed`);
  }
}
