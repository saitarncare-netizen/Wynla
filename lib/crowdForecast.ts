// Crowd forecast — a heuristic "how busy will this resort be" estimate.
// DELIBERATELY no external API + no LLM: zero per-request cost, no abuse
// surface, fully deterministic (same spirit as the snow-surface classifier).
// Signals: resort draw (popularity/size) + proximity to a big metro (day-trip
// pressure) + weekend/holiday + a powder-day bump (fresh snow pulls crowds).
//
// Output is intentionally coarse (quiet / moderate / busy / packed) + a couple
// of plain-language reasons — it's a planning nudge ("go midweek / try a
// quieter mountain"), not a promise.

import { sizeTier } from "./sizeTier";

export type CrowdLevel = "quiet" | "moderate" | "busy" | "packed";

export type CrowdForecast = {
  level: CrowdLevel;
  label: string;
  score: number; // 0-100, for sorting/filtering
  reasons: string[];
};

type CrowdInput = {
  latitude: number | null;
  longitude: number | null;
  tier?: string | null; // "featured" resorts draw more
  vertical_drop?: number | null; // size derived via sizeTier()
  snow_new_24h_in?: number | string | null;
  snow_new_48h_in?: number | string | null;
};

// Major US metros that feed ski day-trips (name, lat, lng).
const METROS: Array<[string, number, number]> = [
  ["Denver", 39.74, -104.99],
  ["Salt Lake City", 40.76, -111.89],
  ["Seattle", 47.61, -122.33],
  ["Portland", 45.51, -122.68],
  ["Los Angeles", 34.05, -118.24],
  ["San Francisco", 37.77, -122.42],
  ["Sacramento", 38.58, -121.49],
  ["Reno", 39.53, -119.81],
  ["Boston", 42.36, -71.06],
  ["New York", 40.71, -74.01],
  ["Minneapolis", 44.98, -93.27],
  ["Chicago", 41.88, -87.63],
  ["Detroit", 42.33, -83.05],
  ["Albuquerque", 35.08, -106.65],
  ["Spokane", 47.66, -117.43],
  ["Burlington", 44.48, -73.21],
];

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestMetroMi(lat: number, lng: number): number {
  let best = Infinity;
  for (const [, mLat, mLng] of METROS) {
    const d = haversineMi(lat, lng, mLat, mLng);
    if (d < best) best = d;
  }
  return best;
}

// Peak winter-holiday windows (US). Compared by month/day so it's year-agnostic.
function isPeakHoliday(date: Date): boolean {
  const m = date.getMonth(); // 0=Jan
  const d = date.getDate();
  // Christmas → New Year (Dec 20 – Jan 2)
  if ((m === 11 && d >= 20) || (m === 0 && d <= 2)) return true;
  // MLK weekend (mid-Jan, ~15-21) + Presidents week (mid-late Feb, ~14-24)
  if (m === 0 && d >= 14 && d <= 21) return true;
  if (m === 1 && d >= 14 && d <= 24) return true;
  // Thanksgiving stretch (late Nov, ~22-29)
  if (m === 10 && d >= 22 && d <= 29) return true;
  return false;
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
};

/** Estimate crowd level for a resort on a given date (defaults to today). */
export function crowdForecast(r: CrowdInput, date: Date = new Date()): CrowdForecast {
  let score = 12; // baseline
  const reasons: string[] = [];

  // Draw: bigger/featured resorts pull more people.
  if (r.tier === "featured") {
    score += 18;
  }
  const size = sizeTier(r.vertical_drop ?? null);
  if (size === "large") score += 14;
  else if (size === "medium") score += 5;

  // Day-trip pressure from the nearest big city.
  if (r.latitude != null && r.longitude != null) {
    const mi = nearestMetroMi(r.latitude, r.longitude);
    if (mi <= 60) {
      score += 24;
      reasons.push("close to a major city");
    } else if (mi <= 120) {
      score += 13;
      reasons.push("day-trip range of a city");
    } else if (mi <= 200) {
      score += 5;
    }
  }

  // Weekend / holiday timing.
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 6 || day === 0) {
    score += 20;
    reasons.push("weekend");
  } else if (day === 5) {
    score += 8;
  } else {
    reasons.push("midweek");
  }
  if (isPeakHoliday(date)) {
    score += 24;
    reasons.push("holiday week");
  }

  // Powder magnet: fresh snow draws crowds the next day or two.
  const fresh = Math.max(num(r.snow_new_24h_in), num(r.snow_new_48h_in) / 2);
  if (fresh >= 6) {
    score += 20;
    reasons.push("powder day");
  } else if (fresh >= 3) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: CrowdLevel;
  let label: string;
  if (score < 25) { level = "quiet"; label = "Likely quiet"; }
  else if (score < 45) { level = "moderate"; label = "Moderate crowds"; }
  else if (score < 70) { level = "busy"; label = "Likely busy"; }
  else { level = "packed"; label = "Expect crowds"; }

  return { level, label, score, reasons: reasons.slice(0, 3) };
}

export const CROWD_COLORS: Record<CrowdLevel, { bg: string; text: string; dot: string }> = {
  quiet: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  moderate: { bg: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500" },
  busy: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  packed: { bg: "bg-red-50", text: "text-red-800", dot: "bg-red-500" },
};
