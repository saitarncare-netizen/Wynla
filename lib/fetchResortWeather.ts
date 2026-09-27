// Per-resort weather extras for the map's resort sheet, fetched lazily
// when a sheet opens (same pattern as lib/fetchNearby.ts). The homepage
// payload carries one small weather row per resort (high, low,
// conditions, fetched_at); the forecast strip, wind and gusts would add
// ~20 KB per resort to it, so they come here for the ONE resort the
// person is looking at instead.
//
// The pure pieces (next-days sum, time-zone pick, row → extras) are
// exported separately and unit-tested in lib/fetchResortWeather.test.ts;
// only fetchResortWeather touches the network.

import { supabase } from "@/lib/supabase";
import { forecastDaysFrom, isForecastJsonV2, type ForecastDay } from "@/lib/weather/forecastJson";
import { localDate } from "@/lib/weather/time";

const COLUMNS = "forecast_json, temp_low_f, wind_mph_avg, wind_mph_gust, fetched_at";

/** Days summed for the sheet's "Snow next 3 days" tile. */
export const NEXT_SNOW_DAYS = 3;

export type ResortWeatherExtras = {
  /** Forecast snowfall over today + the next two days (inches, one
   *  decimal), or null when the forecast no longer covers the window. */
  snowNext3In: number | null;
  lowF: number | null;
  /** Wind at the time of the sync (station or model "current"). */
  windMph: number | null;
  gustMph: number | null;
  /** When the weather sync wrote the row, for the tile's age. */
  fetchedAt: string | null;
};

/** weather_cache columns this module reads. Numeric columns can arrive
 *  as strings from PostgREST (numeric type), so they are coerced. */
export type WeatherExtrasRow = {
  forecast_json: unknown;
  temp_low_f: number | string | null;
  wind_mph_avg: number | string | null;
  wind_mph_gust: number | string | null;
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
  return {
    snowNext3In: snowNextDays(forecastDaysFrom(row.forecast_json), now, timeZone),
    lowF: toNumber(row.temp_low_f),
    windMph: toNumber(row.wind_mph_avg),
    gustMph: toNumber(row.wind_mph_gust),
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
