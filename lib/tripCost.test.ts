import { describe, expect, it } from "vitest";
import { metersToMiles } from "./tripCost";

describe("metersToMiles", () => {
  it("converts using the statute mile", () => {
    expect(metersToMiles(1609.34)).toBeCloseTo(1, 6);
  });

  it("maps zero to zero", () => {
    expect(metersToMiles(0)).toBe(0);
  });
});
