/* eslint-disable no-undef */
// worker-task.mjs (ESM)
import { setTimeout } from "node:timers";
import { parentPort, threadId } from "node:worker_threads";

if (!parentPort) {
  throw new Error("worker-task.mjs must be run as a Worker");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

parentPort.on("message", async (data) => {
  try {
    // Simulate some async work with random sleep
    await sleep(1_000 + Math.random() * 400);

    const result = data * 2;

    // Log internally, will show up if redirected or stdout is piped
    console.log(`Worker ${threadId} processed ${data}, result: ${result}`);

    parentPort.postMessage(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    parentPort.postMessage({ error: errorMessage });
  }
});
