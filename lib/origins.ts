// Origin = the "from" city (or geo location) used to compute drive times.
//
// We support two kinds of origins:
//   - "city": one of 4 fixed metro centroids with pre-cached drive times
//     in drive_time_cache (NYC / Boston / Philly / Hartford). These are
//     real road-network routes, exact.
//   - "geo": the user's actual lat/lng from the Browser Geolocation API.
//     We don't have cached routes for arbitrary points, so drive times
//     are HAVERSINE × 1.3 ÷ 55 mph ESTIMATES at filter/list level. The
//     ResortPanel upgrades to a Mapbox Matrix exact value on click.

export type CityOrigin = {
  kind: "city";
  code: string;
  name: string;   // matches drive_time_cache.origin_name
  short: string;  // 1-line label for chips/buttons
  lat: number;
  lon: number;
};

export type GeoOrigin = {
  kind: "geo";
  code: "geo";
  name: "Here";
  short: "your location";
  lat: number;
  lon: number;
};

export type Origin = CityOrigin | GeoOrigin;

export const ORIGINS: readonly CityOrigin[] = [
  { kind: "city", code: "nyc",          name: "NYC",          short: "NYC",      lat: 40.7128, lon: -74.006  },
  { kind: "city", code: "boston",       name: "Boston",       short: "Boston",   lat: 42.3601, lon: -71.0589 },
  { kind: "city", code: "philadelphia", name: "Philadelphia", short: "Philly",   lat: 39.9526, lon: -75.1652 },
  { kind: "city", code: "hartford",     name: "Hartford",     short: "Hartford", lat: 41.7637, lon: -72.6851 },
] as const;

export function originByCode(code: string | null | undefined): CityOrigin {
  return ORIGINS.find((o) => o.code === code) ?? ORIGINS[0];
}

// Resolves the URL params (?from=, ?fromLat=, ?fromLng=) to an Origin.
// Falls back to NYC if `from=geo` was set but lat/lng missing or invalid
// (e.g. user revisited a stale URL after clearing geolocation permission).
export function resolveOrigin(
  fromCode: string | null,
  fromLat: string | null,
  fromLng: string | null,
): Origin {
  if (fromCode === "geo") {
    const lat = Number(fromLat);
    const lon = Number(fromLng);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { kind: "geo", code: "geo", name: "Here", short: "your location", lat, lon };
    }
  }
  return originByCode(fromCode);
}

export function formatDriveTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
