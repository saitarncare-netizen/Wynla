// Shared URL builders for external resort resources.
// Used by both the detail page and the map ResortPanel so the link patterns
// stay in one place — change once, propagates everywhere.

// Build a Mountain-Forecast peak slug from the resort name.
// Their convention: words separated by hyphens, original case preserved.
// Strip "Resort"/"Ski Area" suffix + apostrophes/periods so common names
// like "Mt. Brighton" → "Mt-Brighton" land closer to a real peak page.
// Some resorts will still 404 — Mountain-Forecast's 404 page has search.
export function mountainForecastSlug(name: string): string {
  return name
    .replace(/\s*(Resort|Mountain Resort|Ski Area|Ski Resort)\s*$/i, "")
    .replace(/['.]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function mountainForecastUrl(name: string): string {
  return `https://www.mountain-forecast.com/peaks/${mountainForecastSlug(name)}`;
}

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
