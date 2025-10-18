import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";

import { WorkerPool } from "../src/index.js";

async function main() {
  const file = readFileSync("./worker.mjs", "utf-8");
  const pool = new WorkerPool<number>(file, {
    eval: true,
    threads: availableParallelism() - 1,
    maxQueueSize: 10,
  });

  pool.startThreads();

  // Run n items
  const items = Array.from({ length: 100 }, (_, i) => i + 1);

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
