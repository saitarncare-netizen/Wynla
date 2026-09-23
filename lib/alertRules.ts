// Pure decision rules shared by the snow-alert push cron and the digest
// email cron. Kept dependency-free so they can be unit-tested without a
// database, and so both crons agree on what "operating", "fresh" and
// "worth mailing" mean.
//
// Vocabulary (matches the data-accuracy plan): a snow number is
//   Reported  — the resort's own snow report (OnTheSnow parse), which is
//               what snow_new_24h_in holds when snow_report_status is
//               open / limited / closed / off-season;
//   Estimated — the Open-Meteo model fallback, which is what the column
//               holds when the parser could not read a report
//               (snow_report_status = 'unknown');
//   Forecast  — NWS weather_cache.snow_24h_in, a forecast not an observation.

import { SURFACE_GLOSSARY, type SurfaceCode } from "@/lib/snowSurface";

export type SnowReportStatus =
  | "open"
  | "closed"
  | "limited"
  | "off-season"
  | "unknown";

export type SnowSource = "Reported" | "Estimated" | "Forecast";

/** A report older than this is treated as stale: no push, and the digest
 *  says so instead of presenting it as today's number. The snow cron runs
 *  daily, so 36 h tolerates one missed run without going silent for two. */
export const REPORT_STALE_HOURS = 36;

/** Resorts we consider open for business. 'limited' means some lifts are
 *  turning, which is still a day someone might drive for. */
export function isResortOperating(status: string | null | undefined): boolean {
  return status === "open" || status === "limited";
}

/** True when the parser actually read the resort's report. 'unknown' (or
 *  null) is written by refresh-snow-conditions whenever the OnTheSnow
 *  parse fails and only the Open-Meteo fallback ran — a data outage, not
 *  a statement about the hill. Callers must keep the two apart so an
 *  in-season parser break is visible in the run log instead of being
 *  counted as "closed" for months. */
export function isStatusKnown(status: string | null | undefined): boolean {
  return (
    status === "open" || status === "limited" || status === "closed" || status === "off-season"
  );
}

/** True when the snow report was written within `maxAgeHours` of `now`.
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
  return status === "unknown" || status == null ? "Estimated" : "Reported";
}

/** Friendly status copy for emails and notifications. */
export function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case "open":
      return "Open";
    case "limited":
      return "Limited operations";
    case "closed":
      return "Closed";
    case "off-season":
      return "Off-season";
    default:
      return "Status unknown";
  }
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
  snowReportStatus: string | null;
  snowReportUpdatedAt: string | null;
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
 *  resort with modelled snow must read as 'closed', not 'below_threshold',
 *  so the run log explains the silence. 'unknown_status' is kept separate
 *  from 'closed' because it means the report could not be parsed: the
 *  push is still suppressed (the fallback number is a model estimate),
 *  but a spike in that counter during the season is a parser outage to
 *  fix, not a quiet hill. */
export function evaluateAlert(c: AlertCandidate, now: Date): AlertVerdict {
  if (!isStatusKnown(c.snowReportStatus)) return "unknown_status";
  if (!isResortOperating(c.snowReportStatus)) return "closed";
  if (!isReportFresh(c.snowReportUpdatedAt, now)) return "stale";
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
  /** Resort is open or running limited operations. */
  operating: boolean;
  /** False when the parser could not read the report (status 'unknown'). */
  statusKnown: boolean;
  /** Fresh, trusted figures only; pass null for stale or missing reports. */
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
 *   off_season      — no favorite is operating: modelled snow at a closed
 *                     hill is not news, and a "no new snow" mail every
 *                     morning all summer is spam
 *   unknown_status  — no favorite is operating AND at least one has no
 *                     readable report. Same outcome as off_season (skip),
 *                     counted apart so a parser outage in season shows
 *                     up in the cron log instead of hiding under
 *                     "off-season"
 *   below_threshold — the user asked to be mailed only for ≥ N in and the
 *                     best favorite is under it
 *   send            — otherwise
 * Only operating resorts count toward the threshold: modelled snow at a
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
