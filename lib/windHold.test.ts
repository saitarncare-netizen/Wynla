import { describe, expect, it } from "vitest";
import {
  evaluateWindHold,
  liftMixFromTypes,
  parseWindFromText,
  parseWindMphFromText,
} from "./windHold";

const defaults = { wind_hold_mph_chair: null, wind_hold_mph_gondola: null };

describe("evaluateWindHold — gusts first", () => {
  it("judges on the gust when both are known", () => {
    const e = evaluateWindHold({ sustained: 22, gust: 48 }, defaults);
    expect(e.basis).toBe("gust");
    expect(e.level).toBe("warning");
    expect(e.detail).toBe("gusts to 48 mph");
  });

  it("falls back to sustained wind without gusts", () => {
    const e = evaluateWindHold({ sustained: 36 }, defaults);
    expect(e.basis).toBe("sustained");
    expect(e.level).toBe("warning");
    expect(e.detail).toBe("sustained 36 mph");
  });

  it("accepts a bare number as sustained", () => {
    expect(evaluateWindHold(55, defaults).level).toBe("high-risk");
    expect(evaluateWindHold(10, defaults).level).toBe("ok");
    expect(evaluateWindHold(null, defaults).basis).toBe("none");
  });
});

describe("evaluateWindHold — lift mix", () => {
  const oneGondolaManyChairs = { ...defaults, liftMix: { chairs: 12, gondolas: 1, trams: 0 }, hasGondolaOrTram: true };
  const gondolaOnly = { ...defaults, liftMix: { chairs: 0, gondolas: 2, trams: 1 }, hasGondolaOrTram: true };

  it("a single gondola does not weaken the high-risk warning", () => {
    expect(evaluateWindHold({ sustained: 30, gust: 52 }, oneGondolaManyChairs).level).toBe("high-risk");
    expect(evaluateWindHold({ sustained: 30, gust: 52 }, oneGondolaManyChairs).threshold).toBe(50);
  });

  it("a gondola-only mountain uses the gondola bounds", () => {
    const e = evaluateWindHold({ sustained: 30, gust: 52 }, gondolaOnly);
    expect(e.level).toBe("warning");
    expect(e.threshold).toBe(50);
    expect(evaluateWindHold({ sustained: 30, gust: 66 }, gondolaOnly).level).toBe("high-risk");
  });

  it("the legacy flag alone no longer raises the bar", () => {
    expect(evaluateWindHold(52, { ...defaults, hasGondolaOrTram: true }).level).toBe("high-risk");
  });

  it("uses resort thresholds when researched", () => {
    const e = evaluateWindHold({ sustained: 20, gust: 42 }, { wind_hold_mph_chair: 40, wind_hold_mph_gondola: null });
    expect(e.source).toBe("resort");
    expect(e.level).toBe("warning");
    expect(e.threshold).toBe(40);
  });

  it("sums the Phase 2 lift_types JSON", () => {
    expect(liftMixFromTypes({ high_speed_quad: 2, fixed_triple: 3, gondola: 1, tram: 0, surface: 4 })).toEqual({ chairs: 5, gondolas: 1, trams: 0 });
    expect(liftMixFromTypes(null)).toBeNull();
  });
});

describe("parseWindFromText", () => {
  it("reads NWS gust phrasing", () => {
    expect(parseWindFromText("25 to 35 mph, with gusts as high as 55 mph")).toEqual({ sustained: 30, gust: 55 });
    expect(parseWindFromText("15 mph, gusts up to 30 mph")).toEqual({ sustained: 15, gust: 30 });
  });
  it("reads plain ranges and Open-Meteo strings", () => {
    expect(parseWindFromText("12 to 15 mph SW")).toEqual({ sustained: 13.5, gust: null });
    expect(parseWindFromText("20 mph")).toEqual({ sustained: 20, gust: null });
    expect(parseWindFromText(null)).toEqual({ sustained: null, gust: null });
    expect(parseWindMphFromText("5 to 10 mph")).toBe(7.5);
  });
});
