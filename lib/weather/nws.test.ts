import { describe, expect, it } from "vitest";
import grid from "./__fixtures__/nws-gridpoint-btv-102-61.json";
import obs from "./__fixtures__/nws-observations-mmnv1.json";
import {
  describeConditions,
  gridElevationFt,
  mergeObservations,
  parseGridDays,
  summarizeDay,
  type NwsGridResponse,
  type RawObservation,
} from "./nws";

// The fixture was recorded 2026-09-23 03:xx UTC for Stowe VT (BTV/102,61).
const NOW = new Date("2026-09-23T03:30:00Z");
const TZ = "America/New_York";

describe("parseGridDays", () => {
  const days = parseGridDays(grid as NwsGridResponse, TZ, NOW);

  it("produces consecutive local days starting today", () => {
    expect(days.length).toBeGreaterThanOrEqual(3);
    expect(days[0].date).toBe("2026-09-22"); // 03:30Z is still the 22nd in Vermont
    for (let i = 1; i < days.length; i++) {
      expect(days[i].date > days[i - 1].date).toBe(true);
    }
  });

  it("converts the quantitative layers to US units", () => {
    const d = days[0];
    // maxTemperature 13.33 °C → 56 °F, minTemperature 4.44 °C → 40 °F.
    expect(d.temp_high_f).toBe(56);
    expect(d.temp_low_f).toBeLessThanOrEqual(40);
    expect(d.snow_in).toBe(0);
    expect(d.ice_in).toBe(0);
    expect(d.qpf_in).not.toBeNull();
    expect(d.gust_mph_max).toBeGreaterThan(0);
    expect(d.precip_chance).toBe(0);
    expect(typeof d.conditions_short).toBe("string");
    expect(d.coverage).toBeGreaterThan(0.5);
  });

  it("spreads a 6-hour accumulation bin evenly across hours and days", () => {
    const g: NwsGridResponse = {
      properties: {
        snowfallAmount: {
          uom: "wmoUnit:mm",
          // 25.4 mm across 03Z-09Z UTC = 23:00-05:00 Eastern → 1 h on the 22nd, 5 h on the 23rd.
          values: [{ validTime: "2026-09-23T03:00:00+00:00/PT6H", value: 25.4 }],
        },
        maxTemperature: { uom: "wmoUnit:degC", values: [{ validTime: "2026-09-23T12:00:00+00:00/PT13H", value: -5 }] },
      },
    };
    const out = parseGridDays(g, TZ, new Date("2026-09-22T20:00:00Z"));
    const d22 = out.find((d) => d.date === "2026-09-22")!;
    const d23 = out.find((d) => d.date === "2026-09-23")!;
    expect(d22.snow_in).toBeCloseTo(1 / 6, 1);
    expect(d23.snow_in).toBeCloseTo(5 / 6, 1);
    expect(d23.temp_high_f).toBe(23);
  });

  it("reads the grid cell elevation in feet", () => {
    expect(gridElevationFt(grid as NwsGridResponse)).toBe(2093);
  });
});

describe("describeConditions", () => {
  it("prefers the most significant weather and writes sentence case", () => {
    expect(
      describeConditions(
        [
          { coverage: "chance", weather: "rain_showers", intensity: null },
          { coverage: "slight_chance", weather: "snow", intensity: "light" },
        ],
        90,
      ),
    ).toBe("Slight chance of snow");
    expect(describeConditions([{ coverage: "likely", weather: "snow", intensity: "heavy" }], 100)).toBe(
      "Heavy snow likely",
    );
    expect(describeConditions([{ coverage: "definite", weather: "freezing_rain", intensity: null }], 100)).toBe(
      "Freezing rain",
    );
  });

  it("falls back to sky cover", () => {
    expect(describeConditions([], 10)).toBe("Sunny");
    expect(describeConditions([], 60)).toBe("Partly cloudy");
    expect(describeConditions([], 95)).toBe("Cloudy");
    expect(describeConditions([], null)).toBeNull();
  });
});

describe("observations", () => {
  const raw = (obs as { features: Array<{ properties: RawObservation }> }).features.map((f) => f.properties);

  it("merges the newest non-null field values", () => {
    const m = mergeObservations(raw);
    expect(m).not.toBeNull();
    expect(m!.observed_at).toBe(raw[0].timestamp);
    // Mount Mansfield reports wind but its temperature sensor is null in this window.
    expect(m!.wind_mph).toBeGreaterThan(0);
    expect(m!.gust_mph).toBeGreaterThanOrEqual(m!.wind_mph!);
  });

  it("does not let a stale reading masquerade as current", () => {
    const stale: RawObservation[] = [
      { timestamp: "2026-09-23T04:00:00+00:00", temperature: { value: null } },
      { timestamp: "2026-09-22T04:00:00+00:00", temperature: { value: 10 } },
    ];
    expect(mergeObservations(stale)!.temp_f).toBeNull();
    expect(mergeObservations([])).toBeNull();
  });

  it("summarizes a local day", () => {
    const day: RawObservation[] = [
      { timestamp: "2026-09-22T10:00:00+00:00", temperature: { value: -4 }, windSpeed: { value: 10 } },
      { timestamp: "2026-09-22T20:00:00+00:00", temperature: { value: 6 }, windSpeed: { value: 30 } },
      { timestamp: "2026-09-23T06:00:00+00:00", temperature: { value: 20 } }, // 02:00 on the 23rd local → excluded
    ];
    const s = summarizeDay(day, "2026-09-22", TZ)!;
    expect(s.sample_count).toBe(2);
    expect(s.temp_high_f).toBe(43);
    expect(s.temp_low_f).toBe(25);
    expect(s.wind_mph_avg).toBe(12);
    expect(summarizeDay(day, "2026-09-20", TZ)).toBeNull();
  });
});
