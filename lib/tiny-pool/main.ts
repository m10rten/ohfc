// example2.ts
import { WorkerPool } from "./src/index.js";
import { Readable } from "node:stream";

// Worker file: worker-task.js
// const { parentPort } = require("node:worker_threads");
// parentPort.on("message", (data) => parentPort.postMessage(data + 1));

async function main() {
  const pool = new WorkerPool<number>("./worker.mjs", {
    eval: false,
    threads: 4,
  });

  const source = Readable.from(Array.from({ length: 1000 }, (_, i) => i));
  pool.attachStream(source);

  source.on("end", async () => {
    console.log("Stream finished");
    await pool.destroy();
  });
}

main();
