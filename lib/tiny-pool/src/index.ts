import { EventEmitter } from "node:events";
import { availableParallelism } from "node:os";
import { Worker, type WorkerOptions } from "node:worker_threads";

import { type Task, TaskQueue } from "./queue.js";
import { Readable } from "node:stream";

interface WorkerPoolOptions extends WorkerOptions {
  threads: number;
  maxMemory?: number;
  maxQueueSize?: number; // configurable queue size
  logger?: ILogger;
}
interface ILogger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

class PooledWorker<T, R> {
  public currentTask: Task<T, R> | null = null;
  constructor(public readonly worker: Worker) {}
}

export class WorkerPool<T = unknown, R = unknown> extends EventEmitter {
  private readonly logger: ILogger;

  private readonly workers: PooledWorker<T, R>[] = [];
  private readonly idleWorkers: PooledWorker<T, R>[] = [];
  private readonly queue: TaskQueue<T, R> = new TaskQueue<T, R>();
  private readonly maxQueueSize: number;

  private destroyed = false;

  private usedSlots = 0;
  private slotWaiters: Array<() => void> = [];

  constructor(
    private readonly workerScript: string,
    private readonly options?: Partial<WorkerPoolOptions>,
  ) {
    super();
    this.logger = options?.logger ?? console;
    this.maxQueueSize = options?.maxQueueSize ?? Infinity;
  }

  public startThreads(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of Array.from({ length: this.options?.threads ?? availableParallelism() - 1 })) {
      this.createWorker();
    }
  }

  // Non-static fromStream instance method
  async fromStream(source: Readable): Promise<void> {
    let readingDone = false;
    let active = 0;

    const tryEnd = async () => {
      if (readingDone && active === 0) {
        this.emit("end");
      }
    };

    source.on("data", async (chunk: T) => {
      if (this.isQueueFull) {
        source.pause();
        await this.waitForSpace();
        source.resume();
      }

      active += 1;
      this.run(chunk)
        .catch((err) => this.emit("error", err))
        .finally(() => {
          active -= 1;
          tryEnd();
        });
    });

    source.on("end", () => {
      readingDone = true;
      tryEnd();
    });

    source.on("error", (err) => this.emit("error", err));
  }

  // Static variant for convenience
  static fromStream<T, R>(
    source: Readable,
    workerScript: string,
    options?: Partial<WorkerPoolOptions>,
  ): WorkerPool<T, R> {
    const pool = new WorkerPool<T, R>(workerScript, options);
    pool.startThreads();
    pool.fromStream(source);
    return pool;
  }

  private createWorker(): void {
    const worker = new Worker(this.workerScript, {
      ...this.options,
      env: process.env,
      ...(this.options?.maxMemory ? { resourceLimits: { maxOldGenerationSizeMb: this.options?.maxMemory } } : {}),
    });

    const pooled = new PooledWorker<T, R>(worker);

    worker.on("message", (result) => {
      if (pooled.currentTask) {
        pooled.currentTask.resolve(result);
        pooled.currentTask = null;
      }

      this.emit("data", result);

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
        this.logger.error(`[WorkerPool] Worker ${worker.threadId} exited with code ${code}, restarting...`);
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
    return this.usedSlots >= this.maxQueueSize;
  }

  // simple helper for user-side polling
  async waitForSpace(intervalMs = 25): Promise<void> {
    while (this.isQueueFull) {
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }

  private async acquireQueueSlot(): Promise<void> {
    if (this.destroyed) throw new TypeError("Worker Pool unavailable because it is destroyed");
    if (this.usedSlots < this.maxQueueSize) {
      this.usedSlots += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.slotWaiters.push(() => {
        this.usedSlots += 1; // slot is reserved atomically here
        resolve();
      });
    });
  }

  private releaseQueueSlot(): void {
    if (this.slotWaiters.length > 0) {
      const next = this.slotWaiters.shift();
      if (next) next(); // pass slot directly to waiting producer
    } else if (this.usedSlots > 0) {
      this.usedSlots -= 1;
    }
  }

  async run(taskData: T): Promise<R> {
    if (this.destroyed) throw new TypeError("Worker Pool unavailable because it is destroyed");

    // Reserve a queue slot atomically before enqueue
    await this.acquireQueueSlot();

    // Double-check destroyed after waiting; free slot if so
    if (this.destroyed) {
      this.releaseQueueSlot();
      if (this.destroyed) throw new TypeError("Worker Pool unavailable because it is destroyed");
    }

    return new Promise((resolve, reject) => {
      this.queue.enqueue({ data: taskData, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.idleWorkers.length > 0 && this.queue.length > 0) {
      const pooled = this.idleWorkers.shift();
      const task = this.queue.dequeue();

      // IMPORTANT: free the queue slot as soon as the task leaves the queue
      this.releaseQueueSlot();

      if (pooled && task) {
        pooled.currentTask = task;
        pooled.worker.postMessage(task.data);
      }
    }
  }

  async destroy(): Promise<void> {
    this.destroyed = true;

    // Unblock waiters so they can finish and see destroyed state
    while (this.slotWaiters.length > 0) {
      const next = this.slotWaiters.shift();
      if (next) next();
    }

    this.queue.clear();
    await Promise.all(this.workers.map((pw) => pw.worker.terminate()));
    this.workers.length = 0;
    this.idleWorkers.length = 0;
    this.usedSlots = 0;

    this.logger.debug("workerpool succesfully destroyed");
  }
}
