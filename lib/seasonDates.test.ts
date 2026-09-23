import { describe, expect, it } from "vitest";
import {
  deriveResortStatus,
  isGlobalOffSeasonNow,
  parseSeasonDates,
  parseSeasonText,
  resolveSeasonInfo,
  seasonWindowText,
  thanksgivingDate,
  easterDate,
} from "./seasonDates";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

// Every distinct phrasing in the live resorts table on 2026-09-23
// (season_open_text, season_close_text, typical_season_start,
// typical_season_end — read-only PostgREST query). Each must parse to
// the expected month; day precision is checked separately below.
const DB_PHRASINGS: Array<[string, number]> = [
  ["mid December", 11],
  ["late November", 10],
  ["early December", 11],
  ["December", 11],
  ["mid-December", 11],
  ["Thanksgiving", 10],
  ["November", 10],
  ["Late November", 10],
  ["early April", 3],
  ["late March", 2],
  ["April", 3],
  ["mid-April", 3],
  ["mid March", 2],
  ["mid-March", 2],
  ["May 17", 4],
  ["mid April", 3],
  ["end of March", 2],
  ["late April", 3],
  ["Mid-November", 10],
  ["Early December", 11],
  ["Mid-December", 11],
  ["Day after Thanksgiving", 10],
  ["Second week of December", 11],
  ["Mid December", 11],
  ["Mid-April", 3],
  ["Mid-March", 2],
  ["Early April", 3],
  ["Late March", 2],
  ["March", 2],
  ["Mid-to-late March", 2],
  ["End of April", 3],
  ["Early/mid April", 3],
  ["Second Sunday in April", 3],
  ["Early to late May", 4],
  ["Late Nov", 10],
  ["mid November", 10],
  ["2026-11-22", 10],
  ["11/22/2026", 10],
  ["Christmas", 11],
];

describe("parseSeasonText — every DB phrasing", () => {
  const today = utc(2026, 8, 23);
  it.each(DB_PHRASINGS)("parses %j", (text, month) => {
    const d = parseSeasonText(text, today);
    expect(d, text).not.toBeNull();
    expect(d!.getUTCMonth(), text).toBe(month);
  });

  it("treats hyphenated and spaced qualifiers identically", () => {
    expect(ymd(parseSeasonText("Mid-November", today))).toBe(ymd(parseSeasonText("Mid November", today)));
    expect(ymd(parseSeasonText("Mid-November", today))).toBe("2026-11-15");
    expect(ymd(parseSeasonText("Late Nov", today))).toBe("2026-11-25");
    expect(ymd(parseSeasonText("Early December", today))).toBe("2026-12-05");
    expect(ymd(parseSeasonText("end of March", today))).toBe("2027-03-27");
  });

  it("averages compound qualifiers", () => {
    expect(ymd(parseSeasonText("Mid-to-late March", today))).toBe("2027-03-20");
    expect(ymd(parseSeasonText("Early/mid April", today))).toBe("2027-04-10");
    expect(ymd(parseSeasonText("Early to late May", today))).toBe("2027-05-15");
  });

  it("resolves named holidays per year", () => {
    expect(ymd(thanksgivingDate(2026))).toBe("2026-11-26");
    expect(ymd(thanksgivingDate(2027))).toBe("2027-11-25");
    expect(ymd(parseSeasonText("Thanksgiving", today))).toBe("2026-11-26");
    expect(ymd(parseSeasonText("Day after Thanksgiving", today))).toBe("2026-11-27");
    expect(ymd(parseSeasonText("Thanksgiving weekend", today))).toBe("2026-11-27");
    expect(ymd(parseSeasonText("Christmas", today))).toBe("2026-12-25");
    expect(ymd(parseSeasonText("Presidents' Day", today))).toBe("2027-02-15");
    expect(ymd(parseSeasonText("Memorial Day", today))).toBe("2027-05-31");
    expect(ymd(easterDate(2027))).toBe("2027-03-28");
    expect(ymd(parseSeasonText("Easter", today))).toBe("2027-03-28");
  });

  it("resolves ordinal weekday / week phrases", () => {
    expect(ymd(parseSeasonText("Second Sunday in April", today))).toBe("2027-04-11");
    expect(ymd(parseSeasonText("Last Saturday of March", today))).toBe("2027-03-27");
    expect(ymd(parseSeasonText("Second week of December", today))).toBe("2026-12-11");
  });

  it("reads explicit days, ordinals and years", () => {
    expect(ymd(parseSeasonText("May 17", today))).toBe("2027-05-17");
    expect(ymd(parseSeasonText("Nov 22nd", today))).toBe("2026-11-22");
    expect(ymd(parseSeasonText("17th of May", today))).toBe("2027-05-17");
    expect(ymd(parseSeasonText("November 22 2027", today))).toBe("2027-11-22");
    expect(ymd(parseSeasonText("2026-11-22", today))).toBe("2026-11-22");
    expect(ymd(parseSeasonText("11/22/26", today))).toBe("2026-11-22");
  });

  it("returns null for junk", () => {
    expect(parseSeasonText("", today)).toBeNull();
    expect(parseSeasonText("TBD", today)).toBeNull();
    expect(parseSeasonText(null, today)).toBeNull();
    expect(parseSeasonText("2026-13-40", today)).toBeNull();
  });
});

describe("year rolling — no hard-coded season", () => {
  it("rolls to the 2027-28 season when read after the 2027 opening", () => {
    expect(ymd(parseSeasonText("Late November", utc(2027, 8, 23)))).toBe("2027-11-25");
    expect(ymd(parseSeasonText("Late November", utc(2027, 11, 1)))).toBe("2028-11-25");
    expect(ymd(parseSeasonText("Thanksgiving", utc(2027, 11, 1)))).toBe("2028-11-23");
  });

  it("keeps a Nov→Apr window in-season across New Year in any year", () => {
    for (const year of [2027, 2028, 2029, 2030]) {
      const info = parseSeasonDates("Late November", "Mid-April", utc(year, 1, 1));
      expect(info.status, String(year)).toBe("in-season");
      expect(ymd(info.nextCloseDate)).toBe(`${year}-04-15`);
    }
  });

  it("counts down from September to the coming November", () => {
    const info = parseSeasonDates("Mid-November", "Mid-April", utc(2026, 8, 23));
    expect(info.status).toBe("off-season");
    expect(ymd(info.nextOpenDate)).toBe("2026-11-15");
    expect(info.daysUntilOpen).toBe(53);
    expect(info.approximate).toBe(true);
  });

  it("marks explicit dates as exact", () => {
    const info = parseSeasonDates("2026-11-22", "2027-04-15", utc(2026, 8, 23));
    expect(info.approximate).toBe(false);
    expect(info.daysUntilOpen).toBe(60);
  });
});

describe("isGlobalOffSeasonNow", () => {
  it("is summer from May 1 through Oct 15 (UTC)", () => {
    expect(isGlobalOffSeasonNow(utc(2026, 4, 1))).toBe(true);
    expect(isGlobalOffSeasonNow(utc(2026, 8, 23))).toBe(true);
    expect(isGlobalOffSeasonNow(utc(2026, 9, 15))).toBe(true);
    expect(isGlobalOffSeasonNow(utc(2026, 9, 16))).toBe(false);
    expect(isGlobalOffSeasonNow(utc(2026, 10, 15))).toBe(false);
    expect(isGlobalOffSeasonNow(utc(2027, 1, 14))).toBe(false);
    expect(isGlobalOffSeasonNow(utc(2027, 3, 30))).toBe(false);
    expect(isGlobalOffSeasonNow(utc(2027, 4, 1))).toBe(true);
  });

  it("uses the UTC calendar, not the process time zone", () => {
    // 2026-04-30T23:30 local in Denver is 2026-05-01T05:30Z — still April
    // for the mountain, but the flag is defined on UTC for determinism.
    expect(isGlobalOffSeasonNow(new Date("2026-05-01T05:30:00Z"))).toBe(true);
    expect(isGlobalOffSeasonNow(new Date("2026-04-30T23:30:00Z"))).toBe(false);
  });
});

describe("resolveSeasonInfo + seasonWindowText", () => {
  it("falls back to the legacy typical_season_* pair", () => {
    const info = resolveSeasonInfo(
      { season_open_text: null, season_close_text: null, typical_season_start: "Mid-November", typical_season_end: "Mid-April" },
      utc(2026, 8, 23),
    );
    expect(info.status).toBe("off-season");
    expect(ymd(info.nextOpenDate)).toBe("2026-11-15");
    expect(seasonWindowText({ typical_season_start: "Mid-November", typical_season_end: "Mid-April" })).toBe("Mid-November – Mid-April");
    expect(seasonWindowText({})).toBeNull();
  });
});

describe("deriveResortStatus", () => {
  const sept = utc(2026, 8, 23);
  const jan = utc(2027, 0, 20);

  it("shows opens-on for an off-season resort with dates", () => {
    const s = deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, parseSeasonDates("Mid-November", "Mid-April", sept), sept);
    expect(s.kind).toBe("opens");
    expect(s.label).toBe("Opens ~Nov 15");
    expect(s.detail).toBe("in 53 days");
    expect(s.dormant).toBe(true);
  });

  it("shows off-season with no dates in September", () => {
    const s = deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, parseSeasonDates(null, null, sept), sept);
    expect(s.kind).toBe("off-season");
    expect(s.dormant).toBe(true);
  });

  it("shows open with lift counts from a live scrape", () => {
    const s = deriveResortStatus(
      { currently_open: true, snow_report_status: "open", lifts_open_today: 12, total_lifts: 20 },
      parseSeasonDates("Late November", "Mid-April", jan),
      jan,
    );
    expect(s.kind).toBe("open");
    expect(s.detail).toContain("12/20 lifts");
    expect(s.detail).toContain("until ~Apr 15");
    expect(s.dormant).toBe(false);
  });

  it("never claims open from season dates alone", () => {
    const s = deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, parseSeasonDates("Late November", "Mid-April", jan), jan);
    expect(s.kind).toBe("likely-open");
    expect(s.dormant).toBe(false);
  });

  it("reads a January scraper 'closed' as closed for the season", () => {
    const s = deriveResortStatus({ currently_open: false, snow_report_status: "closed" }, parseSeasonDates(null, null, jan), jan);
    expect(s.kind).toBe("closed-season");
  });

  it("falls back to check-resort in-season with nothing known", () => {
    const s = deriveResortStatus({ currently_open: null, snow_report_status: null }, parseSeasonDates(null, null, jan), jan);
    expect(s.kind).toBe("unknown");
    expect(s.label).toBe("Check resort");
    expect(s.dormant).toBe(false);
  });

  it("permanently closed wins over everything", () => {
    const s = deriveResortStatus({ currently_open: true, operating_status: "closed" }, parseSeasonDates(null, null, jan), jan);
    expect(s.kind).toBe("closed-permanent");
  });
});
