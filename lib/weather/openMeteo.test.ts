import { afterEach, describe, expect, it } from "vitest";
import fixture from "./__fixtures__/open-meteo-alta-summit.json";
import {
  buildForecastUrl,
  freezingLevelNow,
  parseCurrent,
  parseDaily,
  parseHourly,
  wmoToShort,
  type OpenMeteoResponse,
} from "./openMeteo";

const om = fixture as OpenMeteoResponse;

describe("Open-Meteo parsing", () => {
  it("returns daily rows including the past day", () => {
    const days = parseDaily(om);
    expect(days.length).toBe(4); // past_days=1 + forecast_days=3
    expect(days[0].date).toBe("2026-09-21");
    expect(days[1].temp_high_f).toBeGreaterThan(days[1].temp_low_f!);
    expect(days[1].snow_in).not.toBeNull();
    expect(days[1].uv_index_max).not.toBeNull();
  });

  it("converts local wall-clock hours to UTC using the offset", () => {
    const hours = parseHourly(om);
    expect(om.utc_offset_seconds).toBe(-21600);
    expect(hours[0].time).toBe("2026-09-21T06:00:00Z"); // 00:00 Mountain Daylight Time
    expect(hours[0].local_date).toBe("2026-09-21");
    expect(hours[0].freezing_level_ft).toBeGreaterThan(5000);
  });

  it("parses current conditions and the freezing level near now", () => {
    const cur = parseCurrent(om);
    expect(cur.wind_mph).not.toBeNull();
    const fl = freezingLevelNow(parseHourly(om), new Date("2026-09-21T12:00:00Z"));
    expect(fl).toBeGreaterThan(5000);
  });

  it("labels WMO codes", () => {
    expect(wmoToShort(0)).toBe("Clear");
    expect(wmoToShort(73)).toBe("Snow");
    expect(wmoToShort(86)).toBe("Snow showers");
    expect(wmoToShort(66)).toBe("Freezing rain");
    expect(wmoToShort(null)).toBeNull();
  });
});

describe("buildForecastUrl", () => {
  const original = process.env.OPEN_METEO_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.OPEN_METEO_API_KEY;
    else process.env.OPEN_METEO_API_KEY = original;
  });

  it("uses the free host without a key and the commercial host with one", () => {
    delete process.env.OPEN_METEO_API_KEY;
    const free = buildForecastUrl({ lat: 40.5884, lon: -111.6386, elevationM: 3216 });
    expect(free.startsWith("https://api.open-meteo.com/v1/forecast?")).toBe(true);
    expect(free).toContain("elevation=3216");
    expect(free).toContain("past_days=1");
    expect(free).toContain("forecast_days=16");
    expect(free).not.toContain("apikey");

    process.env.OPEN_METEO_API_KEY = "test-key";
    const paid = buildForecastUrl({ lat: 40.5884, lon: -111.6386 });
    expect(paid.startsWith("https://customer-api.open-meteo.com/v1/forecast?")).toBe(true);
    expect(paid).toContain("apikey=test-key");
    expect(paid).not.toContain("elevation=");
  });
});
