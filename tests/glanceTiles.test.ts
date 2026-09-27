import { describe, expect, it } from "vitest";
import {
  buildGlanceTiles,
  buildMountainFacts,
  buildSheetTiles,
  formatRelativeAge,
  formatSnowTotal,
  type GlanceInput,
  type SheetGlanceInput,
} from "@/lib/glanceTiles";
import type { ResortStatus } from "@/lib/seasonDates";

// One builder feeds both the map's resort sheet and the resort page, so
// these pin the shared vocabulary: every number has a label saying what
// it is and a source line saying where it came from (and how old it is).

const NOW = new Date("2026-01-15T15:00:00Z");
const OPEN: ResortStatus = { kind: "open", label: "Open today", detail: "12/20 lifts", tone: "green", dormant: false };
const OFF: ResortStatus = { kind: "opens", label: "Opens ~Nov 22", detail: "in 61 days", tone: "navy", dormant: true };

function input(over: Partial<GlanceInput> = {}): GlanceInput {
  return {
    resort: {
      snow_new_24h_in: 6,
      snow_base_depth_in: 40,
      snow_report_status: "reported",
      snow_report_updated_at: "2026-01-15T12:00:00Z",
    },
    weather: {
      temp_high_f: 28,
      temp_low_f: 15,
      conditions_short: "Cloudy",
      fetched_at: "2026-01-15T14:00:00Z",
    },
    status: OPEN,
    surface: { kind: "active", label: "Packed powder", confidence: "high" },
    now: NOW,
    ...over,
  };
}

describe("buildGlanceTiles", () => {
  it("returns the four tiles in a fixed order", () => {
    expect(buildGlanceTiles(input()).map((t) => t.key)).toEqual(["snow", "base", "surface", "temp"]);
  });

  it("labels the temperature as today's high, condition and low on a detail line", () => {
    const temp = buildGlanceTiles(input()).find((t) => t.key === "temp");
    expect(temp).toMatchObject({
      label: "High today",
      value: "28°F",
      detail: "Cloudy · low 15°F",
      source: "Forecast · 1h ago",
    });
  });

  it("never uses the condition as the temperature label", () => {
    const temp = buildGlanceTiles(input()).find((t) => t.key === "temp");
    expect(temp?.label).not.toBe("Cloudy");
  });

  it("marks a resort-reported snow figure as Reported with the report age", () => {
    const snow = buildGlanceTiles(input())[0];
    expect(snow).toMatchObject({ label: "New snow (24h)", value: '6"', source: "Reported · 3h ago", accent: true });
  });

  it("marks analysis / station snow as Measured", () => {
    const snow = buildGlanceTiles(
      input({
        resort: { snow_new_24h_in: null, snow_base_depth_in: null, snow_report_status: null, snow_report_updated_at: null },
        weather: { temp_high_f: 20, conditions_short: null, snow_24h_in: "3", fetched_at: "2026-01-15T14:00:00Z" },
      }),
    )[0];
    expect(snow).toMatchObject({ value: '3"', source: "Measured · 1h ago", accent: true });
  });

  it("says Not reported instead of inventing a number", () => {
    const tiles = buildGlanceTiles(
      input({
        resort: { snow_new_24h_in: null, snow_base_depth_in: null, snow_report_status: null, snow_report_updated_at: null },
        weather: null,
        surface: null,
        status: OFF,
      }),
    );
    expect(tiles[0]).toMatchObject({ value: "—", source: "Not reported" });
    expect(tiles[1]).toMatchObject({ key: "base", value: "—", source: "Not reported" });
    expect(tiles[2]).toMatchObject({ value: "Paused", source: "Forecast paused · until lifts run" });
    expect(tiles[3]).toMatchObject({ label: "High today", value: "—", source: "Not synced" });
    expect(tiles[3].detail).toBeUndefined();
  });

  it("can show the derived status instead of an empty base", () => {
    const tiles = buildGlanceTiles(
      input({
        resort: { snow_new_24h_in: null, snow_base_depth_in: null, snow_report_status: null, snow_report_updated_at: null },
        status: OFF,
        statusWhenNoBase: true,
      }),
    );
    expect(tiles[1]).toMatchObject({
      key: "status",
      label: "Status",
      value: "Opens ~Nov 22",
      detail: "in 61 days",
      source: "Season dates",
    });
  });

  it("carries the surface confidence on the page and omits it when unknown", () => {
    expect(buildGlanceTiles(input())[2].source).toBe("Forecast · 1h ago · high confidence");
    const map = buildGlanceTiles(input({ surface: { kind: "active", label: "Packed powder" } }));
    expect(map[2].source).toBe("Forecast · 1h ago");
  });
});

describe("buildSheetTiles", () => {
  const NO_REPORT = { snow_new_24h_in: null, snow_base_depth_in: null, snow_report_status: null, snow_report_updated_at: null };
  const EXTRAS = { snowNext3In: 7.6, lowF: 12, windMph: 14, gustMph: 31, fetchedAt: "2026-01-15T13:00:00Z" };

  function sheet(over: Partial<SheetGlanceInput> = {}): SheetGlanceInput {
    return { ...input(), extras: EXTRAS, ...over };
  }

  it("puts snow and today's weather on top, then base and surface", () => {
    expect(buildSheetTiles(sheet()).map((t) => t.key)).toEqual(["snow", "temp", "base", "surface"]);
  });

  it("shows high and low as one value with the condition and wind on the detail line", () => {
    const today = buildSheetTiles(sheet())[1];
    expect(today).toMatchObject({
      label: "High / low today",
      value: "28° / 15°F",
      detail: "Cloudy · wind 14 mph, gusts 31",
      source: "Forecast · 1h ago",
    });
  });

  it("names gusts only once they matter, and falls back to the fetched low", () => {
    const calm = buildSheetTiles(
      sheet({
        weather: { temp_high_f: 30, conditions_short: "Sunny", fetched_at: "2026-01-15T14:00:00Z" },
        extras: { ...EXTRAS, windMph: 8.4, gustMph: 18 },
      }),
    )[1];
    expect(calm).toMatchObject({ value: "30° / 12°F", detail: "Sunny · wind 8 mph" });
  });

  it("keeps a high-only reading honest while the low is unknown", () => {
    const today = buildSheetTiles(
      sheet({ weather: { temp_high_f: 30, conditions_short: null, fetched_at: null }, extras: undefined }),
    )[1];
    expect(today).toMatchObject({ label: "High today", value: "30°F", source: "Forecast · today" });
    expect(today.detail).toBeUndefined();
    const none = buildSheetTiles(sheet({ weather: null, extras: null }))[1];
    expect(none).toMatchObject({ value: "—", source: "Not synced" });
    expect(none.detail).toBeUndefined();
  });

  it("swaps a paused surface for the next-3-days snow total", () => {
    const tiles = buildSheetTiles(sheet({ resort: NO_REPORT, status: OFF, surface: null }));
    expect(tiles.map((t) => t.key)).toEqual(["snow", "temp", "status", "next-snow"]);
    expect(tiles[3]).toMatchObject({ label: "Snow next 3 days", value: '8"', source: "Forecast · 2h ago", accent: true });
  });

  it("says loading, then Not synced, instead of inventing a total", () => {
    const loading = buildSheetTiles(sheet({ surface: null, extras: undefined }))[3];
    expect(loading).toMatchObject({ key: "next-snow", value: "…", source: "Forecast" });
    const missing = buildSheetTiles(sheet({ surface: null, extras: null }))[3];
    expect(missing).toMatchObject({ value: "—", source: "Not synced" });
    const stale = buildSheetTiles(sheet({ surface: null, extras: { ...EXTRAS, snowNext3In: null } }))[3];
    expect(stale).toMatchObject({ value: "—", source: "Not synced" });
    const dry = buildSheetTiles(sheet({ surface: null, extras: { ...EXTRAS, snowNext3In: 0 } }))[3];
    expect(dry).toMatchObject({ value: '0"', accent: false });
  });

  it("marks a projected opening as projected and never an announced one", () => {
    const status: ResortStatus = { kind: "opens", label: "Opens Dec 18", detail: "in 82 days", tone: "navy", dormant: true };
    const projected = buildSheetTiles(sheet({ resort: NO_REPORT, status, openProjected: true }))[2];
    expect(projected).toMatchObject({ key: "status", value: "Opens Dec 18", detail: "in 82 days · projected", source: "Season dates" });
    const announced = buildSheetTiles(sheet({ resort: NO_REPORT, status, openProjected: false }))[2];
    expect(announced.detail).toBe("in 82 days");
    // openProjected describes the OPENING date only; an open resort's
    // detail stays as the status wrote it.
    const open = buildSheetTiles(sheet({ resort: NO_REPORT, status: OPEN, openProjected: true }))[2];
    expect(open.detail).toBe("12/20 lifts");
  });

  it("says Reported only for an open status backed by a licensed report", () => {
    const reported = buildSheetTiles(
      sheet({ resort: { ...NO_REPORT, snow_report_status: "reported", snow_report_updated_at: "2026-01-15T12:00:00Z" } }),
    )[2];
    expect(reported).toMatchObject({ key: "status", value: "Open today", source: "Reported · 3h ago" });
    const derived = buildSheetTiles(sheet({ resort: NO_REPORT }))[2];
    expect(derived.source).toBe("Season dates");
    const unknown: ResortStatus = { kind: "unknown", label: "Check resort", detail: "Live status not available", tone: "muted", dormant: false };
    expect(buildSheetTiles(sheet({ resort: NO_REPORT, status: unknown }))[2].source).toBe("Check the resort");
  });
});

describe("formatSnowTotal", () => {
  it("rounds to whole inches from 1 inch and keeps a dusting visible", () => {
    expect(formatSnowTotal(0)).toBe('0"');
    expect(formatSnowTotal(0.04)).toBe('0"');
    expect(formatSnowTotal(0.4)).toBe('0.4"');
    expect(formatSnowTotal(1.4)).toBe('1"');
    expect(formatSnowTotal(11.5)).toBe('12"');
  });
});

describe("buildMountainFacts", () => {
  const FULL = {
    summit_elevation_ft: 11570,
    base_elevation_ft: 8120,
    vertical_drop: 3450,
    total_trails: 147,
    total_lifts: 31,
    has_night_skiing: true,
  };
  const texts = (r: Parameters<typeof buildMountainFacts>[0]) => buildMountainFacts(r).map((f) => f.text.replace(/ /g, " "));

  it("lists summit, base, trails, lifts and night skiing", () => {
    expect(texts(FULL)).toEqual(["Summit 11,570 ft", "Base 8,120 ft", "147 trails", "31 lifts", "Night skiing"]);
  });

  it("keeps each number glued to its unit", () => {
    expect(buildMountainFacts(FULL)[0].text).toBe("Summit 11,570 ft");
  });

  it("adds the vertical drop only when an elevation is missing", () => {
    expect(texts({ ...FULL, base_elevation_ft: null })).toEqual([
      "Summit 11,570 ft",
      "Vertical 3,450 ft",
      "147 trails",
      "31 lifts",
      "Night skiing",
    ]);
    expect(texts({ ...FULL, summit_elevation_ft: null, base_elevation_ft: null, has_night_skiing: false })).toEqual([
      "Vertical 3,450 ft",
      "147 trails",
      "31 lifts",
    ]);
  });

  it("skips missing, zero and junk values and singularises one lift", () => {
    expect(
      texts({
        summit_elevation_ft: "not a number",
        base_elevation_ft: 0,
        vertical_drop: null,
        total_trails: null,
        total_lifts: "1",
        has_night_skiing: null,
      }),
    ).toEqual(["1 lift"]);
    expect(
      buildMountainFacts({
        summit_elevation_ft: null,
        base_elevation_ft: null,
        vertical_drop: null,
        total_trails: null,
        total_lifts: null,
        has_night_skiing: null,
      }),
    ).toEqual([]);
  });
});

describe("formatRelativeAge", () => {
  it("formats minutes, hours and days, and rejects bad input", () => {
    expect(formatRelativeAge("2026-01-15T14:59:40Z", NOW)).toBe("just now");
    expect(formatRelativeAge("2026-01-15T14:48:00Z", NOW)).toBe("12m ago");
    expect(formatRelativeAge("2026-01-13T15:00:00Z", NOW)).toBe("2d ago");
    expect(formatRelativeAge("not a date", NOW)).toBeNull();
    expect(formatRelativeAge(null, NOW)).toBeNull();
  });
});
