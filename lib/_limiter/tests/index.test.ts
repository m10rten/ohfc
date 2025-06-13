import { describe, it, expect, beforeEach } from "vitest";
import { Limiter } from "../src/index.js";

describe("Limiter", () => {
  let limiter: Limiter;

  beforeEach(() => {
    limiter = new Limiter({ capacity: 3, refillRate: 1, interval: 1000 });
  });

  it("should initialize with correct parameters", () => {
    expect(limiter).toBeDefined();
    expect(typeof limiter.take).toBe("function");
    expect(typeof limiter["refill"]).toBe("function");
    expect(typeof limiter.logs).toBe("function");
  });

  it("should successfully take a token if available", () => {
    const result = limiter.take();
    expect(result).toBe(true);
    // should decrement internal available tokens — not directly testable without access
    // but assume if multiple takes work until capacity is exhausted
  });

  it("should reject token request when none are available", () => {
    limiter.take(); // 1
    limiter.take(); // 2
    limiter.take(); // 3
    const result = limiter.take(); // 4th request exceeds capacity
    expect(result).toBe(false);
  });

  it("should refill tokens after refill() call", () => {
    limiter.take(); // 1
    limiter.take(); // 2
    limiter.take(); // 3
    expect(limiter.take()).toBe(false); // should now be empty

    limiter["refill"](); // replenish refillRate = 1 token
    const result = limiter.take();
    expect(result).toBe(true);
  });

  it("should log usage timestamps when a token is taken", () => {
    limiter.take();
    const logs = limiter.logs();
    expect(logs.length).toBe(1);
    expect(typeof logs[0]).toBe("number");
    expect(logs[0]).toBeLessThanOrEqual(Date.now());
  });

  it("should maintain multiple logs", () => {
    limiter.take();
    limiter.take();
    const logs = limiter.logs();
    expect(logs.length).toBe(2);
  });

  it("should return an empty log array initially", () => {
    expect(limiter.logs()).toEqual([]);
  });

  it("should refill multiple tokens if refill() is called repeatedly", () => {
    limiter.take();
    limiter.take();
    limiter.take();
    expect(limiter.take()).toBe(false); // all used

    limiter["refill"]();
    limiter["refill"]();
    limiter["refill"]();

    // should be able to take tokens again up to capacity
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(false); // over capacity again
  });
});
