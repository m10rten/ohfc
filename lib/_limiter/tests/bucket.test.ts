import { describe, it, expect, beforeEach } from "vitest";

import { Bucket } from "../src/bucket.js";

describe("Bucket", () => {
  let bucket: Bucket;

  beforeEach(() => {
    bucket = new Bucket(5);
  });

  it("should initialize with full capacity", () => {
    expect(bucket.available()).toBe(5);
  });

  it("should consume a token when available", () => {
    const result = bucket.consume();
    expect(result).toBe(true);
    expect(bucket.available()).toBe(4);
  });

  it("should not consume a token when empty", () => {
    for (let i = 0; i < 5; i++) {
      bucket.consume();
    }
    const result = bucket.consume();
    expect(result).toBe(false);
    expect(bucket.available()).toBe(0);
  });

  it("should refill tokens up to capacity", () => {
    bucket.consume();
    bucket.refill(2);
    expect(bucket.available()).toBe(5);
  });

  it("should not exceed capacity on refill", () => {
    bucket.refill(10);
    expect(bucket.available()).toBe(5);
  });

  it("should fill tokens to full capacity", () => {
    bucket.consume();
    expect(bucket.available()).toBe(4);
    bucket.fill();
    expect(bucket.available()).toBe(5);
  });

  it("should handle consecutive consumes correctly", () => {
    bucket.consume();
    bucket.consume();
    expect(bucket.available()).toBe(3);
  });

  it("should allow partial refill without exceeding capacity", () => {
    bucket.consume();
    bucket.refill(1);
    expect(bucket.available()).toBe(5);
    bucket.consume();
    bucket.refill(0);
    expect(bucket.available()).toBe(4);
  });
});
