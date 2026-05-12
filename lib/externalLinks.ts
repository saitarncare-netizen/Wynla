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

export function bookingComUrl(name: string): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}`;
}

// Stage 30 — Booking.com search URL biased toward "near this resort"
// with sane defaults. If/when we get an actual affiliate AID we just
// add `&aid={id}` here and revenue flows. Until then it's still
// useful as a "find a hotel nearby" handoff.
export function lodgingSearchUrl(name: string, state: string | null | undefined): string {
  const query = state ? `${name} ${state}` : `${name}`;
  const params = new URLSearchParams({
    ss: query,
    dest_type: "landmark",
    // Default 1 adult, no children, 2-night stay starting in 30 days —
    // Booking.com falls back to a sane default if dates are missing.
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

// Airbnb fallback for users who prefer it over Booking.com.
export function airbnbSearchUrl(name: string, state: string | null | undefined): string {
  const query = state ? `${name} ${state}` : name;
  return `https://www.airbnb.com/s/${encodeURIComponent(query)}/homes`;
}
