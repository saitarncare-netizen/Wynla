import { afterEach, describe, expect, it, vi } from "vitest";
import {
  failureMarker,
  lastAttemptAt,
  makeSfav2Samplers,
  measuredIsDue,
  refreshResortWithin,
  type CacheRow,
  type ResortRow,
} from "./refreshResort";
import { StationDirectory } from "./stations";

function cache(over: Partial<CacheRow> = {}): CacheRow {
  return {
    resort_id: 1,
    nws_grid_office: null,
    nws_grid_x: null,
    nws_grid_y: null,
    fetched_at: null,
    fetch_source: null,
    fetch_error: null,
    forecast_for_date: null,
    stations: null,
    measured: null,
    time_zone: null,
    ...over,
  };
}

const resort: ResortRow = {
  id: 1,
  slug: "alta",
  name: "Alta",
  state: "UT",
  latitude: 40.588,
  longitude: -111.638,
  base_elevation_ft: 8530,
  elevation_base: null,
  summit_elevation_ft: 11068,
  elevation_summit: null,
  vertical_drop: null,
  snow_report_status: "no_feed",
};

describe("lastAttemptAt (the 45-minute lock)", () => {
  it("is 0 for a resort that has never been tried", () => {
    expect(lastAttemptAt(undefined)).toBe(0);
    expect(lastAttemptAt(cache())).toBe(0);
  });

  it("uses fetched_at for a good row", () => {
    expect(lastAttemptAt(cache({ fetched_at: "2026-12-10T12:00:00Z" }))).toBe(Date.parse("2026-12-10T12:00:00Z"));
  });

  it("uses the failure marker when the last attempt failed after the last good forecast", () => {
    const row = cache({
      fetched_at: "2026-12-10T12:00:00Z",
      fetch_source: "failed",
      fetch_error: failureMarker(new Date("2026-12-11T09:30:00Z"), "no forecast source answered"),
    });
    expect(lastAttemptAt(row)).toBe(Date.parse("2026-12-11T09:30:00.000Z"));
  });

  it("ignores a stale marker text once the row succeeded again", () => {
    const row = cache({
      fetched_at: "2026-12-12T12:00:00Z",
      fetch_source: "nws+open-meteo",
      fetch_error: "failed@2026-12-11T09:30:00.000Z: leftover",
    });
    expect(lastAttemptAt(row)).toBe(Date.parse("2026-12-12T12:00:00Z"));
  });

  it("keeps the marker within the column's 240 characters", () => {
    expect(failureMarker(new Date("2026-12-11T09:30:00Z"), "x".repeat(500)).length).toBe(240);
    expect(failureMarker(new Date("2026-12-11T09:30:00Z"), "boom")).toBe("failed@2026-12-11T09:30:00.000Z: boom");
  });
});

describe("measuredIsDue", () => {
  const prev = {
    for_date: "2026-12-09",
    sfav2_24h_in: 1,
    sfav2_48h_in: null,
    sfav2_72h_in: null,
    sfav2_valid_end: null,
    sfav2_file: "sfav2_CONUS_24h_2026121000.tif",
    snodas_depth_in: null,
    snodas_swe_in: null,
    snodas_valid: null,
    snodas_raw: null,
    snotel: null,
    history_sources: null,
  };
  it("runs again for a new day or a newer analysis file, otherwise not", () => {
    expect(measuredIsDue(null, "2026-12-09", null)).toBe(true);
    expect(measuredIsDue(prev, "2026-12-10", prev.sfav2_file)).toBe(true);
    expect(measuredIsDue(prev, "2026-12-09", "sfav2_CONUS_24h_2026121012.tif")).toBe(true);
    expect(measuredIsDue(prev, "2026-12-09", prev.sfav2_file)).toBe(false);
    expect(measuredIsDue(prev, "2026-12-09", null)).toBe(false);
  });
});

describe("refreshResortWithin", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("does not touch the network for a resort without coordinates", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const out = await refreshResortWithin(
      { ...resort, latitude: null },
      undefined,
      { now: new Date(), directory: new StationDirectory(), sfav2: makeSfav2Samplers(null), allowMeasured: false },
      10_000,
    );
    expect(out).toEqual({ ok: false, resort_id: 1, error: "bad coordinates" });
    expect(f).not.toHaveBeenCalled();
  });

  it("reports a deadline failure and cancels upstream calls when the budget runs out", async () => {
    const aborted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: { signal?: AbortSignal }) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            aborted.push(url);
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );
    const started = Date.now();
    const out = await refreshResortWithin(
      resort,
      undefined,
      { now: new Date(), directory: new StationDirectory(), sfav2: makeSfav2Samplers(null), allowMeasured: false },
      50,
    );
    expect(out.ok).toBe(false);
    expect((out as { error: string }).error).toMatch(/^deadline/);
    expect(Date.now() - started).toBeLessThan(5_000);
    // The /points lookup was in flight and got cancelled rather than left hanging.
    expect(aborted.some((u) => u.includes("api.weather.gov/points"))).toBe(true);
  });
});
