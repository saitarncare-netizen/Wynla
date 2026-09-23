// Server-side loader for the "My mountains today" screen. Shared with
// /favorites so both pages compute the same Go / Wait / Skip for the
// same row from the same columns (the resort panel's set plus the few
// the verdict needs: wind-hold thresholds, lift mix, snow numbers).
//
// Reads only: favorites (RLS scopes to the signed-in user), weather_cache
// and weather_history (public rows), trips (RLS). No writes.

import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { verdict, type PassContext, type Verdict, type VerdictResort, type VerdictWeather } from "@/lib/goWaitSkip";
import type { DailyWeather } from "@/lib/snowSurface";
import { shiftDate } from "@/lib/weather/time";

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export const TODAY_RESORT_COLS =
  "id, slug, name, state, region, latitude, longitude, passes, tier, vertical_drop, operating_status, season_open_text, season_close_text, typical_season_start, typical_season_end, season_end_date, currently_open, snow_report_status, snow_report_updated_at, lifts_open_today, total_lifts, trails_open_today, total_trails, snow_new_24h_in, snow_new_48h_in, snow_base_depth_in, hero_image_url, hero_image_alt, wind_hold_mph_chair, wind_hold_mph_gondola, lift_types";

export type TodayResort = VerdictResort & {
  id: number;
  name: string;
  state: string;
  region: string | null;
  passes: string[] | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
};

type FavoriteRow = {
  resort_id: number;
  created_at: string;
  resorts: TodayResort | null;
};

type WeatherRow = VerdictWeather & { resort_id: number };

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

export type TodayRow = {
  resort: TodayResort;
  weather: VerdictWeather | null;
  verdict: Verdict;
};

export type TodayData = {
  rows: TodayRow[];
  /** Oldest weather_cache.fetched_at across the rows, so "updated N min
   *  ago" is true for every mountain on the page, not just the best one. */
  weatherUpdatedAt: string | null;
  /** Names of favorites with no weather row yet. */
  unsynced: string[];
  error: string | null;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

export async function loadTodayRows(
  supabase: Client,
  opts: { now: Date; withHistory: boolean; pass?: PassContext },
): Promise<TodayData> {
  const { data, error } = await supabase
    .from("favorites")
    .select(`resort_id, created_at, resorts(${TODAY_RESORT_COLS})`)
    .order("created_at", { ascending: false })
    .returns<FavoriteRow[]>();
  if (error) return { rows: [], weatherUpdatedAt: null, unsynced: [], error: error.message };

  const resorts = (data ?? []).map((r) => r.resorts).filter((r): r is TodayResort => r != null);
  if (resorts.length === 0) return { rows: [], weatherUpdatedAt: null, unsynced: [], error: null };
  const ids = resorts.map((r) => r.id);

  // The surface classifier wants the trailing week; eight days covers a
  // late refresh. weather_history has no retention job, so the date
  // bound matters more than the limit.
  const since = shiftDate(opts.now.toISOString().slice(0, 10), -8);
  const [wxRes, histRes] = await Promise.all([
    supabase
      .from("weather_cache")
      .select("resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, wind_mph_avg, wind_mph_gust, fetched_at, forecast_json")
      .in("resort_id", ids)
      .returns<WeatherRow[]>(),
    opts.withHistory
      ? supabase
          .from("weather_history")
          .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg")
          .in("resort_id", ids)
          .gte("observed_date", since)
          .order("observed_date", { ascending: true })
          .returns<HistoryRow[]>()
      : Promise.resolve({ data: [] as HistoryRow[], error: null }),
  ]);

  const weatherById = new Map<number, WeatherRow>();
  for (const w of wxRes.data ?? []) weatherById.set(w.resort_id, w);
  const historyById = new Map<number, DailyWeather[]>();
  for (const h of histRes.data ?? []) {
    const list = historyById.get(h.resort_id) ?? [];
    list.push({
      observed_date: h.observed_date,
      temp_high_f: h.temp_high_f,
      temp_low_f: h.temp_low_f,
      snow_24h_in: num(h.snow_24h_in),
      rain_24h_in: num(h.rain_24h_in),
      precip_24h_in: num(h.precip_24h_in),
      wind_mph_avg: num(h.wind_mph_avg),
    });
    historyById.set(h.resort_id, list);
  }

  const rows: TodayRow[] = resorts.map((resort) => {
    const weather = weatherById.get(resort.id) ?? null;
    return {
      resort,
      weather,
      verdict: verdict(resort, weather, opts.pass ?? null, {
        now: opts.now,
        history: historyById.get(resort.id) ?? [],
      }),
    };
  });

  let oldest: string | null = null;
  const unsynced: string[] = [];
  for (const r of rows) {
    const at = r.weather?.fetched_at ?? null;
    if (!at) {
      unsynced.push(r.resort.name);
      continue;
    }
    if (oldest == null || Date.parse(at) < Date.parse(oldest)) oldest = at;
  }
  return { rows, weatherUpdatedAt: oldest, unsynced, error: null };
}

// ---------- Next trip ----------

export type NextTrip = {
  id: string;
  name: string | null;
  total_days: number;
  lodging_mode: "basecamp" | "roadtrip" | null;
  /** YYYY-MM-DD when trips.start_date exists and is set. */
  start_date: string | null;
  started_at: string | null;
  stopNames: string[];
  /** True when picked by a future start date; false when it is just the
   *  most recent trip (the column is missing or nothing is scheduled). */
  upcoming: boolean;
};

type TripRow = {
  id: string;
  name: string | null;
  total_days: number;
  lodging_mode: "basecamp" | "roadtrip" | null;
  resort_slugs: string[] | null;
  started_at: string | null;
  created_at: string;
  /** Absent until the 2026-09-23 DDL adds the column. */
  start_date?: string | null;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The next scheduled trip when trips.start_date exists (feature-detected
 *  off select("*"), the same way /trip/[id] does), else the newest trip. */
export async function loadNextTrip(supabase: Client, todayISO: string): Promise<NextTrip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<TripRow[]>();
  if (error || !data || data.length === 0) return null;

  const hasStartDate = "start_date" in data[0];
  let pick: TripRow | null = null;
  let upcoming = false;
  if (hasStartDate) {
    const scheduled = data
      .filter((t) => typeof t.start_date === "string" && ISO_DATE.test(t.start_date) && t.start_date >= todayISO)
      .sort((a, b) => (a.start_date as string).localeCompare(b.start_date as string));
    if (scheduled.length > 0) {
      pick = scheduled[0];
      upcoming = true;
    }
  }
  if (!pick) pick = data[0];

  const slugs = Array.from(new Set(pick.resort_slugs ?? []));
  const { data: names } = slugs.length
    ? await supabase.from("resorts").select("slug, name").in("slug", slugs)
    : { data: [] as Array<{ slug: string; name: string }> };
  const nameBySlug = new Map((names ?? []).map((r) => [r.slug, r.name]));
  const stopNames: string[] = [];
  for (const s of pick.resort_slugs ?? []) {
    const n = nameBySlug.get(s) ?? s;
    if (stopNames[stopNames.length - 1] !== n) stopNames.push(n);
  }

  return {
    id: pick.id,
    name: pick.name,
    total_days: pick.total_days,
    lodging_mode: pick.lodging_mode,
    start_date: hasStartDate && typeof pick.start_date === "string" && ISO_DATE.test(pick.start_date) ? pick.start_date : null,
    started_at: pick.started_at,
    stopNames,
    upcoming,
  };
}
