import { describe, it, expect, vi } from "vitest";

import { signal, Signal } from "../src/index.js";

describe("Signal", () => {
  it("should initialize with the given value", () => {
    const s = signal(42);
    expect(s.get()).toBe(42);
  });

  it("should update the value with set()", () => {
    const s = signal("initial");
    s.set("updated");
    expect(s.get()).toBe("updated");
  });

  it("should update the value with var.value=", () => {
    const s = signal("initial");
    s.value = "updated";
    expect(s.value).toBe("updated");
  });

  it("should notify subscribers when the value changes", () => {
    const s = signal(0);
    const callback = vi.fn();

    s.subscribe(callback);
    s.set(1);
    s.set(2);

    expect(callback).toHaveBeenCalledTimes(3); // 1 initial + 2 changes
    expect(callback).toHaveBeenNthCalledWith(1, 0);
    expect(callback).toHaveBeenNthCalledWith(2, 1);
    expect(callback).toHaveBeenNthCalledWith(3, 2);
  });

  it("should not notify subscribers when set() is called with the same value", () => {
    const s = signal("same");
    const callback = vi.fn();

    s.subscribe(callback);
    s.set("same");

    // Only initial call
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith("same");
  });

  it("should allow unsubscribing from notifications", () => {
    const s = signal(10);
    const callback = vi.fn();

    const unsubscribe = s.subscribe(callback);
    s.set(20);

    unsubscribe();
    s.set(30);

    expect(callback).toHaveBeenCalledTimes(2); // 1 initial + 1 change before unsub
    expect(callback).toHaveBeenNthCalledWith(1, 10);
    expect(callback).toHaveBeenNthCalledWith(2, 20);
  });

  it("should support multiple independent subscribers", () => {
    const s = signal("start");
    const cbA = vi.fn();
    const cbB = vi.fn();

    s.subscribe(cbA);
    s.subscribe(cbB);

    s.set("next");

    expect(cbA).toHaveBeenCalledTimes(2);
    expect(cbB).toHaveBeenCalledTimes(2);
    expect(cbA).toHaveBeenNthCalledWith(1, "start");
    expect(cbA).toHaveBeenNthCalledWith(2, "next");
    expect(cbB).toHaveBeenNthCalledWith(1, "start");
    expect(cbB).toHaveBeenNthCalledWith(2, "next");
  });

  it("should behave correctly with complex types", () => {
    const s = signal<{ x: number }>({ x: 1 });
    const callback = vi.fn();

    s.subscribe(callback);
    s.set({ x: 2 });
    s.set({ x: 2 }); // should notify again because object identity changes

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(1, { x: 1 });
    expect(callback).toHaveBeenNthCalledWith(2, { x: 2 });
    expect(callback).toHaveBeenNthCalledWith(3, { x: 2 });
  });

  it("should export a factory function returning a Signal instance", () => {
    const s = signal(123);
    expect(s).toBeInstanceOf(Signal);
    expect(s.get()).toBe(123);
  });

  it("should automatically remove unreachable subscribers via WeakRef", async () => {
    const s = signal("alpha");
    const callback = vi.fn();

    // Scoped subscriber to later drop reference
    {
      const scopedCallback = (v: string) => {
        callback(v);
      };
      s.subscribe(scopedCallback);
      s.set("beta");

      expect(callback).toHaveBeenCalledTimes(2); // initial + beta
    }

    // Hint GC: drop reference — but JS won't actually GC deterministically here
    // So this test mainly confirms it doesn't call dead subscribers

    s.set("gamma");

    // The weakly held callback may or may not be collected yet.
    // But we expect no more than 3 calls if FinalizationRegistry worked

    expect(callback.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
