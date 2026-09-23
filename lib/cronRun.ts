// Cron plumbing shared by every scheduled job: auth, run logging,
// pipeline health and founder alerts.
//
// Why this exists: for 43 days in summer 2026 the weather cron returned
// 503 on every run and nobody knew, because each cron answered
// `ok: true` unconditionally and nothing persisted a run history. Now:
//   - runCron() wraps a job: it records start/finish/ok/summary in
//     cron_runs (when that table exists — the migration is in
//     handoff-docs/sql/2026-09-23-pipeline.sql and the code
//     feature-detects it), always prints one JSON line to the Vercel
//     log, and answers HTTP 500 when the job reports ok:false so
//     Vercel's own cron-failure email fires too.
//   - computeHealth() answers "is the data fresh?" from the tables
//     themselves (not from the crons' self-reports), with a verdict of
//     fresh / stale / dead and explicit thresholds.
//   - notifyIfUnhealthy() emails the founder at most once per 12 h,
//     deduped through cron_runs (and only when that table exists).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAlertRecipient, sendOpsEmail } from "@/lib/email/resendClient";

export const CRON_JOBS = [
  "refresh-weather",
  "refresh-snow-conditions",
  "check-snow-alerts",
  "daily-digest",
  // Manual / backfill scorer for the prediction ledger; the daily
  // refresh-weather run scores on its own (not scheduled in vercel.json).
  "score-predictions",
] as const;
export type CronJob = (typeof CRON_JOBS)[number] | "health-alert";

/** PostgREST / Postgres codes that mean "that table or column is not there". */
const MISSING_SCHEMA_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);

export function isMissingSchemaError(error: { code?: string | null } | null | undefined): boolean {
  return !!error?.code && MISSING_SCHEMA_CODES.has(error.code);
}

let cronRunsAvailable: boolean | null = null;
function noteCronRunsMissing(where: string): void {
  if (cronRunsAvailable !== false) {
    cronRunsAvailable = false;
    console.warn(
      `[cronRun] cron_runs table is missing (${where}); run handoff-docs/sql/2026-09-23-pipeline.sql to enable run history`,
    );
  }
}

// ---------- auth + client ----------

/** Vercel Cron sends "Authorization: Bearer ${CRON_SECRET}"; so does the
 *  GitHub Actions workflow and the local trigger script. Fails closed. */
export function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cronRun] CRON_SECRET is not configured; refusing to run");
    return NextResponse.json({ ok: false, reason: "cron_secret_not_configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  return null;
}

export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------- run logging ----------

export type CronSummary = { ok: boolean; reason?: string } & Record<string, unknown>;

export type CronContext = {
  supabase: SupabaseClient;
  startedAt: Date;
  /** Milliseconds left before the route's deadline (maxDuration minus safety margin). */
  msLeft: () => number;
};

const SAFETY_MARGIN_MS = 45_000;

async function recordStart(supabase: SupabaseClient, job: CronJob, startedAt: Date): Promise<number | null> {
  if (cronRunsAvailable === false) return null;
  const { data, error } = await supabase
    .from("cron_runs")
    .insert({ job, started_at: startedAt.toISOString() })
    .select("id")
    .single();
  if (error) {
    if (isMissingSchemaError(error)) noteCronRunsMissing("insert");
    else console.warn(`[cronRun] cron_runs insert failed: ${error.message}`);
    return null;
  }
  cronRunsAvailable = true;
  return (data as { id: number }).id;
}

async function recordFinish(
  supabase: SupabaseClient,
  id: number | null,
  finishedAt: Date,
  durationMs: number,
  summary: CronSummary,
  errorText: string | null,
): Promise<void> {
  if (id === null) return;
  const { error } = await supabase
    .from("cron_runs")
    .update({
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      ok: summary.ok,
      summary,
      error: errorText,
    })
    .eq("id", id);
  if (error) console.warn(`[cronRun] cron_runs update failed: ${error.message}`);
}

/**
 * Run a cron job with auth, run history and a one-line log. The handler
 * returns its summary; `ok:false` maps to HTTP 500.
 */
export async function runCron(
  request: Request,
  job: CronJob,
  maxDurationSec: number,
  handler: (ctx: CronContext) => Promise<CronSummary>,
): Promise<NextResponse> {
  const denied = checkCronAuth(request);
  if (denied) return denied;
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "missing supabase env" }, { status: 503 });
  }
  const startedAt = new Date();
  const deadline = startedAt.getTime() + maxDurationSec * 1000 - SAFETY_MARGIN_MS;
  const runId = await recordStart(supabase, job, startedAt);
  let summary: CronSummary;
  let errorText: string | null = null;
  try {
    summary = await handler({ supabase, startedAt, msLeft: () => deadline - Date.now() });
  } catch (e) {
    errorText = String((e as Error)?.message ?? e).slice(0, 500);
    summary = { ok: false, reason: errorText };
  }
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  await recordFinish(supabase, runId, finishedAt, durationMs, summary, errorText);
  console.log(JSON.stringify({ cron: job, duration_ms: durationMs, ...summary }));
  return NextResponse.json({ job, duration_ms: durationMs, ...summary }, { status: summary.ok ? 200 : 500 });
}

// ---------- health ----------

export type HealthVerdict = "fresh" | "stale" | "dead";

export type LastRun = {
  job: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  duration_ms: number | null;
  summary: Record<string, unknown> | null;
};

export type PipelineHealth = {
  verdict: HealthVerdict;
  checked_at: string;
  thresholds: { fresh_hours: number; dead_hours: number; min_fresh_share: number };
  active_resorts: number;
  weather: {
    latest_fetched_at: string | null;
    age_hours: number | null;
    fresh_rows: number;
    fresh_share: number;
    failed_rows: number;
  };
  history: {
    latest_observed_date: string | null;
    rows_for_latest_date: number;
    age_days: number | null;
  };
  snow_report: {
    latest_updated_at: string | null;
    age_hours: number | null;
    status_counts: Record<string, number>;
    open_known: number;
  };
  cron_runs: { available: boolean; last: LastRun[] };
  problems: string[];
};

/** Longer than any route's maxDuration (300 s) plus queueing slack. */
const UNFINISHED_RUN_MS = 15 * 60_000;

function envNumber(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.round(((now.getTime() - t) / 3_600_000) * 10) / 10 : null;
}

export async function computeHealth(supabase: SupabaseClient, now: Date = new Date()): Promise<PipelineHealth> {
  // Hobby runs once a day, so "fresh" allows a day plus the cron's flex
  // window. Tighten HEALTH_FRESH_HOURS once the 30-minute workflow runs.
  const freshHours = envNumber("HEALTH_FRESH_HOURS", 26);
  const deadHours = envNumber("HEALTH_DEAD_HOURS", 48);
  const minFreshShare = 0.7;
  const problems: string[] = [];

  const [{ count: activeCount }, latestWx, freshWx, failedWx, latestHist, latestSnow, statuses, openKnown] =
    await Promise.all([
      supabase.from("resorts").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("weather_cache").select("fetched_at").order("fetched_at", { ascending: false }).limit(1),
      supabase
        .from("weather_cache")
        .select("resort_id", { count: "exact", head: true })
        .gte("fetched_at", new Date(now.getTime() - freshHours * 3_600_000).toISOString())
        .neq("fetch_source", "failed"),
      supabase.from("weather_cache").select("resort_id", { count: "exact", head: true }).eq("fetch_source", "failed"),
      supabase.from("weather_history").select("observed_date").order("observed_date", { ascending: false }).limit(1),
      supabase
        .from("resorts")
        .select("snow_report_updated_at")
        .eq("active", true)
        .not("snow_report_updated_at", "is", null)
        .order("snow_report_updated_at", { ascending: false })
        .limit(1),
      supabase.from("resorts").select("snow_report_status").eq("active", true),
      supabase.from("resorts").select("id", { count: "exact", head: true }).eq("active", true).not("currently_open", "is", null),
    ]);

  const active = activeCount ?? 0;
  const latestFetched = (latestWx.data?.[0] as { fetched_at?: string } | undefined)?.fetched_at ?? null;
  const wxAge = hoursSince(latestFetched, now);
  const freshRows = freshWx.count ?? 0;
  const freshShare = active > 0 ? Math.round((freshRows / active) * 100) / 100 : 0;

  const latestDate = (latestHist.data?.[0] as { observed_date?: string } | undefined)?.observed_date ?? null;
  let rowsForLatest = 0;
  if (latestDate) {
    const { count } = await supabase
      .from("weather_history")
      .select("id", { count: "exact", head: true })
      .eq("observed_date", latestDate);
    rowsForLatest = count ?? 0;
  }
  const histAgeDays = latestDate
    ? Math.round(((now.getTime() - Date.parse(`${latestDate}T00:00:00Z`)) / 86_400_000) * 10) / 10
    : null;

  const latestSnowAt =
    (latestSnow.data?.[0] as { snow_report_updated_at?: string } | undefined)?.snow_report_updated_at ?? null;
  const statusCounts: Record<string, number> = {};
  for (const r of (statuses.data ?? []) as Array<{ snow_report_status: string | null }>) {
    const k = r.snow_report_status ?? "null";
    statusCounts[k] = (statusCounts[k] ?? 0) + 1;
  }

  let cronAvailable = false;
  const last: LastRun[] = [];
  const runs = await supabase
    .from("cron_runs")
    .select("job, started_at, finished_at, ok, duration_ms, summary")
    .order("started_at", { ascending: false })
    .limit(40);
  if (runs.error) {
    if (isMissingSchemaError(runs.error)) noteCronRunsMissing("health");
    else problems.push(`cron_runs query failed: ${runs.error.message}`);
  } else {
    cronAvailable = true;
    const seen = new Set<string>();
    for (const r of (runs.data ?? []) as LastRun[]) {
      if (seen.has(r.job)) continue;
      seen.add(r.job);
      last.push(r);
    }
  }

  // Verdict.
  let verdict: HealthVerdict = "fresh";
  if (wxAge === null || wxAge > deadHours) {
    verdict = "dead";
    problems.push(wxAge === null ? "weather_cache has no rows" : `weather is ${wxAge} h old`);
  } else if (wxAge > freshHours) {
    verdict = "stale";
    problems.push(`weather is ${wxAge} h old`);
  }
  if (verdict !== "dead" && freshShare < minFreshShare) {
    verdict = "stale";
    problems.push(`only ${Math.round(freshShare * 100)}% of resorts refreshed in the last ${freshHours} h`);
  }
  if (histAgeDays === null || histAgeDays > 3) {
    verdict = verdict === "dead" ? "dead" : "stale";
    problems.push(histAgeDays === null ? "weather_history is empty" : `weather_history latest day is ${histAgeDays} days old`);
  }
  const weatherRun = last.find((r) => r.job === "refresh-weather");
  if (weatherRun && weatherRun.ok === false) {
    if (verdict === "fresh") verdict = "stale";
    problems.push("last refresh-weather run reported failure");
  }
  // A start row with no finish row older than the route's budget means
  // Vercel killed the function (or it crashed outside the try): the
  // summary was never written, which must not read as "no news".
  for (const r of last) {
    if (r.finished_at === null && now.getTime() - Date.parse(r.started_at) > UNFINISHED_RUN_MS) {
      if (verdict === "fresh") verdict = "stale";
      problems.push(`${r.job} run started ${r.started_at} never finished (killed or crashed)`);
    }
  }

  return {
    verdict,
    checked_at: now.toISOString(),
    thresholds: { fresh_hours: freshHours, dead_hours: deadHours, min_fresh_share: minFreshShare },
    active_resorts: active,
    weather: {
      latest_fetched_at: latestFetched,
      age_hours: wxAge,
      fresh_rows: freshRows,
      fresh_share: freshShare,
      failed_rows: failedWx.count ?? 0,
    },
    history: { latest_observed_date: latestDate, rows_for_latest_date: rowsForLatest, age_days: histAgeDays },
    snow_report: {
      latest_updated_at: latestSnowAt,
      age_hours: hoursSince(latestSnowAt, now),
      status_counts: statusCounts,
      open_known: openKnown.count ?? 0,
    },
    cron_runs: { available: cronAvailable, last },
    problems,
  };
}

// ---------- founder alert (deduped 12 h) ----------

const ALERT_DEDUPE_HOURS = 12;

/**
 * Dedupe state lives ONLY in cron_runs (job = 'health-alert'). An earlier
 * design fell back to a sentinel weather_cache row when the table was
 * missing; that row carried fetched_at = now, so the first alert made
 * /api/health report "fresh" for a day and silenced every later alert
 * while the data was actually dead. Without a durable record we do not
 * send at all: a 30-minute workflow would otherwise email the founder
 * 48 times a day. /api/health still answers 503, which any uptime
 * monitor turns into an alarm, and the run log says why no mail went.
 */
async function lastAlertAt(supabase: SupabaseClient): Promise<{ at: string | null; available: boolean }> {
  if (cronRunsAvailable === false) return { at: null, available: false };
  const { data, error } = await supabase
    .from("cron_runs")
    .select("started_at")
    .eq("job", "health-alert")
    .order("started_at", { ascending: false })
    .limit(1);
  if (error) {
    if (isMissingSchemaError(error)) noteCronRunsMissing("alert dedupe");
    else console.warn(`[cronRun] alert dedupe query failed: ${error.message}`);
    return { at: null, available: false };
  }
  cronRunsAvailable = true;
  return { at: (data?.[0] as { started_at?: string } | undefined)?.started_at ?? null, available: true };
}

async function markAlertSent(supabase: SupabaseClient, now: Date, health: PipelineHealth): Promise<boolean> {
  const { error } = await supabase.from("cron_runs").insert({
    job: "health-alert",
    started_at: now.toISOString(),
    finished_at: now.toISOString(),
    ok: true,
    duration_ms: 0,
    summary: { verdict: health.verdict, problems: health.problems },
  });
  if (error) {
    if (isMissingSchemaError(error)) noteCronRunsMissing("alert mark");
    else console.warn(`[cronRun] alert mark failed: ${error.message}`);
    return false;
  }
  return true;
}

export type AlertResult = { sent: boolean; reason: string };

/** Email the founder when the pipeline is stale/dead, at most once per 12 h. */
export async function notifyIfUnhealthy(
  supabase: SupabaseClient,
  health: PipelineHealth,
  now: Date = new Date(),
): Promise<AlertResult> {
  if (health.verdict === "fresh") return { sent: false, reason: "healthy" };
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "RESEND_API_KEY not set" };
  const last = await lastAlertAt(supabase);
  if (!last.available) {
    return { sent: false, reason: "cron_runs table missing; run handoff-docs/sql/2026-09-23-pipeline.sql to enable alerts" };
  }
  if (last.at && now.getTime() - Date.parse(last.at) < ALERT_DEDUPE_HOURS * 3_600_000) {
    return { sent: false, reason: `alert already sent at ${last.at}` };
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";
  const text = [
    `Wynla data pipeline is ${health.verdict.toUpperCase()}.`,
    "",
    ...health.problems.map((p) => `- ${p}`),
    "",
    `Weather: latest refresh ${health.weather.latest_fetched_at ?? "never"} (${health.weather.age_hours ?? "?"} h ago), ${health.weather.fresh_rows}/${health.active_resorts} resorts fresh, ${health.weather.failed_rows} failed.`,
    `History: latest observed date ${health.history.latest_observed_date ?? "none"} (${health.history.rows_for_latest_date} rows).`,
    `Snow report: latest update ${health.snow_report.latest_updated_at ?? "never"}.`,
    "",
    `Details: ${site}/api/health`,
    "Run the job by hand: node scripts/pipeline-trigger.mjs refresh-weather",
  ].join("\n");
  const res = await sendOpsEmail({
    to: getAlertRecipient(),
    subject: `Wynla pipeline ${health.verdict}: ${health.problems[0] ?? "check /api/health"}`,
    text,
  });
  if (!res.ok) return { sent: false, reason: `send failed: ${res.error ?? "unknown"}` };
  const recorded = await markAlertSent(supabase, now, health);
  return { sent: true, reason: recorded ? "sent" : "sent, but the dedupe row could not be written" };
}
