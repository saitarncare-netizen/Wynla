// History-entry rules for the phone resort sheet (ResortSheet.tsx) and the
// map's URL writer (MapPage.writeQuery). Pure functions over the
// history.state object and an href string, unit-tested in
// tests/sheetHistory.test.ts.
//
// The sheet pushes ONE entry when it opens, with the same URL as the entry
// under it, so the phone's back gesture closes the sheet instead of
// leaving the map. The hazard: filter taps while the sheet is open rewrite
// the CURRENT entry's URL in place (writeQuery → replaceState). If a UI
// close (×, Escape, flick, ArrowDown) then called history.back(), Next's
// popstate handler would restore the entry underneath, whose URL predates
// those filter taps, and the filters would silently revert. So a UI close
// only goes back when our entry is on top AND its URL is still the one we
// pushed; otherwise it strips our key from the current entry and leaves
// the (already rewritten) URL where it is.

export const SHEET_ID_KEY = "wnSheet";
export const SHEET_HREF_KEY = "wnSheetHref";

type HistoryState = Record<string, unknown>;

function asState(state: unknown): HistoryState | null {
  return state && typeof state === "object" ? (state as HistoryState) : null;
}

/** The sheet entry recorded in a history.state object, if any. `href` is
 *  the URL the entry had when the sheet pushed it; null when unknown
 *  (the key was re-asserted after something dropped it). */
export function readSheetEntry(state: unknown): { id: number; href: string | null } | null {
  const s = asState(state);
  const id = s?.[SHEET_ID_KEY];
  if (typeof id !== "number") return null;
  const href = s?.[SHEET_HREF_KEY];
  return { id, href: typeof href === "string" ? href : null };
}

/** State for the sheet's entry: the existing state plus our two keys. */
export function withSheetEntry(state: unknown, id: number, href: string | null): HistoryState {
  return { ...(asState(state) ?? {}), [SHEET_ID_KEY]: id, [SHEET_HREF_KEY]: href };
}

/** The same state with our keys removed (Next's own keys kept). */
export function withoutSheetEntry(state: unknown): HistoryState {
  const rest: HistoryState = { ...(asState(state) ?? {}) };
  delete rest[SHEET_ID_KEY];
  delete rest[SHEET_HREF_KEY];
  return rest;
}

export type SheetCloseAction =
  /** Our untouched entry is on top: pop it (popstate then closes the sheet). */
  | "back"
  /** Our entry is on top but its URL was rewritten since the push (or the
   *  push URL is unknown): drop our key in place and close directly. */
  | "replace"
  /** Our entry is not on top (a navigation already happened, or the key
   *  was dropped): leave history alone and close directly. */
  | "none";

export function sheetCloseAction(state: unknown, entryId: number, currentHref: string): SheetCloseAction {
  const entry = readSheetEntry(state);
  if (!entry || entry.id !== entryId) return "none";
  return entry.href !== null && entry.href === currentHref ? "back" : "replace";
}

// Keys Next.js' app router keeps in history.state. When one of them is in
// the object passed to its patched replaceState, Next assumes the call is
// its own and skips syncing useSearchParams with the new URL, so the map's
// URL writer must never pass them through.
const NEXT_KEYS = new Set(["__NA", "_N", "__PRIVATE_NEXTJS_INTERNALS_TREE"]);

/**
 * The non-Next part of history.state, for a replaceState that rewrites the
 * URL but must keep the sheet's entry keys (so a back press still closes
 * the sheet after a filter tap). Null when there is nothing to keep, which
 * is what writeQuery passed before.
 */
export function customHistoryState(state: unknown): HistoryState | null {
  const s = asState(state);
  if (!s) return null;
  const out: HistoryState = {};
  let any = false;
  for (const [k, v] of Object.entries(s)) {
    if (NEXT_KEYS.has(k)) continue;
    out[k] = v;
    any = true;
  }
  return any ? out : null;
}
