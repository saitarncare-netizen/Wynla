import { describe, expect, it } from "vitest";
import { deriveSeasonStatus, type SeasonEvidence } from "./seasonStatus";

const none: SeasonEvidence = {
  operating_status: "active",
  season_open_text: null,
  season_close_text: null,
  typical_season_start: null,
  typical_season_end: null,
  season_end_date: null,
};

describe("deriveSeasonStatus", () => {
  it("is null when there is no evidence (never false by default)", () => {
    expect(deriveSeasonStatus(none, new Date("2026-12-15T12:00:00Z")).currently_open).toBeNull();
  });

  it("is false for a permanently closed resort", () => {
    const v = deriveSeasonStatus({ ...none, operating_status: "closed" }, new Date("2027-01-15T12:00:00Z"));
    expect(v.currently_open).toBe(false);
    expect(v.reason).toBe("operating_status=closed");
  });

  it("never claims open from typical dates: false before the typical opening, null inside the window", () => {
    const e = { ...none, typical_season_start: "Mid-November", typical_season_end: "Mid-April" };
    const inside = deriveSeasonStatus(e, new Date("2027-01-15T12:00:00Z"));
    expect(inside.currently_open).toBeNull();
    expect(inside.reason).toBe("typical window only (unverified)");
    const before = deriveSeasonStatus(e, new Date("2026-10-01T12:00:00Z"));
    expect(before.currently_open).toBe(false);
    expect(before.reason).toBe("before typical opening (Mid-November)");
    // After the typical close the parser counts down to the NEXT typical
    // opening, so summer reads as "before typical opening" → false.
    const summer = deriveSeasonStatus(e, new Date("2027-07-10T12:00:00Z"));
    expect(summer.currently_open).toBe(false);
    expect(summer.reason).toBe("before typical opening (Mid-November)");
  });

  it("uses resort-declared season text for true / false", () => {
    const e = { ...none, season_open_text: "2026-12-05", season_close_text: "2027-04-10", typical_season_start: "Mid-November" };
    const before = deriveSeasonStatus(e, new Date("2026-11-20T12:00:00Z"));
    expect(before.currently_open).toBe(false);
    expect(before.reason).toBe("before opening (2026-12-05 to 2027-04-10)");
    expect(deriveSeasonStatus(e, new Date("2026-12-06T12:00:00Z")).currently_open).toBe(true);
    expect(deriveSeasonStatus(e, new Date("2027-04-20T12:00:00Z")).currently_open).toBe(false);
    // Close-only text: past the close date is "after closing".
    const closeOnly = deriveSeasonStatus({ ...none, season_close_text: "2027-04-10" }, new Date("2027-04-20T12:00:00Z"));
    expect(closeOnly.currently_open).toBe(false);
    expect(closeOnly.reason).toBe("after closing (? to 2027-04-10)");
  });

  it("treats last season's end date as evidence only until the end of October", () => {
    const e = { ...none, season_end_date: "2026-04-05" };
    expect(deriveSeasonStatus(e, new Date("2026-09-23T12:00:00Z")).currently_open).toBe(false);
    expect(deriveSeasonStatus(e, new Date("2026-11-15T12:00:00Z")).currently_open).toBeNull();
    expect(deriveSeasonStatus(e, new Date("2026-03-01T12:00:00Z")).currently_open).toBeNull();
  });
});

describe("deriveSeasonStatus with '(projected)' season text (2026-09-23 backfill)", () => {
  const base: SeasonEvidence = {
    operating_status: "active",
    season_open_text: null,
    season_close_text: null,
    typical_season_start: null,
    typical_season_end: null,
    season_end_date: null,
  };
  const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day, 12));

  it("never claims open from a projected opening: false before it, null inside the window", () => {
    const e = { ...base, season_open_text: "December 4, 2026 (projected)", season_close_text: "March 28, 2027 (projected)" };
    expect(deriveSeasonStatus(e, d(2026, 9, 1)).currently_open).toBe(false);
    expect(deriveSeasonStatus(e, d(2027, 0, 15)).currently_open).toBeNull();
    expect(deriveSeasonStatus(e, d(2027, 0, 15)).reason).toContain("projected");
  });

  it("an announced opening with only a projected close still proves open in season", () => {
    const e = { ...base, season_open_text: "November 13, 2026", season_close_text: "April 11, 2027 (projected)" };
    expect(deriveSeasonStatus(e, d(2027, 0, 15)).currently_open).toBe(true);
    expect(deriveSeasonStatus(e, d(2027, 4, 15)).currently_open).toBe(false);
  });
});
