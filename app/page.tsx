import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MapPage from "@/components/Map/MapPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [resortsRes, driveTimesRes, weatherRes, authRes] = await Promise.all([
    supabase
      .from("resorts")
      .select(
        "id, slug, name, state, region, latitude, longitude, passes, tier, vertical_drop, total_trails, total_acres, website_url, has_night_skiing, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, terrain_park_count",
      )
      .eq("active", true)
      .order("name"),
    supabase
      .from("drive_time_cache")
      .select("resort_id, origin_name, duration_seconds, distance_meters"),
    supabase
      .from("weather_cache")
      .select(
        "resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, snow_48h_in, wind_mph_avg, wind_dir_short, fetched_at, forecast_json",
      ),
    (async () => {
      const ssr = await createSupabaseServerClient();
      const { data } = await ssr.auth.getUser();
      return { user: data.user };
    })(),
  ]);

  if (resortsRes.error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <p className="rounded-md border border-wn-charcoal/20 bg-white px-4 py-2 font-mono text-sm text-wn-charcoal">
          db error: {resortsRes.error.message}
        </p>
      </main>
    );
  }

  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center p-8">
          <p className="text-sm text-wn-charcoal/60">Loading...</p>
        </main>
      }
    >
      <MapPage
        resorts={resortsRes.data ?? []}
        driveTimes={driveTimesRes.data ?? []}
        weather={weatherRes.data ?? []}
        isAuthed={!!authRes.user}
      />
    </Suspense>
  );
}
