import { Readable } from "node:stream";
import { WorkerPool } from "../src/index.js";
import Deferred from "../../deferred/src/index.js";

console.time("workers:streams");
const { resolve, reject, promise } = new Deferred();

const main = async () => {
  const source = Readable.from(Array.from({ length: 100 }, (_, i) => i));
  const pool = WorkerPool.fromStream<number, number>(source, "./worker.mjs", {
    threads: 8,
    maxQueueSize: 5,
  });

  pool.on("data", (res) => console.log("result:", res));
  pool.on("end", async () => {
    console.log("All tasks complete.");
    await pool.destroy();
    resolve();
  });

  pool.on("error", async (error) => reject(error));
  await promise;
};

main().then(() => console.timeEnd("workers:streams"));
