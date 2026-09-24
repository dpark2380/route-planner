import { describe, expect, it } from "vitest";
import { parseDollarsToCents } from "./format";

describe("parseDollarsToCents", () => {
  it("parses a decimal amount typed digit by digit", () => {
    expect(parseDollarsToCents("2", 1000)).toBe(200);
    expect(parseDollarsToCents("2.", 1000)).toBe(200);
    expect(parseDollarsToCents("2.5", 1000)).toBe(250);
    expect(parseDollarsToCents("2.50", 1000)).toBe(250);
  });

  it("ignores text that isn't a number yet instead of resetting the budget", () => {
    expect(parseDollarsToCents("", 1000)).toBeNull();
    expect(parseDollarsToCents("-", 1000)).toBeNull();
    expect(parseDollarsToCents("abc", 1000)).toBeNull();
  });

  it("clamps negatives to zero and large values to the maximum", () => {
    expect(parseDollarsToCents("-5", 1000)).toBe(0);
    expect(parseDollarsToCents("99", 1000)).toBe(1000);
  });
});
