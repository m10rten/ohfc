# `@ohfc/tiny-pool`

A minimalist and efficient TypeScript worker thread pool library for Node.js, providing task queuing, concurrency control, and stream integration with backpressure support.

---

## Installation

```sh
npm install @ohfc/tiny-pool
```

---

## Quick Initialization Example

```ts
import { WorkerPool } from "@ohfc/tiny-pool";

const pool = new WorkerPool<number>("./worker.mjs", {
  threads: 4,
  maxQueueSize: 10,
});

pool.startThreads();
```

---

## Usage Examples

**Stream integration example:**

```ts
const source = Readable.from(Array.from({ length: 100 }, (_, i) => i));
const pool = WorkerPool.fromStream<number, number>(source, "./worker.mjs", { threads: 2 });

pool.on("data", (res) => console.log("result:", res));
pool.on("end", async () => {
  console.log("All tasks complete.");
  await pool.destroy();
});
pool.on("error", (error) => {
  console.error("Pool error:", error);
});
```

**Manual task enqueueing example:**

```ts
const pool = new WorkerPool<number>("./worker.mjs", { threads: 3, maxQueueSize: 5 });
pool.startThreads();

const tasks = Array.from({ length: 50 }, (_, i) => i + 1);
const results: Promise<number>[] = [];

for (const n of tasks) {
  while (pool.isQueueFull) {
    await pool.waitForSpace(50);
  }
  results.push(pool.run(n));
}

const finalResults = await Promise.all(results);
console.log("Final Results:", finalResults.slice(0, 10));
await pool.destroy();
```

---

## Worker Example (`@ohfc/tiny-pool` worker module)

```ts
import { defineWorker } from "@ohfc/tiny-pool";
import { setTimeout as sleep } from "node:timers/promises";

defineWorker(async (data: number) => {
  await sleep(1000); // simulate async task delay
  return data * 2;
});
```

---

## API

### `new WorkerPool<T = unknown, R = unknown>(workerScript: string, options?: Partial<WorkerPoolOptions>)`

Creates a worker pool to manage multiple worker threads.

- **workerScript**: Path or content of worker script.
- **options**:
  - `threads` (number): Number of worker threads to create (default: available cores - 1)
  - `maxQueueSize` (number): Max tasks that can queue (default: Infinity)
  - `maxMemory`, `logger`, and others inherited from `WorkerOptions`.

### Methods

- **`startThreads(): void`**  
  Starts the worker threads.

- **`run(taskData: T): Promise<R>`**  
  Enqueues a task and returns a promise that resolves with the worker’s result.

- **`fromStream(source: Readable): Promise<void>`**  
  Reads tasks from a Node.js Readable stream and processes them asynchronously, emitting `'data'` events with results and `'end'` when done.

- **`destroy(): Promise<void>`**  
  Gracefully terminates all workers, clears queues, and cleans resources.

- **`waitForSpace(intervalMs?: number): Promise<void>`**  
  Promise that resolves once there is space in the queue (backpressure support).

- **`isQueueFull: boolean`**  
  Boolean indicating if the queue is full.

- **`queueLength: number`**  
  Number of tasks currently queued.

---

## Events

- **`'data'`** (result: R): Emitted when a task completes successfully.
- **`'error'`** (err: Error): Emitted on worker or task errors.
- **`'end'`**: Emitted after the input stream ends and all tasks finish (only with `fromStream`).

---

## Why Use @ohfc/tiny-pool?

- Minimal dependencies and lightweight.
- Easy to integrate with streams and manual task submission.
- Built-in queue and concurrency management with backpressure support.
- Automatically restarts crashed workers.
- Typed with TypeScript for strong developer experience.

---

## License

MIT
