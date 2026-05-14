// Season-dates parser — converts the loosely-typed `season_open_text` and
// `season_close_text` strings on the resorts table into a structured
// SeasonInfo object the UI can render.
//
// Input formats handled (in order of attempt):
//   ISO-ish      "2026-11-22"      → exact
//   US slash     "11/22/2026"      → exact
//   Month Day    "November 22"     → assume current or next year (whichever
//                                    is still in the future)
//   Qualifier+Mo "Late November"   → day 25 of that month (Early=5, Mid=15)
//   Bare month   "November"        → day 15 of that month
//   Anything else → null for that side (status "unknown" if both null)
//
// The window can WRAP year-end — ski resorts open in Nov and close in Apr.
// If parsed `close` < `open` we treat it as "open → close of NEXT year"
// when deciding the in-season status, so a date in February still reads
// as in-season relative to a Nov-open / Apr-close window.

export type SeasonStatus = "in-season" | "off-season" | "unknown";

export type SeasonInfo = {
  status: SeasonStatus;
  /** Days until the NEXT opening date. null when in-season or unknown. */
  daysUntilOpen: number | null;
  /** Days until the season closes. null when off-season or unknown. */
  daysUntilClose: number | null;
  nextOpenDate: Date | null;
  nextCloseDate: Date | null;
};

const MONTH_NAMES: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const QUALIFIER_DAY: Record<string, number> = {
  early: 5,
  mid: 15,
  middle: 15,
  late: 25,
  end: 25,
};

const MS_PER_DAY = 86_400_000;

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function makeUTCDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

/**
 * Parse a single season-text field into a Date.
 *
 * `referenceYear` is the year we anchor on when the text omits a year
 * (e.g. "November 22" or "Late December"). We try `referenceYear` first
 * and roll forward by one year if that date has already passed.
 *
 * `referenceToday` is used to decide whether to roll forward. Defaults
 * to the current date when not provided.
 */
function parseSingleSeasonText(
  text: string | null,
  referenceYear: number,
  referenceToday: Date,
): Date | null {
  if (!text) return null;
  const raw = text.trim();
  if (raw.length === 0) return null;

  // ISO "YYYY-MM-DD"
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    if (isValidYMD(y, m, d)) return makeUTCDate(y, m, d);
  }

  // US slash "M/D/YYYY" or "MM/DD/YYYY"
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const m = Number(usMatch[1]) - 1;
    const d = Number(usMatch[2]);
    let y = Number(usMatch[3]);
    if (y < 100) y += 2000; // "26" → 2026
    if (isValidYMD(y, m, d)) return makeUTCDate(y, m, d);
  }

  // Normalize for textual parsing: strip punctuation, collapse whitespace,
  // lower-case for keyword lookup.
  const cleaned = raw
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length === 0) return null;

  // Try to find a month token + optional qualifier + optional day-of-month.
  let monthIdx: number | null = null;
  let monthTokenIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in MONTH_NAMES) {
      monthIdx = MONTH_NAMES[t];
      monthTokenIdx = i;
      break;
    }
  }
  if (monthIdx === null) return null;

  // Look for a numeric day-of-month adjacent to the month token. Accept
  // "November 22", "Nov 22nd", "22 November" — but ignore 4-digit years.
  let day: number | null = null;
  for (const candidate of [
    tokens[monthTokenIdx + 1],
    tokens[monthTokenIdx - 1],
  ]) {
    if (!candidate) continue;
    const m = candidate.match(/^(\d{1,2})(?:st|nd|rd|th)?$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 31) {
        day = n;
        break;
      }
    }
  }

  // Year token (e.g. "November 22 2026" or "Nov 2026") — optional.
  let parsedYear: number | null = null;
  for (const t of tokens) {
    const m = t.match(/^(\d{4})$/);
    if (m) {
      parsedYear = Number(m[1]);
      break;
    }
  }

  // Qualifier (early/mid/late) — used only when no explicit day.
  if (day === null) {
    for (const t of tokens) {
      if (t in QUALIFIER_DAY) {
        day = QUALIFIER_DAY[t];
        break;
      }
    }
  }

  // Just a month name → assume day 15.
  if (day === null) day = 15;

  // Decide the year. Explicit > referenceYear with rollover.
  let year = parsedYear ?? referenceYear;
  if (!isValidYMD(year, monthIdx, day)) {
    // Clamp invalid day (e.g. Feb 30) to last day of that month.
    day = lastDayOfMonth(year, monthIdx);
  }
  let candidate = makeUTCDate(year, monthIdx, day);

  if (parsedYear === null && candidate < startOfDayUTC(referenceToday)) {
    // Roll forward one year so "November 22" in May 2026 → 2026, not 2025.
    year += 1;
    if (!isValidYMD(year, monthIdx, day)) {
      day = lastDayOfMonth(year, monthIdx);
    }
    candidate = makeUTCDate(year, monthIdx, day);
  }

  return candidate;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 0 || m > 11) return false;
  if (d < 1 || d > lastDayOfMonth(y, m)) return false;
  return true;
}

function lastDayOfMonth(year: number, month: number): number {
  // Day 0 of next month → last day of current month (UTC).
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function diffDays(later: Date, earlier: Date): number {
  return Math.round(
    (startOfDayUTC(later).getTime() - startOfDayUTC(earlier).getTime()) / MS_PER_DAY,
  );
}

/**
 * Parse a resort's season_open_text + season_close_text into a structured
 * SeasonInfo. The `today` arg is mainly for testing — defaults to now.
 */
export function parseSeasonDates(
  openText: string | null,
  closeText: string | null,
  today?: Date,
): SeasonInfo {
  const now = today ?? new Date();
  const todayUTC = startOfDayUTC(now);
  const refYear = todayUTC.getUTCFullYear();

  const open = parseSingleSeasonText(openText, refYear, todayUTC);
  const close = parseSingleSeasonText(closeText, refYear, todayUTC);

  if (!open && !close) {
    return {
      status: "unknown",
      daysUntilOpen: null,
      daysUntilClose: null,
      nextOpenDate: null,
      nextCloseDate: null,
    };
  }

  // If we only have one side, infer status from it alone.
  if (open && !close) {
    const days = diffDays(open, todayUTC);
    if (days <= 0) {
      // Past the open date but no close known — call it in-season w/o close.
      return {
        status: "in-season",
        daysUntilOpen: null,
        daysUntilClose: null,
        nextOpenDate: open,
        nextCloseDate: null,
      };
    }
    return {
      status: "off-season",
      daysUntilOpen: days,
      daysUntilClose: null,
      nextOpenDate: open,
      nextCloseDate: null,
    };
  }
  if (!open && close) {
    const days = diffDays(close, todayUTC);
    if (days < 0) {
      return {
        status: "off-season",
        daysUntilOpen: null,
        daysUntilClose: null,
        nextOpenDate: null,
        nextCloseDate: close,
      };
    }
    return {
      status: "in-season",
      daysUntilOpen: null,
      daysUntilClose: days,
      nextOpenDate: null,
      nextCloseDate: close,
    };
  }

  // Both present. Handle the year-wrap case where close < open in calendar
  // terms (a typical Nov→Apr season). We anchor the "current season window"
  // around today and answer two questions:
  //   - Are we inside a window that opened in the past and hasn't closed?
  //   - If not, when does the next window open?
  //
  // Strategy: build candidate (open, close) pairs across adjacent years and
  // pick the first one whose [open, close] interval contains today, else
  // the one whose open is soonest in the future.
  const o = open!;
  const c = close!;

  const candidates: Array<{ openD: Date; closeD: Date }> = [];
  // Try open as-parsed paired with close in the same season:
  //   - if close > open same year, that's the natural pair
  //   - if close < open, the close belongs to the FOLLOWING year
  for (const oYearDelta of [-1, 0, 1]) {
    const oCandidate = makeUTCDate(
      o.getUTCFullYear() + oYearDelta,
      o.getUTCMonth(),
      o.getUTCDate(),
    );
    const closeYear =
      c.getUTCMonth() < oCandidate.getUTCMonth() ||
      (c.getUTCMonth() === oCandidate.getUTCMonth() &&
        c.getUTCDate() < oCandidate.getUTCDate())
        ? oCandidate.getUTCFullYear() + 1
        : oCandidate.getUTCFullYear();
    const cCandidate = makeUTCDate(closeYear, c.getUTCMonth(), c.getUTCDate());
    candidates.push({ openD: oCandidate, closeD: cCandidate });
  }

  // 1. Window containing today → in-season.
  for (const { openD, closeD } of candidates) {
    if (todayUTC >= openD && todayUTC <= closeD) {
      return {
        status: "in-season",
        daysUntilOpen: null,
        daysUntilClose: diffDays(closeD, todayUTC),
        nextOpenDate: openD,
        nextCloseDate: closeD,
      };
    }
  }

  // 2. Soonest future open → off-season counting down.
  const futureOpens = candidates
    .filter(({ openD }) => openD > todayUTC)
    .sort((a, b) => a.openD.getTime() - b.openD.getTime());
  if (futureOpens.length > 0) {
    const next = futureOpens[0];
    return {
      status: "off-season",
      daysUntilOpen: diffDays(next.openD, todayUTC),
      daysUntilClose: null,
      nextOpenDate: next.openD,
      nextCloseDate: next.closeD,
    };
  }

  // 3. Fallback — shouldn't hit, but degrade gracefully.
  return {
    status: "unknown",
    daysUntilOpen: null,
    daysUntilClose: null,
    nextOpenDate: null,
    nextCloseDate: null,
  };
}

// Short date formatter used by SeasonCountdown. "Nov 22" / "Apr 15".
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// --- Inline sanity checks (uncomment to run via `node --loader ts-node ...` or vitest):
// const may2026 = new Date(Date.UTC(2026, 4, 14));
// console.assert(parseSeasonDates("2026-11-22", "2027-04-15", may2026).status === "off-season");
// console.assert(parseSeasonDates("November 22", "April 15", may2026).daysUntilOpen! > 100);
// console.assert(parseSeasonDates("Late November", "Mid-April", may2026).status === "off-season");
// const feb2026 = new Date(Date.UTC(2026, 1, 1));
// console.assert(parseSeasonDates("Late November", "Mid April", feb2026).status === "in-season");
// console.assert(parseSeasonDates(null, null, may2026).status === "unknown");
// console.assert(parseSeasonDates("Thanksgiving weekend", null, may2026).status === "unknown");
