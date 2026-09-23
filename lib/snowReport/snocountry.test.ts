import { describe, expect, it } from "vitest";
import demo from "../weather/__fixtures__/snocountry-demo-vt.json";
import { normalizeResortName, parseFeedNumber } from "./provider";
import { matchItems, normalizeItem, parseReportTime, statusFromCode, type SnoCountryItem } from "./snocountry";

const items = (demo as { items: SnoCountryItem[] }).items;

describe("field mapping (validated against the public demo key on 2026-09-23)", () => {
  it("maps the demo feed to normalized reports", () => {
    const rep = normalizeItem(items[0], 42, new Date("2026-09-23T12:00:00Z"));
    expect(rep.resortId).toBe(42);
    expect(rep.source).toBe("snocountry:802002");
    expect(rep.status).toBe("closed"); // resortStatus 8 = summer operations
    expect(rep.reportedAt).toBe("2026-04-12T18:17:06.000Z"); // 14:17:06 Eastern daylight time
    expect(rep.baseDepthIn).toBeNull(); // blank in the off-season feed
    expect(rep.liftsTotal).toBe(6);
    expect(rep.trailsTotal).toBe(71);
  });

  it("maps an in-season item with ranges", () => {
    const item: SnoCountryItem = {
      id: "802010",
      resortName: "Jay Peak Resort",
      state: "VT",
      reportDateTime: "2027-01-15 06:45:00",
      resortStatus: "1",
      newSnowMin: "4",
      newSnowMax: "6",
      snowLast48Hours: "13-15",
      avgBaseDepthMin: "40",
      avgBaseDepthMax: "60",
      openDownHillTrails: "70",
      openDownHillLifts: "8",
      maxOpenDownHillTrails: "81",
      maxOpenDownHillLifts: "9",
      primarySurfaceCondition: "Packed Powder",
    };
    const rep = normalizeItem(item, 9, new Date("2027-01-15T15:00:00Z"));
    expect(rep.status).toBe("open");
    expect(rep.new24In).toBe(6);
    expect(rep.new48In).toBe(15);
    expect(rep.baseDepthIn).toBe(50);
    expect(rep.liftsOpen).toBe(8);
    expect(rep.liftsTotal).toBe(9);
    expect(rep.trailsOpen).toBe(70);
    expect(rep.surface).toBe("Packed Powder");
    expect(rep.reportedAt).toBe("2027-01-15T11:45:00.000Z"); // Eastern standard time
  });

  it("maps every documented resortStatus code", () => {
    expect(statusFromCode("1")).toBe("open");
    expect(statusFromCode(2)).toBe("open");
    expect(statusFromCode("3")).toBe("open");
    expect(statusFromCode("4")).toBe("unknown");
    expect(statusFromCode("5")).toBe("off-season");
    expect(statusFromCode("6")).toBe("off-season");
    expect(statusFromCode("7")).toBe("closed");
    expect(statusFromCode("8")).toBe("closed");
    expect(statusFromCode(undefined)).toBe("unknown");
  });

  it("parses feed numerics", () => {
    expect(parseFeedNumber("")).toBeNull();
    expect(parseFeedNumber("12")).toBe(12);
    expect(parseFeedNumber("13-15")).toBe(15);
    expect(parseFeedNumber(7)).toBe(7);
    expect(parseFeedNumber("n/a")).toBeNull();
    expect(parseReportTime("bad")).toBeNull();
  });
});

describe("matching feed items to Wynla resorts", () => {
  const resorts = [
    { id: 1, slug: "bolton-valley", name: "Bolton Valley", state: "VT" },
    { id: 2, slug: "bromley-mountain", name: "Bromley Mountain", state: "VT" },
    { id: 3, slug: "burke-mountain", name: "Burke Mountain", state: "VT" },
    { id: 4, slug: "burke-ny", name: "Burke Mountain", state: "NY" },
  ];

  it("matches by state and normalized name", () => {
    const { matched, unmatched } = matchItems(items, resorts);
    expect(matched.map((m) => `${m.item.id}->${m.resort.id}`)).toEqual(["802002->1", "802003->2", "802004->3"]);
    expect(unmatched).toEqual([]);
  });

  it("reports what it could not place instead of guessing", () => {
    const { matched, unmatched } = matchItems(
      [{ id: "1", resortName: "Mystery Hill", state: "VT" }],
      resorts,
    );
    expect(matched).toEqual([]);
    expect(unmatched).toEqual(["Mystery Hill (VT)"]);
  });

  it("normalizes decorations consistently", () => {
    expect(normalizeResortName("Killington Resort")).toBe("killington");
    expect(normalizeResortName("Smugglers' Notch Resort")).toBe("smugglers notch");
    expect(normalizeResortName("Mt. Bohemia")).toBe("mt bohemia");
  });
});
