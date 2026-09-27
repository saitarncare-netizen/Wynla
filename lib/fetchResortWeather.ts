// Per-resort weather extras for the map's resort sheet, fetched lazily
// when a sheet opens (same pattern as lib/fetchNearby.ts). The homepage
// payload carries one small weather row per resort (high, low,
// conditions, fetched_at); the forecast strip behind the next-3-days
// snow total and today's wind would add ~20 KB per resort to it, so it
// comes here for the ONE resort the person is looking at instead.
//
// Wind comes from TODAY's day in the forecast strip, never from
// weather_cache.wind_mph_avg / wind_mph_gust. Those two columns hold the
// live reading at sync time (lib/weather/merge pickCurrentWind), and the
// only sync is the 11:00 UTC cron (4-7 AM in the US), so at 3 PM they
// would show a pre-dawn summit reading under a "Forecast" label and hide
// the afternoon gusts the forecast expects.
//
// The pure pieces (next-days sum, today's wind, time-zone pick, row →
// extras) are exported separately and unit-tested in
// lib/fetchResortWeather.test.ts; only fetchResortWeather touches the
// network.

import { supabase } from "@/lib/supabase";
import { forecastDaysFrom, isForecastJsonV2, type ForecastDay } from "@/lib/weather/forecastJson";
import { localDate } from "@/lib/weather/time";
import { parseWindFromText } from "@/lib/windHold";

const COLUMNS = "forecast_json, temp_low_f, fetched_at";

/** Days summed for the sheet's "Snow next 3 days" tile. */
export const NEXT_SNOW_DAYS = 3;

export type ResortWeatherExtras = {
  /** Forecast snowfall over today + the next two days (inches, one
   *  decimal), or null when the forecast no longer covers the window. */
  snowNext3In: number | null;
  lowF: number | null;
  /** Today's forecast peak sustained wind (mph), from the resort-local
   *  day's wind_short in the strip; null when the strip has no day for
   *  today or the day has no wind figure. */
  todayWindMph: number | null;
  /** Today's forecast peak gust (mph), same day. */
  todayGustMph: number | null;
  /** When the weather sync wrote the row, for the tile's age. */
  fetchedAt: string | null;
};

/** weather_cache columns this module reads. Numeric columns can arrive
 *  as strings from PostgREST (numeric type), so they are coerced. */
export type WeatherExtrasRow = {
  forecast_json: unknown;
  temp_low_f: number | string | null;
  fetched_at: string | null;
};

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sum of forecast snowfall for `count` calendar days starting TODAY in
 * the forecast's own time zone (the day strip's dates are resort-local).
 * Days before today are skipped, so a row synced yesterday still sums
 * the right window. Returns null instead of a smaller number when the
 * strip no longer reaches the end of the window or any day in it has no
 * snowfall figure: a partial sum would read as "less snow coming".
 */
export function snowNextDays(
  days: ForecastDay[],
  now: Date,
  timeZone?: string | null,
  count: number = NEXT_SNOW_DAYS,
): number | null {
  const today = localDate(now, timeZone);
  const window = days
    .filter((d) => typeof d?.date === "string" && d.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, count);
  if (window.length < count) return null;
  let sum = 0;
  for (const d of window) {
    const inches = toNumber(d.snow_in);
    if (inches == null) return null;
    sum += inches;
  }
  return Math.round(sum * 10) / 10;
}

/**
 * Today's forecast wind from the day strip: the resort-local day whose
 * date is today in `timeZone` (so a row synced yesterday still answers
 * for today, not for the day it was written). Sustained is the day's
 * peak (merge.ts writes wind_short from the daily max; a legacy NWS
 * range like "10 to 15 mph" reads as its midpoint, the same parse the
 * resort page's strip uses); the gust is the v2 gust_mph field, else a
 * "gusts …" phrase in the text. Both null when there is no day for today.
 */
export function todayWind(
  days: ForecastDay[],
  now: Date,
  timeZone?: string | null,
): { windMph: number | null; gustMph: number | null } {
  const today = localDate(now, timeZone);
  const day = days.find((d) => d?.date === today);
  if (!day) return { windMph: null, gustMph: null };
  const parsed = parseWindFromText(day.wind_short);
  return { windMph: parsed.sustained ?? null, gustMph: toNumber(day.gust_mph) ?? parsed.gust ?? null };
}

/** The zone the refresh job dated the strip in (NWS point first, then
 *  Open-Meteo, the same order refreshResort resolves it). v1 rows carry
 *  no zone; the caller's fallback is used for those. */
export function forecastTimeZone(forecastJson: unknown): string | null {
  if (!isForecastJsonV2(forecastJson)) return null;
  const sources = forecastJson.sources;
  return sources?.nws?.time_zone ?? sources?.open_meteo?.time_zone ?? null;
}

export function extrasFromRow(
  row: WeatherExtrasRow,
  now: Date,
  fallbackTimeZone?: string | null,
): ResortWeatherExtras {
  const timeZone = forecastTimeZone(row.forecast_json) ?? fallbackTimeZone ?? null;
  const days = forecastDaysFrom(row.forecast_json);
  const wind = todayWind(days, now, timeZone);
  return {
    snowNext3In: snowNextDays(days, now, timeZone),
    lowF: toNumber(row.temp_low_f),
    todayWindMph: wind.windMph,
    todayGustMph: wind.gustMph,
    fetchedAt: row.fetched_at ?? null,
  };
}

/**
 * Weather extras for one resort, or null when the read fails or the
 * resort has no weather row yet (the sheet then says "Not synced").
 * `timeZone` is the resort's zone (lib/sunTimes timeZoneForResort), used
 * only for legacy v1 rows whose forecast does not name its own zone.
 */
export async function fetchResortWeather(
  resortId: number,
  opts: { timeZone?: string | null; now?: Date } = {},
): Promise<ResortWeatherExtras | null> {
  const { data, error } = await supabase
    .from("weather_cache")
    .select(COLUMNS)
    .eq("resort_id", resortId)
    .maybeSingle();
  if (error || !data) return null;
  return extrasFromRow(data as WeatherExtrasRow, opts.now ?? new Date(), opts.timeZone);
}
