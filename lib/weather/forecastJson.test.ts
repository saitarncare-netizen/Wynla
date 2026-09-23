import { describe, expect, it } from "vitest";
import { forecastDaysFrom, isForecastJsonV2, type ForecastDay } from "./forecastJson";

const day: ForecastDay = {
  date: "2026-12-10",
  weekday: "Thu",
  temp_high_f: 25,
  temp_low_f: 10,
  conditions_short: "Snow likely",
  snow_in: 4.2,
  precip_chance: 80,
  wind_short: "18 mph",
  wind_dir_short: "NW",
};

describe("forecastDaysFrom", () => {
  it("reads the legacy v1 array and the v2 object alike", () => {
    expect(forecastDaysFrom([day])).toEqual([day]);
    expect(forecastDaysFrom({ v: 2, days: [day], hourly: [] })).toEqual([day]);
    expect(forecastDaysFrom(null)).toEqual([]);
    expect(forecastDaysFrom({ v: 1 })).toEqual([]);
    expect(forecastDaysFrom("nonsense")).toEqual([]);
  });

  it("detects v2 strictly", () => {
    expect(isForecastJsonV2({ v: 2, days: [] })).toBe(true);
    expect(isForecastJsonV2({ v: 2 })).toBe(false);
    expect(isForecastJsonV2([day])).toBe(false);
  });
});
