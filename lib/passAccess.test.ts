import { describe, expect, it } from "vitest";
import {
  blackoutText,
  daysText,
  formatRange,
  formatRanges,
  getAccess,
  getFamilyAccess,
  isBlackedOut,
  isBlackedOutFor,
  productsFor,
  summaryLine,
  PASS_ACCESS_SEASON,
  PASS_ACCESS_VERIFIED_ON,
  type PassProductAccess,
} from "./passAccess";
import {
  buildPassAccess,
  normaliseProduct,
  parseBlackouts,
  parseDateRanges,
  parseDays,
} from "../scripts/build-pass-access.mjs";

// ---------------------------------------------------------------------------
// Parsing (scripts/build-pass-access.mjs)
// ---------------------------------------------------------------------------

describe("parseDateRanges", () => {
  it("parses the Ikon Base list with explicit years", () => {
    expect(parseDateRanges("Dec 26-30 2026, Jan 16-17 2027, Feb 13-14 2027")).toEqual([
      ["2026-12-26", "2026-12-30"],
      ["2027-01-16", "2027-01-17"],
      ["2027-02-13", "2027-02-14"],
    ]);
  });

  it("puts year-less tokens in the right half of the season and keeps single days", () => {
    // Epic's own phrasing: the year sits after the last item of each group
    // and "Jan 16" has no year at all.
    expect(parseDateRanges("peak dates: Nov 27-28, Dec 26-31 2026; Jan 16; Feb 13-14 2027")).toEqual([
      ["2026-11-27", "2026-11-28"],
      ["2026-12-26", "2026-12-31"],
      ["2027-01-16", "2027-01-16"],
      ["2027-02-13", "2027-02-14"],
    ]);
  });

  it("carries the month across bare day tokens and ignores the night-skiing sentence", () => {
    const text =
      "No 9am-3pm day access on Nov 27-29 2026; Dec 5-6, 12-13, 26-31 2026; Jan 1-3, 9-10 2027. Night skiing (3pm on) unrestricted except Dec 24 2026";
    expect(parseDateRanges(text)).toEqual([
      ["2026-11-27", "2026-11-29"],
      ["2026-12-05", "2026-12-06"],
      ["2026-12-12", "2026-12-13"],
      ["2026-12-26", "2026-12-31"],
      ["2027-01-01", "2027-01-03"],
      ["2027-01-09", "2027-01-10"],
    ]);
  });

  it("parses a range across New Year written with two months", () => {
    expect(parseDateRanges("Dec 20 2026 - Jan 4 2027")).toEqual([["2026-12-20", "2027-01-04"]]);
    expect(parseDateRanges("Dec 20 to Jan 4")).toEqual([["2026-12-20", "2027-01-04"]]);
  });

  it("parses Indy's numeric MM/DD/YYYY spellings", () => {
    expect(parseDateRanges("Additional 12/27/2026-01/03/2027, 02/14/2027")).toEqual([
      ["2026-12-27", "2027-01-03"],
      ["2027-02-14", "2027-02-14"],
    ]);
  });

  it("skips parenthetical commentary and dedupes", () => {
    const text =
      "all Saturdays & Sundays + Nov 27 2026, Dec 28-31 2026 (product page); Dec 25 2026 additionally listed on the peak-restricted-dates page - treat as restricted";
    expect(parseDateRanges(text)).toEqual([
      ["2026-11-27", "2026-11-27"],
      ["2026-12-25", "2026-12-25"],
      ["2026-12-28", "2026-12-31"],
    ]);
  });

  it("returns nothing for text with no dates", () => {
    expect(parseDateRanges("none (7 unrestricted days); 50% off 1-day ticket after 7 days used")).toEqual([]);
  });
});

describe("parseBlackouts", () => {
  const unlimited = parseDays("unlimited");
  const seven = parseDays("7");

  it("maps 'none' variants to status none", () => {
    expect(parseBlackouts("none", unlimited).status).toBe("none");
    expect(parseBlackouts("None", seven).status).toBe("none");
    expect(parseBlackouts("none (includes peak dates)", unlimited).status).toBe("none");
    expect(parseBlackouts("n/a (spring only)", unlimited).status).toBe("none");
  });

  it("marks Indy's not-yet-published list as unpublished with a last-season hint", () => {
    const b = parseBlackouts(
      "26/27 dates TBA (Indy announces fall 2026; page shows 'Blackout Dates - View Full List Below'); 25/26 ref: Xmas partial; MLK; Pres; PeakSat",
      parseDays("2"),
    );
    expect(b.status).toBe("unpublished");
    expect(b.ranges).toEqual([]);
    expect(b.lastSeason).toBe(
      "part of Christmas week, MLK weekend, Presidents' Day weekend, peak-season Saturdays",
    );
    expect(parseBlackouts("TBD - 'Blackout dates will be announced in fall of 2026, if any'", parseDays("2")).status).toBe(
      "unpublished",
    );
  });

  it("does not apply blackouts to products with no access", () => {
    expect(parseBlackouts("n/a", parseDays("not included")).status).toBe("not_applicable");
    expect(parseBlackouts("None", parseDays("discount only (Allied)")).status).toBe("not_applicable");
  });

  it("substitutes the published Epic peak list for a bare 'peak dates'", () => {
    const b = parseBlackouts("peak dates", parseDays("5"));
    expect(b.status).toBe("dates");
    expect(b.rangesSource).toBe("epic-peak-list");
    expect(b.ranges[0]).toEqual(["2026-11-27", "2026-11-28"]);
  });

  it("keeps explicit dates as explicit", () => {
    const b = parseBlackouts("Dec 26-30 2026, Jan 16-17 2027, Feb 13-14 2027", parseDays("5"));
    expect(b.rangesSource).toBe("explicit");
    expect(b.ranges).toHaveLength(3);
  });

  it("treats the Epic Day Pass option as conditional", () => {
    const b = parseBlackouts("peak dates if 'no peak' option chosen", parseDays("1-7"));
    expect(b.status).toBe("conditional");
    expect(b.ranges).toHaveLength(4);
  });

  it("parses weekday-only and mixed rules", () => {
    const wk = parseBlackouts("Saturdays and Sundays only", parseDays("weekday access (Mon-Fri) including peak dates"));
    expect(wk.status).toBe("weekdays");
    expect(wk.weekdays.sort()).toEqual([0, 6]);
    const mixed = parseBlackouts("peak dates + all Saturdays", parseDays("6 days/week"));
    expect(mixed.status).toBe("dates");
    expect(mixed.weekdays).toEqual([6]);
    expect(mixed.rangesSource).toBe("epic-peak-list");
  });

  it("falls back to unknown when nothing parses, keeping the text", () => {
    const b = parseBlackouts("some holidays, see resort", parseDays("2"));
    expect(b.status).toBe("unknown");
    expect(b.text).toBe("some holidays, see resort");
  });
});

describe("parseDays", () => {
  it("classifies the dataset's phrasings", () => {
    expect(parseDays("unlimited")).toMatchObject({ kind: "unlimited", short: "unlimited" });
    expect(parseDays("7")).toMatchObject({ kind: "limited", count: 7, short: "7 days" });
    expect(parseDays("1")).toMatchObject({ kind: "limited", count: 1, short: "1 day" });
    expect(parseDays("2/3/4")).toMatchObject({ kind: "range", min: 2, max: 4, short: "2-4 days" });
    expect(parseDays("1-7")).toMatchObject({ kind: "range", min: 1, max: 7, short: "1-7 days" });
    expect(parseDays("not included")).toMatchObject({ kind: "none", short: "not included" });
    expect(parseDays("none")).toMatchObject({ kind: "none" });
    expect(parseDays("discount only (Allied)")).toMatchObject({ kind: "discount" });
    expect(parseDays("2 (Bonus Mountain)")).toMatchObject({ count: 2, qualifier: "full Ikon Pass only" });
    expect(parseDays("2 (not valid at holder's home resort)")).toMatchObject({
      count: 2,
      qualifier: "not valid at your home resort",
    });
    expect(parseDays("10 combined (Vail + Beaver Creek + Whistler Blackcomb)")).toMatchObject({
      count: 10,
      qualifier: "shared across Vail, Beaver Creek and Whistler Blackcomb",
    });
    expect(parseDays("7", { groupLabel: "Killington and Pico" })).toMatchObject({
      qualifier: "shared across Killington and Pico",
    });
    expect(parseDays("weekday access (Mon-Fri) excluding peak dates")).toMatchObject({ kind: "weekdays" });
  });
});

describe("normaliseProduct", () => {
  it("splits tier qualifiers and fixes spellings", () => {
    expect(normaliseProduct("epic", "Epic Day Pass - All / 32 / 22 Resorts tiers")).toEqual({
      product: "Epic Day Pass",
      productKey: "epic-day-pass",
      qualifier: "All / 32 / 22 Resorts tiers",
    });
    expect(normaliseProduct("epic", "Park City Youth Pass (child 5-12)")).toMatchObject({
      product: "Park City Youth Pass",
      qualifier: "child 5-12",
    });
    expect(normaliseProduct("indy", "Indy Base AddOn Pass")).toMatchObject({ productKey: "indy-base-add-on-pass" });
  });

  it("refuses an unknown product so a new roster cannot slip through untyped", () => {
    expect(() => normaliseProduct("ikon", "Ikon Base Plus")).toThrow(/Unknown ikon product/);
  });
});

describe("buildPassAccess", () => {
  const row = (extra: Record<string, unknown>) => ({
    slug: "test-hill",
    resort_name: "Test Hill",
    state: "VT",
    pass_family: "indy",
    product: "Indy Base Pass",
    days: "2",
    blackout_dates: "None",
    reservation_required: false,
    new_for_2026_27: false,
    source_url: "https://www.indyskipass.com/our-resorts/test-hill ; https://example.com/x",
    verified_on: "2026-09-23",
    ...extra,
  });

  it("drops rows without a slug and XC-only product rows, and sorts families and products", () => {
    const { output, dropped } = buildPassAccess(
      [
        row({ product: "Indy+ Pass" }),
        row({ product: "Indy XC Pass", days: "2 XC trail days" }),
        row({ slug: null }),
        row({}),
        row({ pass_family: "ikon", product: "Ikon Base Pass", days: "not included", blackout_dates: "n/a", bonus_mountain: true }),
        row({ pass_family: "ikon", product: "Ikon Pass", days: "2 (Bonus Mountain)", blackout_dates: "Dec 26-30 2026", bonus_mountain: true }),
      ],
      "2026-09-23",
    );
    expect(dropped).toEqual({ noSlug: 1, xcProduct: 1 });
    // The script is untyped JS; assert the shape the loader expects.
    const resorts = output.resorts as Record<string, Record<string, PassProductAccess[]>>;
    const families = Object.keys(resorts["test-hill"]);
    expect(families).toEqual(["ikon", "indy"]);
    expect(resorts["test-hill"].ikon.map((e) => e.productKey)).toEqual(["ikon-pass", "ikon-base-pass"]);
    expect(resorts["test-hill"].indy.map((e) => e.productKey)).toEqual(["indy-base-pass", "indy-plus-pass"]);
    const bonus = resorts["test-hill"].ikon[0];
    expect(bonus.isBonusMountain).toBe(true);
    expect(bonus.sourceUrls).toEqual(["https://www.indyskipass.com/our-resorts/test-hill", "https://example.com/x"]);
    expect(output.verifiedOn).toBe("2026-09-23");
  });
});

// ---------------------------------------------------------------------------
// Loader (lib/passAccess.ts) against the committed dataset
// ---------------------------------------------------------------------------

describe("dataset", () => {
  it("is the 2026-27 season verified on 2026-09-23", () => {
    expect(PASS_ACCESS_SEASON).toBe("2026-27");
    expect(PASS_ACCESS_VERIFIED_ON).toBe("2026-09-23");
  });

  it("covers the four families and lists products in display order", () => {
    for (const slug of ["vail", "alta", "jay-peak", "buck-hill"]) expect(getAccess(slug)).not.toBeNull();
    expect(productsFor("ikon").map((p) => p.productKey)).toEqual([
      "ikon-pass",
      "ikon-base-pass",
      "ikon-session-pass",
    ]);
    expect(productsFor("epic").slice(0, 3).map((p) => p.productKey)).toEqual([
      "epic-pass",
      "epic-local-pass",
      "epic-day-pass",
    ]);
    expect(productsFor("indy").map((p) => p.productKey)).toEqual([
      "indy-base-pass",
      "indy-plus-pass",
      "indy-base-add-on-pass",
      "indy-plus-add-on-pass",
    ]);
    expect(productsFor("mountain_collective")).toEqual([
      { product: "Mountain Collective Pass", productKey: "mountain-collective-pass" },
    ]);
  });

  it("returns null for an unknown slug and an empty list for an unverified family", () => {
    expect(getAccess("no-such-resort")).toBeNull();
    expect(getFamilyAccess("vail", "indy")).toEqual([]);
  });
});

describe("isBlackedOut", () => {
  it("answers from explicit ranges, including the edge days", () => {
    expect(isBlackedOut("alyeska-resort", "Ikon Base Pass", "2026-12-26")).toBe(true);
    expect(isBlackedOut("alyeska-resort", "ikon-base-pass", "2026-12-30")).toBe(true);
    expect(isBlackedOut("alyeska-resort", "Ikon Base Pass", "2026-12-31")).toBe(false);
    expect(isBlackedOut("alyeska-resort", "Ikon Base Pass", "2027-01-16")).toBe(true);
    expect(isBlackedOut("alyeska-resort", "Ikon Base Pass", "2027-03-01")).toBe(false);
  });

  it("is false on a no-blackout product and true on a bonus mountain's Ikon blackout", () => {
    expect(isBlackedOut("alyeska-resort", "Ikon Pass", "2026-12-26")).toBe(false);
    expect(isBlackedOut("buck-hill", "Ikon Pass", "2027-02-13")).toBe(true);
    expect(isBlackedOut("buck-hill", "Ikon Pass", "2027-02-15")).toBe(false);
  });

  it("returns null for unpublished, conditional and no-access products, and for bad input", () => {
    // Indy Base at a resort whose Indy page shows a blackout badge: the
    // 2026-27 list is not out yet, so we must not answer.
    expect(isBlackedOut("beaver-mountain", "Indy Base Pass", "2026-12-27")).toBeNull();
    // Epic Day Pass: depends on whether the no-peak option was bought.
    expect(isBlackedOut("vail", "Epic Day Pass", "2026-12-27")).toBeNull();
    // Ikon Base gives no access at Alta.
    expect(isBlackedOut("alta", "Ikon Base Pass", "2026-12-27")).toBeNull();
    expect(isBlackedOut("vail", "Ikon Pass", "2026-12-27")).toBeNull();
    expect(isBlackedOut("vail", "Epic Pass", "2026-13-01")).toBeNull();
    expect(isBlackedOut("vail", "Epic Pass", "2027-02-30")).toBeNull();
    expect(isBlackedOut("no-such-resort", "Epic Pass", "2026-12-27")).toBeNull();
  });

  it("handles weekday rules and a synthetic range across New Year", () => {
    const entry: PassProductAccess = {
      product: "Test Midweek",
      productKey: "test-midweek",
      qualifier: null,
      days: { text: "weekday access", kind: "weekdays", short: "weekdays" },
      blackouts: {
        status: "dates",
        text: "weekends + Dec 20 2026 - Jan 4 2027",
        ranges: [["2026-12-20", "2027-01-04"]],
        weekdays: [0, 6],
        rangesSource: "explicit",
        lastSeason: null,
      },
      reservationRequired: false,
      isBonusMountain: false,
      sharedWith: null,
      newFor2026_27: false,
      sourceUrls: [],
      verifiedOn: "2026-09-23",
    };
    expect(isBlackedOutFor(entry, "2026-12-31")).toBe(true); // inside the range
    expect(isBlackedOutFor(entry, "2027-01-04")).toBe(true); // last day of the range
    expect(isBlackedOutFor(entry, "2027-01-05")).toBe(false); // Tuesday after
    expect(isBlackedOutFor(entry, "2027-01-09")).toBe(true); // Saturday
    expect(isBlackedOutFor(entry, "2027-01-10")).toBe(true); // Sunday
    expect(isBlackedOutFor(entry, "2027-01-11")).toBe(false); // Monday
  });
});

describe("formatting", () => {
  it("formats ranges the way people write them", () => {
    expect(formatRange(["2026-12-26", "2026-12-30"])).toBe("Dec 26-30");
    expect(formatRange(["2027-01-16", "2027-01-16"])).toBe("Jan 16");
    expect(formatRange(["2026-12-20", "2027-01-04"])).toBe("Dec 20-Jan 4");
    expect(formatRange(["2026-12-20", "2027-01-04"], true)).toBe("Dec 20, 2026-Jan 4, 2027");
    expect(formatRange(["2026-12-26", "2026-12-30"], true)).toBe("Dec 26-30, 2026");
    expect(formatRanges([["2026-12-26", "2026-12-30"], ["2027-01-16", "2027-01-17"]])).toBe(
      "Dec 26-30, Jan 16-17",
    );
  });

  it("writes honest blackout sentences", () => {
    const base = getFamilyAccess("alyeska-resort", "ikon").find((e) => e.productKey === "ikon-base-pass");
    expect(base && blackoutText(base.blackouts)).toBe(
      "Blackout dates: Dec 26-30, 2026; Jan 16-17, 2027; Feb 13-14, 2027",
    );
    const indy = getFamilyAccess("beaver-mountain", "indy").find((e) => e.productKey === "indy-base-pass");
    expect(indy && blackoutText(indy.blackouts)).toMatch(/^2026-27 blackout dates not announced yet · last season: /);
    const day = getFamilyAccess("vail", "epic").find((e) => e.productKey === "epic-day-pass");
    expect(day && blackoutText(day.blackouts)).toMatch(/^Peak dates blacked out only if you buy the no-peak version: Nov 27-28, 2026/);
    const midweek = getFamilyAccess("alpine-valley-oh", "epic").find((e) => e.productKey === "northeast-midweek-pass");
    expect(midweek && blackoutText(midweek.blackouts)).toBe("Not valid on weekends");
  });

  it("writes days with their qualifier", () => {
    const bonus = getFamilyAccess("buck-hill", "ikon")[0];
    expect(daysText(bonus.days)).toBe("2 days · full Ikon Pass only");
    expect(daysText({ text: "unlimited", kind: "unlimited", short: "unlimited" })).toBe("Unlimited");
  });

  it("builds the one-line chip summary", () => {
    expect(summaryLine("alyeska-resort", "ikon")).toBe(
      "Ikon: 7 days · Ikon Base: 5 days, blackouts Dec 26-30, Jan 16-17, Feb 13-14 · Session: 2-4 days, blackouts Dec 26-30, Jan 16-17, Feb 13-14",
    );
    expect(summaryLine("buck-hill", "ikon")).toBe(
      "Ikon: 2 days (full pass only), blackouts Dec 26-30, Jan 16-17, Feb 13-14 · Ikon Base & Session: not included",
    );
    expect(summaryLine("jackson-hole", "ikon")).toMatch(/^Ikon: 7 days \(reservation required\)/);
    expect(summaryLine("vail", "epic")).toMatch(/^Epic: unlimited · Epic Local: 10 days \(shared\), blackouts Nov 27-28, Dec 26-31, Jan 16, Feb 13-14 · Epic Day: 1-7 days, peak dates optional · \+\d more$/);
    expect(summaryLine("vail", "indy")).toBeNull();
  });
});
