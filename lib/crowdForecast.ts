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
import { haversineMeters } from "./distance";
import { nthWeekdayOfMonth, thanksgivingDate } from "./seasonDates";
import { timeZoneForResort } from "./sunTimes";

export type CrowdLevel = "quiet" | "moderate" | "busy" | "packed";

export type CrowdForecast = {
  level: CrowdLevel;
  label: string;
  score: number; // 0-100, for sorting/filtering
  reasons: string[];
  /** The holiday window the date fell in, if any — for copy like
   *  "Presidents' Day week". */
  holiday: string | null;
};

type CrowdInput = {
  latitude: number | null;
  longitude: number | null;
  tier?: string | null; // "featured" resorts draw more
  vertical_drop?: number | null; // size derived via sizeTier()
  snow_new_24h_in?: number | string | null;
  snow_new_48h_in?: number | string | null;
  /** Used with `state` to evaluate the weekday in the resort's own clock. */
  slug?: string | null;
  state?: string | null;
};

// Metros that feed ski day-trips: name, lat, lng, weight. Weight scales
// the day-trip pressure — 1.0 for a multi-million metro, less for a
// regional city whose whole population could fit in one big resort's
// parking lot. Burlington VT (~45k people) is deliberately NOT here: it
// made every northern-Vermont hill read "close to a major city" (audit
// domain-logic-13); Boston / NYC pressure still reaches Vermont through
// the ≤200 mi band.
const METROS: Array<[string, number, number, number]> = [
  ["Denver", 39.74, -104.99, 1],
  ["Salt Lake City", 40.76, -111.89, 1],
  ["Seattle", 47.61, -122.33, 1],
  ["Portland", 45.51, -122.68, 1],
  ["Los Angeles", 34.05, -118.24, 1],
  ["San Francisco", 37.77, -122.42, 1],
  ["Sacramento", 38.58, -121.49, 0.75],
  ["Reno", 39.53, -119.81, 0.6],
  ["Boston", 42.36, -71.06, 1],
  ["New York", 40.71, -74.01, 1],
  ["Philadelphia", 39.95, -75.17, 1],
  ["Washington", 38.9, -77.04, 1],
  ["Pittsburgh", 40.44, -79.99, 0.75],
  ["Minneapolis", 44.98, -93.27, 1],
  ["Chicago", 41.88, -87.63, 1],
  ["Milwaukee", 43.04, -87.91, 0.75],
  ["Detroit", 42.33, -83.05, 1],
  ["Phoenix", 33.45, -112.07, 1],
  ["Las Vegas", 36.17, -115.14, 0.75],
  ["Albuquerque", 35.08, -106.65, 0.6],
  ["Spokane", 47.66, -117.43, 0.5],
  ["Anchorage", 61.22, -149.9, 0.5],
];

const METERS_PER_MILE = 1609.34;

function nearestMetro(lat: number, lng: number): { miles: number; weight: number } {
  let best = { miles: Infinity, weight: 0 };
  for (const [, mLat, mLng, weight] of METROS) {
    const miles = haversineMeters(lat, lng, mLat, mLng) / METERS_PER_MILE;
    if (miles < best.miles) best = { miles, weight };
  }
  return best;
}

// ---------- Holiday calendar ----------

export type HolidayWindow = {
  key: "thanksgiving" | "christmas" | "mlk" | "presidents";
  label: string;
  /** Inclusive calendar bounds as UTC-midnight timestamps. */
  start: number;
  end: number;
};

const utc = (y: number, m: number, d: number) => Date.UTC(y, m, d);

/**
 * Peak US winter-holiday windows for the season that starts in the
 * autumn of `seasonStartYear` (2026 → the 2026-27 season). Computed from
 * the federal-holiday rules, so 2027, 2028 … need no edits:
 *   • Thanksgiving  — Wed before through the Sunday after (4th Thu Nov)
 *   • Christmas / New Year — the Saturday on or before Dec 23 through the
 *     first Sunday on or after Jan 1 (school break)
 *   • MLK weekend   — Fri through Mon (3rd Mon Jan)
 *   • Presidents'   — Fri before through the Sunday that ends the school
 *     week after (3rd Mon Feb); the busiest stretch of the season in the
 *     Northeast and Rockies
 */
export function holidayWindows(seasonStartYear: number): HolidayWindow[] {
  const y = seasonStartYear;
  const thanks = thanksgivingDate(y);
  const thanksDay = thanks.getUTCDate();

  const dec23Dow = new Date(utc(y, 11, 23)).getUTCDay();
  const xmasStart = utc(y, 11, 23 - ((dec23Dow - 6 + 7) % 7));
  const jan1Dow = new Date(utc(y + 1, 0, 1)).getUTCDay();
  const xmasEnd = utc(y + 1, 0, 1 + ((7 - jan1Dow) % 7));

  const mlkMon = nthWeekdayOfMonth(y + 1, 0, 1, 3);
  const presMon = nthWeekdayOfMonth(y + 1, 1, 1, 3);

  return [
    { key: "thanksgiving", label: "Thanksgiving weekend", start: utc(y, 10, thanksDay - 1), end: utc(y, 10, thanksDay + 3) },
    { key: "christmas", label: "Christmas break", start: xmasStart, end: xmasEnd },
    { key: "mlk", label: "MLK weekend", start: utc(y + 1, 0, mlkMon - 3), end: utc(y + 1, 0, mlkMon) },
    { key: "presidents", label: "Presidents' Day week", start: utc(y + 1, 1, presMon - 3), end: utc(y + 1, 1, presMon + 6) },
  ];
}

/** Which peak-holiday window a calendar date (y, m 0-11, d) falls in. */
export function peakHolidayFor(year: number, month: number, day: number): HolidayWindow | null {
  const t = utc(year, month, day);
  // A date in Jan–Feb belongs to the season that started the previous
  // autumn; check the neighbouring season too so a window straddling
  // New Year is found from either side.
  for (const seasonYear of [year - 1, year]) {
    for (const w of holidayWindows(seasonYear)) {
      if (t >= w.start && t <= w.end) return w;
    }
  }
  return null;
}

/** Calendar fields of an instant as seen in a time zone (UTC when unknown). */
export function calendarParts(date: Date, timeZone: string | undefined): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone ?? "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    year: Number(get("year")),
    month: Number(get("month")) - 1,
    day: Number(get("day")),
    weekday: weekdayIdx < 0 ? new Date(date).getUTCDay() : weekdayIdx,
  };
}

/** Next Saturday (strictly after today) at UTC noon, in the resort's
 *  local calendar — what "this weekend" means on the resort page. */
export function upcomingSaturday(now: Date, timeZone: string | undefined): Date {
  const { year, month, day, weekday } = calendarParts(now, timeZone);
  const ahead = (6 - weekday + 7) % 7 || 7;
  return new Date(utc(year, month, day + ahead) + 12 * 3_600_000);
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

  // Day-trip pressure from the nearest big city, scaled by its size.
  if (r.latitude != null && r.longitude != null) {
    const { miles, weight } = nearestMetro(r.latitude, r.longitude);
    if (miles <= 60) {
      score += Math.round(24 * weight);
      reasons.push(weight >= 0.75 ? "close to a major city" : "close to a regional city");
    } else if (miles <= 120) {
      score += Math.round(13 * weight);
      reasons.push("day-trip range of a city");
    } else if (miles <= 200) {
      score += Math.round(5 * weight);
    }
  }

  // Weekend / holiday timing, evaluated in the resort's own calendar so a
  // UTC server never reads Saturday night as Sunday.
  const tz = timeZoneForResort({ slug: r.slug, state: r.state, latitude: r.latitude, longitude: r.longitude });
  const cal = calendarParts(date, tz);
  if (cal.weekday === 6 || cal.weekday === 0) {
    score += 20;
    reasons.push("weekend");
  } else if (cal.weekday === 5) {
    score += 8;
  } else {
    reasons.push("midweek");
  }
  const holiday = peakHolidayFor(cal.year, cal.month, cal.day);
  if (holiday) {
    score += 24;
    reasons.push(holiday.label);
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

  return { level, label, score, reasons: reasons.slice(0, 3), holiday: holiday?.label ?? null };
}

export const CROWD_COLORS: Record<CrowdLevel, { bg: string; text: string; dot: string }> = {
  quiet: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "bg-emerald-500" },
  moderate: { bg: "bg-sky-50", text: "text-sky-800", dot: "bg-sky-500" },
  busy: { bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  packed: { bg: "bg-red-50", text: "text-red-800", dot: "bg-red-500" },
};
