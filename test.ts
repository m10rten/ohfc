import * as fs from "fs";
import * as path from "path";

/**
 * # Progress Reporting Package Specification for Stream-Based Processing Flows

## Overview

This package provides a standardized way to report progress for a processing system composed of multiple sequential or composable stream-based steps (using native Node.js streams). It enables lifecycle event tracking, nested sub-progress reporting, customizable output destinations, and flexible flow definitions supporting reusable events.

---

## Key Concepts

### 1. Flow

- A named processing sequence consisting of multiple lifecycle events (steps).
- Flows may reuse events from other flows and can be composed from multiple flows.
- Each flow defines a set of **lifecycle events** and their default progress messages.

### 2. Lifecycle Event

- Represents a distinct state or step within a flow (e.g., "load", "validate", "process").
- Lifecycle events may have associated default progress message templates.
- Events are dynamic and not fixed — flows can share and extend event sets.

### 3. Progress Events

- Two levels of progress reporting:
  - **Step-level**: signifies progression through lifecycle events (e.g., step 1 of 6).
  - **Sub-step-level**: indicates finer-grained progress within a step (e.g., item 10 of 100).
- Optionally, custom messages can be provided for both step and sub-step progress.

### 4. Output Strategies

- Different output destinations for progress reports:
  - **Console Output**: JSON progress events printed to the console.
  - **File Output**: JSON progress events appended to a log file.
  - **Custom Output**: User-defined output strategies can be easily plugged in.

### 5. Progress Tracker

- Central class managing progress state for a particular flow.
- Responsible for:
  - Registering total steps and sub-steps.
  - Emitting progress JSON on step start, sub-step progress, or arbitrary lifecycle events.
  - Maintaining current progress counters and flow context.
- Validates lifecycle events against the registered flow definition to ensure consistency.

### 6. Stream Processing Steps

- Implemented as **native Node.js stream classes** (`Transform`, `Readable`, `Writable`).
- Each step corresponds to a lifecycle event in the flow.
- Steps receive input and produce output of the same or compatible data types to allow flexible chaining.
- Each step is responsible for:
  - Emitting a **step start event** when processing begins.
  - Emitting **sub-step progress events** for each processed item.
- Steps expose an explicit `start(substepCount: number)` method which:
  - Initializes progress sub-step counts.
  - Emits the lifecycle event corresponding to the step start.
- Steps must be started (via `start()`) **before** piping to ensure consistent progress reporting and avoid uninitialized errors.

### 7. Pipeline Coordination

- The complete pipeline is constructed by piping individual steps.
- External orchestration code:
  - Creates and configures steps.
  - Calls `start()` on each step with the appropriate sub-step count before piping begins.
  - Pipes streams in correct processing order, ensuring sequential processing and buffering as needed.
  - Final writable step listens for end-of-flow and emits finishing lifecycle events.

---

## User Requirements and Constraints

- **Strong TypeScript** typing throughout — avoid usage of `any`.
- **Easy to use API** for registering flows, creating progress trackers, and managing steps.
- Flexible support for any number of flows with reusable lifecycle events.
- Support for nested progress levels (steps and sub-steps).
- Customizable output destinations via a pluggable output strategy interface.
- Steps implemented as **native Node.js stream subclasses only** — no shared custom base classes.
- Clear explicit initialization (`start()`) method on steps to avoid concurrency issues with progress tracking.
- Ability to rearrange steps and flows while maintaining progress accuracy.
- Provide example usage demonstrating flow registration, step creation, progress initialization, and pipeline execution.
- Stream data types are consistent across the pipeline to allow flexible step swapping.

---

## Package Components

### FlowDefinition

- Holds flow name and set of lifecycle events with default messages.
- Supports flow composition (merging multiple flows into one).

### FlowRegistry

- Global storage for registered flow definitions.
- Enables flow lookup by name.

### ProgressTracker

- Created for a specific flow name, using a registered flow definition.
- Methods:
  - `initSteps(totalSteps: number)`: sets number of lifecycle events expected.
  - `initSubSteps(totalSubSteps: number)`: defines sub-steps within a lifecycle event.
  - `nextStep(lifecycleEvent: string, message?: string)`: marks step start with optional message.
  - `nextSubStep(message?: string)`: marks progress of individual sub-steps.
  - `emitEvent(lifecycleEvent: string, message?: string)`: emits an arbitrary lifecycle event with optional message.
- Internally validates lifecycle events against flow definition events.

### Output Strategies

- Interface allowing output of JSON progress objects.
- Built-in implementations for:
  - Console output.
  - File logging.
- Custom output can be implemented by the user conforming to the interface.

### Stream Step Classes (Usage Pattern)

- Each step is a native stream class implementation (`Transform` or others).
- Steps accept a `ProgressTracker` instance.
- Expose `start(totalSubSteps: number)` method to:
  - Initialize sub-step count on the tracker.
  - Emit `nextStep()` event for step lifecycle.
- During data processing (`_transform` or `_write`), steps:
  - Emit `nextSubStep()` events for individual items.
- Must call `start()` externally before piping data through the step.

---

## Typical Usage Flow

1. **Define flows and lifecycle events**, register them via the flow registry.
2. **Create a `ProgressTracker` instance** referencing the desired flow.
3. **Create step instances** (`Transform`, `Readable`, `Writable`), passing the tracker to each.
4. **Call `start()` on each step**, supplying the count of sub-steps to expect.
5. **Create a readable input stream** producing flow data.
6. **Pipe the readable into the first step**, then pipe sequentially through all steps.
7. **Pipe the last step into a writable** that emits finished events and outputs final data.
8. **Monitor output** on the console, file, or custom destinations for progress updates.

---

## JSON Progress Event Structure

Each emitted progress JSON object contains:

| Field           | Type    | Description                                               |
|-----------------|---------|-----------------------------------------------------------|
| `flow`          | string  | Name of the processing flow                               |
| `lifecycleEvent`| string  | Name of the lifecycle event or sub-step                   |
| `step`          | number? | Current lifecycle step number (1-based)                   |
| `totalSteps`    | number? | Total number of lifecycle steps                            |
| `subStep`       | number? | Current sub-step number within current lifecycle step     |
| `totalSubSteps` | number? | Total number of sub-steps for current lifecycle step      |
| `message`       | string? | Optional custom progress message                           |
| `timestamp`     | string  | ISO8601 timestamp of event emission                        |

---

## Summary

This package facilitates detailed, hierarchical progress reporting for stream-based processing flows comprising multiple lifecycle steps. It separates flow definition, progress tracking, output configuration, and native stream step implementations. Explicit startup synchronization of streams with progress state prevents race conditions and maintains accurate progress visibility. The system promotes flexibility, extensibility, and ease of use with strong typing and pluggable outputs.


 */

/** Interface for output strategies */
export interface IOutputStrategy {
  /**
   * Output a JSON object representing progress
   * @param progress the progress object to output
   */
  output(progress: ProgressOutput): void;
}

/** The shape of the progress output */
export interface ProgressOutput {
  flow: string;
  lifecycleEvent: string;
  step?: number;
  totalSteps?: number;
  subStep?: number;
  totalSubSteps?: number;
  message?: string;
  timestamp: string;
}

/** Default console output strategy */
export class ConsoleOutputStrategy implements IOutputStrategy {
  output(progress: ProgressOutput): void {
    console.log(JSON.stringify(progress));
  }
}

/** Default file output strategy */
export class FileOutputStrategy implements IOutputStrategy {
  private filePath: string;

  /**
   * @param filename filename to write progress lines into
   */
  constructor(filename = "progress.log") {
    this.filePath = path.resolve(filename);
  }

  output(progress: ProgressOutput): void {
    // Append each JSON progress line with newline
    fs.appendFileSync(this.filePath, JSON.stringify(progress) + "\n", "utf8");
  }
}

/** Typed lifecycle event registry for dynamic flow event reuse */
export class LifecycleRegistry {
  private static registry: Map<string, Set<string>> = new Map();

  /** Register lifecycle events for a flow */
  static registerFlow(flowName: string, events: string[]): void {
    if (!this.registry.has(flowName)) {
      this.registry.set(flowName, new Set());
    }
    const eventSet = this.registry.get(flowName)!;
    for (const event of events) {
      eventSet.add(event);
    }
  }

  /** Get lifecycle events for a flow */
  static getEvents(flowName: string): string[] {
    return Array.from(this.registry.get(flowName) ?? []);
  }

  /** Check if event is valid for flow */
  static isEventForFlow(flowName: string, event: string): boolean {
    return this.registry.get(flowName)?.has(event) ?? false;
  }
}

/** Progress tracking class */
export class ProgressTracker {
  private flowName: string;
  private outputStrategy: IOutputStrategy;
  private currentStep = 0;
  private totalSteps = 0;
  private currentSubStep = 0;
  private totalSubSteps = 0;

  /**
   * Create a new ProgressTracker
   * @param flowName name of the flow
   * @param outputStrategy output strategy to use (default console)
   */
  constructor(flowName: string, outputStrategy?: IOutputStrategy) {
    this.flowName = flowName;
    this.outputStrategy = outputStrategy ?? new ConsoleOutputStrategy();
  }

  /**
   * Initialize total steps for progress
   * @param total total steps count
   */
  initSteps(total: number): void {
    if (total < 1) {
      throw new Error("Total steps must be at least 1");
    }
    this.totalSteps = total;
    this.currentStep = 0;
  }

  /**
   * Initialize total substeps for current step
   * @param total total sub steps count
   */
  initSubSteps(total: number): void {
    if (total < 1) {
      throw new Error("Total substeps must be at least 1");
    }
    this.totalSubSteps = total;
    this.currentSubStep = 0;
  }

  /**
   * Mark next step completed and output progress event
   * @param lifecycleEvent lifecycle event name
   * @param message optional message with progress
   */
  nextStep(lifecycleEvent: string, message?: string): void {
    // Validate lifecycle event for flow
    if (
      !LifecycleRegistry.isEventForFlow(this.flowName, lifecycleEvent) &&
      LifecycleRegistry.getEvents(this.flowName).length > 0
    ) {
      throw new Error(`Lifecycle event '${lifecycleEvent}' not registered for flow '${this.flowName}'`);
    }

    if (this.currentStep + 1 > this.totalSteps) {
      throw new Error("No more steps available, exceeded totalSteps");
    }
    this.currentStep++;
    this.currentSubStep = 0; // Reset substep on new step
    this.totalSubSteps = 0;

    // Output event without substeps
    this.outputStrategy.output({
      flow: this.flowName,
      lifecycleEvent,
      step: this.currentStep,
      totalSteps: this.totalSteps,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  /**
   * Mark next substep completed within current step
   * @param message optional message with progress
   */
  nextSubStep(message?: string): void {
    if (this.totalSubSteps === 0) {
      throw new Error("SubSteps not initialized");
    }
    if (this.currentSubStep + 1 > this.totalSubSteps) {
      throw new Error("No more substeps available, exceeded totalSubSteps");
    }
    this.currentSubStep++;

    this.outputStrategy.output({
      flow: this.flowName,
      lifecycleEvent: `step-${this.currentStep}-substep`,
      step: this.currentStep,
      totalSteps: this.totalSteps,
      subStep: this.currentSubStep,
      totalSubSteps: this.totalSubSteps,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  /**
   * Force output a custom message at current step
   * @param lifecycleEvent lifecycle event name
   * @param message message to output
   */
  emitEvent(lifecycleEvent: string, message: string): void {
    // Validate lifecycle event for flow
    if (
      !LifecycleRegistry.isEventForFlow(this.flowName, lifecycleEvent) &&
      LifecycleRegistry.getEvents(this.flowName).length > 0
    ) {
      throw new Error(`Lifecycle event '${lifecycleEvent}' not registered for flow '${this.flowName}'`);
    }

    this.outputStrategy.output({
      flow: this.flowName,
      lifecycleEvent,
      step: this.currentStep,
      totalSteps: this.totalSteps,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}

/** Example usage */
export function exampleUsage(): void {
  // Register lifecycle events for flows
  LifecycleRegistry.registerFlow("flowA", ["start", "load", "process", "finish"]);
  LifecycleRegistry.registerFlow("flowB", ["start", "validate", "finish"]);
  LifecycleRegistry.registerFlow("flowC", [
    ...LifecycleRegistry.getEvents("flowA"),
    ...LifecycleRegistry.getEvents("flowB"),
    "finalize",
  ]);

  // Create a progress tracker for flowA using console output
  const trackerA = new ProgressTracker("flowA");

  trackerA.initSteps(3);
  trackerA.nextStep("start", "Starting flow A");
  trackerA.nextStep("load", "Loading resources");

  trackerA.initSubSteps(5);
  for (let i = 0; i < 5; i++) {
    trackerA.nextSubStep(`loading item ${i + 1} of 5`);
  }

  trackerA.nextStep("process", "Processing data");
  trackerA.nextStep("finish", "Finished flow A");
}
