import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { timeAgo } from "../src/index.js";

describe("timeAgo", () => {
  const BASE_TIME = new Date("2025-09-07T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '0 seconds ago' for the same time", () => {
    expect(timeAgo(BASE_TIME, "en")).toBe("now");
  });

  it("returns '1 minute ago' for 1 minute in the past", () => {
    const past = BASE_TIME - 60 * 1000;
    expect(timeAgo(past, "en")).toBe("1 minute ago");
  });

  it("returns 'in 2 hours' for 2 hours in the future", () => {
    const future = BASE_TIME + 2 * 60 * 60 * 1000;
    expect(timeAgo(future, "en")).toBe("in 2 hours");
  });

  it("returns correct value for string date", () => {
    const pastDate = new Date(BASE_TIME - 86400 * 1000).toISOString();
    expect(timeAgo(pastDate, "en")).toBe("yesterday");
  });

  it("returns correct value for Date input", () => {
    const futureDate = new Date(BASE_TIME + 7 * 86400 * 1000);
    expect(timeAgo(futureDate, "en")).toBe("next week");
  });

  it("throws on invalid input", () => {
    // @ts-expect-error expects different type
    expect(() => timeAgo(null)).toThrow();
    // @ts-expect-error expects different type
    expect(() => timeAgo(undefined)).toThrow();
  });

  it("accepts locales argument", () => {
    const future = BASE_TIME + 60 * 1000;
    expect(timeAgo(future, "de")).toMatch(/in 1 Minute/i);
  });
});
