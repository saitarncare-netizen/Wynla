// Season-dates parser — converts the loosely-typed `season_open_text` /
// `season_close_text` (and the legacy `typical_season_start` /
// `typical_season_end`) strings on the resorts table into a structured
// SeasonInfo the UI can render, plus the resort-status derivation the
// resort page and map panel share.
//
// Input formats handled (in order of attempt):
//   ISO-ish        "2026-11-22"              → exact
//   US slash       "11/22/2026"              → exact
//   Named holiday  "Thanksgiving", "Day after Thanksgiving", "Christmas",
//                  "Memorial Day", "Presidents' Day", "Easter" → computed
//                  per year (nth-weekday / computus), so they roll correctly
//                  into every future season
//   Nth weekday    "Second Sunday in April", "Last Saturday of March",
//                  "Second week of December"
//   Month Day      "November 22", "Nov 22nd", "May 17", "17th of May"
//   Qualifier+Mo   "Late November", "Mid-November", "mid November",
//                  "early/mid April", "Mid-to-late March", "end of March"
//   Bare month     "November"               → day 15 of that month
//   Anything else  → null for that side (status "unknown" if both null)
//
// Hyphens, en/em dashes and slashes are treated as separators, so
// "Mid-November" and "Mid November" parse identically (audit finding
// domain-logic-24: the hyphenated form — the DB's own documented example
// — used to fail and hide the countdown on every resort that used it).
//
// Years are never hard-coded: a text without a year is anchored on the
// reference year and rolled forward when the date has already passed,
// so "Late November" read in September 2027 means November 2027, and read
// in December 2027 means November 2028. An explicit year more than a
// year in the past ("November 27, 2026" still in the DB in 2028) is
// treated as the resort's habitual month/day and re-anchored the same
// way, flagged approximate.
//
// The window can WRAP year-end — ski resorts open in Nov and close in Apr.
// If parsed `close` < `open` we treat it as "open → close of NEXT year"
// when deciding the in-season status, so a date in February still reads
// as in-season relative to a Nov-open / Apr-close window.

export type SeasonStatus = "in-season" | "off-season" | "unknown";

/**
 * Global "is this currently off-season for most US resorts?" helper.
 *
 * May 1 through Oct 15 (UTC calendar, so the server render and the
 * client hydration agree at month boundaries). Used to gate UI that is
 * pointless in summer (fresh-snow chips, crowd estimates) and to soften
 * per-resort status copy when the scraper has nothing live to say.
 *
 * The window ends mid-October rather than at Halloween on purpose: the
 * earliest US openings (Arapahoe Basin, Loveland, Killington, Wild
 * Mountain) and the first real Rockies storms land in the second half of
 * October, and hiding those behind a "summer" switch was the audit's
 * domain-logic-28 complaint. Per-resort truth (currently_open, snow
 * report status, parsed season dates) always wins over this flag.
 */
export function isGlobalOffSeasonNow(now: Date = new Date()): boolean {
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  if (m >= 4 && m <= 8) return true; // May 1 – Sep 30
  return m === 9 && d <= 15; // Oct 1 – Oct 15
}

export type SeasonInfo = {
  status: SeasonStatus;
  /** Days until the NEXT opening date. null when in-season or unknown. */
  daysUntilOpen: number | null;
  /** Days until the season closes. null when off-season or unknown. */
  daysUntilClose: number | null;
  nextOpenDate: Date | null;
  nextCloseDate: Date | null;
  /** True when at least one side came from a qualifier, bare month or
   *  holiday phrase rather than an explicit day — the UI prefixes "~". */
  approximate: boolean;
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

// Day-of-month a qualifier stands for. When several appear ("mid to
// late", "early/mid") we average them, which lands "mid-to-late March"
// on the 20th and "early/mid April" on the 10th.
const QUALIFIER_DAY: Record<string, number> = {
  beginning: 3,
  start: 3,
  early: 5,
  mid: 15,
  middle: 15,
  late: 25,
  end: 27,
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  last: -1,
};

const MS_PER_DAY = 86_400_000;

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function makeUTCDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

// ---------- Calendar helpers (exported: crowdForecast shares them) ----------

/** Day-of-month of the nth given weekday in a month (n = 1..5). */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const offset = (weekday - first + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}

/** Day-of-month of the last given weekday in a month. */
export function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  const lastDay = lastDayOfMonth(year, month);
  const lastDow = new Date(Date.UTC(year, month, lastDay)).getUTCDay();
  return lastDay - ((lastDow - weekday + 7) % 7);
}

/** US Thanksgiving = fourth Thursday of November. */
export function thanksgivingDate(year: number): Date {
  return makeUTCDate(year, 10, nthWeekdayOfMonth(year, 10, 4, 4));
}

/** Western Easter Sunday (Meeus/Jones/Butcher computus). */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return makeUTCDate(year, month, day);
}

type NamedHoliday = {
  pattern: RegExp;
  date: (year: number) => Date;
};

// Named-holiday phrases the DB uses (or plausibly will). Order matters:
// the more specific "day after thanksgiving" must beat "thanksgiving".
const NAMED_HOLIDAYS: NamedHoliday[] = [
  {
    pattern: /(day after|friday after|weekend of|weekend after)\s+thanksgiving|thanksgiving\s+(weekend|friday)/,
    date: (y) => addDays(thanksgivingDate(y), 1),
  },
  { pattern: /thanksgiving/, date: (y) => thanksgivingDate(y) },
  { pattern: /christmas/, date: (y) => makeUTCDate(y, 11, 25) },
  { pattern: /new\s*years?/, date: (y) => makeUTCDate(y, 0, 1) },
  {
    pattern: /(mlk|martin luther king)/,
    date: (y) => makeUTCDate(y, 0, nthWeekdayOfMonth(y, 0, 1, 3)),
  },
  {
    pattern: /presidents?/,
    date: (y) => makeUTCDate(y, 1, nthWeekdayOfMonth(y, 1, 1, 3)),
  },
  { pattern: /easter/, date: (y) => easterDate(y) },
  {
    pattern: /memorial day/,
    date: (y) => makeUTCDate(y, 4, lastWeekdayOfMonth(y, 4, 1)),
  },
  {
    pattern: /labor day/,
    date: (y) => makeUTCDate(y, 8, nthWeekdayOfMonth(y, 8, 1, 1)),
  },
  {
    pattern: /(columbus|indigenous peoples)/,
    date: (y) => makeUTCDate(y, 9, nthWeekdayOfMonth(y, 9, 1, 2)),
  },
  { pattern: /veterans/, date: (y) => makeUTCDate(y, 10, 11) },
  { pattern: /halloween/, date: (y) => makeUTCDate(y, 9, 31) },
];

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

type ParsedSide = { date: Date; approximate: boolean };

/**
 * Parse a single season-text field into a Date.
 *
 * `referenceYear` is the year we anchor on when the text omits a year.
 * We try `referenceYear` first and roll forward by one year if that date
 * has already passed relative to `referenceToday`.
 */
function parseSingleSeasonText(
  text: string | null | undefined,
  referenceYear: number,
  referenceToday: Date,
): ParsedSide | null {
  if (!text) return null;
  const raw = text.trim();
  if (raw.length === 0) return null;

  // ISO "YYYY-MM-DD"
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    if (isValidYMD(y, m, d)) return { date: makeUTCDate(y, m, d), approximate: false };
    return null;
  }

  // US slash "M/D/YYYY" or "MM/DD/YY"
  const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const m = Number(usMatch[1]) - 1;
    const d = Number(usMatch[2]);
    let y = Number(usMatch[3]);
    if (y < 100) y += 2000; // "26" → 2026
    if (isValidYMD(y, m, d)) return { date: makeUTCDate(y, m, d), approximate: false };
    return null;
  }

  // Normalize for textual parsing: lower-case, drop apostrophes
  // ("Presidents' Day"), turn every separator — including hyphens, dashes
  // and slashes — into whitespace, collapse runs.
  const cleaned = raw
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[.,;:()\-–—/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  if (tokens.length === 0) return null;

  // Explicit 4-digit year anywhere in the phrase (optional).
  let parsedYear: number | null = null;
  for (const t of tokens) {
    const m = t.match(/^(\d{4})$/);
    if (m) {
      parsedYear = Number(m[1]);
      break;
    }
  }

  // Named holidays are year-dependent, so resolve them through the same
  // reference-year / roll-forward path as month phrases.
  for (const h of NAMED_HOLIDAYS) {
    if (h.pattern.test(cleaned)) {
      return rollForward((y) => h.date(y), parsedYear, referenceYear, referenceToday, false);
    }
  }

  // Month token + optional qualifier / ordinal weekday / day-of-month.
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
  const month = monthIdx;

  // "Second Sunday in April" / "Last Saturday of March" / "Second week of
  // December" — ordinal + (weekday | week | weekend) before the month.
  const ordinalIdx = tokens.findIndex((t) => t in ORDINAL_WORDS);
  if (ordinalIdx >= 0 && ordinalIdx < monthTokenIdx) {
    const n = ORDINAL_WORDS[tokens[ordinalIdx]];
    const unit = tokens[ordinalIdx + 1] ?? "";
    if (unit in WEEKDAY_NAMES) {
      const weekday = WEEKDAY_NAMES[unit];
      return rollForward(
        (y) => {
          const day = n === -1 ? lastWeekdayOfMonth(y, month, weekday) : nthWeekdayOfMonth(y, month, weekday, n);
          return makeUTCDate(y, month, Math.min(day, lastDayOfMonth(y, month)));
        },
        parsedYear,
        referenceYear,
        referenceToday,
        false,
      );
    }
    if (unit === "weekend") {
      // The nth weekend = the nth Saturday.
      return rollForward(
        (y) => {
          const day = n === -1 ? lastWeekdayOfMonth(y, month, 6) : nthWeekdayOfMonth(y, month, 6, n);
          return makeUTCDate(y, month, Math.min(day, lastDayOfMonth(y, month)));
        },
        parsedYear,
        referenceYear,
        referenceToday,
        true,
      );
    }
    if (unit === "week") {
      // Middle of the nth week: 1st ≈ 4th, 2nd ≈ 11th, 3rd ≈ 18th, last ≈ 26th.
      const day = n === -1 ? 26 : 4 + (n - 1) * 7;
      return rollForward(
        (y) => makeUTCDate(y, month, Math.min(day, lastDayOfMonth(y, month))),
        parsedYear,
        referenceYear,
        referenceToday,
        true,
      );
    }
  }

  // Numeric day-of-month near the month token: "November 22", "Nov 22nd",
  // "22 November", "17th of May" (two tokens before, across "of").
  let day: number | null = null;
  for (const candidate of [
    tokens[monthTokenIdx + 1],
    tokens[monthTokenIdx - 1],
    tokens[monthTokenIdx - 1] === "of" ? tokens[monthTokenIdx - 2] : undefined,
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
  let approximate = false;

  // Qualifiers (early / mid / late / end …) — used only without an
  // explicit day. Several qualifiers average out ("mid to late" → 20).
  if (day === null) {
    const qualifierDays = tokens.filter((t) => t in QUALIFIER_DAY).map((t) => QUALIFIER_DAY[t]);
    if (qualifierDays.length > 0) {
      day = Math.round(qualifierDays.reduce((a, b) => a + b, 0) / qualifierDays.length);
    }
    approximate = true;
  }

  // Just a month name → assume the middle of the month.
  if (day === null) day = 15;
  const dayFinal = day;

  return rollForward(
    (y) => makeUTCDate(y, month, Math.min(dayFinal, lastDayOfMonth(y, month))),
    parsedYear,
    referenceYear,
    referenceToday,
    approximate,
  );
}

/** An explicit year older than this (relative to the reference date) is
 *  last season's data that nobody refreshed — "November 27, 2026" read
 *  in September 2028. We keep the month/day as the resort's habitual
 *  date and re-anchor the year, flagged approximate so the UI shows "~". */
const STALE_EXPLICIT_YEAR_DAYS = 365;

/** Assumed season length when only one edge is known. ~5 months covers
 *  the typical late-Nov → mid-Apr US season without stretching a March
 *  close back into October. */
const TYPICAL_SEASON_DAYS = 150;

/** A live snow report older than this is not evidence that lifts are
 *  running today; the status derivation then falls back to season text. */
const LIVE_REPORT_MAX_AGE_DAYS = 7;

/** Build the date for `parsedYear ?? referenceYear`; when the year was
 *  implicit (or explicit but more than a year stale) and the date has
 *  already passed, rebuild it for the next year (holidays and
 *  nth-weekdays move, so we recompute, not add 365). */
function rollForward(
  build: (year: number) => Date,
  parsedYear: number | null,
  referenceYear: number,
  referenceToday: Date,
  approximate: boolean,
): ParsedSide {
  const today = startOfDayUTC(referenceToday);
  if (parsedYear !== null) {
    const explicit = build(parsedYear);
    if (diffDays(today, explicit) <= STALE_EXPLICIT_YEAR_DAYS) return { date: explicit, approximate };
    // Fall through: treat the stale explicit date as a month/day template.
    approximate = true;
  }
  let candidate = build(referenceYear);
  if (candidate < today) candidate = build(referenceYear + 1);
  return { date: candidate, approximate };
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

/** Exposed for tests + callers that only need one side (e.g. "when does
 *  it open?" copy). Returns the resolved UTC date or null. */
export function parseSeasonText(text: string | null | undefined, today: Date = new Date()): Date | null {
  const todayUTC = startOfDayUTC(today);
  return parseSingleSeasonText(text, todayUTC.getUTCFullYear(), todayUTC)?.date ?? null;
}

const UNKNOWN_SEASON: SeasonInfo = {
  status: "unknown",
  daysUntilOpen: null,
  daysUntilClose: null,
  nextOpenDate: null,
  nextCloseDate: null,
  approximate: false,
};

/**
 * Parse a resort's season_open_text + season_close_text into a structured
 * SeasonInfo. The `today` arg is mainly for testing — defaults to now.
 */
export function parseSeasonDates(
  openText: string | null | undefined,
  closeText: string | null | undefined,
  today?: Date,
): SeasonInfo {
  const now = today ?? new Date();
  const todayUTC = startOfDayUTC(now);
  const refYear = todayUTC.getUTCFullYear();

  const open = parseSingleSeasonText(openText, refYear, todayUTC);
  const close = parseSingleSeasonText(closeText, refYear, todayUTC);
  const approximate = (open?.approximate ?? false) || (close?.approximate ?? false);

  if (!open && !close) return UNKNOWN_SEASON;

  // One-sided text: we only know when the season starts OR when it ends,
  // so the other edge is guessed from a typical US season length. Both
  // branches also defer to the global summer switch — a close date in
  // March never makes a September mountain "in-season" (review finding:
  // spout-springs / magic-mountain-id showed a green "Likely open" pill
  // and a confident surface class in September from close-only text).
  const summer = isGlobalOffSeasonNow(todayUTC);
  if (open && !close) {
    const days = diffDays(open.date, todayUTC);
    // `open.date` is already rolled forward, so the most recent opening
    // is one year earlier (a few days off for moving holidays, which is
    // fine for a season-length check).
    const lastOpen = makeUTCDate(open.date.getUTCFullYear() - 1, open.date.getUTCMonth(), open.date.getUTCDate());
    const sinceLastOpen = diffDays(todayUTC, lastOpen);
    const openedToday = days <= 0;
    // Mt Lemmon ("mid December", no close text) used to count down to
    // NEXT December all winter long once Dec 15 passed.
    const withinSeason = !summer && sinceLastOpen >= 0 && sinceLastOpen <= TYPICAL_SEASON_DAYS;
    if (openedToday || withinSeason) {
      return {
        status: "in-season",
        daysUntilOpen: null,
        daysUntilClose: null,
        nextOpenDate: openedToday ? open.date : lastOpen,
        nextCloseDate: null,
        approximate,
      };
    }
    return {
      status: "off-season",
      daysUntilOpen: days,
      daysUntilClose: null,
      nextOpenDate: open.date,
      nextCloseDate: null,
      approximate,
    };
  }
  if (!open && close) {
    const days = diffDays(close.date, todayUTC);
    if (days < 0) {
      return {
        status: "off-season",
        daysUntilOpen: null,
        daysUntilClose: null,
        nextOpenDate: null,
        nextCloseDate: close.date,
        approximate,
      };
    }
    if (!summer && days <= TYPICAL_SEASON_DAYS) {
      return {
        status: "in-season",
        daysUntilOpen: null,
        daysUntilClose: days,
        nextOpenDate: null,
        nextCloseDate: close.date,
        approximate,
      };
    }
    // Too early to assume lifts are running: the status stays unknown
    // (so the pill falls through to off-season / check-resort) but the
    // close date is kept for the season-preview copy.
    return { ...UNKNOWN_SEASON, nextCloseDate: close.date, approximate };
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
  const o = open!.date;
  const c = close!.date;

  const candidates: Array<{ openD: Date; closeD: Date }> = [];
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
        approximate,
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
      approximate,
    };
  }

  // 3. Fallback — shouldn't hit, but degrade gracefully.
  return UNKNOWN_SEASON;
}

/** The season-text columns a resort row may carry. `typical_*` are the
 *  legacy pair (21 rows have them without the newer `season_*` pair). */
export type SeasonTextSource = {
  season_open_text?: string | null;
  season_close_text?: string | null;
  typical_season_start?: string | null;
  typical_season_end?: string | null;
};

/** Per-side fallback from `season_*` to `typical_season_*`, then parse. */
export function resolveSeasonInfo(r: SeasonTextSource, today?: Date): SeasonInfo {
  return parseSeasonDates(
    r.season_open_text ?? r.typical_season_start ?? null,
    r.season_close_text ?? r.typical_season_end ?? null,
    today,
  );
}

/** Human window for the season-preview card: "late November – mid April"
 *  from the raw texts, or null when neither side is known. */
export function seasonWindowText(r: SeasonTextSource): string | null {
  const open = (r.season_open_text ?? r.typical_season_start ?? "").trim();
  const close = (r.season_close_text ?? r.typical_season_end ?? "").trim();
  if (!open && !close) return null;
  if (open && close) return `${open} – ${close}`;
  return open ? `opens ${open}` : `closes ${close}`;
}

// ---------- Resort status (shared by the resort page + map panel) ----------

export type ResortStatusKind =
  | "open"
  | "limited"
  | "opens"
  | "likely-open"
  | "closed-season"
  | "off-season"
  | "closed-permanent"
  | "unknown";

export type ResortStatus = {
  kind: ResortStatusKind;
  /** Short headline, e.g. "Open today", "Opens ~Nov 22". */
  label: string;
  /** Optional second clause, e.g. "in 61 days", "12/20 lifts". */
  detail: string | null;
  /** Visual tone the pill maps to a colour. */
  tone: "green" | "amber" | "red" | "navy" | "muted";
  /** True when the resort is not running lifts today as far as we know —
   *  the gate the surface forecast + crowd estimate use to go dormant. */
  dormant: boolean;
};

export type ResortStatusSource = {
  currently_open?: boolean | null;
  snow_report_status?: string | null;
  operating_status?: string | null;
  lifts_open_today?: number | null;
  total_lifts?: number | null;
  trails_open_today?: number | null;
  total_trails?: number | null;
  season_end_date?: string | null;
  /** When the scraper last wrote snow_report_status; an old stamp makes
   *  an "open" report worthless as evidence for today. */
  snow_report_updated_at?: string | null;
};

/** Is the live snow report fresh enough to say what lifts do TODAY?
 *  No stamp at all is trusted (older rows predate the column). */
function liveReportIsFresh(r: ResortStatusSource, now: Date): boolean {
  if (!r.snow_report_updated_at) return true;
  const stamp = new Date(r.snow_report_updated_at).getTime();
  if (!Number.isFinite(stamp)) return true;
  return now.getTime() - stamp <= LIVE_REPORT_MAX_AGE_DAYS * MS_PER_DAY;
}

/**
 * One status for every resort, in priority order: live scrape → parsed
 * season dates → global calendar → "check resort". Never claims a
 * mountain is open without a live signal.
 */
export function deriveResortStatus(
  r: ResortStatusSource,
  season: SeasonInfo,
  now: Date = new Date(),
): ResortStatus {
  if (r.operating_status === "closed") {
    return { kind: "closed-permanent", label: "Permanently closed", detail: null, tone: "red", dormant: true };
  }
  // A scraped "open" only counts while the scrape is recent; a stale
  // report would otherwise keep a resort "Open today" all summer.
  const fresh = liveReportIsFresh(r, now);
  const report = fresh ? (r.snow_report_status ?? "").toLowerCase() : "";
  if ((fresh && r.currently_open === true) || report === "open") {
    const lifts =
      r.lifts_open_today != null && r.total_lifts != null && r.total_lifts > 0
        ? `${r.lifts_open_today}/${r.total_lifts} lifts`
        : null;
    const trails =
      r.trails_open_today != null && r.total_trails != null && r.total_trails > 0
        ? `${r.trails_open_today}/${r.total_trails} trails`
        : null;
    // resorts.season_end_date is LAST season's date until the scraper
    // refreshes it, so it is only usable as "until …" while still ahead.
    const seasonEnd = r.season_end_date ? new Date(r.season_end_date + "T00:00:00Z") : null;
    const until =
      season.status === "in-season" && season.nextCloseDate
        ? `until ${season.approximate ? "~" : ""}${formatShortDate(season.nextCloseDate)}`
        : seasonEnd && Number.isFinite(seasonEnd.getTime()) && seasonEnd >= startOfDayUTC(now)
          ? `until ${formatShortDate(seasonEnd)}`
          : null;
    return {
      kind: "open",
      label: "Open today",
      detail: [lifts, trails, until].filter(Boolean).join(" · ") || null,
      tone: "green",
      dormant: false,
    };
  }
  if (report === "limited") {
    return { kind: "limited", label: "Limited operations", detail: "Some lifts running", tone: "amber", dormant: false };
  }
  if (season.status === "off-season" && season.nextOpenDate) {
    const days = season.daysUntilOpen;
    return {
      kind: "opens",
      label: `Opens ${season.approximate ? "~" : ""}${formatShortDate(season.nextOpenDate)}`,
      detail: days != null && days <= 365 ? (days === 1 ? "tomorrow" : `in ${days} days`) : null,
      tone: "navy",
      dormant: true,
    };
  }
  const globalOff = isGlobalOffSeasonNow(now);
  if (report === "closed") {
    return globalOff
      ? { kind: "off-season", label: "Off-season", detail: "Opening date not published yet", tone: "muted", dormant: true }
      : { kind: "closed-season", label: "Closed for the season", detail: null, tone: "red", dormant: true };
  }
  if (season.status === "in-season") {
    return {
      kind: "likely-open",
      label: "Likely open",
      detail: season.nextCloseDate
        ? `season runs to ${season.approximate ? "~" : ""}${formatShortDate(season.nextCloseDate)} · confirm with resort`
        : "confirm with resort",
      tone: "green",
      dormant: false,
    };
  }
  if (globalOff) {
    return { kind: "off-season", label: "Off-season", detail: "Check resort for opening date", tone: "muted", dormant: true };
  }
  return { kind: "unknown", label: "Check resort", detail: "Live status not available", tone: "muted", dormant: false };
}

// Short date formatter used by SeasonCountdown + status pills. "Nov 22".
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
