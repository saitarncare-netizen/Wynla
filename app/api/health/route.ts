// Public pipeline health: is the weather / history / snow-report data
// fresh? No secret needed — the response is aggregate freshness only
// (no user data, no keys). External pingers (UptimeRobot, the GitHub
// workflow, the founder's phone) can watch it: HTTP 200 = fresh,
// 503 = stale or dead, so a dumb HTTP monitor alerts for free.
//
// ?notify=1 additionally emails the founder when unhealthy (deduped to
// once per 12 h via cron_runs / a sentinel row). The GitHub workflow
// calls it that way after each refresh.

import { NextResponse } from "next/server";
import { computeHealth, getServiceClient, notifyIfUnhealthy } from "@/lib/cronRun";
import { ledgerSummary, type LedgerSummary } from "@/lib/predictionLog";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

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
  try {
    const health = await computeHealth(supabase);
    const alert = notify ? await notifyIfUnhealthy(supabase, health) : null;
    // Prediction-ledger counts are informational: they never change the
    // verdict, and a missing table reads as available:false, not stale.
    // The 7-day hit rate is withheld (null) below MIN_RATE_SAMPLE rows.
    let ledger: LedgerSummary | null = null;
    try {
      ledger = await ledgerSummary(supabase);
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
