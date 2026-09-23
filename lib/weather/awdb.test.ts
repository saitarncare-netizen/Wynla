import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/awdb-daily-atwater.json";
import { parseSnotelDaily, pickSnotel, type SnotelStation } from "./awdb";

describe("SNOTEL daily parsing", () => {
  it("pivots the element series into daily rows in US units", () => {
    const rows = parseSnotelDaily(fixture as Parameters<typeof parseSnotelDaily>[0]);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < rows.length; i++) expect(rows[i].date > rows[i - 1].date).toBe(true);
    const r = rows[0];
    expect(r.snow_depth_in).toBe(0);
    expect(r.swe_in).toBe(0);
    expect(r.temp_max_f).toBeGreaterThan(r.temp_min_f!);
    expect(r.temp_avg_f).not.toBeNull();
  });

  it("returns an empty list for an empty response", () => {
    expect(parseSnotelDaily([])).toEqual([]);
  });
});

describe("pickSnotel", () => {
  const stations: SnotelStation[] = [
    { triplet: "1308:UT:SNTL", name: "Atwater", lat: 40.59124, lon: -111.63775, elevation_ft: 8750 },
    { triplet: "766:UT:SNTL", name: "Snowbird", lat: 40.56914, lon: -111.65852, elevation_ft: 9170 },
    { triplet: "628:UT:SNTL", name: "Mill-D North", lat: 40.65883, lon: -111.63683, elevation_ft: 8940 },
    { triplet: "999:UT:SNTL", name: "Far away", lat: 41.5, lon: -111.6, elevation_ft: 8800 },
  ];

  it("takes the nearest site within 15 km and 300 m of mid-mountain", () => {
    const alta = { lat: 40.5884, lon: -111.6386, midElevationFt: 9500 };
    const pick = pickSnotel(stations, alta)!;
    expect(pick.station.triplet).toBe("1308:UT:SNTL");
    expect(pick.distance_km).toBeLessThan(1);
  });

  it("rejects sites at the wrong elevation and outside the radius", () => {
    expect(pickSnotel(stations, { lat: 40.5884, lon: -111.6386, midElevationFt: 11_000 })).toBeNull();
    expect(pickSnotel(stations, { lat: 44.5, lon: -72.8, midElevationFt: 3000 })).toBeNull();
  });
});
