// Server-side loader for the Saturday ranking. Shared by app/go/page.tsx
// (anon client) and the Thursday cron (service client): both fetch the
// same rows and hand them to lib/saturday/rank.ts, so a rider sees on
// Thursday morning exactly what the email said.
//
// Reads only; every table here exists in the live schema
// (handoff-docs/DB_SCHEMA_LIVE_2026-09-23.md). Two shapes need care:
//   * weather_cache.forecast_json is v1 (bare array) on rows the new
//     pipeline has not rewritten and v2 ({v:2, days, hourly, measured,
//     ...}) afterwards. v2 rows carry ~240 hourly entries we do not need,
//     so the first select projects `forecast_json->days` etc. and only
//     the v1 rows (where that projection is null) are re-read whole.
//   * PostgREST caps a response at 1,000 rows, so the history read is
//     chunked by resort id (≤ 100 ids × ≤ 8 days per chunk).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyWeather } from "@/lib/snowSurface";
import { forecastDaysFrom, isForecastJsonV2, type ForecastDay, type MeasuredSnow } from "@/lib/weather/forecastJson";
import { estimateDriveSeconds, haversineMeters } from "@/lib/distance";
import { originHasExactDrives, type GoOrigin } from "./cities";
import { shiftIso, todayIso } from "./dates";
import type { DriveInfo, RankResort, RankWeather } from "./rank";

export const RANK_RESORT_COLUMNS =
  "id, slug, name, state, latitude, longitude, passes, tier, vertical_drop, season_open_text, season_close_text, typical_season_start, typical_season_end, operating_status, currently_open, snow_report_status, snow_report_updated_at, lifts_open_today, total_lifts, trails_open_today, total_trails, season_end_date, snow_base_depth_in, snow_new_24h_in, snow_new_48h_in, current_surface_class, current_surface_updated_at, wind_hold_mph_chair, wind_hold_mph_gondola, lift_types";

/** Never classify more resorts than this per request; beyond it the
 *  drive radius is the wrong filter anyway. */
const MAX_CANDIDATES = 160;
const HISTORY_DAYS = 7;
const HISTORY_CHUNK = 100;
const DRIVE_PAGE = 1000;

export type LoadedSaturdayData = {
  resorts: RankResort[];
  /** Serializable (unstable_cache-safe) weather keyed by resort id. */
  weather: Array<[number, RankWeather]>;
  /** Exact drive times from drive_time_cache, empty when the origin has none. */
  drives: Array<[number, DriveInfo]>;
  driveSource: "cache" | "estimate";
  loadedAt: string;
};

type WeatherLightRow = {
  resort_id: number;
  fetched_at: string | null;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | string | null;
  wind_mph_avg: number | null;
  v: number | null;
  days: ForecastDay[] | null;
  measured: MeasuredSnow | null;
  updated_at: string | null;
};

type WeatherFullRow = {
  resort_id: number;
  forecast_json: unknown;
};

type HistoryRow = {
  resort_id: number;
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | string | null;
  rain_24h_in: number | string | null;
  precip_24h_in: number | string | null;
  wind_mph_avg: number | string | null;
};

type DriveRow = { resort_id: number; duration_seconds: number; distance_meters: number | null };

const numOrNull = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function loadDrives(supabase: SupabaseClient, originName: string): Promise<DriveRow[]> {
  const rows: DriveRow[] = [];
  let total: number | null = null;
  while (total === null || rows.length < total) {
    const from = rows.length;
    const { data, error, count } = await supabase
      .from("drive_time_cache")
      .select("resort_id, duration_seconds, distance_meters", { count: "exact" })
      .eq("origin_name", originName)
      .order("resort_id")
      .order("id")
      .range(from, from + DRIVE_PAGE - 1);
    if (error) throw new Error(`drive_time_cache: ${error.message}`);
    const page = (data ?? []) as DriveRow[];
    if (page.length === 0) break;
    rows.push(...page);
    total = count ?? rows.length;
  }
  return rows;
}

async function loadWeather(supabase: SupabaseClient, ids: number[]): Promise<Map<number, WeatherLightRow>> {
  const byId = new Map<number, WeatherLightRow>();
  if (ids.length === 0) return byId;
  const { data, error } = await supabase
    .from("weather_cache")
    .select(
      "resort_id, fetched_at, temp_high_f, temp_low_f, snow_24h_in, wind_mph_avg, v:forecast_json->v, days:forecast_json->days, measured:forecast_json->measured, updated_at:forecast_json->updated_at",
    )
    .in("resort_id", ids);
  if (error) throw new Error(`weather_cache: ${error.message}`);
  for (const row of (data ?? []) as WeatherLightRow[]) byId.set(row.resort_id, row);

  // v1 rows: the JSON is a bare array, so `->days` came back null. Read
  // those whole (a v1 strip is ten small objects).
  const legacyIds = [...byId.values()].filter((r) => r.v !== 2 || !Array.isArray(r.days)).map((r) => r.resort_id);
  if (legacyIds.length > 0) {
    const { data: full, error: fullErr } = await supabase
      .from("weather_cache")
      .select("resort_id, forecast_json")
      .in("resort_id", legacyIds);
    if (fullErr) throw new Error(`weather_cache (legacy): ${fullErr.message}`);
    for (const row of (full ?? []) as WeatherFullRow[]) {
      const light = byId.get(row.resort_id);
      if (!light) continue;
      light.days = forecastDaysFrom(row.forecast_json);
      if (isForecastJsonV2(row.forecast_json)) {
        light.measured = row.forecast_json.measured;
        light.updated_at = row.forecast_json.updated_at;
      }
    }
  }
  return byId;
}

async function loadHistory(supabase: SupabaseClient, ids: number[], sinceIso: string): Promise<Map<number, HistoryRow[]>> {
  const byId = new Map<number, HistoryRow[]>();
  for (const part of chunk(ids, HISTORY_CHUNK)) {
    const { data, error } = await supabase
      .from("weather_history")
      .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg")
      .in("resort_id", part)
      .gte("observed_date", sinceIso)
      .order("observed_date", { ascending: true });
    if (error) throw new Error(`weather_history: ${error.message}`);
    for (const row of (data ?? []) as HistoryRow[]) {
      const arr = byId.get(row.resort_id) ?? [];
      arr.push(row);
      byId.set(row.resort_id, arr);
    }
  }
  return byId;
}

/** Load everything rankForSaturday needs for one origin + drive radius. */
export async function loadSaturdayData(
  supabase: SupabaseClient,
  origin: GoOrigin,
  maxDriveHours: number,
  now: Date = new Date(),
): Promise<LoadedSaturdayData> {
  const { data: resortData, error: resortErr } = await supabase
    .from("resorts")
    .select(RANK_RESORT_COLUMNS)
    .eq("active", true)
    .order("name");
  if (resortErr) throw new Error(`resorts: ${resortErr.message}`);
  const resorts = (resortData ?? []) as unknown as RankResort[];

  // Drive times: cached road routes when the origin has them, else the
  // straight-line estimate the ranking labels with "≈". A city that is
  // supposed to be cached but has no rows (Philadelphia on 2026-09-23)
  // silently degrades to the estimate rather than showing nothing.
  const drives: Array<[number, DriveInfo]> = [];
  if (originHasExactDrives(origin)) {
    for (const row of await loadDrives(supabase, origin.name)) {
      drives.push([row.resort_id, { seconds: row.duration_seconds, meters: row.distance_meters, estimated: false }]);
    }
  }
  const driveById = new Map(drives);
  const maxSeconds = maxDriveHours * 3600;
  const candidates: Array<{ id: number; seconds: number }> = [];
  for (const r of resorts) {
    const cached = driveById.get(r.id);
    let seconds = cached?.seconds;
    if (seconds == null) {
      const lat = numOrNull(r.latitude);
      const lon = numOrNull(r.longitude);
      if (lat == null || lon == null) continue;
      seconds = estimateDriveSeconds(haversineMeters(origin.lat, origin.lon, lat, lon));
    }
    if (seconds <= maxSeconds) candidates.push({ id: r.id, seconds });
  }
  candidates.sort((a, b) => a.seconds - b.seconds);
  const ids = candidates.slice(0, MAX_CANDIDATES).map((c) => c.id);

  const today = todayIso(now);
  const [weatherById, historyById] = await Promise.all([
    loadWeather(supabase, ids),
    loadHistory(supabase, ids, shiftIso(today, -HISTORY_DAYS)),
  ]);

  const weather: Array<[number, RankWeather]> = [];
  for (const id of ids) {
    const w = weatherById.get(id);
    if (!w) continue;
    const history: DailyWeather[] = (historyById.get(id) ?? []).map((h) => ({
      observed_date: h.observed_date,
      temp_high_f: h.temp_high_f,
      temp_low_f: h.temp_low_f,
      snow_24h_in: numOrNull(h.snow_24h_in),
      rain_24h_in: numOrNull(h.rain_24h_in),
      precip_24h_in: numOrNull(h.precip_24h_in),
      wind_mph_avg: numOrNull(h.wind_mph_avg),
    }));
    // The history cron writes yesterday's row each morning; today's
    // conditions come from the weather snapshot, same synthesis as the
    // resort page so both surfaces agree.
    if (history.at(-1)?.observed_date !== today) {
      const snow = numOrNull(w.snow_24h_in);
      history.push({
        observed_date: today,
        temp_high_f: w.temp_high_f,
        temp_low_f: w.temp_low_f,
        snow_24h_in: snow,
        rain_24h_in: 0,
        precip_24h_in: snow != null ? snow * 0.1 : 0,
        wind_mph_avg: w.wind_mph_avg,
      });
    }
    weather.push([
      id,
      {
        days: Array.isArray(w.days) ? w.days : [],
        measured: w.measured ?? null,
        updatedAt: w.updated_at ?? w.fetched_at ?? null,
        history,
      },
    ]);
  }

  return {
    resorts,
    weather,
    drives,
    driveSource: drives.length > 0 ? "cache" : "estimate",
    loadedAt: now.toISOString(),
  };
}
