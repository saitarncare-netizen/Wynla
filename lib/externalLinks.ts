// Shared URL builders for external resort resources.
// Used by both the detail page and the map ResortPanel so the link patterns
// stay in one place — change once, propagates everywhere.

export function weatherGovUrl(lat: number, lng: number): string {
  return `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lng}`;
}

// Animated wind layer at zoom 12 (regional); auto-generated per resort.
export function windyUrl(lat: number, lng: number): string {
  return `https://www.windy.com/?wind,${lat},${lng},12`;
}

// Google Maps name+state search → full business listing with photos/reviews.
// Falls back to name-only when state is missing.
export function googleMapsUrl(name: string, state: string | null | undefined): string {
  const query = state ? `${name} ${state} ski resort` : `${name} ski resort`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Stage 37 — the previous Booking.com / Airbnb / generic lodging URL
// builders moved out of this file into `lib/affiliateLinks.ts`, where
// they pick up affiliate IDs from NEXT_PUBLIC_AFFILIATE_* env vars.
// This file is back to its original "non-revenue informational links"
// scope: weather, wind, and a Google Maps handoff.
