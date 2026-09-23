import { describe, expect, it } from "vitest";
import { cToF, compass, haversineKm, kmhToMph, meanOrNull, mmToIn, mToFt, round, roundOrNull } from "./units";

describe("unit conversions", () => {
  it("converts NWS metric layers to US units", () => {
    expect(round(mmToIn(25.4), 2)).toBe(1);
    expect(round(mmToIn(76.2), 1)).toBe(3);
    expect(cToF(0)).toBe(32);
    expect(round(cToF(-6.666666), 0)).toBe(20);
    expect(round(kmhToMph(9.26), 1)).toBe(5.8);
    expect(round(mToFt(637.9464), 0)).toBe(2093);
  });

  it("keeps unknown distinct from zero", () => {
    expect(roundOrNull(null)).toBeNull();
    expect(roundOrNull(undefined)).toBeNull();
    expect(roundOrNull(0)).toBe(0);
    expect(roundOrNull(Number.NaN)).toBeNull();
    expect(meanOrNull([null, undefined])).toBeNull();
    expect(meanOrNull([2, null, 4])).toBe(3);
  });

  it("maps degrees to an 8-point compass", () => {
    expect(compass(0)).toBe("N");
    expect(compass(22)).toBe("N");
    expect(compass(23)).toBe("NE");
    expect(compass(180)).toBe("S");
    expect(compass(292)).toBe("W"); // 292.5° is the W/NW boundary
    expect(compass(300)).toBe("NW");
    expect(compass(359)).toBe("N");
    expect(compass(null)).toBeNull();
  });

  it("measures great-circle distance", () => {
    // Stowe village to Mt Mansfield summit station (~2.8 km).
    const d = haversineKm(44.5303, -72.7814, 44.5248, -72.8154);
    expect(d).toBeGreaterThan(2.5);
    expect(d).toBeLessThan(3.2);
  });
});
