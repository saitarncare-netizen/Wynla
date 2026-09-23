import { describe, expect, it } from "vitest";
import {
  customHistoryState,
  readSheetEntry,
  sheetCloseAction,
  SHEET_HREF_KEY,
  SHEET_ID_KEY,
  withoutSheetEntry,
  withSheetEntry,
} from "@/components/Map/sheetHistory";

// The phone resort sheet pushes one history entry (same URL) when it
// opens. These cover the rule that decides what a UI close does with it,
// the regression being "tap pin → tap Ikon chip → tap ×" silently
// reverting the Ikon filter because × called history.back().

const MAP = "https://wynla.app/";
const MAP_IKON = "https://wynla.app/?pass=ikon";
// Shape of what Next's app router keeps on every entry.
const NEXT = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { tree: "x" } };

describe("withSheetEntry / readSheetEntry / withoutSheetEntry", () => {
  it("adds the id and push URL without dropping Next's keys", () => {
    const s = withSheetEntry(NEXT, 7, MAP);
    expect(s.__NA).toBe(true);
    expect(s.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({ tree: "x" });
    expect(readSheetEntry(s)).toEqual({ id: 7, href: MAP });
  });
  it("treats a missing push URL as unknown", () => {
    expect(readSheetEntry(withSheetEntry(null, 3, null))).toEqual({ id: 3, href: null });
  });
  it("reads nothing from null, non-objects or foreign state", () => {
    expect(readSheetEntry(null)).toBeNull();
    expect(readSheetEntry("wnSheet")).toBeNull();
    expect(readSheetEntry(NEXT)).toBeNull();
    expect(readSheetEntry({ [SHEET_ID_KEY]: "7" })).toBeNull();
  });
  it("strips only our keys", () => {
    const s = withoutSheetEntry(withSheetEntry(NEXT, 7, MAP));
    expect(s).toEqual(NEXT);
    expect(SHEET_ID_KEY in s).toBe(false);
    expect(SHEET_HREF_KEY in s).toBe(false);
  });
});

describe("sheetCloseAction", () => {
  it("goes back when our untouched entry is on top", () => {
    const state = withSheetEntry(NEXT, 7, MAP);
    expect(sheetCloseAction(state, 7, MAP)).toBe("back");
  });
  it("replaces in place after a filter tap rewrote the URL (no revert)", () => {
    // writeQuery keeps our keys but changes the URL to ?pass=ikon.
    const state = withSheetEntry({}, 7, MAP);
    expect(sheetCloseAction(state, 7, MAP_IKON)).toBe("replace");
  });
  it("replaces in place when the push URL is unknown (key re-asserted)", () => {
    expect(sheetCloseAction(withSheetEntry(NEXT, 7, null), 7, MAP)).toBe("replace");
  });
  it("leaves history alone when our entry is not on top", () => {
    expect(sheetCloseAction(NEXT, 7, MAP)).toBe("none");
    expect(sheetCloseAction(null, 7, MAP)).toBe("none");
    // A different sheet's entry (a later open) is not ours to pop.
    expect(sheetCloseAction(withSheetEntry(NEXT, 8, MAP), 7, MAP)).toBe("none");
  });
});

describe("customHistoryState (MapPage.writeQuery)", () => {
  it("keeps the sheet keys so a back press still closes the sheet", () => {
    const kept = customHistoryState(withSheetEntry(NEXT, 7, MAP));
    expect(readSheetEntry(kept)).toEqual({ id: 7, href: MAP });
  });
  it("drops Next's keys so its replaceState still syncs useSearchParams", () => {
    const kept = customHistoryState({ ...withSheetEntry(NEXT, 7, MAP), _N: true });
    expect(kept).not.toBeNull();
    expect(kept && "__NA" in kept).toBe(false);
    expect(kept && "_N" in kept).toBe(false);
    expect(kept && "__PRIVATE_NEXTJS_INTERNALS_TREE" in kept).toBe(false);
  });
  it("is null when only Next's keys are present (the old behaviour)", () => {
    expect(customHistoryState(NEXT)).toBeNull();
    expect(customHistoryState(null)).toBeNull();
    expect(customHistoryState(undefined)).toBeNull();
  });
  it("tap pin, tap a filter, tap ×: the filter URL survives", () => {
    // 1. The sheet pushes its entry on the plain map URL.
    let state: unknown = withSheetEntry(NEXT, 7, MAP);
    let href = MAP;
    // 2. Filter tap: writeQuery rewrites the URL, keeping our keys.
    state = { ...NEXT, ...(customHistoryState(state) ?? {}) };
    href = MAP_IKON;
    // 3. × must not go back (that would restore MAP).
    expect(sheetCloseAction(state, 7, href)).toBe("replace");
    // 4. After the in-place strip, a second close is a no-op.
    state = withoutSheetEntry(state);
    expect(sheetCloseAction(state, 7, href)).toBe("none");
  });
});
