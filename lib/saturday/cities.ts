// Cities for the Saturday picks page. The data lives in lib/origins.ts
// (LAUNCH_CITIES) so the map, the planner and the profile's
// preferred_origin share one list; this module only resolves the /go
// URL state to an origin and formats it for copy and for the planner
// deep link.

import {
  LAUNCH_CITIES,
  hasCachedDriveTimes,
  launchCityByCode,
  type CityOrigin,
  type GeoOrigin,
  type Origin,
} from "@/lib/origins";
import { DEFAULT_TIME_ZONE } from "./dates";

export { LAUNCH_CITIES };

export type GoOrigin = Origin;

/** Options for the city select, in launch order (East first). */
export function cityOptions(): Array<{ code: string; label: string }> {
  return LAUNCH_CITIES.map((c) => ({ code: c.code, label: originLabel(c) }));
}

export const DEFAULT_CITY_CODE = "nyc";

/**
 * Resolve `?city=` (+ `lat`/`lng` for `city=geo`) to an origin. An
 * unknown code returns null so the page can ask rather than answer for
 * NYC by mistake; a geo request without usable coordinates also returns
 * null.
 */
export function resolveGoOrigin(
  city: string | null | undefined,
  lat: string | null | undefined,
  lng: string | null | undefined,
): GoOrigin | null {
  if (city === "geo") {
    const la = Number(lat);
    const lo = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) {
      const geo: GeoOrigin = { kind: "geo", code: "geo", name: "Here", short: "your location", lat: la, lon: lo };
      return geo;
    }
    return null;
  }
  return launchCityByCode(city);
}

/** "from NYC" / "from your location" for headings and the share card. */
export function originLabel(origin: GoOrigin): string {
  if (origin.kind !== "city") return "your location";
  // lib/origins keeps `name` plain ("Washington", state "DC") so the
  // map can render "Washington, DC"; on its own the word is ambiguous
  // in a heading, so /go copy says "Washington DC".
  return origin.state === "DC" ? "Washington DC" : origin.name;
}

/** The zone whose calendar decides "this Saturday" for this origin. A
 *  geo origin is treated as Eastern: the launch footprint is East and
 *  Midwest, and a one-hour difference never moves a Saturday. */
export function originTimeZone(origin: GoOrigin): string {
  return origin.kind === "city" ? (origin.timeZone ?? DEFAULT_TIME_ZONE) : DEFAULT_TIME_ZONE;
}

/** True when the drive times for this origin come from drive_time_cache. */
export function originHasExactDrives(origin: GoOrigin): boolean {
  return hasCachedDriveTimes(origin);
}

/**
 * Query string for the map planner's `from=` origin. Every launch city
 * is in the map's own list (ORIGINS), so cities go by code and the map
 * shows "Chicago" with its "≈" estimate until drive_time_cache covers
 * it; a geo origin goes as coordinates plus a label. Mirrors
 * app/trip-templates/[slug]/page.tsx.
 */
export function plannerOriginParams(origin: GoOrigin): string {
  if (origin.kind === "city") return `from=${origin.code}`;
  return (
    `from=geo&fromLat=${origin.lat.toFixed(5)}&fromLng=${origin.lon.toFixed(5)}` +
    `&fromLabel=${encodeURIComponent("Your location")}`
  );
}

export function isCityOrigin(origin: GoOrigin): origin is CityOrigin {
  return origin.kind === "city";
}
