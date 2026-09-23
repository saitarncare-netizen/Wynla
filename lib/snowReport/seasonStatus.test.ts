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

  it("uses typical season dates", () => {
    const e = { ...none, typical_season_start: "Mid-November", typical_season_end: "Mid-April" };
    expect(deriveSeasonStatus(e, new Date("2027-01-15T12:00:00Z")).currently_open).toBe(true);
    expect(deriveSeasonStatus(e, new Date("2026-10-01T12:00:00Z")).currently_open).toBe(false);
  });

  it("prefers explicit season text over typical dates", () => {
    const e = { ...none, season_open_text: "2026-12-05", typical_season_start: "Mid-November" };
    expect(deriveSeasonStatus(e, new Date("2026-11-20T12:00:00Z")).currently_open).toBe(false);
    expect(deriveSeasonStatus(e, new Date("2026-12-06T12:00:00Z")).currently_open).toBe(true);
  });

  it("treats last season's end date as evidence only until the end of October", () => {
    const e = { ...none, season_end_date: "2026-04-05" };
    expect(deriveSeasonStatus(e, new Date("2026-09-23T12:00:00Z")).currently_open).toBe(false);
    expect(deriveSeasonStatus(e, new Date("2026-11-15T12:00:00Z")).currently_open).toBeNull();
    expect(deriveSeasonStatus(e, new Date("2026-03-01T12:00:00Z")).currently_open).toBeNull();
  });
});
