import { parentPort } from "node:worker_threads";

assertParentPort(parentPort);

export function defineWorker<T, R>(fn: (data: T) => Promise<R> | R) {
  if (!parentPort) return; // not in Worker context
  parentPort.on("message", async (data) => {
    assertParentPort(parentPort);
    if (typeof fn !== "function") throw new TypeError(`callback has to be a function`);
    try {
      const result = await fn(data);
      parentPort.postMessage(result);
    } catch (err) {
      parentPort.postMessage({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

function assertParentPort(v: unknown): asserts v is MessagePort {
  if (!v) {
    throw new TypeError("parentport can only be used in worker");
  }
}
