/* eslint-disable no-undef */

import { defineWorker } from "./dist/worker.js";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

defineWorker(async (data) => {
  await sleep(1_000 + Math.random() * 400);
  return data * 2;
});
