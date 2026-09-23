// Public pipeline health: is the weather / history / snow-report data
// fresh? No secret needed — the response is aggregate freshness only
// (no user data, no keys). External pingers (UptimeRobot, the GitHub
// workflow, the founder's phone) can watch it: HTTP 200 = fresh,
// 503 = stale or dead, so a dumb HTTP monitor alerts for free.
//
// ?notify=1 additionally emails the founder when unhealthy (deduped to
// once per 12 h via cron_runs / a sentinel row). The GitHub workflow
// calls it that way after each refresh.
//
// Prediction-ledger block: the public path carries availability and
// volume counts only (is the ledger writing, is it scoring, is the feed
// leaving gaps). The hit counts, the 7-day hit rate and the per-region
// gate table appear only when the request carries the cron bearer token,
// because a rate on a public JSON endpoint could be scraped and quoted as
// Wynla's accuracy before the founder review the ledger doc requires.

import { NextResponse } from "next/server";
import { computeHealth, getServiceClient, notifyIfUnhealthy } from "@/lib/cronRun";
import { ledgerRegionStats, ledgerSummary, MIN_RATE_SAMPLE, type LedgerSummary, type RegionStat } from "@/lib/predictionLog";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const LEDGER_WINDOW_DAYS = 7;

type LedgerBlock = {
  available: boolean;
  window_days: number;
  predictions_logged_24h: number;
  scored_7d: number;
  closed_unobserved_7d: number;
  surface_compared_7d: number;
  // Founder-only (cron bearer token).
  surface_hits_7d?: number;
  surface_hit_rate_7d?: number | null;
  by_region?: Array<RegionStat & { hit_rate: number | null }> | null;
};

function ledgerBlock(s: LedgerSummary, region: RegionStat[] | null | undefined, authorized: boolean): LedgerBlock {
  const block: LedgerBlock = {
    available: s.available,
    window_days: s.window_days,
    predictions_logged_24h: s.predictions_logged_24h,
    scored_7d: s.scored,
    closed_unobserved_7d: s.closed_unobserved,
    surface_compared_7d: s.surface_compared,
  };
  if (!authorized) return block;
  block.surface_hits_7d = s.surface_hits;
  block.surface_hit_rate_7d = s.surface_hit_rate;
  block.by_region =
    region?.map((r) => ({
      ...r,
      hit_rate: r.compared >= MIN_RATE_SAMPLE ? Math.round((r.hits / r.compared) * 1000) / 1000 : null,
    })) ?? null;
  return block;
}

export async function GET(request: Request) {
  const rl = checkRateLimit(`health:${clientIp(request)}`, { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, verdict: "dead", reason: "missing supabase env" }, { status: 503 });
  }
  const notify = new URL(request.url).searchParams.get("notify") === "1";
  // Same bearer token as the crons. Compared inline rather than through
  // checkCronAuth so an unset secret stays quiet on this public path.
  const secret = process.env.CRON_SECRET;
  const authorized = !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
  try {
    const health = await computeHealth(supabase);
    const alert = notify ? await notifyIfUnhealthy(supabase, health) : null;
    // Ledger counts are informational: they never change the verdict,
    // and a missing table reads as available:false, not stale.
    let ledger: LedgerBlock | null = null;
    try {
      const [summary, region] = await Promise.all([
        ledgerSummary(supabase, LEDGER_WINDOW_DAYS),
        authorized ? ledgerRegionStats(supabase) : Promise.resolve(undefined),
      ]);
      ledger = ledgerBlock(summary, region, authorized);
    } catch {
      ledger = null;
    }
    return NextResponse.json(
      { ok: health.verdict === "fresh", ...health, ledger, alert },
      {
        status: health.verdict === "fresh" ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, verdict: "dead", reason: String((e as Error)?.message ?? e).slice(0, 200) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
