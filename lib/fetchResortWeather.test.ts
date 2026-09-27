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

import { extrasFromRow, fetchResortWeather, forecastTimeZone, snowNextDays } from "./fetchResortWeather";

const { from, query } = db;

function day(date: string, snow_in: number | null): ForecastDay {
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
  };
}

// 2026-12-10 03:00 UTC is still Dec 9 in Denver (UTC-7).
const NOW = new Date("2026-12-10T03:00:00Z");
const STRIP = [
  day("2026-12-08", 9),
  day("2026-12-09", 2),
  day("2026-12-10", 4.25),
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
  it("reads the v2 strip in its own zone and coerces numeric strings", () => {
    const extras = extrasFromRow(
      {
        forecast_json: { v: 2, days: STRIP, sources: { nws: { time_zone: "America/Denver" }, open_meteo: null } },
        temp_low_f: "12",
        wind_mph_avg: 14,
        wind_mph_gust: "31",
        fetched_at: "2026-12-09T12:00:00Z",
      },
      NOW,
      "UTC",
    );
    expect(extras).toEqual({ snowNext3In: 6.3, lowF: 12, windMph: 14, gustMph: 31, fetchedAt: "2026-12-09T12:00:00Z" });
  });

  it("uses the caller's zone for a legacy v1 array and tolerates empty columns", () => {
    const extras = extrasFromRow(
      { forecast_json: STRIP, temp_low_f: null, wind_mph_avg: "", wind_mph_gust: null, fetched_at: null },
      NOW,
      "America/Denver",
    );
    expect(extras).toEqual({ snowNext3In: 6.3, lowF: null, windMph: null, gustMph: null, fetchedAt: null });
  });

  it("has no 3-day figure when the row has no forecast", () => {
    const extras = extrasFromRow(
      { forecast_json: null, temp_low_f: 5, wind_mph_avg: null, wind_mph_gust: null, fetched_at: null },
      NOW,
    );
    expect(extras.snowNext3In).toBeNull();
    expect(extras.lowF).toBe(5);
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
      data: { forecast_json: STRIP, temp_low_f: 8, wind_mph_avg: 10, wind_mph_gust: 20, fetched_at: "2026-12-09T12:00:00Z" },
      error: null,
    });
    const extras = await fetchResortWeather(42, { timeZone: "America/Denver", now: NOW });
    expect(from).toHaveBeenCalledWith("weather_cache");
    expect(query.select).toHaveBeenCalledWith("forecast_json, temp_low_f, wind_mph_avg, wind_mph_gust, fetched_at");
    expect(query.eq).toHaveBeenCalledWith("resort_id", 42);
    expect(extras).toMatchObject({ snowNext3In: 6.3, lowF: 8, windMph: 10, gustMph: 20 });
  });

  it("returns null on a read error or a missing row", async () => {
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    expect(await fetchResortWeather(1)).toBeNull();
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchResortWeather(1)).toBeNull();
  });
});
