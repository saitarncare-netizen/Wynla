// Derive resorts.currently_open from what we actually know about the
// season, and ONLY from that. The old scraper wrote currently_open=false
// for every resort it failed to parse, which flipped Vail to "closed"
// on a timeout and blanked the surface forecast for the whole map. The
// contract now: true/false only with evidence, null when we do not know.
//
// Evidence, strongest first:
//   1. A resort-reported status from the licensed feed (open / closed /
//      off-season) — handled by the caller, this module never sees it.
//   2. operating_status = 'closed' (permanently closed) → false.
//   3. Resort-declared season dates (season_open_text / season_close_text):
//      in-season → true, before opening / after closing → false.
//   4. typical_season_* ("Mid-November" / "Mid-April") is a generic
//      expectation, not a declaration: it yields false BEFORE the typical
//      opening (which, once the typical close has passed, is the next
//      season's opening) and null inside the window. It never yields true:
//      the UI renders true as "Open today", and a resort that opens late
//      for lack of snow would otherwise show as open for weeks.
//   5. season_end_date alone: only meaningful between that date and the
//      end of October of the same year ("the season ended, summer now").
//      After that it is last season's date and says nothing.

import { parseSeasonDates } from "@/lib/seasonDates";

export type SeasonEvidence = {
  operating_status: string | null;
  season_open_text: string | null;
  season_close_text: string | null;
  typical_season_start: string | null;
  typical_season_end: string | null;
  season_end_date: string | null;
};

export type SeasonVerdict = {
  currently_open: boolean | null;
  reason: string;
};

function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "Mid-November" → "Mid November"; leaves ISO dates ("2026-12-05") alone. */
function unhyphenate(text: string | null): string | null {
  return text ? text.replace(/([a-z])-(?=[a-z])/gi, "$1 ") : text;
}

export function deriveSeasonStatus(e: SeasonEvidence, today: Date = new Date()): SeasonVerdict {
  if ((e.operating_status ?? "").toLowerCase() === "closed") {
    return { currently_open: false, reason: "operating_status=closed" };
  }
  // The DB stores qualifiers hyphenated ("Mid-November"); the shared
  // parser tokenizes on spaces only, so it would read that as unknown.
  if (e.season_open_text || e.season_close_text) {
    const info = parseSeasonDates(unhyphenate(e.season_open_text), unhyphenate(e.season_close_text), today);
    const span = `${e.season_open_text ?? "?"} to ${e.season_close_text ?? "?"}`;
    if (info.status === "in-season") return { currently_open: true, reason: `season dates (${span})` };
    if (info.status === "off-season") {
      return {
        currently_open: false,
        reason: info.daysUntilOpen !== null ? `before opening (${span})` : `after closing (${span})`,
      };
    }
  }
  if (e.typical_season_start || e.typical_season_end) {
    const info = parseSeasonDates(unhyphenate(e.typical_season_start), unhyphenate(e.typical_season_end), today);
    if (info.status === "off-season" && info.daysUntilOpen !== null) {
      return { currently_open: false, reason: `before typical opening (${e.typical_season_start ?? "?"})` };
    }
    if (info.status !== "unknown") {
      return { currently_open: null, reason: "typical window only (unverified)" };
    }
  }
  if (e.season_end_date) {
    const end = Date.parse(`${e.season_end_date}T00:00:00Z`);
    if (Number.isFinite(end)) {
      const endDate = new Date(end);
      const t = ymdUTC(today);
      const summerEnd = `${endDate.getUTCFullYear()}-10-31`;
      if (t > e.season_end_date && t <= summerEnd) {
        return { currently_open: false, reason: `season ended ${e.season_end_date}` };
      }
    }
  }
  return { currently_open: null, reason: "no season evidence" };
}
