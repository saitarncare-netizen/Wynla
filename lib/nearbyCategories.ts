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
  | "ski_shop"
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
  ski_shop: { key: "ski_shop", label: "Ski & board shops", emoji: "🏂", blurb: "Buy or rent gear" },
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
  "ski_shop",
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
  // ⭐ editorial "Recommended" flag — derived once from real Google
  // ratings (top picks per category, well-rated + enough reviews). Per
  // Google ToS we store only this boolean, never the rating values.
  is_recommended?: boolean | null;
};

// The Round 9 importer fell back to OSM addr:street (or a free-text
// `description` tag) when a place had no cuisine tag, so ~2,300 rows
// carry values like "Main Street", "U.S. Route 4 East" or "West 200
// South" instead of a description. Those are hidden at render time.
//
// An address is recognised by its SHAPE, not by one word: a short string
// (at most six words) that ends in a street word, optionally followed by
// a compass direction ("Main Street West", "Wealthy Street Southeast"),
// or that carries a route / grid number. "St. Bernard Grill" and
// "Drive-in" therefore pass through — the street word is not at the end.
const STREET_WORD =
  "street|st|road|rd|route|rte|avenue|ave|drive|dr|highway|hwy|way|lane|ln|boulevard|blvd|pike|turnpike|parkway|pkwy|circle|court|ct|place|plaza|square|sq|broadway|trail|loop|commons|row|alley|terrace|arterial";
const DIRECTION = "north|south|east|west|northeast|northwest|southeast|southwest|n|s|e|w|ne|nw|se|sw|sud|nord|est|ouest";
const ENDS_IN_STREET_WORD = new RegExp(`\\b(?:${STREET_WORD})\\.?(?:\\s+(?:${DIRECTION}))*$`, "i");
// French-style names put the street word first: "Rue des Pins",
// "Chemin de Richford", "Paseo del Pueblo Norte".
const STARTS_WITH_STREET_WORD = /^(?:rue|chemin|route|paseo|avenida|calle)\s/i;
// "U.S. Route 4", "Vermont Route 114", "State Highway 23A", "OR 35",
// "PA 611", "M-32 West", "US 2 East", "Us-93 North", "I 70 Business Loop",
// "(CA-140)", and lettered county roads such as "County Highway K".
const ROUTE_NUMBER = /(?:^|[\s(])(?:route|rte|highway|hwy|us|u\.s\.|i|sr|[a-z]{1,2})[- ]?\d+[a-z]?\b|\b(?:county|co)\.?\s+(?:highway|hwy|road|rd)\s+[a-z]{1,2}$/i;
// Utah-style grid addresses ("West 200 South", "East 2nd South").
const GRID_ADDRESS = /\b(?:north|south|east|west)\s+\d+(?:st|nd|rd|th)?\b/i;
// A leading house number or a trailing ZIP code is an address whatever
// its length ("760 Copper Road C102, Frisco, CO 80443").
const HOUSE_NUMBER_OR_ZIP = /^\d+\s|\b\d{5}$/;
const MAX_ADDRESS_WORDS = 6;

function looksLikeAddress(text: string): boolean {
  if (HOUSE_NUMBER_OR_ZIP.test(text)) return true;
  if (text.split(/\s+/).length > MAX_ADDRESS_WORDS) return false;
  return (
    ENDS_IN_STREET_WORD.test(text) ||
    STARTS_WITH_STREET_WORD.test(text) ||
    ROUTE_NUMBER.test(text) ||
    GRID_ADDRESS.test(text)
  );
}

// A raw OSM tag value is a single token ("Steak_house", "pizza") or a
// semicolon list of single tokens ("Donut;Coffee_shop"). Anything with
// spaces inside a part is free text a human wrote ("Ski Shop, Climbing
// Gear, Used Gear", "General store; TruValue Hardware") and must keep
// its own capitalisation.
function looksLikeOsmTag(text: string): boolean {
  return text.split(";").every((part) => !/\s/.test(part.trim()));
}

// A few OSM cuisine values whose word-by-word form reads wrong.
const CUISINE_LABELS: Record<string, string> = {
  bbq: "BBQ",
  barbecue: "BBQ",
  "tex-mex": "Tex-Mex",
  fish_and_chips: "fish and chips",
  bar_and_grill: "bar and grill",
  coffee_shop: "coffee shop",
  steak_house: "steak house",
  fine_dining: "fine dining",
};

/**
 * Turn a raw nearby-place description into display copy, or "" when it
 * should be hidden. "Steak_house" -> "Steak house", "donut;coffee_shop"
 * -> "Donut, coffee shop", "Main Street" -> "" (an address is not a
 * description). OSM tag values are normalised word by word; free text is
 * passed through with only its first letter capitalised, so "Ski Shop,
 * Climbing Gear" and "bar and grill" both stay readable.
 */
export function prettifyDescription(raw: string | null | undefined): string {
  if (!raw) return "";
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (looksLikeAddress(text)) return "";
  const joined = looksLikeOsmTag(text)
    ? [
        ...new Set(
          text
            .split(/\s*;\s*/)
            .map((p) => p.trim().toLowerCase())
            .filter(Boolean)
            .map((p) => CUISINE_LABELS[p] ?? p.replace(/_/g, " ")),
        ),
      ].join(", ")
    : text;
  if (!joined) return "";
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export function distanceLabel(km: number | null): string {
  // Hide 0 / sub-50m distances — those are uncomputed rows, not "0.0 mi away".
  if (km == null || km < 0.05) return "";
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

// Google Maps deep links. Every nearby place is clickable even when we
// have no website — tapping the card opens the place on Google Maps
// (its listing carries Google's own ratings + reviews), and the
// Directions action drops a pin and starts navigation to the exact
// coordinates. Both open the native Maps app on mobile.
export function mapsPlaceUrl(name: string, lat: number | null, lng: number | null): string {
  const query = lat != null && lng != null ? `${name} ${lat},${lng}` : name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsDirectionsUrl(name: string, lat: number | null, lng: number | null): string {
  // Precise pin = the place's own coordinates; falls back to a name
  // search when coordinates are missing (shouldn't happen from OSM).
  const dest = lat != null && lng != null ? `${lat},${lng}` : name;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}
