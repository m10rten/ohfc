import { Readable, Writable, Transform, PassThrough } from "node:stream";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";

/**
 * Here is the full specification distilled from all your prompts and requests:

Define an interface for Steps to represent pipeline steps.

Steps must be Node.js Streams: Writable, Readable, or Transform streams.

Implement two abstract Step classes based on the interface:

SingleStep: for steps without sub-progress.

MultiStep: for steps with sub-progress items.

Each Step must expose a .stream() method returning its stream instance.

Implement a custom Pipeline class that:

Accepts Step instances.

Runs steps sequentially using the Node.js native promise-based stream pipeline.

Supports a "wait" option for steps that must buffer output (insert a file buffer between steps).

The file buffer step:

Buffers stream output to a temporary file (.tmp extension preferred).

Ensures the next step only starts when buffer writing is complete.

Supports reading from the buffer for the next step.

Manages cleanup of the temporary file.

Progress tracking system:

Abstract Progress class defining update/reset methods.

EngineProgress class extends Progress and tracks global state.

Progress state includes:

Current step index.

Total steps count (excluding internal buffer steps).

Sub progress items count and total.

Message per step.

Progress updates output as JSON to console with console.clear() for dynamic display.

Sub-progress can be stored/set/fetched from the buffer step due to unknown stream size.

Progress update frequency should be throttled based on total size to avoid excessive logs.

Global application state stored in a singleton Store class, accessed by EngineProgress.

Pipeline progress counts only user-facing steps, ignoring internal buffer steps — e.g., step 2 of 2 instead of counting buffers.

A Sink step exists acting as a passthrough stream to clear memory (consumes data without action).

Steps are executed via an .execute() method called only outside the step classes (no internal calls to .execute() inside steps).

Steps' .execute() replaces prior .run() method.

The .stream() method remains used internally by pipeline for connecting streams.

All timing delays minimum 1 second to visually showcase progress effects.

Implementation is in TypeScript, using no external frameworks or packages, fully typed with minimal casting.

Example steps:

Basic mock stream input.

Step with no sub-progress.

Step with sub-progress.

A step configured to wait, causing insertion of a file buffer step before downstream processing.

Use Node.js native streaming/pipeline/promises API.

Avoid counting internal buffer steps in progress totals.

Clear separation between progress reporting logic and stream pipeline chaining.

Code must be minimal and clean with essential JSDoc/inline comments only when necessary.

Output progress states on console as JSON for user awareness.

File buffer step uses ".tmp" extensions; performance difference vs ".ndjson" is negligible.

All streams and progress are designed for real asynchronous backpressure-aware operations.
 */
/** Singleton Global Store */
class Store {
  private static instance: Store;
  private state: {
    currentStep: number;
    totalSteps: number;
    subProgressItems: number;
    subTotalItems: number;
    message: string;
  } = {
    currentStep: 0,
    totalSteps: 0,
    subProgressItems: 0,
    subTotalItems: 0,
    message: "",
  };

  private constructor() {}
  static getInstance() {
    if (!Store.instance) Store.instance = new Store();
    return Store.instance;
  }
  set<K extends keyof typeof this.state>(key: K, value: (typeof this.state)[K]) {
    this.state[key] = value;
  }
  get<K extends keyof typeof this.state>(key: K) {
    return this.state[key];
  }
  log() {
    console.clear();
    console.log(JSON.stringify(this.state, null, 2));
  }
}

/** Abstract Progress */
abstract class Progress {
  abstract update(current: number, total: number, message: string): void;
  abstract updateSub(subItems: number, total: number): void;
  abstract resetSub(): void;
}

/** Engine Progress */
class EngineProgress extends Progress {
  private store = Store.getInstance();
  update(current: number, total: number, message: string) {
    this.store.set("currentStep", current);
    this.store.set("totalSteps", total);
    this.store.set("message", message);
    this.store.log();
  }
  updateSub(sub: number, total: number) {
    this.store.set("subProgressItems", sub);
    this.store.set("subTotalItems", total);
    this.store.log();
  }
  resetSub() {
    this.store.set("subProgressItems", 0);
    this.store.set("subTotalItems", 0);
  }
}

/** Step Interface */
interface Step {
  id: string;
  label: string;
  wait: boolean;
  stream(): NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream;
}

/** Abstract Single Step */
abstract class SingleStep implements Step {
  id = randomUUID();
  wait = false;
  constructor(public label: string) {}
  abstract stream(): NodeJS.ReadableStream | NodeJS.WritableStream | NodeJS.ReadWriteStream;
  /** execute does what run did, but is only called externally by pipeline */
  async execute(progress: EngineProgress, current: number, total: number) {
    progress.update(current, total, this.label);
    await new Promise((res) => setTimeout(res, 1000));
  }
}

/** Abstract Multi Step */
abstract class MultiStep implements Step {
  id = randomUUID();
  wait = false;
  constructor(
    public label: string,
    public subTotal: number,
  ) {}
  abstract stream(): NodeJS.ReadableStream | NodeJS.ReadWriteStream;
  async execute(progress: EngineProgress, current: number, total: number) {
    progress.update(current, total, this.label);
    progress.resetSub();
    for (let i = 0; i < this.subTotal; i++) {
      progress.updateSub(i + 1, this.subTotal);
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}

/** File Buffer Step */
class FileBufferStep extends SingleStep {
  private file = `./buffer-${this.id}.tmp`;
  stream() {
    return createWriteStream(this.file);
  }
  readStream() {
    return createReadStream(this.file);
  }
  async cleanup() {
    await fs.unlink(this.file).catch(() => {});
  }
  async execute() {
    // No external progress for internal buffer
  }
}

/** Sink Step (memory clearing) */
class SinkStep extends SingleStep {
  stream() {
    return new PassThrough({ objectMode: true });
  }
  async execute(progress: EngineProgress, current: number, total: number) {
    progress.update(current, total, `${this.label} (Sink clearing)`);
    await new Promise((res) => setTimeout(res, 500));
  }
}

/** Mock Input Step */
class MockInputStep extends SingleStep {
  stream() {
    let i = 0;
    return new Readable({
      objectMode: true,
      read() {
        if (i < 5) this.push(`item-${i++}`);
        else this.push(null);
      },
    });
  }
}

/** Transform Step with SubProgress */
class TransformStep extends MultiStep {
  stream() {
    return new Transform({
      objectMode: true,
      transform(chunk, _enc, cb) {
        cb(null, chunk.toString().toUpperCase());
      },
    });
  }
}

/** Custom Pipeline with wait logic */
class CustomPipeline {
  constructor(private steps: Step[]) {}

  async run(progress: EngineProgress) {
    const userStepsCount = this.steps.filter((s) => !(s instanceof FileBufferStep)).length;
    progress.update(0, userStepsCount, "initialized");

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i]!;
      // Only execute user steps' progress externally, skip internal buffer steps
      if (!(step instanceof FileBufferStep)) {
        // @ts-expect-error execute method exists on SingleStep/MultiStep
        await step.execute?.(progress, i + 1, userStepsCount);
      }
      // Handle pipeline stream connection and file buffer for wait
      if (step.wait && i < this.steps.length - 1) {
        const buffer = new FileBufferStep("File Buffer");

        // Run pipeline: current step -> buffer
        await pipeline([step.stream(), buffer.stream()]);

        const next = this.steps[i + 1]!;

        // Run pipeline: buffer readstream -> next step
        await pipeline([buffer.readStream(), next.stream()]);

        await buffer.cleanup();
      } else if (!step.wait && i < this.steps.length - 1) {
        progress.resetSub();
        const next = this.steps[i + 1]!;
        await pipeline([step.stream(), next.stream()]);
      }
    }
  }
}

/** Engine Wrapper */
class Engine {
  constructor(private steps: Step[]) {}
  async run() {
    const progress = new EngineProgress();
    const p = new CustomPipeline(this.steps);
    await p.run(progress);
    const sink = new SinkStep("Sink");
    await pipeline(
      sink.stream(),
      new Writable({
        objectMode: true,
        write(_chunk, _enc, cb) {
          cb();
        },
      }),
    );
  }
}

/** Main Execution */
(async () => {
  const engine = new Engine([
    new MockInputStep("Input Stream"),
    new TransformStep("Transform with SubProgress", 3),
    new MockInputStep("Intermediate Stream"),
    Object.assign(new TransformStep("Waiting Transform", 2), { wait: true }),
  ]);
  await engine.run();
})();
