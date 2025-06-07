import { describe, it, expect, vi } from "vitest";

import { once } from "../src/index.js";

describe("once.ts", () => {
  it("should call the function only once", () => {
    const fn = vi.fn(() => 42);
    const wrapped = once(fn);

    const result1 = wrapped();
    const result2 = wrapped();
    const result3 = wrapped();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1).toBe(42);
    expect(result2).toBe(42);
    expect(result3).toBe(42);
  });

  it("should pass arguments only on first call", () => {
    const fn = vi.fn((x: number) => x * 2);
    const wrapped = once(fn);

    const result1 = wrapped(3);
    const result2 = wrapped(7);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1).toBe(6);
    expect(result2).toBe(6); // still returns first result
  });

  it("should resolve with the same value for subsequent calls (promise)", async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const wrapped = once(fn);

    const result1 = await wrapped(5);
    const result2 = await wrapped(10);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1).toBe(10);
    expect(result2).toBe(10);
  });

  it("should reject with the same error on every call after the first rejection (error cached)", async () => {
    const error = new Error("fail");
    const fn = vi.fn(() => Promise.reject(error));
    const wrapped = once(fn);

    await expect(wrapped()).rejects.toThrow(error);
    await expect(wrapped()).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1); // If error is cached
  });

  it("should throw again if the first call throws (no result cached)", () => {
    const fn = vi.fn(() => {
      throw new Error("fail");
    });
    const wrapped = once(fn);

    expect(() => wrapped()).toThrowError("fail");
    expect(() => wrapped()).toThrowError("fail");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
