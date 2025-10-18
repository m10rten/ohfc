import { defineWorker } from "./dist/worker.js";
import { setTimeout as sleep } from "node:timers/promises";

defineWorker(async (data) => {
  await sleep(1_000); // sleep 1 second
  return data * 2;
});
