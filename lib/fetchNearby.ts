// Round 9 (2026-06): client-side fetcher for the nearby_restaurants +
// nearby_activities tables. Used by ResortPanel to lazy-load when the
// panel opens — keeps the homepage SSR payload small (we don't want
// to ship 425 resorts × ~30 rows each on the initial map render).
//
// Returns top N rows per category sorted by distance ascending. The
// component decides how many to render; this function just normalizes
// the column types.

import { supabase } from "@/lib/supabase";
import type { NearbyRow } from "./nearbyCategories";

const NEARBY_COLUMNS =
  "id, resort_id, name, category, description, distance_km, drive_minutes, latitude, longitude, website_url, source, confidence_score, is_recommended";

export async function fetchNearbyRestaurants(resortId: number): Promise<NearbyRow[]> {
  const { data, error } = await supabase
    .from("nearby_restaurants")
    .select(NEARBY_COLUMNS)
    .eq("resort_id", resortId)
    // Recommended first so they survive the cap, then nearest. limit bounds
    // the payload for dense resorts (rendering caps each category anyway).
    .order("is_recommended", { ascending: false })
    .order("distance_km", { ascending: true })
    .limit(60);
  if (error) return [];
  return (data ?? []) as NearbyRow[];
}

export async function fetchNearbyActivities(resortId: number): Promise<NearbyRow[]> {
  const { data, error } = await supabase
    .from("nearby_activities")
    .select(NEARBY_COLUMNS)
    .eq("resort_id", resortId)
    // Recommended first so they survive the cap, then nearest. limit bounds
    // the payload for dense resorts (rendering caps each category anyway).
    .order("is_recommended", { ascending: false })
    .order("distance_km", { ascending: true })
    .limit(60);
  if (error) return [];
  return (data ?? []) as NearbyRow[];
}
