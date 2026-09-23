// URL state for /go. Everything the page needs to answer is in the query
// string (?city=&pass=&product=&max=&day=) so a result is a shareable
// link, the share card can be rendered from the same params, and the
// Thursday email can deep-link to the exact view it summarises.

import { isPassFamily, productsFor, type PassFamily } from "@/lib/passAccess";
import { DEFAULT_CITY_CODE } from "./cities";
import type { WeekendDay } from "./dates";

export type GoState = {
  /** Launch city code, or "geo" with lat/lng. */
  city: string;
  lat: string | null;
  lng: string | null;
  /** null = any pass or lift ticket. */
  pass: PassFamily | null;
  /** productKey from lib/passAccess.productsFor, or null for "any product". */
  product: string | null;
  /** Max drive in hours, 1-12. */
  max: number;
  day: WeekendDay;
};

export const DEFAULT_MAX_HOURS = 5;
export const MIN_MAX_HOURS = 1;
export const MAX_MAX_HOURS = 12;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function read(sp: Params, key: string): string | null {
  if (sp instanceof URLSearchParams) return sp.get(key);
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s == null ? null : String(s);
}

export function parsePassFamily(value: string | null | undefined): PassFamily | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "none" || v === "any") return null;
  return isPassFamily(v) ? v : null;
}

/** The product key only counts when it belongs to the chosen family. */
export function parseProduct(family: PassFamily | null, value: string | null | undefined): string | null {
  if (!family || !value) return null;
  const v = value.trim().toLowerCase();
  return productsFor(family).some((p) => p.productKey === v) ? v : null;
}

export function parseMaxHours(value: string | null | undefined): number {
  if (value == null || value.trim() === "") return DEFAULT_MAX_HOURS;
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MAX_HOURS;
  return Math.min(MAX_MAX_HOURS, Math.max(MIN_MAX_HOURS, Math.round(n)));
}

export function parseDay(value: string | null | undefined): WeekendDay {
  return value === "sun" ? "sun" : "sat";
}

/** A launch city code, "geo", or the default city. Unknown codes fall
 *  back to the default here; the page then resolves the origin and
 *  shows the picker when the code was not a real city. */
function parseCity(value: string | null | undefined): string {
  if (!value) return DEFAULT_CITY_CODE;
  const v = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(v) ? v : DEFAULT_CITY_CODE;
}

function parseCoord(value: string | null | undefined, limit: number): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  // Four decimals is ~11 m; enough for a drive time, not enough to
  // identify a house when the link is shared.
  return n.toFixed(4);
}

export function parseGoParams(sp: Params): GoState {
  const city = parseCity(read(sp, "city"));
  const pass = parsePassFamily(read(sp, "pass"));
  return {
    city,
    lat: city === "geo" ? parseCoord(read(sp, "lat"), 90) : null,
    lng: city === "geo" ? parseCoord(read(sp, "lng"), 180) : null,
    pass,
    product: parseProduct(pass, read(sp, "product")),
    max: parseMaxHours(read(sp, "max")),
    day: parseDay(read(sp, "day")),
  };
}

/** Canonical query string for a state, in a fixed order so two equal
 *  views share one URL (and one OG image cache entry). */
export function goQuery(state: GoState): string {
  const p = new URLSearchParams();
  p.set("city", state.city);
  if (state.city === "geo" && state.lat && state.lng) {
    p.set("lat", state.lat);
    p.set("lng", state.lng);
  }
  p.set("pass", state.pass ?? "any");
  if (state.pass && state.product) p.set("product", state.product);
  if (state.max !== DEFAULT_MAX_HOURS) p.set("max", String(state.max));
  if (state.day !== "sat") p.set("day", state.day);
  return p.toString();
}

export function goPath(state: GoState): string {
  return `/go?${goQuery(state)}`;
}

/** Absolute URL for sharing and for the email. */
export function goUrl(state: GoState, siteBase: string): string {
  return `${siteBase.replace(/\/+$/, "")}${goPath(state)}`;
}
