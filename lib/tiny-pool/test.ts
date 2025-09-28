// example1.ts
import { availableParallelism } from "node:os";
import { WorkerPool } from "./src/index.js";
import { readFileSync } from "node:fs";

// Worker file: worker-task.js
// const { parentPort } = require("node:worker_threads");
// parentPort.on("message", (data) => parentPort.postMessage(data * 2));

async function main() {
  const file = readFileSync("./worker.mjs", "utf-8");
  const pool = new WorkerPool<number>(file, {
    eval: true,
    threads: availableParallelism() - 1,
    maxQueueSize: 10,
  });
  // Run 100 items
  const items = Array.from({ length: 100 }, (_, i) => i + 1);

  const results = await Promise.all(items.map((n) => pool.run(n)));

  console.log("Final Results:", results.slice(0, 10), "...");
  await pool.destroy();
}

main();
