// example1.ts
// import { availableParallelism } from "node:os";
import { WorkerPool } from "./src/index.js";
import { readFileSync } from "node:fs";

// Worker file: worker-task.js
// const { parentPort } = require("node:worker_threads");
// parentPort.on("message", (data) => parentPort.postMessage(data * 2));

async function main() {
  const file = readFileSync("./worker.mjs", "utf-8");
  const pool = new WorkerPool<number>(file, {
    eval: true,
    // threads: availableParallelism() - 1,
    maxQueueSize: 100_000,
  });
  // Run n items
  const items = Array.from({ length: 1_000_000 }, (_, i) => i + 1);

  const results: unknown[] = [];

  for await (const n of items) {
    // wait before pushing, but don't wait for task completion
    while (pool.isQueueFull) {
      await pool.waitForSpace(50);
    }
    results.push(pool.run(n)); // enqueue task, get promise immediately
  }

  // then later, wait for everything
  const finalResults = await Promise.all(results);
  console.log("Final Results:", finalResults.slice(0, 10), "...");
  await pool.destroy();
}

main();
