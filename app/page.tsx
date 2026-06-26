import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MapPage from "@/components/Map/MapPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [resortsRes, driveTimesRes, weatherRes, authRes] = await Promise.all([
    supabase
      .from("resorts")
      .select(
        "id, slug, name, state, region, latitude, longitude, passes, tier, vertical_drop, total_trails, total_acres, website_url, has_night_skiing, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, terrain_park_count, total_lifts, high_speed_lifts, base_elevation_ft, summit_elevation_ft, annual_snowfall_in, season_open_text, season_close_text, snowmaking_pct, has_tubing, has_lessons, has_rentals, has_lodging_on_mountain, has_xc_skiing, has_backcountry_access, trail_map_url, webcam_url, closest_airport_iata, closest_airport_distance_mi, hero_image_url, hero_image_alt, hero_image_attribution, snow_base_depth_in, snow_new_24h_in, snow_new_48h_in, snow_new_7d_in, trails_open_today, lifts_open_today, snow_report_status, snow_report_updated_at, ticket_price_adult_min, ticket_price_adult_max, ticket_price_currency, ticket_booking_url, ticket_price_updated_at, allows_snowboards, lift_types, currently_open, season_end_date, terrain_park_features, current_surface_class, current_surface_updated_at, has_adaptive_program",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("drive_time_cache")
      .select("resort_id, origin_name, duration_seconds, distance_meters"),
    supabase
      .from("weather_cache")
      // forecast_json (10-day array × ~360 resorts) was shipped on every map
      // load but is never rendered here — the 10-day strip lives on
      // /resort/[slug], which fetches its own weather row. Dropped for payload.
      .select(
        "resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, snow_48h_in, wind_mph_avg, wind_dir_short, fetched_at",
      ),
    (async () => {
      const ssr = await createSupabaseServerClient();
      const { data } = await ssr.auth.getUser();
      return { user: data.user };
    })(),
  ]);

  if (resortsRes.error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-lg font-semibold text-wn-navy">Something went wrong loading the map.</p>
        <p className="text-sm text-wn-charcoal/70">Please refresh in a moment.</p>
      </main>
    );
  }

  return (
    <MapPage
      resorts={resortsRes.data ?? []}
      driveTimes={driveTimesRes.data ?? []}
      weather={weatherRes.data ?? []}
      isAuthed={!!authRes.user}
    />
  );
}
