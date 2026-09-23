// /near/[city] — "Ski resorts near <City>" (audit finding content-seo-27).
//
// One page per city in lib/origins ORIGINS (29 today): every active
// resort within NEAR_MAX_HOURS of the city's downtown centroid, sorted
// by drive time and grouped into <2 h / 2-4 h / 4-6 h bands. Drive times
// come from drive_time_cache when the city has cached road routes (the
// four Northeast cities) and from the lib/distance estimate otherwise,
// carrying the same "≈" mark every other drive-time surface uses.
//
// This module is the pure half (no I/O): banding, row building, the
// nearest-launch-city helper the state pages use, and the page's
// canonical paths. The reads live in app/near/[city]/data.ts so this
// file stays unit-testable without a Supabase client.

import { estimateDriveSeconds, haversineMeters } from "@/lib/distance";
import {
  LAUNCH_CITIES,
  ORIGINS,
  findOrigin,
  hasCachedDriveTimes,
  launchCityByCode,
  originLabel,
  type CityOrigin,
} from "@/lib/origins";
import {
  deriveResortStatus,
  resolveSeasonInfo,
  type ResortStatus,
  type ResortStatusSource,
  type SeasonTextSource,
} from "@/lib/seasonDates";

/** Radius of the page. Six hours is the longest single-day drive the
 *  planner treats as a weekend, and the /go picker's ceiling is 12 h. */
export const NEAR_MAX_HOURS = 6;

export type DriveBand = "under-2" | "2-4" | "4-6";

export const DRIVE_BANDS: ReadonlyArray<{ key: DriveBand; label: string; maxHours: number }> = [
  { key: "under-2", label: "Under 2 hours", maxHours: 2 },
  { key: "2-4", label: "2 to 4 hours", maxHours: 4 },
  { key: "4-6", label: "4 to 6 hours", maxHours: NEAR_MAX_HOURS },
];

/** Band for a drive, or null when it is past the page's radius. */
export function bandFor(seconds: number): DriveBand | null {
  const hours = seconds / 3600;
  for (const band of DRIVE_BANDS) {
    if (hours <= band.maxHours) return band.key;
  }
  return null;
}

/** The resort columns the page reads. `ResortStatusSource` +
 *  `SeasonTextSource` are the inputs deriveResortStatus already takes,
 *  so a status here matches the resort page and the map panel. */
export type NearResortRow = ResortStatusSource &
  SeasonTextSource & {
    id: number;
    slug: string;
    name: string;
    state: string;
    latitude: number | string | null;
    longitude: number | string | null;
    passes: string[] | null;
    tier: string | null;
    vertical_drop: number | null;
    /** Adult window lift ticket, whole dollars, from the resort's own
     *  price page (fresh-eyes-newbie-35). Null until the backfill runs. */
    ticket_price_adult_min: number | null;
    ticket_price_adult_max: number | null;
    ticket_price_currency: string | null;
    ticket_price_updated_at: string | null;
  };

export type DriveInfo = {
  seconds: number;
  meters: number | null;
  /** True when the value is the lib/distance estimate, not a road route. */
  estimated: boolean;
};

/** Measured 24 h snowfall (NOHRSC analysis, weather_cache.forecast_json
 *  v2 `measured.sfav2_24h_in`), only shown for resorts that are running. */
export type MeasuredSnow24h = {
  inches: number;
  /** ISO-8601 end of the 24 h window the analysis covers. */
  validEnd: string | null;
};

export type NearRow = {
  id: number;
  slug: string;
  name: string;
  state: string;
  passes: string[];
  verticalDropFt: number | null;
  drive: DriveInfo;
  band: DriveBand;
  status: ResortStatus;
  /** True when the season text carries a "(projected)" qualifier. */
  openProjected: boolean;
  ticket: { minUsd: number; maxUsd: number | null; updatedAt: string | null } | null;
  snow24h: MeasuredSnow24h | null;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
};

/** Cached road route when the origin has one for this resort, otherwise
 *  the straight-line estimate; null when the resort has no coordinates. */
export function driveFor(
  origin: CityOrigin,
  resort: Pick<NearResortRow, "id" | "latitude" | "longitude">,
  cached: ReadonlyMap<number, { seconds: number; meters: number | null }>,
): DriveInfo | null {
  const hit = hasCachedDriveTimes(origin) ? cached.get(resort.id) : undefined;
  if (hit) return { seconds: hit.seconds, meters: hit.meters, estimated: false };
  const lat = num(resort.latitude);
  const lon = num(resort.longitude);
  if (lat == null || lon == null) return null;
  const gc = haversineMeters(origin.lat, origin.lon, lat, lon);
  return { seconds: estimateDriveSeconds(gc), meters: Math.round(gc * 1.2), estimated: true };
}

/**
 * Every resort inside the radius as a display row, sorted by drive time
 * (ties by name so the order is stable between renders). Resorts without
 * coordinates and permanently closed resorts are left out: a page called
 * "near <City>" must not list a mountain that cannot be placed or ridden.
 */
export function buildNearRows(
  origin: CityOrigin,
  resorts: ReadonlyArray<NearResortRow>,
  cached: ReadonlyMap<number, { seconds: number; meters: number | null }>,
  snowById: ReadonlyMap<number, MeasuredSnow24h>,
  now: Date = new Date(),
): NearRow[] {
  const rows: NearRow[] = [];
  for (const r of resorts) {
    if (r.operating_status === "closed") continue;
    const drive = driveFor(origin, r, cached);
    if (!drive) continue;
    const band = bandFor(drive.seconds);
    if (!band) continue;
    const season = resolveSeasonInfo(r, now);
    const status = deriveResortStatus(r, season, now);
    const minUsd = r.ticket_price_adult_min;
    rows.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      state: r.state,
      passes: r.passes ?? [],
      verticalDropFt: r.vertical_drop,
      drive,
      band,
      status,
      openProjected: season.openProjected,
      ticket:
        minUsd != null && minUsd > 0
          ? { minUsd, maxUsd: r.ticket_price_adult_max, updatedAt: r.ticket_price_updated_at }
          : null,
      // Snow is a today number; a dormant mountain's 24 h total is not
      // something anyone can ride, so it is not shown.
      snow24h: status.dormant ? null : (snowById.get(r.id) ?? null),
    });
  }
  rows.sort((a, b) => a.drive.seconds - b.drive.seconds || a.name.localeCompare(b.name));
  return rows;
}

export function groupByBand(rows: ReadonlyArray<NearRow>): Array<{ key: DriveBand; label: string; rows: NearRow[] }> {
  return DRIVE_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    rows: rows.filter((r) => r.band === band.key),
  })).filter((g) => g.rows.length > 0);
}

// ---------- Cities + paths ----------

/** The city a /near/[city] slug names, or null. Slugs are the origin
 *  codes ("nyc", "salt-lake-city"), lower-cased. */
export function resolveNearCity(slug: string | null | undefined): CityOrigin | null {
  if (!slug) return null;
  return findOrigin(slug.trim().toLowerCase());
}

/** Codes pre-rendered at build: the /go launch cities. The other
 *  origins render on demand (dynamicParams) and are cached the same way. */
export function nearStaticCityCodes(): string[] {
  return LAUNCH_CITIES.map((c) => c.code);
}

export function nearAllCityCodes(): string[] {
  return ORIGINS.map((c) => c.code);
}

export function nearPath(code: string): string {
  return `/near/${code}`;
}

/** Where the page's call to action goes: the Saturday picks for a launch
 *  city, otherwise the map with this city as the drive-time origin (the
 *  map knows every origin; /go only answers for launch cities). */
export function nearCtaFor(city: CityOrigin): { href: string; label: string; isGo: boolean } {
  if (launchCityByCode(city.code)) {
    return { href: `/go?city=${city.code}`, label: "See this Saturday's picks", isGo: true };
  }
  return { href: `/?from=${city.code}`, label: `Open the map from ${city.short}`, isGo: false };
}

/** Page title. `originLabel` gives "New York City, NY"; the title keeps
 *  the city only, the state rides in the description. */
export function nearTitle(city: CityOrigin): string {
  return `Ski resorts near ${nearCityName(city)}`;
}

/** "New York City", "Washington DC", "Portland, ME" (the two Portlands
 *  need their state to tell them apart). */
export function nearCityName(city: CityOrigin): string {
  if (city.code === "nyc") return "New York City";
  if (city.state === "DC") return "Washington DC";
  const twin = ORIGINS.some((o) => o.code !== city.code && o.name === city.name);
  return twin ? `${city.name}, ${city.state}` : city.name;
}

export function nearDescription(city: CityOrigin, count: number): string {
  const label = originLabel(city);
  const how = city.cached ? "road drive times" : "estimated drive times";
  return `${count} ski resort${count === 1 ? "" : "s"} within ${NEAR_MAX_HOURS} hours of ${label}, sorted by ${how}, with pass, opening status, vertical and measured snow. Then see this Saturday's picks.`;
}

// ---------- Nearest launch city (state pages) ----------

export type NearbyCity = {
  city: CityOrigin;
  /** Estimated seconds from the point to the city centroid (always ≈). */
  seconds: number;
  isLaunch: boolean;
};

/**
 * The cities closest to a point, nearest first, for the "Nearest launch
 * city" links on /state/[code]. The distance is the lib/distance
 * estimate to the city centroid; every result is labelled ≈ by the
 * caller. Launch cities (the ones /go answers for) sort first within the
 * radius because that is the link with a Saturday answer behind it.
 */
export function nearestCities(lat: number, lon: number, limit = 3, maxHours = NEAR_MAX_HOURS): NearbyCity[] {
  const launch = new Set(LAUNCH_CITIES.map((c) => c.code));
  const all: NearbyCity[] = ORIGINS.map((city) => ({
    city,
    seconds: estimateDriveSeconds(haversineMeters(lat, lon, city.lat, city.lon)),
    isLaunch: launch.has(city.code),
  })).sort((a, b) => a.seconds - b.seconds);
  const inside = all.filter((c) => c.seconds <= maxHours * 3600);
  const pool = inside.length > 0 ? inside : all.slice(0, 1);
  return [...pool.filter((c) => c.isLaunch), ...pool.filter((c) => !c.isLaunch)].slice(0, limit);
}

/** Mean of the coordinates that parse; null when none do. */
export function centroidOf(
  points: ReadonlyArray<{ latitude: number | string | null; longitude: number | string | null }>,
): { lat: number; lon: number } | null {
  let lat = 0;
  let lon = 0;
  let n = 0;
  for (const p of points) {
    const a = num(p.latitude);
    const b = num(p.longitude);
    if (a == null || b == null) continue;
    lat += a;
    lon += b;
    n += 1;
  }
  return n === 0 ? null : { lat: lat / n, lon: lon / n };
}

// ---------- Formatting ----------

/** "1h 45m" rounded to 5 minutes: an estimate shown to the minute
 *  claims a precision it does not have, and cached routes were computed
 *  months ago. */
export function formatDriveRounded(seconds: number): string {
  const totalMin = Math.round(seconds / 300) * 5;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`;
}

/** "Sep 23, 2026" in UTC, for "as of" stamps on reported numbers. */
export function formatStampDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Sep 23, 12:00 UTC" for the end of a measured window. */
export function formatStampTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${day}, ${time} UTC`;
}

export function formatCoords(city: CityOrigin): string {
  const ns = city.lat >= 0 ? "N" : "S";
  const ew = city.lon >= 0 ? "E" : "W";
  return `${Math.abs(city.lat).toFixed(2)}° ${ns}, ${Math.abs(city.lon).toFixed(2)}° ${ew}`;
}
