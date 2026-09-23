import { describe, expect, it } from "vitest";
import { buildGlanceTiles, formatRelativeAge, type GlanceInput } from "@/lib/glanceTiles";
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

  it("shows the derived status instead of an empty base on the map sheet", () => {
    const tiles = buildGlanceTiles(
      input({
        resort: { snow_new_24h_in: null, snow_base_depth_in: null, snow_report_status: null, snow_report_updated_at: null },
        status: OFF,
        statusWhenNoBase: true,
      }),
    );
    expect(tiles[1]).toMatchObject({ key: "status", label: "Status", value: "Opens ~Nov 22", source: "in 61 days" });
  });

  it("carries the surface confidence on the page and omits it when unknown", () => {
    expect(buildGlanceTiles(input())[2].source).toBe("Forecast · 1h ago · high confidence");
    const map = buildGlanceTiles(input({ surface: { kind: "active", label: "Packed powder" } }));
    expect(map[2].source).toBe("Forecast · 1h ago");
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
