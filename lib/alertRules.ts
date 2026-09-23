// Pure decision rules shared by the snow-alert push cron and the digest
// email cron. Kept dependency-free so they can be unit-tested without a
// database, and so both crons agree on what "operating", "fresh" and
// "worth mailing" mean.
//
// Data contract (pipeline package, 2026-09-23 — see
// handoff-docs/DATA_PIPELINE_2026-09-23.md):
//   resorts.currently_open      true / false only with evidence (a licensed
//                               resort report, operator-declared season
//                               dates, operating_status = 'closed'), null
//                               when we do not know. Never false by default.
//   resorts.snow_report_status  'reported' when a licensed feed read the
//                               resort's own report (then snow_new_24h_in
//                               is the resort's number and
//                               snow_report_updated_at is the resort's own
//                               report time); 'no_feed' otherwise (then
//                               snow_new_24h_in is MEASURED — the NOAA
//                               snowfall analysis / SNOTEL written by
//                               refresh-weather — and snow_report_updated_at
//                               is only the time the season status was
//                               last evaluated).
//
// Vocabulary for copy: a snow number is
//   Reported  — the resort's own snow report (licensed feed);
//   Measured  — NOAA snowfall analysis / SNOTEL at the resort point;
//   Forecast  — NWS weather_cache.snow_24h_in, a forecast not an observation.

import { SURFACE_GLOSSARY, type SurfaceCode } from "@/lib/snowSurface";

export type SnowReportStatus = "reported" | "no_feed";

export type SnowSource = "Reported" | "Measured" | "Forecast";

/** A snow number older than this is treated as stale: no push, and the
 *  digest says so instead of presenting it as today's number. The refresh
 *  jobs run daily, so 36 h tolerates one missed run without going silent
 *  for two. */
export const REPORT_STALE_HOURS = 36;

/** True when a licensed feed read the resort's own report, i.e. the snow
 *  columns are the resort's numbers rather than the measured analysis. */
export function isReportedStatus(status: string | null | undefined): boolean {
  return status === "reported";
}

/** Resorts we consider open for business: only a verified open flag.
 *  null (unknown) is NOT operating — see isStatusKnown. */
export function isResortOperating(currentlyOpen: boolean | null | undefined): boolean {
  return currentlyOpen === true;
}

/** True when we actually know whether the hill runs. null means no
 *  evidence either way (no feed, no declared season dates yet). Callers
 *  keep "unknown" apart from "closed": a push is suppressed in both cases
 *  (never claim a powder day at a hill that may be shut), but a large
 *  unknown count in season means resorts are missing season evidence,
 *  which is fixable data, not a quiet hill. */
export function isStatusKnown(currentlyOpen: boolean | null | undefined): boolean {
  return typeof currentlyOpen === "boolean";
}

/** True when the snow number was written within `maxAgeHours` of `now`.
 *  A missing timestamp is never fresh. */
export function isReportFresh(
  updatedAt: string | Date | null | undefined,
  now: Date,
  maxAgeHours: number = REPORT_STALE_HOURS,
): boolean {
  if (!updatedAt) return false;
  const t = updatedAt instanceof Date ? updatedAt.getTime() : Date.parse(updatedAt);
  if (!Number.isFinite(t)) return false;
  const ageHours = (now.getTime() - t) / 36e5;
  return ageHours >= 0 && ageHours <= maxAgeHours;
}

/** Which kind of number resorts.snow_new_24h_in currently holds. */
export function snowSourceForStatus(status: string | null | undefined): SnowSource {
  return isReportedStatus(status) ? "Reported" : "Measured";
}

/** Friendly status copy for emails and notifications. `offSeason` is the
 *  global May-Oct calendar (lib/seasonDates.isGlobalOffSeasonNow), which
 *  turns a known-closed hill into "Off-season" instead of "Closed". */
export function statusLabel(currentlyOpen: boolean | null | undefined, offSeason = false): string {
  if (currentlyOpen === true) return "Open";
  if (currentlyOpen === false) return offSeason ? "Off-season" : "Closed";
  return "Status unknown";
}

/** SANY surface class code → label, or null when we have no classification. */
export function surfaceLabelForCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const entry = SURFACE_GLOSSARY[code.toUpperCase() as SurfaceCode];
  return entry ? entry.label : null;
}

function localDateKey(d: Date, timeZone?: string): string {
  // en-CA gives YYYY-MM-DD, which is a stable key for "same calendar day".
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Same calendar day in the given IANA zone (defaults to the runtime zone). */
export function isSameLocalDay(a: Date, b: Date, timeZone?: string): boolean {
  return localDateKey(a, timeZone) === localDateKey(b, timeZone);
}

/** "6:05 AM MST" style stamp in the resort's zone, for "as of" copy. */
export function formatResortLocalTime(d: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Push alert eligibility

export type AlertCandidate = {
  thresholdIn: number;
  lastAlertedAt: string | null;
  snowNew24hIn: number | null;
  /** resorts.currently_open — true / false with evidence, null unknown. */
  currentlyOpen: boolean | null;
  /** When the snow number was last written: the resort's report time for
   *  'reported' rows, the weather refresh (weather_cache.fetched_at) for
   *  measured rows. */
  snowUpdatedAt: string | null;
  /** IANA zone of the resort, for the once-per-local-day dedupe. */
  timeZone?: string;
};

export type AlertVerdict =
  | "fire"
  | "unknown_status"
  | "closed"
  | "stale"
  | "below_threshold"
  | "already_today";

/** Why an alert does or does not fire this run. Order matters: a closed
 *  resort with measured snow must read as 'closed', not 'below_threshold',
 *  so the run log explains the silence. 'unknown_status' (currently_open
 *  null) is kept separate from 'closed': the push is still suppressed —
 *  snow falls on shut mountains too and a false "powder day" costs more
 *  trust than a missed one — but a spike in that counter during the season
 *  means resorts are missing season evidence (declared dates or a feed),
 *  which is fixable data, not a quiet hill. */
export function evaluateAlert(c: AlertCandidate, now: Date): AlertVerdict {
  if (!isStatusKnown(c.currentlyOpen)) return "unknown_status";
  if (!isResortOperating(c.currentlyOpen)) return "closed";
  if (!isReportFresh(c.snowUpdatedAt, now)) return "stale";
  if (c.snowNew24hIn == null || c.snowNew24hIn < c.thresholdIn) return "below_threshold";
  if (c.lastAlertedAt) {
    const last = new Date(c.lastAlertedAt);
    if (!Number.isNaN(last.getTime()) && isSameLocalDay(last, now, c.timeZone)) {
      return "already_today";
    }
  }
  return "fire";
}

// ---------------------------------------------------------------------------
// Digest send decision

export type DigestFrequency = "daily" | "weekly";

export type DigestSnapshotInput = {
  /** Resort is verified open (currently_open === true). */
  operating: boolean;
  /** False when we do not know whether the hill runs (currently_open null). */
  statusKnown: boolean;
  /** Fresh, trusted figures only; pass null for stale or missing numbers. */
  snowNew24hIn: number | null;
  snowNew7dIn: number | null;
};

export type DigestVerdict =
  | "send"
  | "empty"
  | "off_season"
  | "unknown_status"
  | "below_threshold";

/**
 * Decide whether a digest is worth sending.
 *   empty           — nothing to show at all
 *   off_season      — no favorite is operating: measured snow at a closed
 *                     hill is not news, and a "no new snow" mail every
 *                     morning all summer is spam
 *   unknown_status  — no favorite is operating AND at least one has an
 *                     unknown open state. Same outcome as off_season
 *                     (skip), counted apart so missing season evidence in
 *                     season shows up in the cron log instead of hiding
 *                     under "off-season"
 *   below_threshold — the user asked to be mailed only for ≥ N in and the
 *                     best favorite is under it
 *   send            — otherwise
 * Only operating resorts count toward the threshold: measured snow at a
 * closed hill is not a reason to open an email. Weekly digests compare
 * the 7-day total, since "did anything fall this week" is the question.
 */
export function decideDigest(
  snapshots: DigestSnapshotInput[],
  thresholdIn: number | null,
  frequency: DigestFrequency,
): { verdict: DigestVerdict; maxNewIn: number } {
  if (snapshots.length === 0) return { verdict: "empty", maxNewIn: 0 };
  const operating = snapshots.filter((s) => s.operating);
  const pick = (s: DigestSnapshotInput) =>
    frequency === "weekly" ? (s.snowNew7dIn ?? s.snowNew24hIn ?? 0) : (s.snowNew24hIn ?? 0);
  const maxNewIn = operating.reduce((m, s) => Math.max(m, pick(s)), 0);
  if (operating.length === 0) {
    const anyUnknown = snapshots.some((s) => !s.statusKnown);
    return { verdict: anyUnknown ? "unknown_status" : "off_season", maxNewIn: 0 };
  }
  const threshold = thresholdIn ?? 0;
  if (threshold > 0 && maxNewIn < threshold) return { verdict: "below_threshold", maxNewIn };
  return { verdict: "send", maxNewIn };
}
