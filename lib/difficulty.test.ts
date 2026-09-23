import { describe, expect, it } from "vitest";
import { getDifficultyMix, normalize } from "./difficulty";

describe("normalize", () => {
  it("pins the total to 100 by adjusting the largest bucket", () => {
    const m = normalize({ beginner: 26, intermediate: 25, advanced: 25, expert: 25, fromPct: true });
    expect(m.beginner + m.intermediate + m.advanced + m.expert).toBe(100);
    expect(m.beginner).toBe(25);
  });
  it("leaves an exact 100 untouched", () => {
    const m = normalize({ beginner: 20, intermediate: 50, advanced: 20, expert: 10, fromPct: true });
    expect(m).toEqual({ beginner: 20, intermediate: 50, advanced: 20, expert: 10, fromPct: true });
  });
  it("absorbs a shortfall into the largest bucket", () => {
    const m = normalize({ beginner: 10, intermediate: 40, advanced: 30, expert: 15, fromPct: true });
    expect(m.intermediate).toBe(45);
  });
});

describe("getDifficultyMix", () => {
  const base = {
    difficulty_pct_beginner: null,
    difficulty_pct_intermediate: null,
    difficulty_pct_advanced: null,
    difficulty_pct_expert: null,
    trails_beginner: null,
    trails_intermediate: null,
    trails_advanced: null,
    trails_expert: null,
  };
  it("refuses to fabricate from a single percentage", () => {
    expect(getDifficultyMix({ ...base, difficulty_pct_advanced: 33 })).toBeNull();
  });
  it("accepts a nearly complete percentage row", () => {
    const m = getDifficultyMix({ ...base, difficulty_pct_beginner: 20, difficulty_pct_intermediate: 50, difficulty_pct_advanced: 30 })!;
    expect(m.fromPct).toBe(true);
    expect(m.expert).toBe(0);
  });
  it("derives percentages from counts", () => {
    const m = getDifficultyMix({ ...base, trails_beginner: 1, trails_intermediate: 1, trails_advanced: 1, trails_expert: 0 })!;
    expect(m.fromPct).toBe(false);
    expect(m.beginner + m.intermediate + m.advanced + m.expert).toBe(100);
  });
  it("returns null with nothing", () => {
    expect(getDifficultyMix(base)).toBeNull();
  });
});
