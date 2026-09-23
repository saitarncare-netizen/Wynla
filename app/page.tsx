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
// Measured 2026-09-23: 66 -> 53 columns cut the resorts JSON from 809 KB
// to 622 KB raw for 425 active resorts.
const RESORT_COLUMNS =
  "id, slug, name, state, region, latitude, longitude, passes, tier, vertical_drop, total_trails, total_acres, website_url, has_night_skiing, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, terrain_park_count, total_lifts, high_speed_lifts, base_elevation_ft, summit_elevation_ft, annual_snowfall_in, season_open_text, season_close_text, snowmaking_pct, has_tubing, has_lessons, has_rentals, has_lodging_on_mountain, has_xc_skiing, has_backcountry_access, webcam_url, closest_airport_iata, hero_image_url, hero_image_alt, snow_base_depth_in, snow_new_24h_in, trails_open_today, lifts_open_today, snow_report_status, ticket_price_adult_min, ticket_price_adult_max, lift_types, currently_open, current_surface_class, has_adaptive_program";

// PostgREST caps every response at the project's max-rows setting (1,000
// on Supabase) even when no limit is requested. drive_time_cache holds
// 4 origins x ~437 resorts = ~1,750 rows, so the old single select
// silently dropped the tail and some resorts had no drive time for some
// origins. Page through in 1,000-row windows with a deterministic order.
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
  ["home-resorts"],
  { revalidate: HOME_DATA_REVALIDATE_SECONDS, tags: [HOME_DATA_CACHE_TAG] },
);

const getCachedDriveTimes = unstable_cache(
  async (): Promise<DriveTimeRows> => {
    const rows: DriveTimeRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("drive_time_cache")
        .select("resort_id, origin_name, duration_seconds, distance_meters")
        .order("origin_name")
        .order("resort_id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`drive_time_cache: ${error.message}`);
      const page = (data ?? []) as DriveTimeRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
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
      .select("resort_id, temp_high_f, conditions_short");
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
