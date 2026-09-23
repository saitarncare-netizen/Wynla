import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MapPage, {
  type DriveTimeRows,
  type Resort,
  type WeatherSnapshot,
} from "@/components/Map/MapPage";

// Stays dynamic because the header needs the per-request auth cookie.
// The three anon data reads below are cached independently of that, so a
// dynamic render is a cookie check plus a cache hit, not three PostgREST
// round-trips.
export const dynamic = "force-dynamic";

// Homepage-only canonical. This used to live in the root layout, where it
// cascaded to every route and marked the whole site as a duplicate of "/".
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// The map data only changes when the daily crons write it (11:30-13:00
// UTC), so a 10-minute TTL loses nothing while turning every visitor's
// three queries into one cache read per region per 10 minutes.
const HOME_DATA_REVALIDATE_SECONDS = 600;
// Not exported: Next only allows its own named exports from a page file.
// A cron that wants to bust the cache early calls revalidateTag("home-data").
const HOME_DATA_CACHE_TAG = "home-data";

// Only the columns the map, filters, ResortPanel and trip planner read.
// Everything else (attribution, ticket links, 48h/7d snow, season end
// dates, ...) is rendered on /resort/[slug], which fetches its own row.
// Measured 2026-09-23 with scripts/measure-home-payload.mjs (re-run it
// after editing this list): 66 -> 53 columns cut the resorts JSON from
// 757 KB to 581 KB raw (60 -> 49 KB gzip) for 397 active resorts.
// Season-1 integration: typical_season_*, operating_status, season_end_date
// and snow_report_updated_at are read by ResortPanel's status derivation
// (lib/seasonDates.deriveResortStatus, same inputs as the resort page) and
// were added after the measurement above; they are short text/date columns
// (a few KB over 397 rows).
const RESORT_COLUMNS =
  "id, slug, name, state, region, city, latitude, longitude, passes, tier, vertical_drop, total_trails, total_acres, website_url, has_night_skiing, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, terrain_park_count, total_lifts, high_speed_lifts, base_elevation_ft, summit_elevation_ft, annual_snowfall_in, season_open_text, season_close_text, typical_season_start, typical_season_end, operating_status, season_end_date, snowmaking_pct, has_tubing, has_lessons, has_rentals, has_lodging_on_mountain, has_xc_skiing, has_backcountry_access, webcam_url, closest_airport_iata, hero_image_url, hero_image_alt, hero_image_attribution, snow_base_depth_in, snow_new_24h_in, trails_open_today, lifts_open_today, snow_report_status, snow_report_updated_at, ticket_price_adult_min, ticket_price_adult_max, lift_types, currently_open, current_surface_class, has_adaptive_program";

// PostgREST caps every response at the project's max-rows setting (1,000
// on Supabase) even when no limit is requested. drive_time_cache holds
// 4 origins x ~437 resorts = ~1,750 rows, so the old single select
// silently dropped the tail and some resorts had no drive time for some
// origins. Page through in windows with a deterministic order and stop on
// the exact row count, not on a short page: if max-rows is ever lowered
// below PAGE_SIZE a short first page would otherwise look like the end.
const PAGE_SIZE = 1000;

type DriveTimeRow = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
};

const getCachedResorts = unstable_cache(
  async (): Promise<Resort[]> => {
    const { data, error } = await supabase
      .from("resorts")
      .select(RESORT_COLUMNS)
      .eq("active", true)
      .order("name");
    // Throwing keeps a failed read out of the cache so the next request
    // retries instead of serving an empty map for ten minutes.
    if (error) throw new Error(`resorts: ${error.message}`);
    return (data ?? []) as unknown as Resort[];
  },
  // Bump the key suffix whenever RESORT_COLUMNS changes: the data cache
  // outlives a deploy, so without it the old column set is served for
  // up to HOME_DATA_REVALIDATE_SECONDS (the header search's town match
  // would silently see no `city` in that window).
  ["home-resorts", "v2"],
  { revalidate: HOME_DATA_REVALIDATE_SECONDS, tags: [HOME_DATA_CACHE_TAG] },
);

const getCachedDriveTimes = unstable_cache(
  async (): Promise<DriveTimeRows> => {
    const rows: DriveTimeRow[] = [];
    let total: number | null = null;
    while (total === null || rows.length < total) {
      const from = rows.length;
      const { data, error, count } = await supabase
        .from("drive_time_cache")
        .select("resort_id, origin_name, duration_seconds, distance_meters", {
          count: "exact",
        })
        .order("origin_name")
        .order("resort_id")
        // Unique tiebreak: the (resort_id, origin_name) unique index has
        // been partial before, so duplicates must not straddle a window.
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`drive_time_cache: ${error.message}`);
      const page = (data ?? []) as DriveTimeRow[];
      // An empty page with rows still owed means the table shrank
      // mid-read; stop rather than loop forever.
      if (page.length === 0) break;
      rows.push(...page);
      total = count ?? rows.length;
    }
    // Compact per-origin tuples: the row objects repeat four keys per
    // entry, which is most of their serialized weight in the RSC payload.
    const byOrigin: DriveTimeRows = {};
    for (const r of rows) {
      (byOrigin[r.origin_name] ??= []).push([
        r.resort_id,
        r.duration_seconds,
        r.distance_meters,
      ]);
    }
    return byOrigin;
  },
  ["home-drive-times"],
  { revalidate: HOME_DATA_REVALIDATE_SECONDS, tags: [HOME_DATA_CACHE_TAG] },
);

const getCachedWeather = unstable_cache(
  async (): Promise<WeatherSnapshot[]> => {
    // The map panel shows today's conditions and high only. The 10-day
    // forecast, lows, wind and 48h snow all live on /resort/[slug].
    const { data, error } = await supabase
      .from("weather_cache")
      // fetched_at dates the map sheet's "Forecast · 3h ago" tiles.
      .select("resort_id, temp_high_f, conditions_short, fetched_at");
    if (error) throw new Error(`weather_cache: ${error.message}`);
    return (data ?? []) as WeatherSnapshot[];
  },
  ["home-weather"],
  { revalidate: HOME_DATA_REVALIDATE_SECONDS, tags: [HOME_DATA_CACHE_TAG] },
);

export default async function Home() {
  const [resortsRes, driveTimesRes, weatherRes, user] = await Promise.all([
    getCachedResorts().then(
      (data) => ({ data, error: null as string | null }),
      (e: unknown) => ({ data: null, error: e instanceof Error ? e.message : String(e) }),
    ),
    // Drive times and weather are enrichment: if either read fails the
    // map still renders, just without that layer, same as before.
    getCachedDriveTimes().catch((e: unknown) => {
      console.error("[home] drive_time_cache read failed", e);
      return {} as DriveTimeRows;
    }),
    getCachedWeather().catch((e: unknown) => {
      console.error("[home] weather_cache read failed", e);
      return [] as WeatherSnapshot[];
    }),
    // The auth read depends on the request cookie, so it must stay
    // outside every cached scope.
    (async () => {
      const ssr = await createSupabaseServerClient();
      const { data } = await ssr.auth.getUser();
      return data.user;
    })(),
  ]);

  if (resortsRes.error || !resortsRes.data) {
    console.error("[home] resorts read failed", resortsRes.error);
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-lg font-semibold text-wn-navy">Something went wrong loading the map.</p>
        <p className="text-sm text-wn-charcoal/70">Please refresh in a moment.</p>
      </main>
    );
  }

  return (
    <MapPage
      resorts={resortsRes.data}
      driveTimes={driveTimesRes}
      weather={weatherRes}
      isAuthed={!!user}
    />
  );
}
