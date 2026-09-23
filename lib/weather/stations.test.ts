import { describe, expect, it } from "vitest";
import type { NwsStation } from "./nws";
import { mappingIsStale, midElevationFt, rankCandidates } from "./stations";

const stowe = { lat: 44.5303, lon: -72.7814, state: "VT", baseElevationFt: 1559, summitElevationFt: 3719 };

const stations: NwsStation[] = [
  { id: "KMVL", name: "Morrisville-Stowe State Airport", lat: 44.53589, lon: -72.61625, elevation_ft: 709 },
  { id: "MMNV1", name: "NEPP site at Mount Mansfield", lat: 44.52472, lon: -72.81528, elevation_ft: 3891 },
  { id: "UVM06", name: "Mt. Mansfield (East)", lat: 44.5247, lon: -72.7614, elevation_ft: 2877 },
  { id: "KBTV", name: "Burlington", lat: 44.46806, lon: -73.15028, elevation_ft: 331 },
  { id: "NOELV", name: "No elevation", lat: 44.53, lon: -72.79, elevation_ft: null },
];

describe("rankCandidates", () => {
  it("keeps stations inside the radius, highest first", () => {
    const ranked = rankCandidates(stations, stowe);
    expect(ranked.map((s) => s.id)).toEqual(["MMNV1", "UVM06", "KMVL", "NOELV"]);
    expect(ranked.find((s) => s.id === "KBTV")).toBeUndefined(); // 30 km away
    expect(ranked[0].distance_km).toBeLessThan(3);
  });

  it("honours a custom radius", () => {
    expect(rankCandidates(stations, stowe, 40).some((s) => s.id === "KBTV")).toBe(true);
  });
});

describe("helpers", () => {
  it("computes mid-mountain elevation", () => {
    expect(midElevationFt(stowe)).toBe(2639);
    expect(midElevationFt({ ...stowe, summitElevationFt: null })).toBe(1559);
    expect(midElevationFt({ ...stowe, baseElevationFt: null, summitElevationFt: null })).toBeNull();
  });

  it("expires the station mapping after 30 days", () => {
    const now = new Date("2026-12-10T00:00:00Z");
    expect(mappingIsStale(null, now)).toBe(true);
    expect(mappingIsStale("2026-11-20T00:00:00Z", now)).toBe(false);
    expect(mappingIsStale("2026-10-20T00:00:00Z", now)).toBe(true);
    expect(mappingIsStale("not a date", now)).toBe(true);
  });
});
