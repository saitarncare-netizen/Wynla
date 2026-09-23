// Origin = the "from" city (or geo location) used to compute drive times.
//
// We support two kinds of origins:
//   - "city": a metro centroid from ORIGINS below. The four Northeast
//     cities (NYC / Boston / Philadelphia / Hartford) have real road
//     routes pre-cached in drive_time_cache, keyed by `name`. Every
//     other city has no cache rows, so drive times fall back to the
//     Haversine estimate in lib/distance and are labelled "≈".
//     LAUNCH_CITIES is the subset the Saturday picks page (/go) and the
//     Thursday email launch with; it is derived from ORIGINS so the map,
//     /go and profiles.preferred_origin share one list of city data.
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
  /** IANA zone of the city, for "this Saturday" and "8 AM local" copy. */
  timeZone: string;
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

const EASTERN = "America/New_York";
const CENTRAL = "America/Chicago";
const MOUNTAIN = "America/Denver";
const PACIFIC = "America/Los_Angeles";

const city = (
  code: string,
  name: string,
  short: string,
  state: string,
  timeZone: string,
  lat: number,
  lon: number,
  cached = false,
): CityOrigin => ({ kind: "city", code, name, short, state, timeZone, lat, lon, cached });

// Cached Northeast cities first (their `name` is the drive_time_cache
// key, do not rename), then the rest of the country roughly east to
// west. Coordinates are city-hall / downtown centroids. `name` is the
// plain city name; the state suffix from originLabel() is what tells
// the two Portlands apart, and `short` carries it for chips where the
// full label would not fit. Time zones are the city's own IANA zone
// (Phoenix has no DST, Boise is its own Mountain zone).
export const ORIGINS: readonly CityOrigin[] = [
  city("nyc",            "NYC",            "NYC",          "NY", EASTERN,           40.7128, -74.006,   true),
  city("boston",         "Boston",         "Boston",       "MA", EASTERN,           42.3601, -71.0589,  true),
  city("philadelphia",   "Philadelphia",   "Philly",       "PA", EASTERN,           39.9526, -75.1652,  true),
  city("hartford",       "Hartford",       "Hartford",     "CT", EASTERN,           41.7637, -72.6851,  true),
  city("washington-dc",  "Washington",     "DC",           "DC", EASTERN,           38.9072, -77.0369),
  city("albany",         "Albany",         "Albany",       "NY", EASTERN,           42.6526, -73.7562),
  city("burlington",     "Burlington",     "Burlington",   "VT", EASTERN,           44.4759, -73.2121),
  city("portland-me",    "Portland",       "Portland ME",  "ME", EASTERN,           43.6591, -70.2568),
  city("pittsburgh",     "Pittsburgh",     "Pittsburgh",   "PA", EASTERN,           40.4406, -79.9959),
  city("buffalo",        "Buffalo",        "Buffalo",      "NY", EASTERN,           42.8864, -78.8784),
  city("cleveland",      "Cleveland",      "Cleveland",    "OH", EASTERN,           41.4993, -81.6944),
  city("detroit",        "Detroit",        "Detroit",      "MI", EASTERN,           42.3314, -83.0458),
  city("chicago",        "Chicago",        "Chicago",      "IL", CENTRAL,           41.8781, -87.6298),
  city("milwaukee",      "Milwaukee",      "Milwaukee",    "WI", CENTRAL,           43.0389, -87.9065),
  city("minneapolis",    "Minneapolis",    "Minneapolis",  "MN", CENTRAL,           44.9778, -93.265),
  city("denver",         "Denver",         "Denver",       "CO", MOUNTAIN,          39.7392, -104.9903),
  city("salt-lake-city", "Salt Lake City", "SLC",          "UT", MOUNTAIN,          40.7608, -111.891),
  city("boise",          "Boise",          "Boise",        "ID", "America/Boise",   43.615,  -116.2023),
  city("reno",           "Reno",           "Reno",         "NV", PACIFIC,           39.5296, -119.8138),
  city("las-vegas",      "Las Vegas",      "Las Vegas",    "NV", PACIFIC,           36.1699, -115.1398),
  city("phoenix",        "Phoenix",        "Phoenix",      "AZ", "America/Phoenix", 33.4484, -112.074),
  city("albuquerque",    "Albuquerque",    "ABQ",          "NM", MOUNTAIN,          35.0844, -106.6504),
  city("spokane",        "Spokane",        "Spokane",      "WA", PACIFIC,           47.6588, -117.426),
  city("seattle",        "Seattle",        "Seattle",      "WA", PACIFIC,           47.6062, -122.3321),
  city("portland",       "Portland",       "Portland OR",  "OR", PACIFIC,           45.5152, -122.6784),
  city("sacramento",     "Sacramento",     "Sacramento",   "CA", PACIFIC,           38.5816, -121.4944),
  city("san-francisco",  "San Francisco",  "SF",           "CA", PACIFIC,           37.7749, -122.4194),
  city("los-angeles",    "Los Angeles",    "LA",           "CA", PACIFIC,           34.0522, -118.2437),
  city("san-diego",      "San Diego",      "San Diego",    "CA", PACIFIC,           32.7157, -117.1611),
] as const;

export const DEFAULT_ORIGIN: CityOrigin = ORIGINS[0];

/**
 * Cities the Saturday picks page (/go) and the Thursday email launch
 * with: the four cached map origins plus the East / Midwest metros whose
 * riders drive to the same mountains, in launch order (East first).
 * Derived from ORIGINS by code so there is exactly one list of city
 * data; add a code here (and drive_time_cache rows, ideally) to launch
 * /go in another city.
 */
const LAUNCH_CITY_CODES = [
  "nyc",
  "boston",
  "philadelphia",
  "hartford",
  "washington-dc",
  "chicago",
  "minneapolis",
  "detroit",
] as const;

export const LAUNCH_CITIES: readonly CityOrigin[] = LAUNCH_CITY_CODES.map((code) => {
  const c = ORIGINS.find((o) => o.code === code);
  if (!c) throw new Error(`LAUNCH_CITIES: "${code}" is not in ORIGINS`);
  return c;
});

/** Any launch city by code, or null; unlike originByCode there is no
 *  NYC fallback because /go must not silently answer for the wrong city. */
export function launchCityByCode(code: string | null | undefined): CityOrigin | null {
  if (!code) return null;
  const wanted = code.trim().toLowerCase();
  return LAUNCH_CITIES.find((o) => o.code === wanted) ?? null;
}

/** Full display label, "Denver, CO". NYC keeps its short form because
 *  "NYC, NY" reads oddly. */
export function originLabel(o: CityOrigin): string {
  return o.code === "nyc" ? "New York City, NY" : `${o.name}, ${o.state}`;
}

/** The estimate marker every drive-time surface uses. Kept in one place
 *  so a label can never say "estimated" one way in the drawer and
 *  another way in /compare. */
export const ESTIMATE_MARK = "≈";

/** Prefixes a label with the estimate mark when the value behind it is
 *  a Haversine estimate rather than a cached road route. */
export function withEstimateMark(label: string, isEstimate: boolean): string {
  return isEstimate ? `${ESTIMATE_MARK} ${label}` : label;
}

/** The label a city gets in the origin pickers (drawer, desktop From
 *  dropdown, account default): the full label plus an explicit
 *  "(≈ estimated)" for cities without cached routes, so the user knows
 *  before picking that the times will be rough. */
export function originOptionLabel(o: CityOrigin): string {
  return o.cached ? originLabel(o) : `${originLabel(o)} (${ESTIMATE_MARK} estimated)`;
}

/** Short form for chips and section titles: "NYC", "Denver", "here". */
export function originShort(origin: Origin): string {
  return origin.kind === "geo" ? "here" : origin.short;
}

/** The drive-time filter's own label, shared by the desktop From button
 *  and the active-filter chip so both carry the same "≈" when the
 *  origin's times are estimates. `withinHours` 0 means no cap. */
export function driveFilterLabel(
  withinHours: number,
  origin: Origin,
  isEstimate: boolean,
): string {
  const base =
    withinHours > 0
      ? `≤ ${withinHours}h drive from ${originShort(origin)}`
      : `Any drive from ${originShort(origin)}`;
  return withEstimateMark(base, isEstimate);
}

/** ORIGINS sorted for pickers: cached cities first (exact drive times),
 *  then everything else A-Z by their display label, so the two
 *  Portlands sort by state. */
export function originsForPicker(): CityOrigin[] {
  const cached = ORIGINS.filter((o) => o.cached);
  const rest = ORIGINS.filter((o) => !o.cached).sort((a, b) =>
    originLabel(a).localeCompare(originLabel(b)),
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
// such as /compare (reader): "city:denver" or "geo:40.71,-74.01".
// Geo coordinates are rounded to 2 decimals (about a kilometre). The
// stored copy lives for a year and rides every request as a cookie, so
// it must not pin a home address; drive-time estimates are far coarser
// than a kilometre anyway. The URL keeps the per-visit 5-decimal value.
export const STORED_GEO_DECIMALS = 2;

export function encodeStoredOrigin(stored: StoredOrigin): string {
  if (stored.kind === "geo") {
    return `geo:${stored.lat.toFixed(STORED_GEO_DECIMALS)},${stored.lon.toFixed(STORED_GEO_DECIMALS)}`;
  }
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
  return withEstimateMark(formatDriveTime(seconds), isEstimate);
}
