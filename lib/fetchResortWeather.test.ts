import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ForecastDay } from "./weather/forecastJson";

// The network half is a thin maybeSingle() read; the supabase proxy is
// mocked so the test pins the query (table, columns, filter) and the
// null-on-failure contract without a database.
const db = vi.hoisted(() => ({
  from: vi.fn(),
  query: { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() },
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: (t: string) => db.from(t) } }));

import { extrasFromRow, fetchResortWeather, forecastTimeZone, snowNextDays, todayWind } from "./fetchResortWeather";

const { from, query } = db;

function day(date: string, snow_in: number | null, wind: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date,
    weekday: "Mon",
    temp_high_f: 25,
    temp_low_f: 10,
    conditions_short: "Snow",
    snow_in,
    precip_chance: 60,
    wind_short: null,
    wind_dir_short: null,
    ...wind,
  };
}

// 2026-12-10 03:00 UTC is still Dec 9 in Denver (UTC-7).
const NOW = new Date("2026-12-10T03:00:00Z");
const STRIP = [
  day("2026-12-08", 9, { wind_short: "40 mph", gust_mph: 60 }),
  day("2026-12-09", 2, { wind_short: "14 mph", gust_mph: 31 }),
  day("2026-12-10", 4.25, { wind_short: "9 mph", gust_mph: 17 }),
  day("2026-12-11", 0),
  day("2026-12-12", 6),
];

describe("snowNextDays", () => {
  it("sums today and the next two days in the forecast's zone, skipping past days", () => {
    expect(snowNextDays(STRIP, NOW, "America/Denver")).toBe(6.3); // Dec 9-11: 2 + 4.25 + 0
    expect(snowNextDays(STRIP, NOW, "UTC")).toBe(10.3); // Dec 10-12
  });

  it("does not depend on the strip's order", () => {
    expect(snowNextDays([...STRIP].reverse(), NOW, "America/Denver")).toBe(6.3);
  });

  it("returns 0 for a dry window rather than null", () => {
    expect(snowNextDays([day("2026-12-10", 0), day("2026-12-11", 0), day("2026-12-12", 0)], NOW, "UTC")).toBe(0);
  });

  it("returns null instead of a partial sum when the strip ends early or a day is unknown", () => {
    expect(snowNextDays(STRIP, new Date("2026-12-11T15:00:00Z"), "UTC")).toBeNull(); // only Dec 11-12 left
    expect(snowNextDays([day("2026-12-10", 1), day("2026-12-11", null), day("2026-12-12", 3)], NOW, "UTC")).toBeNull();
    expect(snowNextDays([], NOW, "UTC")).toBeNull();
  });

  it("falls back to UTC for an unknown or missing zone", () => {
    expect(snowNextDays(STRIP, NOW, "Not/AZone")).toBe(10.3);
    expect(snowNextDays(STRIP, NOW, null)).toBe(10.3);
  });
});

describe("todayWind", () => {
  it("reads today's day in the forecast's zone, not the first day or the sync-time reading", () => {
    expect(todayWind(STRIP, NOW, "America/Denver")).toEqual({ windMph: 14, gustMph: 31 }); // Dec 9
    expect(todayWind(STRIP, NOW, "UTC")).toEqual({ windMph: 9, gustMph: 17 }); // Dec 10
  });

  it("falls back to a gust phrase in legacy text and reads a range as its midpoint", () => {
    const legacy = [day("2026-12-10", 1, { wind_short: "10 to 15 mph, with gusts as high as 35 mph" })];
    expect(todayWind(legacy, NOW, "UTC")).toEqual({ windMph: 12.5, gustMph: 35 });
  });

  it("has no wind when the strip has no day for today or the day has no figure", () => {
    expect(todayWind(STRIP, new Date("2026-12-20T15:00:00Z"), "UTC")).toEqual({ windMph: null, gustMph: null });
    expect(todayWind(STRIP, new Date("2026-12-11T15:00:00Z"), "UTC")).toEqual({ windMph: null, gustMph: null });
    expect(todayWind([], NOW, "UTC")).toEqual({ windMph: null, gustMph: null });
  });
});

describe("forecastTimeZone", () => {
  it("prefers the NWS zone, then Open-Meteo, and has none for v1 arrays", () => {
    const v2 = (nws: string | null, om: string | null) => ({
      v: 2,
      days: [],
      sources: {
        nws: nws ? { time_zone: nws } : null,
        open_meteo: om ? { time_zone: om } : null,
        attribution: [],
      },
    });
    expect(forecastTimeZone(v2("America/Denver", "America/Boise"))).toBe("America/Denver");
    expect(forecastTimeZone(v2(null, "America/Boise"))).toBe("America/Boise");
    expect(forecastTimeZone(v2(null, null))).toBeNull();
    expect(forecastTimeZone(STRIP)).toBeNull();
    expect(forecastTimeZone(null)).toBeNull();
  });
});

describe("extrasFromRow", () => {
  it("reads the v2 strip in its own zone, takes today's forecast wind and coerces numeric strings", () => {
    const extras = extrasFromRow(
      {
        forecast_json: { v: 2, days: STRIP, sources: { nws: { time_zone: "America/Denver" }, open_meteo: null } },
        temp_low_f: "12",
        fetched_at: "2026-12-09T12:00:00Z",
      },
      NOW,
      "UTC",
    );
    expect(extras).toEqual({
      snowNext3In: 6.3,
      lowF: 12,
      todayWindMph: 14,
      todayGustMph: 31,
      fetchedAt: "2026-12-09T12:00:00Z",
    });
  });

  it("uses the caller's zone for a legacy v1 array and tolerates empty columns", () => {
    const extras = extrasFromRow({ forecast_json: STRIP, temp_low_f: "", fetched_at: null }, NOW, "America/Denver");
    expect(extras).toEqual({ snowNext3In: 6.3, lowF: null, todayWindMph: 14, todayGustMph: 31, fetchedAt: null });
  });

  it("has no 3-day figure and no wind when the row has no forecast", () => {
    const extras = extrasFromRow({ forecast_json: null, temp_low_f: 5, fetched_at: null }, NOW);
    expect(extras).toEqual({ snowNext3In: null, lowF: 5, todayWindMph: null, todayGustMph: null, fetchedAt: null });
  });
});

describe("fetchResortWeather", () => {
  beforeEach(() => {
    from.mockReset().mockReturnValue(query);
    query.select.mockReset().mockReturnValue(query);
    query.eq.mockReset().mockReturnValue(query);
    query.maybeSingle.mockReset();
  });

  it("reads one weather_cache row by resort id", async () => {
    query.maybeSingle.mockResolvedValue({
      data: { forecast_json: STRIP, temp_low_f: 8, fetched_at: "2026-12-09T12:00:00Z" },
      error: null,
    });
    const extras = await fetchResortWeather(42, { timeZone: "America/Denver", now: NOW });
    expect(from).toHaveBeenCalledWith("weather_cache");
    // No wind_mph_avg / wind_mph_gust: those are the sync-time reading,
    // and the sheet's wind is today's forecast from the strip.
    expect(query.select).toHaveBeenCalledWith("forecast_json, temp_low_f, fetched_at");
    expect(query.eq).toHaveBeenCalledWith("resort_id", 42);
    expect(extras).toMatchObject({ snowNext3In: 6.3, lowF: 8, todayWindMph: 14, todayGustMph: 31 });
  });

  it("returns null on a read error or a missing row", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchResortWeather(1)).toBeNull();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchResortWeather(1)).toBeNull();
  });
});
