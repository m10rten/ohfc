import { describe, it, expect } from "vitest";

import { Period } from "../src/index.js";

describe("Period", () => {
  it("parses period string correctly", () => {
    const period = Period.parse("1y 2mo 3w 4d 5h 6m 7s");
    expect(period.components).toEqual({
      years: 1,
      months: 2,
      days: 3 * 7 + 4,
      hours: 5,
      minutes: 6,
      seconds: 7,
      milliseconds: 0,
    });
  });

  it("adds period to a date correctly", () => {
    const base = new Date(Date.UTC(2000, 0, 1, 0, 0, 0, 0)); // Jan 1, 2000 UTC
    const period = Period.parse("1y 1mo 1d 1h 1m 1s 1ms");
    const result = period.addTo(base);

    expect(result.getUTCFullYear()).toBe(2001);
    expect(result.getUTCMonth()).toBe(1); // Feb
    expect(result.getUTCDate()).toBe(2);
    expect(result.getUTCHours()).toBe(1);
    expect(result.getUTCMinutes()).toBe(1);
    expect(result.getUTCSeconds()).toBe(1);
    expect(result.getUTCMilliseconds()).toBe(1);
  });

  it("formats future date to ISO string with rounding", () => {
    const base = new Date(Date.UTC(2020, 0, 1, 23, 59, 59, 999));
    const period = Period.parse("0y 0mo 0d 0h 0m 1s");

    const roundedToMinute = period.toString(base, { roundTo: "minutes" });
    expect(roundedToMinute.endsWith(":00.000Z")).toBe(true);

    const roundedToHour = period.toString(base, { roundTo: "hours" });
    expect(roundedToHour.endsWith(":00:00.000Z")).toBe(true);
  });

  it("returns correct components via getter", () => {
    const period = Period.parse("3y 2mo 1w 1d");
    const components = period.components;
    expect(components.years).toBe(3);
    expect(components.months).toBe(2);
    expect(components.days).toBe(7 + 1);
  });

  it("throws on invalid period string", () => {
    expect(() => Period.parse("1year")).toThrow('Invalid period format part: "1year"');
    expect(() => Period.parse("abc")).toThrow('Invalid period format part: "abc"');
    expect(() => Period.parse("5x")).toThrow('Invalid period format part: "5x"');
  });
});
