// Stage 33 — OnTheSnow.com page parser used by the daily
// /api/cron/refresh-snow-conditions scraper.
//
// OnTheSnow is a Next.js app. Each resort page (URL pattern
// `https://www.onthesnow.com/{state-slug}/{resort-slug}/ski-resort`)
// embeds the full snow report inside a `<script id="__NEXT_DATA__">`
// JSON blob that's also what the React page renders from.
//
// Pulling structured JSON is dramatically more reliable than scraping
// rendered HTML: their visual layout has changed at least three times,
// but the underlying `fullResort` shape has been stable for years.
//
// All snow figures from OnTheSnow are in centimetres. We convert to
// inches (rounded to the nearest int, since our resorts columns are
// SMALLINT) before returning.

import { load } from "cheerio";

export type SnowReportStatus =
  | "open"
  | "closed"
  | "limited"
  | "off-season"
  | "unknown";

export type SnowReport = {
  snow_base_depth_in: number | null;
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
  trails_open_today: number | null;
  total_trails_today: number | null;
  lifts_open_today: number | null;
  total_lifts_today: number | null;
  snow_report_status: SnowReportStatus;
};

const EMPTY_REPORT: SnowReport = {
  snow_base_depth_in: null,
  snow_new_24h_in: null,
  snow_new_48h_in: null,
  snow_new_7d_in: null,
  trails_open_today: null,
  total_trails_today: null,
  lifts_open_today: null,
  total_lifts_today: null,
  snow_report_status: "unknown",
};

const CM_TO_IN = 1 / 2.54;
const SNOW_24H_MAX = 100;
const SNOW_48H_MAX = 200;
const SNOW_7D_MAX = 300;
const BASE_DEPTH_MAX = 400;

function cmToInches(cm: unknown, max: number): number | null {
  if (typeof cm !== "number" || !Number.isFinite(cm) || cm < 0) return null;
  const inches = Math.round(cm * CM_TO_IN);
  if (inches < 0) return null;
  return Math.min(inches, max);
}

function safeInt(v: unknown, max = 9999): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  const n = Math.round(v);
  return n > max ? max : n;
}

// Sum the last 7 days from `recent[]`. The array is ordered ascending
// by date; we want the last 7 entries that aren't in the future.
function sumLast7Days(recent: unknown): number | null {
  if (!Array.isArray(recent) || recent.length === 0) return null;
  // Filter to entries with numeric snow + a non-future date string.
  const today = new Date().toISOString().slice(0, 10);
  const valid = recent
    .filter(
      (r): r is { date: string; snow: number } =>
        !!r &&
        typeof r === "object" &&
        typeof (r as { snow?: unknown }).snow === "number" &&
        typeof (r as { date?: unknown }).date === "string" &&
        (r as { date: string }).date <= today,
    )
    .slice(-7);
  if (valid.length === 0) return null;
  const totalCm = valid.reduce((acc, r) => acc + r.snow, 0);
  return cmToInches(totalCm, SNOW_7D_MAX);
}

type FullResort = {
  snow?: { base?: number | null; last24?: number | null; last48?: number | null; last72?: number | null };
  depths?: { base?: number | null; middle?: number | null; summit?: number | null };
  runs?: { open?: number | null; total?: number | null };
  lifts?: { open?: number | null; total?: number | null };
  status?: { openFlag?: number | null; openingDate?: string | null; closingDate?: string | null };
  reportStatus?: number | null;
  recent?: { date: string; snow: number }[];
};

// OnTheSnow's `status.openFlag` / `reportStatus` enum (observed):
//   1 → open
//   2 → closed (often: season hasn't started, or has ended)
//   3 → limited / partial
// We also check the opening/closing date window to distinguish
// "closed for the season" (off-season) from "closed today only".
function deriveStatus(full: FullResort): SnowReportStatus {
  const flag = full?.reportStatus ?? full?.status?.openFlag ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const opening = full?.status?.openingDate ?? null;
  const closing = full?.status?.closingDate ?? null;

  // Off-season window: today is before next opening or after most
  // recent closing date.
  if (opening && today < opening) return "off-season";
  if (closing && today > closing && (!opening || today < opening)) return "off-season";

  if (flag === 1) return "open";
  if (flag === 3) return "limited";
  if (flag === 2) {
    // openFlag=2 inside the operating window means "closed today" not
    // off-season; but if we couldn't tell, off-season is the safer
    // default since this is the modal value during summer.
    if (opening && closing && today >= opening && today <= closing) return "closed";
    return "off-season";
  }
  return "unknown";
}

// Extract and parse the __NEXT_DATA__ JSON. Returns null if the page
// isn't an OnTheSnow Next.js page or the JSON is malformed.
function extractNextData(html: string): unknown {
  // Fast path: regex out the script tag content directly. cheerio is
  // slower and we don't need the full DOM.
  const m = html.match(
    /<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (m && m[1]) {
    try {
      return JSON.parse(m[1]);
    } catch {
      // fall through to cheerio
    }
  }
  try {
    const $ = load(html);
    const txt = $("#__NEXT_DATA__").first().html();
    if (!txt) return null;
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

export function parseOnTheSnowHTML(html: string): SnowReport {
  if (!html || html.length < 200) return { ...EMPTY_REPORT };

  const next = extractNextData(html);
  if (!next || typeof next !== "object") return { ...EMPTY_REPORT };

  const full = (next as {
    props?: { pageProps?: { fullResort?: FullResort } };
  }).props?.pageProps?.fullResort;
  if (!full) return { ...EMPTY_REPORT };

  const status = deriveStatus(full);

  // Off-season: null out snow numbers so we don't surface stale
  // summer leftovers in the UI.
  if (status === "off-season") {
    return { ...EMPTY_REPORT, snow_report_status: "off-season" };
  }

  const baseCm = full.snow?.base ?? full.depths?.base ?? null;
  const new24Cm = full.snow?.last24 ?? null;
  const new48Cm = full.snow?.last48 ?? null;
  // Prefer summing recent[] for 7d since OnTheSnow doesn't expose a
  // 7-day field directly. Falls back to last72 if recent[] is absent.
  const new7d = sumLast7Days(full.recent) ?? cmToInches(full.snow?.last72 ?? null, SNOW_7D_MAX);

  const trailsOpen = safeInt(full.runs?.open);
  const trailsTotal = safeInt(full.runs?.total);
  const liftsOpen = safeInt(full.lifts?.open);
  const liftsTotal = safeInt(full.lifts?.total);

  return {
    snow_base_depth_in: cmToInches(baseCm, BASE_DEPTH_MAX),
    snow_new_24h_in: cmToInches(new24Cm, SNOW_24H_MAX),
    snow_new_48h_in: cmToInches(new48Cm, SNOW_48H_MAX),
    snow_new_7d_in: new7d,
    trails_open_today: trailsOpen,
    total_trails_today: trailsTotal,
    lifts_open_today: liftsOpen,
    total_lifts_today: liftsTotal,
    snow_report_status: status,
  };
}
