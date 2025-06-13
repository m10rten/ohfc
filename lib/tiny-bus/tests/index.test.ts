import { describe, it, expect, vi, beforeEach } from "vitest";

import { TinyBus } from "../src/index.js";

type TestEvents = {
  "test:event": { message: string };
  "another:event": number;
};

describe("TinyBus", () => {
  let bus: TinyBus<TestEvents>;

  beforeEach(() => {
    bus = new TinyBus<TestEvents>();
  });

  it("should register and call event listeners with the correct payload", () => {
    const handler = vi.fn();

    bus.on("test:event", handler);
    const payload = { message: "Hello World" };
    bus.emit("test:event", payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("should not call listeners after they have been removed", () => {
    const handler = vi.fn();

    bus.on("test:event", handler);
    bus.off("test:event", handler);

    bus.emit("test:event", { message: "Hello World" });

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle multiple listeners for the same event", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on("another:event", handler1);
    bus.on("another:event", handler2);

    bus.emit("another:event", 42);

    expect(handler1).toHaveBeenCalledWith(42);
    expect(handler2).toHaveBeenCalledWith(42);
  });

  it("should remove all listeners for a specific event when clear is called with event name", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on("another:event", handler1);
    bus.on("another:event", handler2);

    bus.clear("another:event");

    bus.emit("another:event", 100);

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should remove all listeners for all events when clear is called without arguments", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.on("another:event", handler1);
    bus.on("test:event", handler2);

    bus.clear();

    bus.emit("another:event", 50);
    bus.emit("test:event", { message: "Gone" });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
    expect(Object.keys(bus["listeners"]).length).toBe(0);
  });

  it("should do nothing when removing a handler not registered", () => {
    const handler = vi.fn();

    // Removing without adding should not throw
    expect(() => bus.off("test:event", handler)).not.toThrow();
  });

  it("should do nothing when emitting an event without listeners", () => {
    expect(() => bus.emit("another:event", 123)).not.toThrow();
  });

  it("should expect a ts error when emitting an invalid event", () => {
    // @ts-expect-error invalid event
    expect(() => bus.emit("invalid:event", 123)).not.toThrow();
  });
});
