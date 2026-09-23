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
// blended. The table is feature-detected: when the migration
// (handoff-docs/sql/2026-09-23-ledger.sql) has not been applied every
// entry point logs one warning per process and returns without failing
// the cron.
//
// "Actual" surface: the same classifier, re-run on OBSERVED inputs only
// (weather_history rows through the target day, no forecast day mixed
// in). That is the fairest label available without a human on the hill;
// the doc lists its known biases.

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
  written: number;
  errors: string[];
};

export type LedgerScoreResult = {
  available: boolean;
  date: string;
  /** Rows that were unscored for this date when the run started. */
  candidates: number;
  /** Rows scored against an observation. */
  scored: number;
  /** Rows closed without an observation (date too old to wait any longer). */
  closed_unobserved: number;
  /** Rows left for a later run: no observation yet, date still recent. */
  pending: number;
  surface_hits: number;
  surface_compared: number;
  errors: string[];
};

export type LedgerSummary = {
  available: boolean;
  predictions_logged_24h: number;
  scored_7d: number;
  surface_compared_7d: number;
  surface_hits_7d: number;
  /** Hits / compared over the last 7 days; null below MIN_RATE_SAMPLE so
   *  a lucky first week never reads as a track record. */
  surface_hit_rate_7d: number | null;
};

// ---------- constants ----------

export const LEDGER_TABLE = "prediction_log";
export const LEDGER_MIGRATION = "handoff-docs/sql/2026-09-23-ledger.sql";

/** Below this many compared rows the hit rate is withheld (null). */
export const MIN_RATE_SAMPLE = 30;

/** A row whose target day is this many days old and still has no
 *  observation is closed as unobserved: the history feed missed that
 *  day and it will not be backfilled. */
export const UNOBSERVED_CLOSE_AFTER_DAYS = 3;

/** Upsert batch size; PostgREST accepts far more but this keeps each
 *  request small enough that a single slow write cannot eat the budget. */
const WRITE_BATCH = 200;
/** `in (...)` filter batch size (keeps the URL short). */
const ID_BATCH = 150;

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

let ledgerAvailable: boolean | null = null;

function noteLedgerMissing(where: string): void {
  if (ledgerAvailable !== false) {
    ledgerAvailable = false;
    console.warn(`[predictionLog] ${LEDGER_TABLE} table is missing (${where}); run ${LEDGER_MIGRATION} to enable the ledger`);
  }
}

/** Test hook: forget a previous "table missing" verdict. */
export function resetLedgerAvailability(): void {
  ledgerAvailable = null;
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

/** Forecast confidence decays with horizon exactly as classifyForecast
 *  caps it: one day out can be at most medium, further out is low. */
export function capConfidence(c: Confidence, horizon: number): Confidence {
  if (horizon <= 0) return c;
  if (horizon === 1) return c === "high" ? "medium" : c;
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

/** Upsert predictions by (resort_id, for_date, horizon_days). A re-run
 *  the same day overwrites the row with the fresher forecast, which is
 *  what "made_at" then reflects. */
export async function writePredictions(supabase: SupabaseClient, rows: PredictionRow[]): Promise<LedgerWriteResult> {
  const result: LedgerWriteResult = { available: ledgerAvailable !== false, written: 0, errors: [] };
  if (ledgerAvailable === false || rows.length === 0) return result;
  for (let off = 0; off < rows.length; off += WRITE_BATCH) {
    const batch = rows.slice(off, off + WRITE_BATCH);
    const { error } = await supabase.from(LEDGER_TABLE).upsert(batch, { onConflict: "resort_id,for_date,horizon_days" });
    if (error) {
      if (isMissingSchemaError(error)) {
        noteLedgerMissing("write");
        result.available = false;
        return result;
      }
      result.errors.push(error.message);
      continue;
    }
    ledgerAvailable = true;
    result.written += batch.length;
  }
  return result;
}

async function inBatches<T>(ids: number[], fetchBatch: (slice: number[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let off = 0; off < ids.length; off += ID_BATCH) {
    out.push(...(await fetchBatch(ids.slice(off, off + ID_BATCH))));
  }
  return out;
}

/**
 * Score every unscored row whose target day is `date`. Reads the
 * observations and resort status it needs, computes the observed surface,
 * writes the updates in batches. Never throws on a missing table.
 */
export async function scoreDay(supabase: SupabaseClient, date: string, now: Date = new Date()): Promise<LedgerScoreResult> {
  const result: LedgerScoreResult = {
    available: ledgerAvailable !== false,
    date,
    candidates: 0,
    scored: 0,
    closed_unobserved: 0,
    pending: 0,
    surface_hits: 0,
    surface_compared: 0,
    errors: [],
  };
  if (ledgerAvailable === false) return result;

  const { data, error } = await supabase
    .from(LEDGER_TABLE)
    .select("id, resort_id, for_date, horizon_days, made_at, surface_class, forecast_snow_in, forecast_high_f, forecast_low_f")
    .eq("for_date", date)
    .is("scored_at", null)
    .limit(10_000);
  if (error) {
    if (isMissingSchemaError(error)) {
      noteLedgerMissing("score");
      result.available = false;
    } else result.errors.push(`select: ${error.message}`);
    return result;
  }
  ledgerAvailable = true;
  const rows = (data ?? []) as UnscoredRow[];
  result.candidates = rows.length;
  if (rows.length === 0) return result;

  const ids = Array.from(new Set(rows.map((r) => r.resort_id)));
  const since = shiftDate(date, -8);
  const [history, resorts, caches] = await Promise.all([
    inBatches(ids, async (slice) => {
      const { data, error } = await supabase
        .from("weather_history")
        .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg")
        .in("resort_id", slice)
        .gte("observed_date", since)
        .lte("observed_date", date);
      if (error) {
        result.errors.push(`weather_history: ${error.message}`);
        return [];
      }
      return (data ?? []) as ObservedDay[];
    }),
    inBatches(ids, async (slice) => {
      const { data, error } = await supabase
        .from("resorts")
        .select("id, currently_open, snow_base_depth_in")
        .in("id", slice);
      if (error) {
        result.errors.push(`resorts: ${error.message}`);
        return [];
      }
      return (data ?? []) as ResortStatusLite[];
    }),
    inBatches(ids, async (slice) => {
      const { data, error } = await supabase
        .from("weather_cache")
        .select("resort_id, measured:forecast_json->measured")
        .in("resort_id", slice);
      if (error) {
        // Provenance only; scoring proceeds without it.
        result.errors.push(`weather_cache: ${error.message}`);
        return [];
      }
      return (data ?? []) as Array<{ resort_id: number; measured: MeasuredSnow | null }>;
    }),
  ]);
  // A failed history read must not close every row as "unobserved".
  if (result.errors.some((e) => e.startsWith("weather_history:"))) return result;

  const { updates, pending } = scoreRows({
    rows,
    history,
    resorts: new Map(resorts.map((r) => [r.id, r])),
    measured: new Map(caches.map((c) => [c.resort_id, c.measured])),
    now,
  });
  result.pending = pending.length;

  for (let off = 0; off < updates.length; off += WRITE_BATCH) {
    const batch = updates.slice(off, off + WRITE_BATCH);
    // Upsert on the primary key updates only the columns in the payload;
    // the not-null key columns ride along so the INSERT half of the
    // statement is valid even though it never runs.
    const { error } = await supabase.from(LEDGER_TABLE).upsert(batch, { onConflict: "id" });
    if (error) {
      result.errors.push(`update: ${error.message}`);
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
  return result;
}

/** Ledger counts for /api/health. Never throws; `available: false` when
 *  the table is missing. */
export async function ledgerSummary(supabase: SupabaseClient, now: Date = new Date()): Promise<LedgerSummary> {
  const empty: LedgerSummary = {
    available: false,
    predictions_logged_24h: 0,
    scored_7d: 0,
    surface_compared_7d: 0,
    surface_hits_7d: 0,
    surface_hit_rate_7d: null,
  };
  if (ledgerAvailable === false) return empty;
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const head = { count: "exact" as const, head: true };
  const [logged, scored, compared, hits] = await Promise.all([
    supabase.from(LEDGER_TABLE).select("id", head).gte("made_at", dayAgo),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", weekAgo),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", weekAgo).not("surface_hit", "is", null),
    supabase.from(LEDGER_TABLE).select("id", head).gte("scored_at", weekAgo).eq("surface_hit", true),
  ]);
  const firstError = [logged, scored, compared, hits].find((r) => r.error)?.error;
  if (firstError) {
    if (isMissingSchemaError(firstError)) noteLedgerMissing("summary");
    else console.warn(`[predictionLog] summary query failed: ${firstError.message}`);
    return empty;
  }
  ledgerAvailable = true;
  const n = compared.count ?? 0;
  const h = hits.count ?? 0;
  return {
    available: true,
    predictions_logged_24h: logged.count ?? 0,
    scored_7d: scored.count ?? 0,
    surface_compared_7d: n,
    surface_hits_7d: h,
    surface_hit_rate_7d: n >= MIN_RATE_SAMPLE ? Math.round((h / n) * 1000) / 1000 : null,
  };
}
