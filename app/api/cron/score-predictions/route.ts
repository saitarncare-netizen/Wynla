// Prediction-ledger scorer, on demand.
//
// The daily refresh-weather run already scores every pending target day
// through UTC yesterday at the end of each pass (see that route and
// lib/predictionLog scorePendingDays), so this is NOT in vercel.json. It
// exists for two cases: backfilling a stretch of days older than the
// refresh's lookback after an outage, and re-running the scorer by hand
// while reviewing the numbers. Same auth as every cron (Authorization:
// Bearer CRON_SECRET).
//
// Query params: none = the same pending-days pass the refresh does;
// ?date=YYYY-MM-DD (one target day); ?from=YYYY-MM-DD&to=YYYY-MM-DD
// (inclusive range, oldest first, at most 31 days, stops early when the
// budget runs low). Scoring is idempotent: a row is only scored once, and
// re-running a day only touches rows that are still unscored.

import { runCron, type CronContext } from "@/lib/cronRun";
import { scoreDay, scorePendingDays, type LedgerScoreResult } from "@/lib/predictionLog";
import { shiftDate } from "@/lib/weather/time";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_RANGE_DAYS = 31;
const DAY_FLOOR_MS = 15_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function datesFrom(url: URL, now: Date): string[] | null | { error: string } {
  const one = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const todayUtc = now.toISOString().slice(0, 10);
  if (one) {
    if (!DATE_RE.test(one)) return { error: "date must be YYYY-MM-DD" };
    return [one];
  }
  if (from || to) {
    const start = from ?? shiftDate(todayUtc, -MAX_RANGE_DAYS);
    const end = to ?? shiftDate(todayUtc, -1);
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) return { error: "from/to must be YYYY-MM-DD" };
    if (start > end) return { error: "from must not be after to" };
    const out: string[] = [];
    for (let d = start; d <= end && out.length < MAX_RANGE_DAYS; d = shiftDate(d, 1)) out.push(d);
    return out;
  }
  // No params: whatever is pending, exactly as the daily run does it.
  return null;
}

function summarize(days: LedgerScoreResult[], stopped: string | null, extra: Record<string, unknown>) {
  const errors = days.flatMap((d) => d.errors.map((e) => `${d.date}: ${e}`));
  const totals = days.reduce(
    (t, d) => ({
      candidates: t.candidates + d.candidates,
      scored: t.scored + d.scored,
      closed_unobserved: t.closed_unobserved + d.closed_unobserved,
      pending: t.pending + d.pending,
      surface_hits: t.surface_hits + d.surface_hits,
      surface_compared: t.surface_compared + d.surface_compared,
    }),
    { candidates: 0, scored: 0, closed_unobserved: 0, pending: 0, surface_hits: 0, surface_compared: 0 },
  );
  const available = days.length === 0 ? stopped !== "ledger_table_missing" : days[days.length - 1].available;
  return {
    ok: errors.length === 0 && available,
    reason: errors.length ? "score_errors" : !available ? "ledger_table_missing" : undefined,
    available,
    stopped,
    processed: days.length,
    ...extra,
    ...totals,
    days: days.map((d) => ({ ...d, errors: d.errors.length })),
    error_sample: errors.slice(0, 8),
  };
}

async function score(ctx: CronContext, request: Request) {
  const dates = datesFrom(new URL(request.url), ctx.startedAt);
  if (dates !== null && !Array.isArray(dates)) return { ok: false, reason: dates.error };
  const opts = { msLeft: ctx.msLeft };

  if (dates === null) {
    const through = shiftDate(ctx.startedAt.toISOString().slice(0, 10), -1);
    const r = await scorePendingDays(ctx.supabase, through, ctx.startedAt, opts);
    return summarize(r.days, r.available ? r.stopped : "ledger_table_missing", { mode: "pending", from: r.from, through });
  }

  const days: LedgerScoreResult[] = [];
  let stopped: string | null = null;
  for (const date of dates) {
    if (ctx.msLeft() < DAY_FLOOR_MS) {
      stopped = "out_of_time";
      break;
    }
    const r = await scoreDay(ctx.supabase, date, ctx.startedAt, opts);
    days.push(r);
    if (!r.available) {
      stopped = "ledger_table_missing";
      break;
    }
    if (r.stopped) {
      stopped = r.stopped;
      break;
    }
  }
  return summarize(days, stopped, { mode: "dates", requested: dates.length });
}

export async function GET(request: Request) {
  return runCron(request, "score-predictions", maxDuration, (ctx) => score(ctx, request));
}
