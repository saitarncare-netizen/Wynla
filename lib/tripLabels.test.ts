import { describe, expect, it } from "vitest";
import { pluralize, resortNameFromSlug, tripRouteLabel, tripStopNames } from "./tripLabels";

describe("pluralize", () => {
  it("uses the singular only for exactly one", () => {
    expect(pluralize(1, "day")).toBe("1 day");
    expect(pluralize(3, "day")).toBe("3 days");
    expect(pluralize(0, "day")).toBe("0 days");
  });

  it("takes an irregular plural", () => {
    expect(pluralize(2, "stay", "stays")).toBe("2 stays");
    expect(pluralize(2, "person", "people")).toBe("2 people");
    expect(pluralize(1, "person", "people")).toBe("1 person");
  });
});

describe("resortNameFromSlug", () => {
  it("title-cases a one-word slug (the old 'mohawk' trip)", () => {
    expect(resortNameFromSlug("mohawk")).toBe("Mohawk");
  });

  it("title-cases each hyphenated word", () => {
    expect(resortNameFromSlug("big-sky")).toBe("Big Sky");
    expect(resortNameFromSlug("mammoth-mountain")).toBe("Mammoth Mountain");
    expect(resortNameFromSlug("7-springs")).toBe("7 Springs");
  });

  it("upper-cases a trailing state code, never a leading one", () => {
    expect(resortNameFromSlug("burke-ny")).toBe("Burke NY");
    expect(resortNameFromSlug("big-sky-mt")).toBe("Big Sky MT");
    expect(resortNameFromSlug("mt-bachelor")).toBe("Mt Bachelor");
    // Two letters that are not a state stay a word.
    expect(resortNameFromSlug("mount-xy")).toBe("Mount Xy");
  });

  it("keeps joining words lower case inside the name only", () => {
    expect(resortNameFromSlug("sierra-at-tahoe")).toBe("Sierra at Tahoe");
    expect(resortNameFromSlug("the-canyons")).toBe("The Canyons");
  });

  it("tolerates underscores, stray spaces, capitals and empties", () => {
    expect(resortNameFromSlug("  Jay_Peak ")).toBe("Jay Peak");
    expect(resortNameFromSlug("killington--")).toBe("Killington");
    expect(resortNameFromSlug("")).toBe("");
    expect(resortNameFromSlug("-")).toBe("");
  });
});

describe("tripStopNames", () => {
  const names = new Map([
    ["killington", "Killington"],
    ["stowe", "Stowe"],
  ]);

  it("names stops in route order from the resorts lookup", () => {
    expect(tripStopNames(["killington", "stowe"], names)).toEqual(["Killington", "Stowe"]);
  });

  it("falls back to a readable name for a slug the table no longer has", () => {
    expect(tripStopNames(["mohawk", "killington"], names)).toEqual(["Mohawk", "Killington"]);
  });

  it("collapses adjacent repeats but keeps a later revisit", () => {
    expect(tripStopNames(["killington", "killington", "stowe", "killington"], names)).toEqual([
      "Killington",
      "Stowe",
      "Killington",
    ]);
  });

  it("skips empty slugs and handles a missing array", () => {
    expect(tripStopNames(["", "stowe"], names)).toEqual(["Stowe"]);
    expect(tripStopNames(null, names)).toEqual([]);
    expect(tripStopNames(undefined, names)).toEqual([]);
  });
});

describe("tripRouteLabel", () => {
  it("joins up to three stops with arrows", () => {
    expect(tripRouteLabel([])).toBe("");
    expect(tripRouteLabel(["Killington"])).toBe("Killington");
    expect(tripRouteLabel(["A", "B", "C"])).toBe("A → B → C");
  });

  it("counts the stops it leaves out", () => {
    expect(tripRouteLabel(["A", "B", "C", "D", "E"])).toBe("A → B → C +2");
    expect(tripRouteLabel(["A", "B", "C"], 2)).toBe("A → B +1");
  });
});
