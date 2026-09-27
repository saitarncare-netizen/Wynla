// Prediction ledger — freeze every forecast next to what actually happened.
//
// Why: the Snow Surface Forecast is the product's one differentiating
// claim and it has never been compared with reality (strategy move 3b,
// scorecard must-have 2). Season 1 collects the evidence silently: the
// daily refresh writes what it predicted for today, tomorrow and the
// coming Saturday for every active resort, and the next day's run fills
// in the observed values for yesterday and marks each call a hit or a
// miss. Nothing public reads this table until the founder has reviewed
// the numbers (handoff-docs/PREDICTION_LEDGER_2026-09-23.md says what
// may be claimed and when).
//
// Shape: one prediction_log row per (resort, target day, horizon). The
// same Saturday is predicted several times as it approaches, once per
// horizon, so accuracy can later be reported per horizon rather than
// blended. A row is written once and never overwritten: in season the
// refresh runs every 30 minutes, and a "frozen" call that moved with
// every re-run until the day was over would inflate the same-day hit
// rate. made_at is therefore the first forecast of that resort-local day
// (for the daily 11:00 UTC schedule that is 03:00-07:00 local; for the
// in-season half-hourly schedule, shortly after local midnight).
//
// The table is feature-detected: when the migration
// (handoff-docs/sql/2026-09-23-ledger.sql) has not been applied every
// entry point logs one warning and returns without failing the cron,
// then re-probes after a short TTL so a long-lived process notices the
// migration without a restart.
//
// "Actual" surface: the same classifier, re-run on OBSERVED inputs only
// (weather_history rows through the target day, no forecast day mixed
// in). That is the fairest label available without a human on the hill;
// the doc lists its known biases.
//
// PostgREST caps every response at the project's max-rows (1,000 on
// Supabase) even when no limit is requested, so every read here pages:
// weather_history by range with an exact count, unscored rows by keyset
// on id (the scored set shrinks as pages are written, so an offset would
// skip rows).

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "@/lib/cronRun";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";
import {
  classifyToday,
  forecastDayToDailyWeather,
  type DailyWeather,
  type SurfaceCode,
  type SurfaceContext,
  type SurfaceResult,
} from "@/lib/snowSurface";
import type { ForecastDay, MeasuredSnow } from "@/lib/weather/forecastJson";
import { shiftDate } from "@/lib/weather/time";

// ---------- types ----------

export type Confidence = SurfaceResult["confidence"];

/** One frozen prediction, as written to prediction_log. */
export type PredictionRow = {
  resort_id: number;
  for_date: string; // resort-local 'YYYY-MM-DD'
  made_at: string; // ISO-8601
  horizon_days: number;
  surface_class: SurfaceCode | null;
  surface_confidence: Confidence | null;
  forecast_snow_in: number | null;
  forecast_high_f: number | null;
  forecast_low_f: number | null;
  forecast_gust_mph: number | null;
  source: Record<string, unknown>;
};

/** The subset of a logged row the scorer needs back. */
export type UnscoredRow = {
  id: number;
  resort_id: number;
  for_date: string;
  horizon_days: number;
  made_at: string;
  surface_class: SurfaceCode | null;
  forecast_snow_in: number | string | null;
  forecast_high_f: number | null;
  forecast_low_f: number | null;
};

/** A weather_history row (numeric columns arrive as strings from PostgREST). */
export type ObservedDay = {
  resort_id: number;
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | string | null;
  rain_24h_in: number | string | null;
  precip_24h_in: number | string | null;
  wind_mph_avg: number | string | null;
};

/** What the scorer knows about a resort beyond its weather. */
export type ResortStatusLite = {
  id: number;
  currently_open: boolean | null;
  snow_base_depth_in: number | null;
};

/** The update written back to a scored row. */
export type ScoredUpdate = {
  id: number;
  resort_id: number;
  for_date: string;
  horizon_days: number;
  made_at: string;
  actual_snow_in: number | null;
  actual_high_f: number | null;
  actual_low_f: number | null;
  actual_gust_mph: number | null;
  actual_surface_class: SurfaceCode | null;
  actual_source: Record<string, unknown>;
  scored_at: string;
  surface_hit: boolean | null;
  snow_abs_err_in: number | null;
};

export type LedgerWriteResult = {
  available: boolean;
  /** Rows inserted. Rows whose key already existed are left untouched
   *  (the first call of the day is the frozen one) and counted in
   *  `already_frozen`. */
  written: number;
  already_frozen: number;
  errors: string[];
};

export type LedgerScoreResult = {
  available: boolean;
  date: string;
  /** Unscored rows for this date that the run looked at. */
  candidates: number;
  /** Rows scored against an observation. */
  scored: number;
  /** Rows closed without an observation (date too old to wait any longer). */
  closed_unobserved: number;
  /** Rows left for a later run: no observation yet, date still recent. */
  pending: number;
  surface_hits: number;
  surface_compared: number;
  /** Pages of unscored rows read (each at most SCORE_PAGE rows). */
  pages: number;
  /** "out_of_time" when the budget ran out before the last page. */
  stopped: string | null;
  errors: string[];
};

export type LedgerSummary = {
  available: boolean;
  window_days: number;
  /** Rows frozen in the last 24 h (the daily volume). */
  predictions_logged_24h: number;
  /** Rows scored against an observation inside the window. */
  scored: number;
  /** Rows closed inside the window because no observation ever landed;
   *  a feed gap, not a score. */
  closed_unobserved: number;
  surface_compared: number;
  surface_hits: number;
  /** Hits / compared inside the window; null below MIN_RATE_SAMPLE so a
   *  lucky first week never reads as a track record. */
  surface_hit_rate: number | null;
};

/** One row of the prediction_log_region_stats view (all time). */
export type RegionStat = {
  region: string | null;
  horizon_days: number;
  compared: number;
  hits: number;
};

export type ScoreOptions = {
  /** Milliseconds left in the caller's budget; scoring stops between
   *  pages when it drops under PAGE_FLOOR_MS. */
  msLeft?: () => number;
};

export type PendingScoreResult = {
  available: boolean;
  /** Oldest unscored target day found (bounded by the lookback), or null. */
  from: string | null;
  through: string;
  days: LedgerScoreResult[];
  stopped: string | null;
};

// ---------- constants ----------

export const LEDGER_TABLE = "prediction_log";
export const LEDGER_REGION_VIEW = "prediction_log_region_stats";
export const LEDGER_MIGRATION = "handoff-docs/sql/2026-09-23-ledger.sql";

/** Below this many compared rows the hit rate is withheld (null). */
export const MIN_RATE_SAMPLE = 30;

/** A row whose target day is this many days old and still has no
 *  observation is closed as unobserved: the history feed missed that
 *  day and it will not be backfilled. */
export const UNOBSERVED_CLOSE_AFTER_DAYS = 3;

/** How far back the scheduled scorer looks for unscored days. Covers
 *  the close-unobserved pass (day 3) plus a week of missed runs; older
 *  rows are for the manual backfill route. */
export const SCORE_LOOKBACK_DAYS = 10;

/** After a "table missing" verdict the ledger stays quiet this long,
 *  then re-probes, so the migration is picked up without a restart. */
export const AVAILABILITY_TTL_MS = 10 * 60_000;

/** Upsert batch size; PostgREST accepts far more but this keeps each
 *  request small enough that a single slow write cannot eat the budget. */
const WRITE_BATCH = 200;
/** `in (...)` filter batch size (keeps the URL short). */
const ID_BATCH = 150;
/** PostgREST max-rows on Supabase; every read pages at this size. */
const PAGE_SIZE = 1000;
/** Unscored rows per scoring page. */
export const SCORE_PAGE = PAGE_SIZE;
/** Scoring stops between pages below this much remaining budget. */
const PAGE_FLOOR_MS = 8_000;

/**
 * Adjacent classes count as a hit. The pairs are the ones a rider would
 * not feel as a wrong call: packed powder groomed overnight is machine
 * groomed; frozen granular that set up hard is icy patches; wet snow that
 * refroze loose is wet granular. PP and IP are never neighbours of each
 * other and nothing is adjacent to VC (VC = "not enough signal", which
 * only scores as a hit against itself).
 *
 *   PP  ~ PPC
 *   PPC ~ PP, MG
 *   MG  ~ PPC, LSG
 *   LSG ~ MG, FG, WG
 *   FG  ~ LSG, IP
 *   IP  ~ FG
 *   WS  ~ WG
 *   WG  ~ WS, LSG
 *   VC  ~ (none)
 */
export const SURFACE_NEIGHBOURS: Record<SurfaceCode, readonly SurfaceCode[]> = {
  PP: ["PPC"],
  PPC: ["PP", "MG"],
  MG: ["PPC", "LSG"],
  LSG: ["MG", "FG", "WG"],
  FG: ["LSG", "IP"],
  IP: ["FG"],
  WS: ["WG"],
  WG: ["WS", "LSG"],
  VC: [],
};

// ---------- feature detection ----------

type Availability = { missing: boolean; since: number };
const availability = new Map<string, Availability>();

/** True while a relation is known to be missing and the TTL has not
 *  elapsed. After the TTL the next call probes again. */
function knownMissing(relation: string, now: Date): boolean {
  const a = availability.get(relation);
  if (!a?.missing) return false;
  if (now.getTime() - a.since < AVAILABILITY_TTL_MS) return true;
  availability.delete(relation);
  return false;
}

function noteMissing(relation: string, where: string, error: { code?: string | null; message?: string }, now: Date): void {
  const a = availability.get(relation);
  if (a?.missing) return;
  availability.set(relation, { missing: true, since: now.getTime() });
  // 42P01 / PGRST205 = no such table; 42703 / PGRST204 = a column is
  // missing (a partial migration). The code is printed so the two can be
  // told apart from the log alone.
  console.warn(
    `[predictionLog] ${relation} is unavailable (${where}, ${error.code ?? "no code"}: ${error.message ?? ""}); run ${LEDGER_MIGRATION} to enable the ledger`,
  );
}

function noteAvailable(relation: string): void {
  availability.delete(relation);
}

/** Test hook: forget a previous "table missing" verdict. */
export function resetLedgerAvailability(): void {
  availability.clear();
}

// ---------- pure helpers ----------

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function round1(v: number | null): number | null {
  return v === null ? null : Math.round(v * 10) / 10;
}

function roundInt(v: number | null): number | null {
  return v === null ? null : Math.round(v);
}

/** UTC weekday of a 'YYYY-MM-DD' (0 = Sunday). Zone-free on purpose:
 *  the string is already a resort-local calendar day. */
function weekdayOf(ymd: string): number {
  return new Date(Date.parse(`${ymd}T00:00:00Z`)).getUTCDay();
}

/**
 * Horizons logged each run: today (0), tomorrow (1) and the coming
 * Saturday. On a Saturday "today" already covers it, so the following
 * Saturday (7) is logged instead; on a Friday the Saturday row is the
 * tomorrow row, so only two horizons come back.
 */
export function predictionHorizons(localToday: string): number[] {
  const dow = weekdayOf(localToday);
  let toSaturday = (6 - dow + 7) % 7;
  if (toSaturday === 0) toSaturday = 7;
  return Array.from(new Set([0, 1, toSaturday])).sort((a, b) => a - b);
}

/** Same class, or a neighbour in SURFACE_NEIGHBOURS. Null when either
 *  side has no class (dormant prediction, closed resort, no observation). */
export function isSurfaceHit(predicted: SurfaceCode | null, actual: SurfaceCode | null): boolean | null {
  if (!predicted || !actual) return null;
  if (predicted === actual) return true;
  return SURFACE_NEIGHBOURS[predicted]?.includes(actual) ?? false;
}

/** Forecast confidence decays with horizon exactly as the resort page
 *  does (classifyForecast over days 1..3): tomorrow keeps the
 *  classifier's own confidence, two days out is at most medium, three or
 *  more days out is low. The ledger's label for a day therefore matches
 *  what the page showed for that same day. */
export function capConfidence(c: Confidence, horizon: number): Confidence {
  if (horizon <= 1) return c;
  if (horizon === 2) return c === "high" ? "medium" : c;
  return "low";
}

export type BuildInput = {
  resortId: number;
  /** Resort-local calendar date of "today". */
  localToday: string;
  /** Forecast strip from forecast_json (v2 days). Matched by date, not index. */
  days: ForecastDay[];
  /** The window the run fed classifyToday for today: observed history
   *  through yesterday plus today's synthesized forecast row, oldest first. */
  window: DailyWeather[];
  /** Today's stored result, or null when the run had no class for today. */
  todayResult: SurfaceResult | null;
  /** True when the resort is closed / off-season: numbers are still
   *  logged (they are cheap and the forecast can still be scored) but no
   *  surface class is claimed. */
  dormant: boolean;
  ctx: SurfaceContext;
  now: Date;
  forecastUpdatedAt: string | null;
};

/**
 * Build the rows for one resort. Pure: no I/O, no clock beyond `now`.
 * Rows are only produced for horizons whose target day exists in the
 * forecast strip; a surface class for horizon >= 1 needs every
 * intermediate day as well (the classifier rolls its window forward one
 * forecast day at a time).
 */
export function buildPredictionRows(input: BuildInput): PredictionRow[] {
  const byDate = new Map(input.days.map((d) => [d.date, d]));
  const madeAt = input.now.toISOString();
  const rows: PredictionRow[] = [];
  for (const h of predictionHorizons(input.localToday)) {
    const target = shiftDate(input.localToday, h);
    const day = byDate.get(target);
    if (!day) continue;

    let surface: SurfaceResult | null = null;
    let rolled = 0;
    let gap = false;
    if (!input.dormant) {
      if (h === 0) {
        surface = input.todayResult;
      } else {
        let rolling = input.window.slice();
        for (let i = 1; i <= h; i++) {
          const step = byDate.get(shiftDate(input.localToday, i));
          if (!step) {
            gap = true;
            break;
          }
          rolling = [...rolling.slice(-6), forecastDayToDailyWeather(step)];
          rolled++;
        }
        if (!gap && rolling.length > 0) {
          const r = classifyToday(rolling, input.ctx);
          surface = r ? { ...r, confidence: capConfidence(r.confidence, h) } : null;
        }
      }
    }

    rows.push({
      resort_id: input.resortId,
      for_date: target,
      made_at: madeAt,
      horizon_days: h,
      surface_class: surface?.code ?? null,
      surface_confidence: surface?.confidence ?? null,
      forecast_snow_in: round1(num(day.snow_in)),
      forecast_high_f: roundInt(num(day.temp_high_f)),
      forecast_low_f: roundInt(num(day.temp_low_f)),
      forecast_gust_mph: roundInt(num(day.gust_mph)),
      source: {
        forecast_updated_at: input.forecastUpdatedAt,
        day_source: day.source ?? null,
        nws_coverage: day.nws_coverage ?? null,
        classifier: input.dormant ? "dormant" : gap ? "forecast_gap" : "snowSurface",
        window_days: input.dormant ? 0 : input.window.length + rolled,
        // Day-0 classes reuse the run's stored class so the ledger and the
        // resort page agree; later horizons are rolled from the same window.
        day0_from_stored: h === 0 && !input.dormant,
      },
    });
  }
  return rows;
}

function toDaily(o: ObservedDay): DailyWeather {
  return {
    observed_date: o.observed_date,
    temp_high_f: num(o.temp_high_f),
    temp_low_f: num(o.temp_low_f),
    snow_24h_in: num(o.snow_24h_in),
    rain_24h_in: num(o.rain_24h_in),
    precip_24h_in: num(o.precip_24h_in),
    wind_mph_avg: num(o.wind_mph_avg),
  };
}

export type ScoreInput = {
  rows: UnscoredRow[];
  /** weather_history rows for the rows' resorts, any dates up to and
   *  including the target day (older rows form the classifier window). */
  history: ObservedDay[];
  resorts: Map<number, ResortStatusLite>;
  /** forecast_json.measured per resort, for history_sources provenance. */
  measured?: Map<number, MeasuredSnow | null>;
  now: Date;
};

/**
 * Score rows against observations. Pure. Returns the updates to write
 * and the rows that must wait (no observation yet, target day still
 * recent). A row whose target day is UNOBSERVED_CLOSE_AFTER_DAYS or more
 * days old with no observation is closed with null actuals so it is not
 * retried forever; its actual_source says why.
 */
export function scoreRows(input: ScoreInput): { updates: ScoredUpdate[]; pending: UnscoredRow[] } {
  const scoredAt = input.now.toISOString();
  const todayUtc = input.now.toISOString().slice(0, 10);
  const histByResort = new Map<number, ObservedDay[]>();
  for (const h of input.history) {
    const arr = histByResort.get(h.resort_id) ?? [];
    arr.push(h);
    histByResort.set(h.resort_id, arr);
  }
  for (const arr of histByResort.values()) arr.sort((a, b) => (a.observed_date < b.observed_date ? -1 : 1));

  const updates: ScoredUpdate[] = [];
  const pending: UnscoredRow[] = [];
  const classCache = new Map<string, SurfaceCode | null>();

  for (const row of input.rows) {
    const hist = histByResort.get(row.resort_id) ?? [];
    const observed = hist.find((h) => h.observed_date === row.for_date) ?? null;
    if (!observed) {
      const ageDays = (Date.parse(`${todayUtc}T00:00:00Z`) - Date.parse(`${row.for_date}T00:00:00Z`)) / 86_400_000;
      if (ageDays >= UNOBSERVED_CLOSE_AFTER_DAYS) {
        updates.push({
          id: row.id,
          resort_id: row.resort_id,
          for_date: row.for_date,
          horizon_days: row.horizon_days,
          made_at: row.made_at,
          actual_snow_in: null,
          actual_high_f: null,
          actual_low_f: null,
          actual_gust_mph: null,
          actual_surface_class: null,
          actual_source: { reason: "no_observation", closed_after_days: UNOBSERVED_CLOSE_AFTER_DAYS },
          scored_at: scoredAt,
          surface_hit: null,
          snow_abs_err_in: null,
        });
      } else {
        pending.push(row);
      }
      continue;
    }

    // The observed surface: same classifier, observed rows only, ending
    // on the target day. Cached per resort-day because every horizon row
    // for that day shares it.
    const key = `${row.resort_id}:${row.for_date}`;
    let actualClass = classCache.get(key);
    if (actualClass === undefined) {
      const resort = input.resorts.get(row.resort_id);
      const targetDate = new Date(Date.parse(`${row.for_date}T12:00:00Z`));
      const offSeason = isGlobalOffSeasonNow(targetDate);
      if (resort?.currently_open === false || (resort?.currently_open == null && offSeason)) {
        // Closed or summer: there is no skiable surface to have been
        // right about, so the class is left null and the row scores
        // only on its numbers.
        actualClass = null;
      } else {
        const window = hist
          .filter((h) => h.observed_date <= row.for_date)
          .slice(-8)
          .map(toDaily);
        const r = classifyToday(window, {
          baseDepthIn: resort?.snow_base_depth_in ?? null,
          hasSnowpack: resort?.currently_open === true ? true : null,
          inSeason: !offSeason,
        });
        actualClass = r?.code ?? null;
      }
      classCache.set(key, actualClass);
    }

    const actualSnow = round1(num(observed.snow_24h_in));
    const forecastSnow = num(row.forecast_snow_in);
    const measured = input.measured?.get(row.resort_id) ?? null;
    const windowDays = hist.filter((h) => h.observed_date <= row.for_date).slice(-8).length;
    updates.push({
      id: row.id,
      resort_id: row.resort_id,
      for_date: row.for_date,
      horizon_days: row.horizon_days,
      made_at: row.made_at,
      actual_snow_in: actualSnow,
      actual_high_f: roundInt(num(observed.temp_high_f)),
      actual_low_f: roundInt(num(observed.temp_low_f)),
      // weather_history carries a daily average wind but no gust; the
      // column is reserved for when a daily observed gust exists.
      actual_gust_mph: null,
      actual_surface_class: actualClass,
      actual_source: {
        table: "weather_history",
        observed_date: observed.observed_date,
        window_days: windowDays,
        history_sources: measured && measured.for_date === row.for_date ? measured.history_sources : null,
      },
      scored_at: scoredAt,
      surface_hit: isSurfaceHit(row.surface_class, actualClass),
      snow_abs_err_in:
        actualSnow === null || forecastSnow === null ? null : round1(Math.abs(forecastSnow - actualSnow)),
    });
  }
  return { updates, pending };
}

// ---------- I/O ----------

/**
 * Freeze predictions. Insert-only on (resort_id, for_date, horizon_days):
 * a key that already exists is left exactly as first written, so the
 * in-season half-hourly re-runs never move a call after it was made.
 * Returns how many rows were new; the rest were already frozen.
 */
export async function writePredictions(
  supabase: SupabaseClient,
  rows: PredictionRow[],
  now: Date = new Date(),
): Promise<LedgerWriteResult> {
  const result: LedgerWriteResult = { available: true, written: 0, already_frozen: 0, errors: [] };
  if (knownMissing(LEDGER_TABLE, now)) return { ...result, available: false };
  if (rows.length === 0) return result;
  for (let off = 0; off < rows.length; off += WRITE_BATCH) {
    const batch = rows.slice(off, off + WRITE_BATCH);
    // ON CONFLICT DO NOTHING; RETURNING yields only the rows inserted,
    // which is the written count.
    const { data, error } = await supabase
      .from(LEDGER_TABLE)
      .upsert(batch, { onConflict: "resort_id,for_date,horizon_days", ignoreDuplicates: true })
      .select("id");
    if (error) {
      if (isMissingSchemaError(error)) {
        noteMissing(LEDGER_TABLE, "write", error, now);
        result.available = false;
        return result;
      }
      result.errors.push(error.message);
      continue;
    }
    noteAvailable(LEDGER_TABLE);
    const inserted = Array.isArray(data) ? data.length : 0;
    result.written += inserted;
    result.already_frozen += batch.length - inserted;
  }
  return result;
}

type PageReply<T> = { data: T[] | null; error: { code?: string; message: string } | null; count: number | null };

/**
 * Read a whole result set through PostgREST's max-rows cap: windows of
 * PAGE_SIZE with an exact count, stopping on the count rather than on a
 * short page (the app/page.tsx pattern). `build` must apply a
 * deterministic order.
 */
async function readAllPages<T>(build: (from: number, to: number) => PromiseLike<PageReply<T>>): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let total: number | null = null;
  while (total === null || rows.length < total) {
    const from = rows.length;
    const { data, error, count } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    const page = data ?? [];
    // An empty page with rows still owed means the set shrank mid-read;
    // stop rather than loop forever.
    if (page.length === 0) break;
    rows.push(...page);
    total = count ?? rows.length;
  }
  return { rows, error: null };
}

/**
 * weather_history rows for a set of resorts between two dates inclusive,
 * paged. Exported for the refresh route, whose own history read hit the
 * same cap (437 resorts x 9 days is well over 1,000 rows).
 */
export async function readHistoryRange(
  supabase: SupabaseClient,
  resortIds: number[],
  since: string,
  until: string,
): Promise<{ rows: ObservedDay[]; error: string | null }> {
  const out: ObservedDay[] = [];
  for (let off = 0; off < resortIds.length; off += ID_BATCH) {
    const slice = resortIds.slice(off, off + ID_BATCH);
    const { rows, error } = await readAllPages<ObservedDay>((from, to) =>
      supabase
        .from("weather_history")
        .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg", {
          count: "exact",
        })
        .in("resort_id", slice)
        .gte("observed_date", since)
        .lte("observed_date", until)
        // (resort_id, observed_date) is the table's unique key, so this
        // order is total and windows cannot straddle a duplicate.
        .order("resort_id")
        .order("observed_date")
        .range(from, to),
    );
    if (error) return { rows: out, error };
    out.push(...rows);
  }
  return { rows: out, error: null };
}

/** Per-run memo of resort status + measured provenance, so the pages of
 *  one scoreDay call do not re-read the same resorts. */
class ResortLookup {
  readonly resorts = new Map<number, ResortStatusLite>();
  readonly measured = new Map<number, MeasuredSnow | null>();
  private fetched = new Set<number>();
  constructor(private supabase: SupabaseClient) {}

  async ensure(ids: number[], errors: string[]): Promise<void> {
    const missing = ids.filter((id) => !this.fetched.has(id));
    for (const id of missing) this.fetched.add(id);
    for (let off = 0; off < missing.length; off += ID_BATCH) {
      const slice = missing.slice(off, off + ID_BATCH);
      const [r, c] = await Promise.all([
        this.supabase.from("resorts").select("id, currently_open, snow_base_depth_in").in("id", slice),
        this.supabase.from("weather_cache").select("resort_id, measured:forecast_json->measured").in("resort_id", slice),
      ]);
      if (r.error) errors.push(`resorts: ${r.error.message}`);
      else for (const row of (r.data ?? []) as ResortStatusLite[]) this.resorts.set(row.id, row);
      // Provenance only; scoring proceeds without it.
      if (c.error) errors.push(`weather_cache: ${c.error.message}`);
      else for (const row of (c.data ?? []) as Array<{ resort_id: number; measured: MeasuredSnow | null }>) this.measured.set(row.resort_id, row.measured);
    }
  }
}

/**
 * Score every unscored row whose target day is `date`. Pages by keyset
 * on id: each page's observations and resort status are read, the
 * observed surface computed, the updates written, then the next page is
 * fetched with id > the last one seen (rows left pending are unscored
 * but never re-read in this call, so the loop always terminates). Never
 * throws on a missing table.
 */
export async function scoreDay(
  supabase: SupabaseClient,
  date: string,
  now: Date = new Date(),
  opts: ScoreOptions = {},
): Promise<LedgerScoreResult> {
  const result: LedgerScoreResult = {
    available: true,
    date,
    candidates: 0,
    scored: 0,
    closed_unobserved: 0,
    pending: 0,
    surface_hits: 0,
    surface_compared: 0,
    pages: 0,
    stopped: null,
    errors: [],
  };
  if (knownMissing(LEDGER_TABLE, now)) return { ...result, available: false };

  const lookup = new ResortLookup(supabase);
  const since = shiftDate(date, -8);
  let lastId = 0;
  for (;;) {
    if (opts.msLeft && opts.msLeft() < PAGE_FLOOR_MS) {
      result.stopped = "out_of_time";
      break;
    }
    const { data, error } = await supabase
      .from(LEDGER_TABLE)
      .select("id, resort_id, for_date, horizon_days, made_at, surface_class, forecast_snow_in, forecast_high_f, forecast_low_f")
      .eq("for_date", date)
      .is("scored_at", null)
      .gt("id", lastId)
      .order("id")
      .limit(SCORE_PAGE);
    if (error) {
      if (isMissingSchemaError(error)) {
        noteMissing(LEDGER_TABLE, "score", error, now);
        result.available = false;
      } else result.errors.push(`select: ${error.message}`);
      return result;
    }
    noteAvailable(LEDGER_TABLE);
    const rows = (data ?? []) as UnscoredRow[];
    if (rows.length === 0) break;
    result.pages++;
    result.candidates += rows.length;
    lastId = rows[rows.length - 1].id;

    const ids = Array.from(new Set(rows.map((r) => r.resort_id)));
    const [history] = await Promise.all([readHistoryRange(supabase, ids, since, date), lookup.ensure(ids, result.errors)]);
    if (history.error) {
      // A failed history read must not close every row as "unobserved".
      result.errors.push(`weather_history: ${history.error}`);
      result.stopped = "history_read_failed";
      return result;
    }

    const { updates, pending } = scoreRows({
      rows,
      history: history.rows,
      resorts: lookup.resorts,
      measured: lookup.measured,
      now,
    });
    result.pending += pending.length;

    for (let off = 0; off < updates.length; off += WRITE_BATCH) {
      const batch = updates.slice(off, off + WRITE_BATCH);
      // Upsert on the primary key updates only the columns in the payload;
      // the not-null key columns ride along so the INSERT half of the
      // statement is valid even though it never runs.
      const { error: writeError } = await supabase.from(LEDGER_TABLE).upsert(batch, { onConflict: "id" });
      if (writeError) {
        result.errors.push(`update: ${writeError.message}`);
        continue;
      }
      for (const u of batch) {
        if (u.actual_source.reason === "no_observation") result.closed_unobserved++;
        else result.scored++;
        if (u.surface_hit !== null) {
          result.surface_compared++;
          if (u.surface_hit) result.surface_hits++;
        }
      }
    }
    if (rows.length < SCORE_PAGE) break;
  }
  return result;
}

/**
 * Score every unscored target day up to and including `through`, oldest
 * first, looking back at most SCORE_LOOKBACK_DAYS. One cheap query finds
 * the oldest unscored day so a quiet ledger costs one request and a
 * missed week is caught up automatically. This is what the daily refresh
 * calls; it reaches the close-unobserved pass (day 3) on its own.
 */
export async function scorePendingDays(
  supabase: SupabaseClient,
  through: string,
  now: Date = new Date(),
  opts: ScoreOptions = {},
): Promise<PendingScoreResult> {
  const result: PendingScoreResult = { available: true, from: null, through, days: [], stopped: null };
  if (knownMissing(LEDGER_TABLE, now)) return { ...result, available: false };
  const { data, error } = await supabase
    .from(LEDGER_TABLE)
    .select("for_date")
    .is("scored_at", null)
    .lte("for_date", through)
    .order("for_date")
    .limit(1);
  if (error) {
    if (isMissingSchemaError(error)) {
      noteMissing(LEDGER_TABLE, "pending", error, now);
      return { ...result, available: false };
    }
    result.stopped = `oldest: ${error.message}`;
    return result;
  }
  noteAvailable(LEDGER_TABLE);
  const oldest = (data?.[0] as { for_date: string } | undefined)?.for_date ?? null;
  if (!oldest) return result;
  const floor = shiftDate(through, -(SCORE_LOOKBACK_DAYS - 1));
  result.from = oldest < floor ? floor : oldest;
  for (let d = result.from; d <= through; d = shiftDate(d, 1)) {
    if (opts.msLeft && opts.msLeft() < PAGE_FLOOR_MS) {
      result.stopped = "out_of_time";
      break;
    }
    const day = await scoreDay(supabase, d, now, opts);
    result.days.push(day);
    if (!day.available) {
      result.available = false;
      break;
    }
    if (day.stopped) {
      result.stopped = day.stopped;
      break;
    }
  }
  return result;
}

/**
 * Ledger counts for /api/health. `days` sets the scoring window (the
 * logged count is always the last 24 h). Never throws; `available: false`
 * when the table is missing.
 */
export async function ledgerSummary(supabase: SupabaseClient, days = 7, now: Date = new Date()): Promise<LedgerSummary> {
  const empty: LedgerSummary = {
    available: false,
    window_days: days,
    predictions_logged_24h: 0,
    scored: 0,
    closed_unobserved: 0,
    surface_compared: 0,
    surface_hits: 0,
    surface_hit_rate: null,
  };
  if (knownMissing(LEDGER_TABLE, now)) return empty;
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const windowStart = new Date(now.getTime() - days * 86_400_000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [logged, scoredAll, closed, compared, hits] = await Promise.all([
    supabase.from(LEDGER_TABLE).select("id", head).gte("made_at", dayAgo),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", windowStart),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", windowStart).eq("actual_source->>reason", "no_observation"),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", windowStart).not("surface_hit", "is", null),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", windowStart).eq("surface_hit", true),
  ]);
  const firstError = [logged, scoredAll, closed, compared, hits].find((r) => r.error)?.error;
  if (firstError) {
    if (isMissingSchemaError(firstError)) noteMissing(LEDGER_TABLE, "summary", firstError, now);
    else console.warn(`[predictionLog] summary query failed: ${firstError.message}`);
    return empty;
  }
  noteAvailable(LEDGER_TABLE);
  const n = compared.count ?? 0;
  const h = hits.count ?? 0;
  const closedN = closed.count ?? 0;
  return {
    available: true,
    window_days: days,
    predictions_logged_24h: logged.count ?? 0,
    scored: Math.max(0, (scoredAll.count ?? 0) - closedN),
    closed_unobserved: closedN,
    surface_compared: n,
    surface_hits: h,
    surface_hit_rate: n >= MIN_RATE_SAMPLE ? Math.round((h / n) * 1000) / 1000 : null,
  };
}

/**
 * All-time compared / hit counts per region and horizon from the
 * prediction_log_region_stats view (created by the same migration), so
 * the founder's "200 compared rows per region per horizon" gate is
 * visible without the SQL editor. Null when the view is missing.
 */
export async function ledgerRegionStats(supabase: SupabaseClient, now: Date = new Date()): Promise<RegionStat[] | null> {
  if (knownMissing(LEDGER_REGION_VIEW, now)) return null;
  const { data, error } = await supabase
    .from(LEDGER_REGION_VIEW)
    .select("region, horizon_days, compared, hits")
    .order("region")
    .order("horizon_days")
    .limit(PAGE_SIZE);
  if (error) {
    if (isMissingSchemaError(error)) noteMissing(LEDGER_REGION_VIEW, "region", error, now);
    else console.warn(`[predictionLog] region stats query failed: ${error.message}`);
    return null;
  }
  noteAvailable(LEDGER_REGION_VIEW);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    region: (r.region as string | null) ?? null,
    horizon_days: Number(r.horizon_days),
    compared: Number(r.compared ?? 0),
    hits: Number(r.hits ?? 0),
  }));
}
