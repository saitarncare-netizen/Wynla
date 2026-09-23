import { describe, expect, it } from "vitest";
import {
  buildSurfaceReport,
  classifyForecast,
  classifyToday,
  deriveFeatures,
  forecastDayToDailyWeather,
  hasSnowpackEvidence,
  wordingLooksRainy,
  type DailyWeather,
  type ForecastDay,
} from "./snowSurface";

/** Build N consecutive daily rows ending on `endDate`. */
function days(
  n: number,
  fill: (i: number) => Partial<DailyWeather>,
  endDate = "2027-01-20",
): DailyWeather[] {
  const end = new Date(endDate + "T00:00:00Z").getTime();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return {
      observed_date: d,
      temp_high_f: 30,
      temp_low_f: 18,
      snow_24h_in: 0,
      rain_24h_in: 0,
      precip_24h_in: 0,
      wind_mph_avg: 5,
      ...fill(i),
    };
  });
}

const midSeasonNow = new Date("2027-01-20T18:00:00Z");

describe("bug 1 — rain on an old snowpack with no snow this week", () => {
  // Audit probe: 7 days hi 36 / lo 33, 0.6" rain on day 6, no new snow.
  const hist = days(7, (i) => ({ temp_high_f: 36, temp_low_f: 33, rain_24h_in: i === 5 ? 0.6 : 0, precip_24h_in: i === 5 ? 0.6 : 0 }));

  it("classifies Icy when the resort reports a base", () => {
    const r = classifyToday(hist, { baseDepthIn: 40 })!;
    expect(r.code).toBe("IP");
    expect(r.reasons[0]).toContain('0.6" rain');
    expect(r.reasons[0]).toContain('40" base');
  });

  it("classifies Icy on the in-season flag alone", () => {
    expect(classifyToday(hist, { inSeason: true })!.code).toBe("IP");
    expect(classifyToday(hist, { hasSnowpack: true })!.code).toBe("IP");
  });

  it("never prints 'no rain' when it rained", () => {
    // No snowpack evidence at all (bare ground): falls through to MG,
    // but the reason must reflect the actual rain reading.
    const r = classifyToday(hist)!;
    expect(r.code).toBe("MG");
    expect(r.reasons.join(" ")).not.toContain("no rain");
    expect(r.reasons.join(" ")).toContain('0.6" rain');
  });

  it("hasSnowpackEvidence weighs every source", () => {
    const f = deriveFeatures(hist)!;
    expect(hasSnowpackEvidence(f, {})).toBe(false);
    expect(hasSnowpackEvidence(f, { baseDepthIn: 0 })).toBe(false);
    expect(hasSnowpackEvidence(f, { baseDepthIn: 12 })).toBe(true);
    expect(hasSnowpackEvidence(f, { inSeason: true })).toBe(true);
    expect(hasSnowpackEvidence(deriveFeatures(days(7, () => ({ snow_24h_in: 1 })))!, {})).toBe(true);
  });
});

describe("bug 2 — snow showers and flurries are snow, not rain", () => {
  it("wordingLooksRainy", () => {
    expect(wordingLooksRainy("Snow Showers Likely", 28)).toBe(false);
    expect(wordingLooksRainy("Chance Snow Showers", 30)).toBe(false);
    expect(wordingLooksRainy("Flurries", 20)).toBe(false);
    expect(wordingLooksRainy("Snow showers", 25)).toBe(false);
    expect(wordingLooksRainy("Rain Showers", 40)).toBe(true);
    expect(wordingLooksRainy("Chance Showers And Thunderstorms", 55)).toBe(true);
    expect(wordingLooksRainy("Drizzle", 36)).toBe(true);
    // Mixed wording is rain only when the day is warm enough for it.
    expect(wordingLooksRainy("Rain And Snow", 30)).toBe(false);
    expect(wordingLooksRainy("Rain And Snow", 36)).toBe(true);
    expect(wordingLooksRainy("Wintry Mix", 33)).toBe(false);
    expect(wordingLooksRainy(null, 30)).toBe(false);
  });

  it("does not turn a 5-inch snow-showers day into Icy", () => {
    const hist = days(7, (i) => ({ snow_24h_in: i >= 5 ? 2 : 0 }));
    const fd: ForecastDay = {
      date: "2027-01-21",
      temp_high_f: 26,
      temp_low_f: 12,
      snow_in: 5,
      precip_chance: 80,
      conditions_short: "Snow Showers Likely",
      wind_short: "10 mph",
    };
    expect(forecastDayToDailyWeather(fd).rain_24h_in).toBe(0);
    const out = classifyForecast(hist, [fd, { ...fd, date: "2027-01-22", snow_in: 1 }, { ...fd, date: "2027-01-23", snow_in: 0 }], { inSeason: true });
    expect(out[0]!.code).toBe("PP");
    expect(out.map((r) => r?.code)).not.toContain("IP");
  });

  it("prefers the pipeline's rain_in over the wording guess", () => {
    const fd: ForecastDay = {
      date: "2027-01-21",
      temp_high_f: 40,
      temp_low_f: 30,
      snow_in: 0,
      precip_chance: 90,
      conditions_short: "Rain",
      rain_in: 0.02,
    };
    expect(forecastDayToDailyWeather(fd).rain_24h_in).toBe(0.02);
  });
});

describe("bug 3 — spring corn is reachable", () => {
  // Audit probe: 10 dry April days, hi 45 / lo 25.
  const hist = days(10, () => ({ temp_high_f: 45, temp_low_f: 25 }), "2027-04-10");

  it("classifies WG with a corn timing line when there is a base", () => {
    const r = classifyToday(hist, { baseDepthIn: 60 })!;
    expect(r.code).toBe("WG");
    expect(r.confidence).toBe("high");
    expect(r.when).toContain("corn");
    expect(r.reasons.join(" ")).toContain("freeze-thaw");
  });

  it("classifies WG on the in-season flag when the base is unknown", () => {
    expect(classifyToday(hist, { inSeason: true })!.code).toBe("WG");
  });

  it("keeps Icy for cold cycles that never soften", () => {
    const cold = days(7, () => ({ temp_high_f: 34, temp_low_f: 22 }));
    const r = classifyToday(cold, { inSeason: true })!;
    expect(r.code).toBe("IP");
    expect(r.confidence).toBe("high");
  });

  it("single cold cycle is Frozen granular", () => {
    const one = days(7, (i) => ({ temp_high_f: i === 6 ? 34 : 28, temp_low_f: 20 }));
    expect(classifyToday(one, { inSeason: true })!.code).toBe("FG");
  });
});

describe("existing classes still hold", () => {
  it("fresh cold snow is Powder", () => {
    const r = classifyToday(days(7, (i) => ({ snow_24h_in: i === 6 ? 8 : 0, temp_high_f: 20, temp_low_f: 5 })))!;
    expect(r.code).toBe("PP");
    expect(r.confidence).toBe("high");
  });
  it("recent snow, cold, no cycles is Packed powder", () => {
    const r = classifyToday(days(7, (i) => ({ snow_24h_in: i >= 4 ? 1.5 : 0, temp_high_f: 25, temp_low_f: 10 })))!;
    expect(r.code).toBe("PPC");
  });
  it("warm new snow is Wet snow", () => {
    const r = classifyToday(days(7, (i) => ({ snow_24h_in: i === 6 ? 3 : 0, temp_high_f: 40, temp_low_f: 31 })))!;
    expect(r.code).toBe("WS");
  });
  it("cold dry old snow is Loose granular", () => {
    const r = classifyToday(days(7, (i) => ({ snow_24h_in: i === 0 ? 4 : 0, temp_high_f: 18, temp_low_f: 2 })))!;
    expect(r.code).toBe("LSG");
  });
  it("nothing at all is Variable", () => {
    const r = classifyToday(days(7, () => ({ temp_high_f: 45, temp_low_f: 40 })))!;
    expect(r.code).toBe("VC");
    expect(r.confidence).toBe("low");
  });
});

describe("dormant reports", () => {
  const hist = days(7, () => ({ temp_high_f: 65, temp_low_f: 44 }), "2026-09-22");

  it("goes dormant when the resort is closed", () => {
    const r = buildSurfaceReport(hist, [], { isOpen: false, now: new Date("2026-09-23T12:00:00Z") });
    expect(r.dormant).toBe(true);
    if (r.dormant) expect(r.reason).toBe("closed");
  });

  it("goes dormant off-season even with open state unknown", () => {
    const r = buildSurfaceReport(hist, [], { isOpen: null, offSeason: true, now: new Date("2026-09-23T12:00:00Z") });
    expect(r.dormant).toBe(true);
    if (r.dormant) {
      expect(r.reason).toBe("off-season");
      expect(r.headline).toBe("Off-season");
    }
  });

  it("goes dormant when inputs are older than 48 h", () => {
    const r = buildSurfaceReport(days(7, () => ({})), [], { isOpen: true, lastObservedAt: "2027-01-17T12:00:00Z", now: midSeasonNow });
    expect(r.dormant).toBe(true);
    if (r.dormant) expect(r.reason).toBe("stale");
  });

  it("goes dormant with no history", () => {
    const r = buildSurfaceReport([], [], { isOpen: true, now: midSeasonNow });
    expect(r.dormant).toBe(true);
    if (r.dormant) expect(r.reason).toBe("no-data");
  });

  it("classifies with an unknown open state in season", () => {
    const r = buildSurfaceReport(days(7, () => ({})), [], { isOpen: null, offSeason: false, inSeason: true, now: midSeasonNow });
    expect(r.dormant).toBe(false);
  });

  it("stays active on fresh inputs and exposes the evidence", () => {
    const r = buildSurfaceReport(
      days(7, (i) => ({ snow_24h_in: i === 6 ? 6 : 0, temp_high_f: 22, temp_low_f: 8 })),
      [],
      { isOpen: true, baseDepthIn: 48, lastObservedAt: "2027-01-20T12:00:00Z", now: midSeasonNow },
    );
    expect(r.dormant).toBe(false);
    if (!r.dormant) {
      expect(r.today.code).toBe("PP");
      expect(r.basedOn[0]).toBe("7 days of weather through 2027-01-20");
      expect(r.basedOn).toContain('6" new snow in 7 days');
      expect(r.basedOn).toContain('48" base (resort report)');
      expect(r.features.window_days).toBe(7);
    }
  });
});
