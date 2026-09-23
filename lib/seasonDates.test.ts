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

// Every distinct value in the live resorts table on 2026-09-23 across
// season_open_text, season_close_text, typical_season_start and
// typical_season_end (read-only PostgREST query: 397 rows, 325 with
// season text, 94 distinct phrasings; the "×N" is how many cells use
// it). Each must parse to the expected month; day precision is checked
// separately below. Regenerate this list from the DB when new phrasings
// land — the guarantee is only worth something while it is complete.
const DB_PHRASINGS: Array<[string, number]> = [
  ["Late March", 2], // ×103
  ["Mid-December", 11], // ×102
  ["Early December", 11], // ×80
  ["Late November", 10], // ×66
  ["March 14, 2027", 2], // ×56
  ["Mid-March", 2], // ×56
  ["March 21, 2027", 2], // ×53
  ["December 4, 2026", 11], // ×50
  ["Early April", 3], // ×49
  ["Mid-April", 3], // ×48
  ["March 28, 2027", 2], // ×47
  ["April 4, 2027", 3], // ×38
  ["April 11, 2027", 3], // ×34
  ["December 12, 2026", 11], // ×32
  ["December 11, 2026", 11], // ×31
  ["March 7, 2027", 2], // ×30
  ["Mid-November", 10], // ×30
  ["Late December", 11], // ×29
  ["December 26, 2026", 11], // ×28
  ["Early March", 2], // ×28
  ["November 27, 2026", 10], // ×28
  ["December 5, 2026", 11], // ×23
  ["December 19, 2026", 11], // ×20
  ["December 18, 2026", 11], // ×18
  ["November 20, 2026", 10], // ×16
  ["April 18, 2027", 3], // ×15
  ["November 28, 2026", 10], // ×12
  ["November 21, 2026", 10], // ×11
  ["Early May", 4], // ×10
  ["Late April", 3], // ×10
  ["November 26, 2026", 10], // ×8
  ["April 25, 2027", 3], // ×7
  ["April 3, 2027", 3], // ×7
  ["May 2, 2027", 4], // ×6
  ["Late May", 4], // ×5
  ["November 13, 2026", 10], // ×5
  ["November 25, 2026", 10], // ×5
  ["December 9, 2026", 11], // ×4
  ["Early November", 10], // ×3
  ["Late October", 9], // ×3
  ["May 9, 2027", 4], // ×3
  ["November 6, 2026", 10], // ×3
  ["April", 3], // ×2
  ["April 30, 2027", 3], // ×2
  ["December", 11], // ×2
  ["December 2, 2026", 11], // ×2
  ["December 30, 2026", 11], // ×2
  ["December 6, 2026", 11], // ×2
  ["March", 2], // ×2
  ["May 16, 2027", 4], // ×2
  ["May 23, 2027", 4], // ×2
  ["May 24, 2027", 4], // ×2
  ["Mid-May", 4], // ×2
  ["November 11, 2026", 10], // ×2
  ["November 14, 2026", 10], // ×2
  ["November 15, 2026", 10], // ×2
  ["November 22, 2026", 10], // ×2
  ["April 10, 2027", 3], // ×1
  ["April 12, 2027", 3], // ×1
  ["April 2, 2027", 3], // ×1
  ["April 24, 2027", 3], // ×1
  ["April 9, 2027", 3], // ×1
  ["Day after Thanksgiving", 10], // ×1
  ["December 16, 2026", 11], // ×1
  ["December 20, 2026", 11], // ×1
  ["December 3, 2026", 11], // ×1
  ["December 31, 2026", 11], // ×1
  ["Early June", 5], // ×1
  ["Early October", 9], // ×1
  ["Early to late May", 4], // ×1
  ["Early/mid April", 3], // ×1
  ["End of April", 3], // ×1
  ["end of March", 2], // ×1
  ["July 19, 2026", 6], // ×1
  ["June 6, 2027", 5], // ×1
  ["March 27, 2027", 2], // ×1
  ["March 29, 2027", 2], // ×1
  ["March 31, 2027", 2], // ×1
  ["May 31, 2027", 4], // ×1
  ["May 5, 2027", 4], // ×1
  ["mid December", 11], // ×1
  ["Mid December", 11], // ×1
  ["mid-April", 3], // ×1
  ["mid-December", 11], // ×1
  ["Mid-July", 6], // ×1
  ["Mid-to-late March", 2], // ×1
  ["November", 10], // ×1
  ["November 18, 2026", 10], // ×1
  ["October 27, 2026", 9], // ×1
  ["October 30, 2026", 9], // ×1
  ["October 31, 2026", 9], // ×1
  ["October 9, 2026", 9], // ×1
  ["Second Sunday in April", 3], // ×1
  ["Second week of December", 11], // ×1
];

// Formats no resort uses today but the parser documents (ISO, US slash,
// spelled-out holiday). Kept apart so the DB list above stays honest.
const EXTRA_PHRASINGS: Array<[string, number]> = [
  ["2026-11-22", 10],
  ["11/22/2026", 10],
  ["Christmas", 11],
  ["mid November", 10],
  ["Late Nov", 10],
];

describe("parseSeasonText — every DB phrasing", () => {
  const today = utc(2026, 8, 23);
  it.each([...DB_PHRASINGS, ...EXTRA_PHRASINGS])("parses %j", (text, month) => {
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

  it("trusts a verified closed flag from the new status jobs, but not the legacy scraper's default false", () => {
    // pipeline package: currently_open=false is evidence only on rows it
    // wrote ('reported' feed or 'no_feed' season derivation).
    const season = parseSeasonDates("Late November", "Mid-April", jan);
    expect(deriveResortStatus({ currently_open: false, snow_report_status: "no_feed" }, season, jan).kind).toBe("closed-season");
    expect(deriveResortStatus({ currently_open: false, snow_report_status: "reported" }, season, jan).kind).toBe("closed-season");
    expect(deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, season, jan).kind).toBe("likely-open");
    // A coming opening still wins over the flag (the flag says "before opening").
    const before = parseSeasonDates("Late November", "Mid-April", utc(2026, 10, 1));
    expect(deriveResortStatus({ currently_open: false, snow_report_status: "no_feed" }, before, utc(2026, 10, 1)).kind).toBe("opens");
    // Lift / trail counts only come from a real report.
    const open = deriveResortStatus(
      { currently_open: true, snow_report_status: "no_feed", lifts_open_today: 12, total_lifts: 20 },
      season,
      jan,
    );
    expect(open.kind).toBe("open");
    expect(open.detail ?? "").not.toContain("lifts");
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

describe("one-sided season text", () => {
  const sept = utc(2026, 8, 23);
  const jan = utc(2027, 0, 20);

  it("close-only text never makes a September mountain in-season", () => {
    // Live DB rows: spout-springs "March 31, 2027", loup-loup "end of
    // March", magic-mountain-id "March 21, 2027" — all without open text.
    for (const close of ["March 31, 2027", "end of March", "March 21, 2027"]) {
      const info = parseSeasonDates(null, close, sept);
      expect(info.status, close).toBe("unknown");
      expect(info.nextCloseDate, close).not.toBeNull();
      const s = deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, info, sept);
      expect(s.dormant, close).toBe(true);
      expect(s.kind, close).toBe("off-season");
    }
  });

  it("close-only text is in-season once inside a season-length window", () => {
    const info = parseSeasonDates(null, "March 31, 2027", jan);
    expect(info.status).toBe("in-season");
    expect(info.daysUntilClose).toBe(70);
    // Mid-October is past the summer switch but more than 150 days
    // before a late-March close, so it is still too early to assume lifts.
    expect(parseSeasonDates(null, "March 31, 2027", utc(2026, 9, 20)).status).toBe("unknown");
  });

  it("open-only text stays in-season through the winter (Mt Lemmon)", () => {
    const winter = parseSeasonDates("mid December", null, jan);
    expect(winter.status).toBe("in-season");
    expect(ymd(winter.nextOpenDate)).toBe("2026-12-15");
    expect(deriveResortStatus({ currently_open: false, snow_report_status: "unknown" }, winter, jan).kind).toBe("likely-open");
    // Opening day itself.
    expect(parseSeasonDates("mid December", null, utc(2026, 11, 15)).status).toBe("in-season");
    // September counts down; late May (over 150 days after Dec 15, and
    // summer) counts down to the next December.
    const preseason = parseSeasonDates("mid December", null, sept);
    expect(preseason.status).toBe("off-season");
    expect(ymd(preseason.nextOpenDate)).toBe("2026-12-15");
    const may = parseSeasonDates("mid December", null, utc(2027, 4, 20));
    expect(may.status).toBe("off-season");
    expect(ymd(may.nextOpenDate)).toBe("2027-12-15");
  });
});

describe("explicit years roll into later seasons", () => {
  it("re-anchors a stale 'Month D, YYYY' pair on the current season", () => {
    // Read in September 2028: the 2026-27 dates are two seasons old.
    const pre = parseSeasonDates("November 27, 2026", "March 28, 2027", utc(2028, 8, 1));
    expect(pre.status).toBe("off-season");
    expect(ymd(pre.nextOpenDate)).toBe("2028-11-27");
    expect(ymd(pre.nextCloseDate)).toBe("2029-03-28");
    expect(pre.approximate).toBe(true);
    const mid = parseSeasonDates("November 27, 2026", "March 28, 2027", utc(2029, 0, 15));
    expect(mid.status).toBe("in-season");
    expect(ymd(mid.nextCloseDate)).toBe("2029-03-28");
    // Shortly after the 2027 close the pair is still exact (not stale).
    const spring = parseSeasonDates("November 27, 2026", "March 28, 2027", utc(2027, 3, 10));
    expect(spring.status).toBe("off-season");
    expect(spring.approximate).toBe(false);
    expect(ymd(spring.nextOpenDate)).toBe("2027-11-27");
  });

  it("keeps a current explicit year exact", () => {
    const info = parseSeasonDates("December 4, 2026", "April 4, 2027", utc(2026, 8, 23));
    expect(info.approximate).toBe(false);
    expect(ymd(info.nextOpenDate)).toBe("2026-12-04");
  });
});

describe("deriveResortStatus — live report freshness", () => {
  const jan = utc(2027, 0, 20);
  const season = parseSeasonDates("Late November", "Mid-April", jan);

  it("ignores an 'open' report older than a week", () => {
    const stale = deriveResortStatus(
      { currently_open: true, snow_report_status: "open", snow_report_updated_at: "2026-12-01T12:00:00Z" },
      season,
      jan,
    );
    expect(stale.kind).toBe("likely-open");
    const fresh = deriveResortStatus(
      { currently_open: true, snow_report_status: "open", snow_report_updated_at: "2027-01-19T12:00:00Z" },
      season,
      jan,
    );
    expect(fresh.kind).toBe("open");
  });

  it("only shows 'until' from season_end_date when that date is still ahead", () => {
    const past = deriveResortStatus(
      { currently_open: true, snow_report_status: "open", season_end_date: "2026-04-12" },
      parseSeasonDates(null, null, jan),
      jan,
    );
    expect(past.kind).toBe("open");
    expect(past.detail).toBeNull();
    const ahead = deriveResortStatus(
      { currently_open: true, snow_report_status: "open", season_end_date: "2027-04-12" },
      parseSeasonDates(null, null, jan),
      jan,
    );
    expect(ahead.detail).toBe("until Apr 12");
  });
});
