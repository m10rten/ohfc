import { WorkerPool } from "./src/index.js";
import { Readable } from "node:stream";

async function main() {
  const pool = new WorkerPool<number>("./worker.mjs", {
    maxQueueSize: 10,
    threads: 1,
  });

  // Create the source stream
  const source = Readable.from(Array.from({ length: 100 }, (_, i) => i));

  // Handle flow control manually using pool.isQueueFull and pool.waitForSpace
  source.on("data", async (chunk) => {
    console.log(chunk, pool);
    // Enqueue the chunk (task)
    pool.run(chunk).catch((err) => {
      console.error("Task error:", err);
    });
    // If queue is full, pause the stream and wait for space
    if (pool.isQueueFull) {
      source.pause();
      await pool.waitForSpace();
      return source.resume();
    } else if (source.isPaused()) {
      return source.resume();
    }
  });
}

main();
