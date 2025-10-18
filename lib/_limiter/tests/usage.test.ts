import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { Usage } from "../src/usage.js";

describe("Usage", () => {
  let usage: Usage;

  beforeEach(() => {
    usage = new Usage(3);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start with an empty log", () => {
    expect(usage.getLogs()).toEqual([]);
  });

  it("should add a timestamp to the log", () => {
    usage.add();
    expect(usage.getLogs().length).toBe(1);
    expect(usage.getLogs()[0]).toBe(Date.now());
  });

  it("should maintain the log size within maxLogSize", () => {
    usage.add(); // 1
    vi.advanceTimersByTime(1000);
    usage.add(); // 2
    vi.advanceTimersByTime(1000);
    usage.add(); // 3
    vi.advanceTimersByTime(1000);
    usage.add(); // 4 — should evict first

    const logs = usage.getLogs();
    expect(logs.length).toBe(3);
    expect(logs[0]).toBe(Date.now() - 2000); // first should be evicted
  });

  it("should return a copy of logs, not the internal array", () => {
    usage.add();
    const logs = usage.getLogs();
    logs.push(999999);
    expect(usage.getLogs().includes(999999)).toBe(false);
  });
});
