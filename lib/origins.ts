// Origin = the "from" city (or geo location) used to compute drive times.
//
// We support two kinds of origins:
//   - "city": a metro centroid from ORIGINS below. The four Northeast
//     cities (NYC / Boston / Philadelphia / Hartford) have real road
//     routes pre-cached in drive_time_cache, keyed by `name`. Every
//     other city has no cache rows, so drive times fall back to the
//     Haversine estimate in lib/distance and are labelled "≈".
//   - "geo": the user's actual lat/lng from the Browser Geolocation API
//     (or a ZIP centroid). No cached routes, so estimates apply at the
//     filter/list level; ResortPanel upgrades to a Mapbox Matrix exact
//     value on click.
//
// Resolution order (see resolveOriginWithFallback): the URL ?from= wins
// so share links keep working, then the origin the user last picked on
// this device (lib/preferences, mirrored to profiles.preferred_origin
// when signed in), then NYC.

export type CityOrigin = {
  kind: "city";
  code: string;
  name: string;   // matches drive_time_cache.origin_name for cached cities
  short: string;  // 1-line label for chips/buttons
  state: string;  // two-letter code, for "Denver, CO" style labels
  lat: number;
  lon: number;
  /** True when drive_time_cache holds real road routes for this city.
   *  Everything else is estimated on the client (and labelled "≈"). */
  cached: boolean;
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

const city = (
  code: string,
  name: string,
  short: string,
  state: string,
  lat: number,
  lon: number,
  cached = false,
): CityOrigin => ({ kind: "city", code, name, short, state, lat, lon, cached });

// Cached Northeast cities first (their `name` is the drive_time_cache
// key, do not rename), then the rest of the country roughly east to
// west. Coordinates are city-hall / downtown centroids.
export const ORIGINS: readonly CityOrigin[] = [
  city("nyc",            "NYC",            "NYC",          "NY", 40.7128, -74.006,   true),
  city("boston",         "Boston",         "Boston",       "MA", 42.3601, -71.0589,  true),
  city("philadelphia",   "Philadelphia",   "Philly",       "PA", 39.9526, -75.1652,  true),
  city("hartford",       "Hartford",       "Hartford",     "CT", 41.7637, -72.6851,  true),
  city("washington-dc",  "Washington DC",  "DC",           "DC", 38.9072, -77.0369),
  city("albany",         "Albany",         "Albany",       "NY", 42.6526, -73.7562),
  city("burlington",     "Burlington",     "Burlington",   "VT", 44.4759, -73.2121),
  city("portland-me",    "Portland ME",    "Portland ME",  "ME", 43.6591, -70.2568),
  city("pittsburgh",     "Pittsburgh",     "Pittsburgh",   "PA", 40.4406, -79.9959),
  city("buffalo",        "Buffalo",        "Buffalo",      "NY", 42.8864, -78.8784),
  city("cleveland",      "Cleveland",      "Cleveland",    "OH", 41.4993, -81.6944),
  city("detroit",        "Detroit",        "Detroit",      "MI", 42.3314, -83.0458),
  city("chicago",        "Chicago",        "Chicago",      "IL", 41.8781, -87.6298),
  city("milwaukee",      "Milwaukee",      "Milwaukee",    "WI", 43.0389, -87.9065),
  city("minneapolis",    "Minneapolis",    "Minneapolis",  "MN", 44.9778, -93.265),
  city("denver",         "Denver",         "Denver",       "CO", 39.7392, -104.9903),
  city("salt-lake-city", "Salt Lake City", "SLC",          "UT", 40.7608, -111.891),
  city("boise",          "Boise",          "Boise",        "ID", 43.615,  -116.2023),
  city("reno",           "Reno",           "Reno",         "NV", 39.5296, -119.8138),
  city("las-vegas",      "Las Vegas",      "Las Vegas",    "NV", 36.1699, -115.1398),
  city("phoenix",        "Phoenix",        "Phoenix",      "AZ", 33.4484, -112.074),
  city("albuquerque",    "Albuquerque",    "ABQ",          "NM", 35.0844, -106.6504),
  city("spokane",        "Spokane",        "Spokane",      "WA", 47.6588, -117.426),
  city("seattle",        "Seattle",        "Seattle",      "WA", 47.6062, -122.3321),
  city("portland",       "Portland OR",    "Portland OR",  "OR", 45.5152, -122.6784),
  city("sacramento",     "Sacramento",     "Sacramento",   "CA", 38.5816, -121.4944),
  city("san-francisco",  "San Francisco",  "SF",           "CA", 37.7749, -122.4194),
  city("los-angeles",    "Los Angeles",    "LA",           "CA", 34.0522, -118.2437),
  city("san-diego",      "San Diego",      "San Diego",    "CA", 32.7157, -117.1611),
] as const;

export const DEFAULT_ORIGIN: CityOrigin = ORIGINS[0];

/** Full display label, "Denver, CO". NYC keeps its short form because
 *  "NYC, NY" reads oddly. */
export function originLabel(o: CityOrigin): string {
  return o.code === "nyc" ? "New York City, NY" : `${o.name}, ${o.state}`;
}

/** ORIGINS sorted for pickers: cached cities first (exact drive times),
 *  then everything else A-Z. */
export function originsForPicker(): CityOrigin[] {
  const cached = ORIGINS.filter((o) => o.cached);
  const rest = ORIGINS.filter((o) => !o.cached).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return [...cached, ...rest];
}

/** Strict lookup: null for unknown codes. */
export function findOrigin(code: string | null | undefined): CityOrigin | null {
  if (!code) return null;
  return ORIGINS.find((o) => o.code === code) ?? null;
}

export function originByCode(code: string | null | undefined): CityOrigin {
  return findOrigin(code) ?? DEFAULT_ORIGIN;
}

export function isValidOriginCode(code: unknown): code is string {
  return typeof code === "string" && findOrigin(code) !== null;
}

/** True when drive times from this origin come from the road-route
 *  cache. False means the UI must label them as estimates. */
export function hasCachedDriveTimes(origin: Origin): boolean {
  return origin.kind === "city" && origin.cached;
}

function geoOrigin(lat: number, lon: number): GeoOrigin {
  return { kind: "geo", code: "geo", name: "Here", short: "your location", lat, lon };
}

function parseGeo(latRaw: unknown, lonRaw: unknown): GeoOrigin | null {
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return geoOrigin(lat, lon);
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
    const geo = parseGeo(fromLat, fromLng);
    if (geo) return geo;
  }
  return originByCode(fromCode);
}

/** A persisted origin choice. Geo is stored with its coordinates so a
 *  returning visitor keeps "from here" without a new permission prompt. */
export type StoredOrigin =
  | { kind: "city"; code: string }
  | { kind: "geo"; lat: number; lon: number };

/**
 * URL first, then the stored choice, then NYC. A URL ?from= that names an
 * unknown city (old link, typo) is treated as absent rather than as NYC so
 * the stored preference still applies. `from=geo` with bad coordinates
 * behaves the same way.
 */
export function resolveOriginWithFallback(
  fromCode: string | null,
  fromLat: string | null,
  fromLng: string | null,
  stored: StoredOrigin | null,
): Origin {
  if (fromCode === "geo") {
    const geo = parseGeo(fromLat, fromLng);
    if (geo) return geo;
  } else if (fromCode) {
    const c = findOrigin(fromCode);
    if (c) return c;
  }
  const fromStored = storedToOrigin(stored);
  return fromStored ?? DEFAULT_ORIGIN;
}

export function storedToOrigin(stored: StoredOrigin | null): Origin | null {
  if (!stored) return null;
  if (stored.kind === "geo") return parseGeo(stored.lat, stored.lon);
  return findOrigin(stored.code);
}

export function originToStored(origin: Origin): StoredOrigin {
  return origin.kind === "geo"
    ? { kind: "geo", lat: origin.lat, lon: origin.lon }
    : { kind: "city", code: origin.code };
}

// Compact cookie encoding shared by the map (writer) and server routes
// such as /compare (reader): "city:denver" or "geo:40.71234,-74.00600".
// Coordinates are rounded to 5 decimals (about a metre), matching what
// the URL carries.
export function encodeStoredOrigin(stored: StoredOrigin): string {
  if (stored.kind === "geo") return `geo:${stored.lat.toFixed(5)},${stored.lon.toFixed(5)}`;
  return `city:${stored.code}`;
}

export function decodeStoredOrigin(raw: string | null | undefined): StoredOrigin | null {
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("city:")) {
    const code = raw.slice(5).trim();
    return findOrigin(code) ? { kind: "city", code } : null;
  }
  if (raw.startsWith("geo:")) {
    const [latRaw, lonRaw] = raw.slice(4).split(",");
    const geo = parseGeo(latRaw, lonRaw);
    return geo ? { kind: "geo", lat: geo.lat, lon: geo.lon } : null;
  }
  return null;
}

export function formatDriveTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Drive time with the estimate marker the whole app uses: "≈ 2h 30m"
 *  for Haversine estimates, plain "2h 30m" for cached road routes. */
export function formatDriveTimeLabel(seconds: number, isEstimate: boolean): string {
  const base = formatDriveTime(seconds);
  return isEstimate ? `≈ ${base}` : base;
}
