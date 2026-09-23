import { describe, expect, it } from "vitest";
import { parseSeasonDates } from "./seasonDates";

// The 2026-09-23 backfill wrote season_open_text / season_close_text as
// "November 13, 2026" / "April 11, 2027" for ~320 resorts. These tests
// pin the contract between that format and the countdown parser.
describe("parseSeasonDates with backfilled 'Month D, YYYY' text", () => {
  it("counts down to an announced opening date while off-season", () => {
    const info = parseSeasonDates("November 13, 2026", "April 11, 2027", new Date(Date.UTC(2026, 8, 23)));
    expect(info.status).toBe("off-season");
    expect(info.daysUntilOpen).toBe(51);
    expect(info.nextOpenDate?.toISOString().slice(0, 10)).toBe("2026-11-13");
  });

  it("reads as in-season between the two dates", () => {
    const info = parseSeasonDates("November 13, 2026", "April 11, 2027", new Date(Date.UTC(2027, 0, 15)));
    expect(info.status).toBe("in-season");
    expect(info.nextCloseDate?.toISOString().slice(0, 10)).toBe("2027-04-11");
  });

  it("flags a '(projected)' qualifier without changing the parsed date", () => {
    const info = parseSeasonDates(
      "December 4, 2026 (projected)",
      "March 28, 2027 (projected)",
      new Date(Date.UTC(2026, 8, 23)),
    );
    expect(info.status).toBe("off-season");
    expect(info.nextOpenDate?.toISOString().slice(0, 10)).toBe("2026-12-04");
    expect(info.openProjected).toBe(true);
    expect(info.closeProjected).toBe(true);
    const announced = parseSeasonDates("November 13, 2026", "April 11, 2027 (projected)", new Date(Date.UTC(2026, 8, 23)));
    expect(announced.openProjected).toBe(false);
    expect(announced.closeProjected).toBe(true);
  });

  it("still handles the qualifier form some older rows use", () => {
    const info = parseSeasonDates("Late November", "Early April", new Date(Date.UTC(2026, 8, 23)));
    expect(info.status).toBe("off-season");
    expect(info.nextOpenDate?.toISOString().slice(0, 10)).toBe("2026-11-25");
  });
});
