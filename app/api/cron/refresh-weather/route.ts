// Weather refresh cron — forecast, observations and measured snow for
// every active resort, stalest first, inside one function budget.
//
// Schedule (see vercel.json + handoff-docs/DATA_PIPELINE_2026-09-23.md):
//   Hobby plan:  once a day at 11:00 UTC (Vercel fires it within the hour).
//   Pro plan:    "*/30 * * * *" in season would be the cadence; until then
//                .github/workflows/refresh.yml hits this route every 30 min
//                with the same CRON_SECRET.
//
// Per resort the work is: NWS gridpoint grid → Open-Meteo at base and
// summit → 1-3 station observations → (once per local day) NOHRSC
// snowfall analyses (24/48/72 h), SNODAS, SNOTEL and the station's daily
// summary for weather_history. See lib/weather/refreshResort.ts.
//
// Budget handling: maxDuration is 300 s (the Hobby ceiling); runCron's
// deadline is 45 s before that. Workers stop picking up resorts when less
// than DISPATCH_FLOOR_MS remain, every resort runs under its own budget
// (RESORT_BUDGET_MS or whatever is left, whichever is smaller) with its
// upstream calls cancelled at the deadline, and every completed batch is
// written immediately. A slow upstream day therefore loses only the tail,
// which the next invocation picks up first because it is then the
// stalest. Resorts attempted within MIN_AGE_MIN are skipped, so an
// overlapping Vercel + GitHub invocation is cheap.
//
// After the writes, the Snow Surface Forecast classifier runs on
// observed history (weather_history, through yesterday) plus today's
// forecast, with the resort-reported base depth + verified open flag as
// snowpack evidence (lib/snowSurface hasSnowpackEvidence — the rain-on-
// old-base and spring-corn rules need them, and the resort page passes
// the same context so the stored class agrees with the page's own call).
// Then the pipeline health check runs and emails the founder if the data
// is stale (deduped to once per 12 h through cron_runs).
//
// Query params (all optional): ?limit=N (max resorts), ?resort=ID (one
// resort), ?force=1 (ignore the 45-minute freshness floor).

import { computeHealth, notifyIfUnhealthy, runCron, type CronContext } from "@/lib/cronRun";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";
import { classifyToday, type DailyWeather, type SurfaceCode } from "@/lib/snowSurface";
import { errorText } from "@/lib/weather/http";
import { findLatestSfav2Set } from "@/lib/weather/nohrsc";
import {
  CACHE_COLUMNS,
  lastAttemptAt,
  makeSfav2Samplers,
  refreshResortWithin,
  RESORT_COLUMNS,
  writeOutcomes,
  type CacheRow,
  type RefreshOutcome,
  type ResortRow,
  type WriteStats,
} from "@/lib/weather/refreshResort";
import { StationDirectory } from "@/lib/weather/stations";
import { localHour } from "@/lib/weather/time";

export const runtime = "nodejs";
export const maxDuration = 300;

const CONCURRENCY = 12;
const FLUSH_EVERY = 25;
const MIN_AGE_MIN = 45;
// Worst case for one resort: first-time station mapping (up to 6 paged
// state listings + 6 liveness probes) on top of the forecast and measured
// calls, each fetch 20-25 s with one retry. 90 s covers the measured
// p95 with margin; the dispatch floor must be at least that so a resort
// started at the floor can still finish before the deadline.
const RESORT_BUDGET_MS = 90_000;
const DISPATCH_FLOOR_MS = 95_000;
const FAIL_SHARE_LIMIT = 0.3;

/** Refresh columns plus what the surface classifier needs: the verified
 *  open flag and the resort-reported base depth (snowpack evidence). */
type ResortWithStatus = ResortRow & { currently_open: boolean | null; snow_base_depth_in: number | null };
type HistoryLite = {
  resort_id: number;
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | null;
  rain_24h_in: number | null;
  precip_24h_in: number | null;
  wind_mph_avg: number | null;
};

/** Stalest GOOD forecast first; among equally stale rows, resorts in their
 *  local morning (05-10) go first because that is when their snow reports
 *  and the 12Z analysis land. */
function priority(cache: CacheRow | undefined, now: Date): number {
  const fetched = cache?.fetched_at ? Date.parse(cache.fetched_at) : 0;
  const ageMin = (now.getTime() - fetched) / 60_000;
  const h = localHour(now, cache?.time_zone ?? null);
  const morningBonus = h >= 5 && h <= 10 ? 90 : 0;
  return ageMin + morningBonus;
}

async function refreshAll(ctx: CronContext, request: Request) {
  const { supabase, startedAt: now } = ctx;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit")) || Infinity;
  const onlyId = Number(url.searchParams.get("resort")) || null;
  const force = url.searchParams.get("force") === "1";

  let resortQuery = supabase
    .from("resorts")
    .select(`${RESORT_COLUMNS}, currently_open, snow_base_depth_in`)
    .eq("active", true);
  if (onlyId) resortQuery = resortQuery.eq("id", onlyId);
  const [{ data: resortsData, error: resortsErr }, { data: cacheData, error: cacheErr }] = await Promise.all([
    resortQuery,
    supabase.from("weather_cache").select(CACHE_COLUMNS),
  ]);
  if (resortsErr || !resortsData) return { ok: false, reason: `resorts: ${resortsErr?.message ?? "none"}` };
  if (cacheErr) return { ok: false, reason: `weather_cache: ${cacheErr.message}` };
  const resorts = resortsData as unknown as ResortWithStatus[];
  const cacheBy = new Map((cacheData as unknown as CacheRow[]).map((c) => [c.resort_id, c]));
  const resortsById = new Map(resorts.map((r) => [r.id, r]));

  // Freshness floor (last attempt, success or failure) + ordering.
  const cutoff = now.getTime() - MIN_AGE_MIN * 60_000;
  const queue = resorts
    .filter((r) => force || onlyId || lastAttemptAt(cacheBy.get(r.id)) < cutoff)
    .sort((a, b) => priority(cacheBy.get(b.id), now) - priority(cacheBy.get(a.id), now))
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  const skippedFresh = resorts.length - queue.length;

  // Shared per-run resources: station directories and the latest
  // snowfall analyses (one header read per file, one strip per latitude row).
  const directory = new StationDirectory();
  let sfav2 = makeSfav2Samplers(null);
  try {
    sfav2 = makeSfav2Samplers(await findLatestSfav2Set(now));
  } catch (e) {
    console.warn(`[refresh-weather] sfav2 listing failed: ${errorText(e)}`);
  }

  // Recent history for 48 h / 7 d sums and for the surface classifier.
  const historyCutoff = new Date(now.getTime() - 9 * 86_400_000).toISOString().slice(0, 10);
  const { data: histData } = await supabase
    .from("weather_history")
    .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg")
    .in("resort_id", queue.map((r) => r.id))
    .gte("observed_date", historyCutoff)
    .order("observed_date", { ascending: true });
  const recentHistory = new Map<number, HistoryLite[]>();
  for (const h of (histData ?? []) as HistoryLite[]) {
    const arr = recentHistory.get(h.resort_id) ?? [];
    arr.push({ ...h, snow_24h_in: h.snow_24h_in === null ? null : Number(h.snow_24h_in) });
    recentHistory.set(h.resort_id, arr);
  }

  // Worker pool with a hard dispatch floor, per-resort budgets and
  // incremental flushes.
  const refreshCtx = { now, directory, sfav2, allowMeasured: true };
  const done: RefreshOutcome[] = [];
  let pending: RefreshOutcome[] = [];
  const writeStats: WriteStats = { cacheUpserted: 0, cacheFailedMarked: 0, historyUpserted: 0, resortSnowUpdated: 0, dbErrors: [] };
  const mergeStats = (s: WriteStats) => {
    writeStats.cacheUpserted += s.cacheUpserted;
    writeStats.cacheFailedMarked += s.cacheFailedMarked;
    writeStats.historyUpserted += s.historyUpserted;
    writeStats.resortSnowUpdated += s.resortSnowUpdated;
    writeStats.dbErrors.push(...s.dbErrors);
  };
  let flushing: Promise<void> = Promise.resolve();
  const flush = () => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    flushing = flushing.then(async () => {
      mergeStats(await writeOutcomes(supabase, batch, { resortsById, recentHistory, now }));
    });
  };
  let next = 0;
  let outOfTime = false;
  const worker = async () => {
    while (next < queue.length) {
      if (ctx.msLeft() < DISPATCH_FLOOR_MS) {
        outOfTime = true;
        return;
      }
      const resort = queue[next++];
      const budget = Math.min(RESORT_BUDGET_MS, ctx.msLeft() - 5_000);
      const outcome = await refreshResortWithin(resort, cacheBy.get(resort.id), refreshCtx, budget);
      done.push(outcome);
      pending.push(outcome);
      if (pending.length >= FLUSH_EVERY) flush();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  flush();
  await flushing;

  const okOutcomes = done.filter((o): o is Extract<RefreshOutcome, { ok: true }> => o.ok);
  const failed = done.filter((o): o is Extract<RefreshOutcome, { ok: false }> => !o.ok);
  const timedOut = failed.filter((f) => f.error.startsWith("deadline")).length;
  const failShare = done.length ? failed.length / done.length : 0;

  // Snow Surface Forecast — observed history (through yesterday) plus a
  // synthesized "today" from the fresh forecast. Only resorts that are
  // not known-closed get a class; known-closed (and unknown during the
  // May-Oct off-season) are cleared so a stale "Powder" chip never shows
  // on a shut mountain.
  const surface = { classified: 0, cleared: 0, errors: 0, skippedUnknown: 0 };
  const stamp = now.toISOString();
  const toClassify: Array<{ id: number; code: SurfaceCode | null }> = [];
  const toClear: number[] = [];
  const offSeason = isGlobalOffSeasonNow(now);
  for (const o of okOutcomes) {
    const r = resortsById.get(o.resort_id)!;
    if (r.currently_open === false || (r.currently_open === null && offSeason)) {
      toClear.push(r.id);
      continue;
    }
    const day = o.cacheRow.forecast_json.days[0];
    const hist: DailyWeather[] = (recentHistory.get(r.id) ?? [])
      .filter((h) => !o.historyRow || h.observed_date !== o.historyRow.observed_date)
      .map((h) => ({
        observed_date: h.observed_date,
        temp_high_f: h.temp_high_f,
        temp_low_f: h.temp_low_f,
        snow_24h_in: h.snow_24h_in,
        rain_24h_in: h.rain_24h_in === null ? null : Number(h.rain_24h_in),
        precip_24h_in: h.precip_24h_in === null ? null : Number(h.precip_24h_in),
        wind_mph_avg: h.wind_mph_avg === null ? null : Number(h.wind_mph_avg),
      }));
    if (o.historyRow) {
      const { resort_id: _rid, wind_dir_short: _wd, conditions_short: _cs, ...rest } = o.historyRow;
      void _rid;
      void _wd;
      void _cs;
      hist.push(rest);
    }
    hist.sort((a, b) => (a.observed_date < b.observed_date ? -1 : 1));
    const window = hist.slice(-7);
    if (day) {
      window.push({
        observed_date: day.date,
        temp_high_f: day.temp_high_f,
        temp_low_f: day.temp_low_f,
        snow_24h_in: day.snow_in,
        rain_24h_in: null,
        precip_24h_in: day.qpf_in ?? (day.snow_in != null ? Math.round(day.snow_in * 10) / 100 : null),
        wind_mph_avg: o.cacheRow.wind_mph_avg,
      });
    }
    if (window.length === 0) {
      surface.skippedUnknown++;
      continue;
    }
    // Resort-reported base depth + the verified "open" flag are the
    // snowpack evidence the rain-on-old-base and spring-corn rules need
    // (lib/snowSurface hasSnowpackEvidence); without them the stored
    // class disagreed with the resort page's own call (surface package).
    const result = classifyToday(window.slice(-8), {
      baseDepthIn: r.snow_base_depth_in ?? null,
      hasSnowpack: r.currently_open === true ? true : null,
      inSeason: !offSeason,
    });
    toClassify.push({ id: r.id, code: result?.code ?? null });
  }
  const BATCH = 20;
  for (let off = 0; off < toClassify.length; off += BATCH) {
    const results = await Promise.all(
      toClassify.slice(off, off + BATCH).map((u) =>
        supabase
          .from("resorts")
          .update({ current_surface_class: u.code, current_surface_updated_at: stamp })
          .eq("id", u.id),
      ),
    );
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) surface.errors++;
      else if (toClassify[off + i].code) surface.classified++;
      else surface.cleared++;
    }
  }
  for (let off = 0; off < toClear.length; off += 100) {
    const slice = toClear.slice(off, off + 100);
    const { error } = await supabase
      .from("resorts")
      .update({ current_surface_class: null, current_surface_updated_at: stamp })
      .in("id", slice);
    if (error) surface.errors++;
    else surface.cleared += slice.length;
  }

  // Health + founder alert (deduped to once per 12 h).
  let health: Awaited<ReturnType<typeof computeHealth>> | null = null;
  let alert: Awaited<ReturnType<typeof notifyIfUnhealthy>> | null = null;
  try {
    health = await computeHealth(supabase);
    alert = await notifyIfUnhealthy(supabase, health);
  } catch (e) {
    console.warn(`[refresh-weather] health check failed: ${errorText(e)}`);
  }

  const warningSample = okOutcomes
    .flatMap((o) => o.warnings.map((w) => `${o.resort_id}: ${w}`))
    .slice(0, 8);
  const failureSample = failed.slice(0, 8).map((f) => `${f.resort_id}: ${f.error}`);
  const ok = failShare <= FAIL_SHARE_LIMIT && writeStats.dbErrors.length === 0 && (done.length > 0 || queue.length === 0);
  return {
    ok,
    reason: ok ? undefined : failShare > FAIL_SHARE_LIMIT ? "too_many_resort_failures" : writeStats.dbErrors.length ? "db_errors" : "nothing_processed",
    queued: queue.length,
    processed: done.length,
    refreshed: okOutcomes.length,
    failed: failed.length,
    timed_out: timedOut,
    fail_share: Math.round(failShare * 100) / 100,
    skipped_fresh: skippedFresh,
    remaining: queue.length - done.length,
    out_of_time: outOfTime,
    sfav2_files: {
      h24: sfav2.h24?.file.name ?? null,
      h48: sfav2.h48?.file.name ?? null,
      h72: sfav2.h72?.file.name ?? null,
    },
    writes: writeStats,
    surface,
    health_verdict: health?.verdict ?? null,
    alert,
    warning_sample: warningSample,
    failure_sample: failureSample,
  };
}

export async function GET(request: Request) {
  return runCron(request, "refresh-weather", maxDuration, (ctx) => refreshAll(ctx, request));
}
