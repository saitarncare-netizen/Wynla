// Round 9 (2026-06): visual + label vocabulary for the
// nearby_restaurants + nearby_activities tables.
//
// Categories are stable strings stored in the DB (see migration
// round_9_nearby_restaurants_and_activities); this file owns the
// presentation layer for those strings — emoji, English label, ordering.
// Keep keys in sync with the CHECK constraints on each table.

export type RestaurantCategory =
  | "local"
  | "fast_food"
  | "family"
  | "cafe"
  | "fine_dining";

export type ActivityCategory =
  | "hot_springs"
  | "museum"
  | "brewery"
  | "shopping"
  | "tubing"
  | "sleigh_ride"
  | "ice_skating"
  | "snowshoe"
  | "spa"
  | "winery"
  | "sled_dog"
  | "gondola_sightseeing";

export type CategoryMeta = {
  key: string;
  label: string;
  emoji: string;
  blurb?: string;
};

export const RESTAURANT_CATEGORIES: Record<RestaurantCategory, CategoryMeta> = {
  local: {
    key: "local",
    label: "Local sit-down",
    emoji: "🍽",
    blurb: "Regional cuisine + local spots",
  },
  family: {
    key: "family",
    label: "Family + casual",
    emoji: "👨‍👩‍👧‍👦",
    blurb: "Burgers, pizza, diner-style",
  },
  fast_food: {
    key: "fast_food",
    label: "Fast food",
    emoji: "🍔",
    blurb: "Quick eats on the road",
  },
  cafe: {
    key: "cafe",
    label: "Cafe + breakfast",
    emoji: "☕",
    blurb: "Coffee, bakery, morning fuel",
  },
  fine_dining: {
    key: "fine_dining",
    label: "Fine dining",
    emoji: "🍷",
    blurb: "Date night / celebration",
  },
};

export const RESTAURANT_ORDER: RestaurantCategory[] = [
  "local",
  "family",
  "cafe",
  "fast_food",
  "fine_dining",
];

export const ACTIVITY_CATEGORIES: Record<ActivityCategory, CategoryMeta> = {
  hot_springs: { key: "hot_springs", label: "Hot springs", emoji: "♨️" },
  spa: { key: "spa", label: "Spa", emoji: "💆" },
  museum: { key: "museum", label: "Museum / gallery", emoji: "🏛" },
  brewery: { key: "brewery", label: "Brewery / distillery", emoji: "🍺" },
  winery: { key: "winery", label: "Winery", emoji: "🍷" },
  shopping: { key: "shopping", label: "Shopping", emoji: "🛍" },
  tubing: { key: "tubing", label: "Tubing / snow park", emoji: "🎢" },
  sleigh_ride: { key: "sleigh_ride", label: "Sleigh ride", emoji: "🛷" },
  ice_skating: { key: "ice_skating", label: "Ice skating", emoji: "⛸" },
  snowshoe: { key: "snowshoe", label: "Snowshoe", emoji: "🥾" },
  sled_dog: { key: "sled_dog", label: "Sled dog tour", emoji: "🐕" },
  gondola_sightseeing: { key: "gondola_sightseeing", label: "Gondola sightseeing", emoji: "🚠" },
};

export const ACTIVITY_ORDER: ActivityCategory[] = [
  "hot_springs",
  "spa",
  "museum",
  "brewery",
  "winery",
  "shopping",
  "tubing",
  "ice_skating",
  "sleigh_ride",
  "sled_dog",
  "snowshoe",
  "gondola_sightseeing",
];

export type NearbyRow = {
  id: number;
  resort_id: number;
  name: string;
  category: string;
  description: string | null;
  distance_km: number | null;
  drive_minutes: number | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  source: string;
  confidence_score: number | null;
};

export function distanceLabel(km: number | null): string {
  if (km == null) return "";
  const miles = km * 0.621371;
  if (miles < 1) return `${(miles).toFixed(1)} mi`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function driveLabel(min: number | null): string {
  if (min == null || min <= 0) return "";
  if (min < 60) return `~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`;
}
