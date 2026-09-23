import { describe, expect, it } from "vitest";
import { liftCounts } from "./liftTypes";

describe("liftCounts", () => {
  it("sums every detachable width into highSpeed", () => {
    const c = liftCounts({ high_speed_eight: 1, high_speed_six: 1, high_speed_quad: 3, high_speed_triple: 1 });
    expect(c.highSpeed).toBe(6);
    expect(c.aerial).toBe(6);
  });

  it("does not count bubble chairs or surface lifts as high-speed", () => {
    const c = liftCounts({ bubble_chair: 1, fixed_double: 3, surface: 2, magic_carpet: 1 });
    expect(c.highSpeed).toBe(0);
    expect(c.aerial).toBe(4);
  });

  it("coerces string and null values instead of concatenating", () => {
    const c = liftCounts({ high_speed_quad: "3", fixed_quad: null, gondola: "1", tram: undefined });
    expect(c.highSpeed).toBe(3);
    expect(c.gondola).toBe(1);
    expect(c.tram).toBe(0);
    expect(c.aerial).toBe(4);
  });

  it("returns zeros for a missing object", () => {
    expect(liftCounts(null)).toEqual({ highSpeed: 0, gondola: 0, tram: 0, aerial: 0 });
  });
});
