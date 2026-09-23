import { describe, expect, it } from "vitest";
import type { StationObservation } from "./forecastJson";
import {
  buildHistoryRow,
  describeToday,
  mergeDays,
  mergeHourly,
  pickCurrentWind,
  sumRecentSnow,
  type MergeInput,
  type OpenMeteoParsed,
} from "./merge";
import type { NwsDay } from "./nws";
import type { OpenMeteoDay, OpenMeteoHour } from "./openMeteo";

const NOW = new Date("2026-12-10T14:00:00Z"); // 07:00 Mountain
const TODAY = "2026-12-10";

function nwsDay(date: string, over: Partial<NwsDay> = {}): NwsDay {
  return {
    date,
    temp_high_f: 25,
    temp_low_f: 10,
    snow_in: 4.2,
    ice_in: 0,
    qpf_in: 0.4,
    wind_mph_max: 18,
    gust_mph_max: 34,
    wind_dir_deg: 300,
    precip_chance: 80,
    sky_cover_max: 95,
    conditions_short: "Snow likely",
    coverage: 1,
    ...over,
  };
}

function omDay(date: string, over: Partial<OpenMeteoDay> = {}): OpenMeteoDay {
  return {
    date,
    temp_high_f: 22,
    temp_low_f: 8,
    conditions_short: "Snow",
    snow_in: 3.1,
    rain_in: 0,
    precip_in: 0.3,
    precip_chance: 70,
    wind_mph_max: 15,
    gust_mph_max: 28,
    wind_dir_deg: 290,
    uv_index_max: 2.5,
    ...over,
  };
}

function omHour(time: string, localDate: string, over: Partial<OpenMeteoHour> = {}): OpenMeteoHour {
  return {
    time,
    local_date: localDate,
    temp_f: 20,
    snow_in: 0.2,
    rain_in: 0,
    precip_in: 0.02,
    wind_mph: 12,
    gust_mph: 20,
    wind_dir: "W",
    freezing_level_ft: 6000,
    conditions_short: "Snow",
    ...over,
  };
}

function om(days: OpenMeteoDay[], hours: OpenMeteoHour[] = []): OpenMeteoParsed {
  return {
    days,
    hours,
    current: { time: "2026-12-10T07:00", temp_f: 18, wind_mph: 9, gust_mph: 15, wind_dir_deg: 270 },
    timeZone: "America/Denver",
    utcOffsetSeconds: -25200,
    elevationFt: 8500,
  };
}

function input(over: Partial<MergeInput> = {}): MergeInput {
  return { now: NOW, timeZone: "America/Denver", today: TODAY, nwsDays: [], omBase: null, omSummit: null, ...over };
}

describe("mergeDays", () => {
  it("records the NWS coverage on NWS-headlined days", () => {
    const out = mergeDays(input({ nwsDays: [nwsDay(TODAY, { coverage: 0.75 })] }));
    expect(out[0].source).toBe("nws");
    expect(out[0].nws_coverage).toBe(0.75);
  });

  it("uses NWS as the headline for days it covers and Open-Meteo for the tail", () => {
    const nws = [nwsDay("2026-12-10"), nwsDay("2026-12-11"), nwsDay("2026-12-12", { coverage: 0.25 })];
    const base = om([
      omDay("2026-12-09"),
      omDay("2026-12-10"),
      omDay("2026-12-11"),
      omDay("2026-12-12"),
      omDay("2026-12-13"),
    ]);
    const summit = om([omDay("2026-12-10", { snow_in: 6.4 })]);
    const days = mergeDays(input({ nwsDays: nws, omBase: base, omSummit: summit }));
    expect(days.map((d) => d.date)).toEqual(["2026-12-10", "2026-12-11", "2026-12-12", "2026-12-13"]);
    expect(days[0].source).toBe("nws");
    expect(days[0].snow_in).toBe(4.2);
    expect(days[0].snow_summit_in).toBe(6.4);
    expect(days[0].uv_index_max).toBe(2.5); // NWS has no UV; filled from Open-Meteo
    expect(days[0].gust_mph).toBe(34);
    expect(days[0].wind_short).toBe("18 mph");
    expect(days[0].wind_dir_short).toBe("NW");
    // Day 3's NWS layer only covers a quarter of the day → Open-Meteo takes over.
    expect(days[2].source).toBe("open-meteo");
    expect(days[2].snow_in).toBe(3.1);
    expect(days[3].source).toBe("open-meteo");
  });

  it("fills missing NWS temperatures from Open-Meteo", () => {
    const days = mergeDays(
      input({ nwsDays: [nwsDay("2026-12-10", { temp_high_f: null, temp_low_f: null })], omBase: om([omDay("2026-12-10")]) }),
    );
    expect(days[0].temp_high_f).toBe(22);
    expect(days[0].temp_low_f).toBe(8);
  });

  it("works with NWS alone when Open-Meteo is down", () => {
    const days = mergeDays(input({ nwsDays: [nwsDay("2026-12-10"), nwsDay("2026-12-11")] }));
    expect(days.length).toBe(2);
    expect(days[0].uv_index_max).toBeNull();
    expect(days[0].snow_summit_in).toBeNull();
  });

  it("records the daily max freezing level from the hourly series", () => {
    const hours = [
      omHour("2026-12-10T14:00:00Z", "2026-12-10", { freezing_level_ft: 5400 }),
      omHour("2026-12-10T20:00:00Z", "2026-12-10", { freezing_level_ft: 7100 }),
    ];
    const days = mergeDays(input({ omBase: om([omDay("2026-12-10")], hours) }));
    expect(days[0].freezing_level_ft).toBe(7100);
  });
});

describe("mergeHourly", () => {
  it("keeps the next 48 hours and pairs summit values by timestamp", () => {
    const mk = (offsetH: number, over: Partial<OpenMeteoHour> = {}) =>
      omHour(new Date(NOW.getTime() + offsetH * 3_600_000).toISOString().replace(/\.\d{3}Z$/, "Z"), TODAY, over);
    const base = om([], [mk(-5), mk(0), mk(24), mk(48), mk(49)]);
    const summit = om([], [mk(0, { temp_f: 5, snow_in: 0.5 })]);
    const hours = mergeHourly(input({ omBase: base, omSummit: summit }));
    expect(hours.length).toBe(3);
    expect(hours[0].temp_summit_f).toBe(5);
    expect(hours[0].snow_summit_in).toBe(0.5);
    expect(hours[1].temp_summit_f).toBeNull();
  });
});

describe("pickCurrentWind", () => {
  const station: StationObservation = {
    station_id: "MMNV1",
    station_name: "Mount Mansfield",
    elevation_ft: 3891,
    distance_km: 2.8,
    observed_at: "2026-12-10T13:30:00Z",
    temp_f: 12,
    wind_mph: 25,
    gust_mph: 41,
    wind_dir: "NW",
    precip_1h_in: null,
    conditions_short: null,
  };
  const current = { time: "2026-12-10T07:00", temp_f: 18, wind_mph: 9, gust_mph: 15, wind_dir_deg: 270 };

  it("prefers a fresh station observation", () => {
    const w = pickCurrentWind(station, current, NOW);
    expect(w.source).toBe("station");
    expect(w.wind_mph_gust).toBe(41);
  });

  it("falls back to the model when the observation is stale", () => {
    const w = pickCurrentWind({ ...station, observed_at: "2026-12-10T08:00:00Z" }, current, NOW);
    expect(w.source).toBe("open-meteo");
    expect(w.wind_mph_avg).toBe(9);
    expect(w.wind_dir_short).toBe("W");
    expect(pickCurrentWind(null, null, NOW).source).toBeNull();
  });
});

describe("describeToday", () => {
  it("writes one sentence-case summary with labelled numbers", () => {
    const [day] = mergeDays(input({ nwsDays: [nwsDay("2026-12-10")], omSummit: om([omDay("2026-12-10", { snow_in: 7 })]) }));
    const text = describeToday(day, { wind_mph_avg: 25, wind_mph_gust: 41, wind_dir_deg: null, wind_dir_short: "NW", source: "station" });
    expect(text).toBe(
      "Snow likely. Forecast snowfall 4.2 in at the base, up to 7 in at the summit. High 25°F, low 10°F. Wind 25 mph from the NW, gusts to 41 mph.",
    );
    expect(text).not.toContain("!");
    expect(describeToday(undefined, { wind_mph_avg: null, wind_mph_gust: null, wind_dir_deg: null, wind_dir_short: null, source: null })).toBeNull();
  });
});

describe("buildHistoryRow", () => {
  const base = {
    resortId: 7,
    date: "2026-12-09",
    sfav2In: null as number | null,
    snotel: null,
    stationDay: null,
    omDay: omDay("2026-12-09", { snow_in: 2.0, rain_in: 0.1, precip_in: 0.35, temp_high_f: 30, temp_low_f: 12 }),
    omHours: [omHour("2026-12-09T14:00:00Z", "2026-12-09", { wind_mph: 10 }), omHour("2026-12-09T20:00:00Z", "2026-12-09", { wind_mph: 20 })],
  };

  it("prefers measured analysis over the model and records the source per column", () => {
    const out = buildHistoryRow({ ...base, sfav2In: 5.5 })!;
    expect(out.row.snow_24h_in).toBe(5.5);
    expect(out.sources.snow_24h_in).toBe("nohrsc-analysis");
    expect(out.row.temp_high_f).toBe(30);
    expect(out.sources.temp_high_f).toBe("open-meteo");
    expect(out.row.wind_mph_avg).toBe(15);
    expect(out.sources.wind_mph_avg).toBe("open-meteo");
    expect(out.row.observed_date).toBe("2026-12-09");
  });

  it("uses SNOTEL temperatures and a positive depth change ahead of the model", () => {
    const out = buildHistoryRow({
      ...base,
      snotel: {
        triplet: "1308:UT:SNTL",
        name: "Atwater",
        elevation_ft: 8750,
        distance_km: 0.3,
        observed_date: "2026-12-09",
        snow_depth_in: 40,
        swe_in: 9,
        temp_max_f: 24,
        temp_min_f: 3,
        temp_avg_f: 14,
        precip_in: 0.5,
        depth_change_in: 3,
      },
    })!;
    expect(out.row.temp_high_f).toBe(24);
    expect(out.sources.temp_high_f).toBe("snotel:1308:UT:SNTL@8750ft");
    expect(out.row.snow_24h_in).toBe(3);
    expect(out.sources.snow_24h_in).toBe("snotel-depth-change:1308:UT:SNTL");
    expect(out.row.precip_24h_in).toBe(0.5);
  });

  it("labels station values with the station id and elevation, and the analysis with its window end", () => {
    const out = buildHistoryRow({
      ...base,
      sfav2In: 4.2,
      sfav2ValidEnd: "2026-12-10T12:00:00.000Z",
      station: { id: "ALTU1", elevation_ft: 8750 },
      stationDay: {
        date: "2026-12-09",
        temp_high_f: 28,
        temp_low_f: 9,
        wind_mph_avg: 14,
        wind_dir_short: "NW",
        precip_in: 0.4,
        sample_count: 24,
      },
    })!;
    expect(out.sources.snow_24h_in).toBe("nohrsc-analysis:24h-to-2026-12-10T12:00Z");
    expect(out.sources.temp_high_f).toBe("station:ALTU1@8750ft");
    expect(out.sources.wind_mph_avg).toBe("station:ALTU1@8750ft");
    expect(out.sources.precip_24h_in).toBe("station:ALTU1@8750ft");
    expect(out.row.temp_high_f).toBe(28);
    expect(out.row.wind_dir_short).toBe("NW");
  });

  it("ignores a SNOTEL row for a different date and returns null with no evidence", () => {
    const out = buildHistoryRow({
      ...base,
      omDay: null,
      omHours: [],
      snotel: {
        triplet: "x",
        name: null,
        elevation_ft: null,
        distance_km: 1,
        observed_date: "2026-12-07",
        snow_depth_in: 1,
        swe_in: 1,
        temp_max_f: 1,
        temp_min_f: 1,
        temp_avg_f: 1,
        precip_in: 1,
        depth_change_in: 1,
      },
    });
    expect(out).toBeNull();
  });
});

describe("sumRecentSnow", () => {
  it("sums the newest N values and ignores gaps", () => {
    expect(sumRecentSnow([2.5, null, 1.2, 4], 2)).toBe(2.5);
    expect(sumRecentSnow([2.5, null, 1.2, 4], 7)).toBe(7.7);
    expect(sumRecentSnow([null, null], 7)).toBeNull();
  });
});
