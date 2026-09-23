// Unit conversions + small numeric helpers shared by every source
// parser. Everything user-facing in Wynla is US customary (°F, inches,
// mph, feet); every upstream source is metric or mixed, so all
// conversions live here once and are unit-tested.

export function mmToIn(mm: number): number {
  return mm / 25.4;
}

export function cToF(c: number): number {
  return c * (9 / 5) + 32;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function msToMph(ms: number): number {
  return ms * 2.236936;
}

export function mToFt(m: number): number {
  return m * 3.28084;
}

export function ftToM(ft: number): number {
  return ft / 3.28084;
}

export function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Round only when finite, else null. Keeps "unknown" distinct from 0. */
export function roundOrNull(v: number | null | undefined, decimals = 0): number | null {
  return isNum(v) ? round(v, decimals) : null;
}

/** Degrees → 8-point compass label (N, NE, E ...). */
export function compass(deg: number | null | undefined): string | null {
  if (!isNum(deg)) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Great-circle distance in km between two WGS84 points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Mean of the finite numbers in a list, or null when there are none. */
export function meanOrNull(values: Array<number | null | undefined>): number | null {
  const xs = values.filter(isNum);
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function maxOrNull(values: Array<number | null | undefined>): number | null {
  const xs = values.filter(isNum);
  return xs.length ? Math.max(...xs) : null;
}

export function minOrNull(values: Array<number | null | undefined>): number | null {
  const xs = values.filter(isNum);
  return xs.length ? Math.min(...xs) : null;
}

export function sumOrNull(values: Array<number | null | undefined>): number | null {
  const xs = values.filter(isNum);
  return xs.length ? xs.reduce((a, b) => a + b, 0) : null;
}
