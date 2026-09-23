// Origin = the "from" city (or geo location) used to compute drive times.
//
// We support two kinds of origins:
//   - "city": a fixed metro centroid. ORIGINS are the four the map was
//     built around, with pre-cached drive times in drive_time_cache
//     (real road-network routes, exact). LAUNCH_CITIES adds the
//     East / Midwest cities the Saturday picks page (/go) launches with;
//     those have no cached routes yet, so callers fall back to the
//     lib/distance estimate and label it "≈" (see hasCachedDriveTimes).
//   - "geo": the user's actual lat/lng from the Browser Geolocation API.
//     We don't have cached routes for arbitrary points, so drive times
//     are HAVERSINE × 1.2 ÷ 60 mph ESTIMATES at filter/list level. The
//     ResortPanel upgrades to a Mapbox Matrix exact value on click.

export type CityOrigin = {
  kind: "city";
  code: string;
  name: string;   // matches drive_time_cache.origin_name
  short: string;  // 1-line label for chips/buttons
  lat: number;
  lon: number;
  /** IANA zone of the city, for "this Saturday" and "8 AM local" copy. */
  timeZone?: string;
  /** Rows exist in drive_time_cache for this origin_name (the map's
   *  exact routes). Absent on the /go launch cities until the cache job
   *  covers them; those get the "≈" estimate. */
  driveCache?: boolean;
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

const EASTERN = "America/New_York";
const CENTRAL = "America/Chicago";

export const ORIGINS: readonly CityOrigin[] = [
  { kind: "city", code: "nyc",          name: "NYC",          short: "NYC",      lat: 40.7128, lon: -74.006,  timeZone: EASTERN, driveCache: true },
  { kind: "city", code: "boston",       name: "Boston",       short: "Boston",   lat: 42.3601, lon: -71.0589, timeZone: EASTERN, driveCache: true },
  { kind: "city", code: "philadelphia", name: "Philadelphia", short: "Philly",   lat: 39.9526, lon: -75.1652, timeZone: EASTERN, driveCache: true },
  { kind: "city", code: "hartford",     name: "Hartford",     short: "Hartford", lat: 41.7637, lon: -72.6851, timeZone: EASTERN, driveCache: true },
] as const;

/**
 * Cities the Saturday picks page (/go) and the Thursday email launch
 * with: the four map origins plus the East / Midwest metros whose
 * riders drive to the same mountains. Same shape as ORIGINS so
 * profiles.preferred_origin, the planner's `from=` param and the drive
 * time helpers accept either list. Centroids are city-hall points, not
 * airports, because the drive estimate starts where people live.
 */
export const LAUNCH_CITIES: readonly CityOrigin[] = [
  ...ORIGINS,
  { kind: "city", code: "washington-dc", name: "Washington DC", short: "DC",          lat: 38.9072, lon: -77.0369, timeZone: EASTERN },
  { kind: "city", code: "chicago",       name: "Chicago",       short: "Chicago",     lat: 41.8781, lon: -87.6298, timeZone: CENTRAL },
  { kind: "city", code: "minneapolis",   name: "Minneapolis",   short: "Minneapolis", lat: 44.9778, lon: -93.265,  timeZone: CENTRAL },
  { kind: "city", code: "detroit",       name: "Detroit",       short: "Detroit",     lat: 42.3314, lon: -83.0458, timeZone: EASTERN },
] as const;

export function originByCode(code: string | null | undefined): CityOrigin {
  return ORIGINS.find((o) => o.code === code) ?? ORIGINS[0];
}

/** Any launch city by code, or null; unlike originByCode there is no
 *  NYC fallback because /go must not silently answer for the wrong city. */
export function launchCityByCode(code: string | null | undefined): CityOrigin | null {
  if (!code) return null;
  const wanted = code.trim().toLowerCase();
  return LAUNCH_CITIES.find((o) => o.code === wanted) ?? null;
}

/** True when drive_time_cache is expected to hold exact routes for this
 *  origin. A geo origin never has them. */
export function hasCachedDriveTimes(origin: Origin): boolean {
  return origin.kind === "city" && origin.driveCache === true;
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
