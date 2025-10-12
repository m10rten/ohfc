import { setTimeout } from "node:timers/promises";
import zap from "./src/index.js";

async function streamExample() {
  try {
    const stream = await zap.stream("https://jsonplaceholder.typicode.com/posts", { method: "GET" });
    if (!stream) throw new Error("No stream available");

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      await setTimeout(500);
      const { value, done: doneReading } = await reader.read();
      if (value) {
        console.log(decoder.decode(value));
      }
      done = doneReading;
    }
  } catch (error) {
    console.error("Streaming error:", error);
  }
}

streamExample();
