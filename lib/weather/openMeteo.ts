// Open-Meteo point forecasts, queried at a specific elevation.
//
// Why a second forecast source next to NWS: NWS grid cells are 2.5 km
// averages (valley-biased) and stop at ~7 days. Open-Meteo downscales on
// a 90 m DEM via the `elevation` parameter, so we can ask for the base
// AND the summit of every resort, get hourly detail + freezing level
// for the next 48 h, and extend the strip to 16 days.
//
// Licensing: the free endpoint is non-commercial. When OPEN_METEO_API_KEY
// is set we use the commercial host (customer-api.open-meteo.com) and
// pass the key; otherwise we fall back to the free host and log a
// warning once per process so the founder sees it in Vercel logs.
// Attribution "Weather data by Open-Meteo.com" (CC BY 4.0) is recorded
// in forecast_json.sources.attribution for the UI to render.

import { fetchJson } from "./http";
import { compass, isNum, round, roundOrNull } from "./units";

const HOURLY_VARS = [
  "temperature_2m",
  "snowfall",
  "rain",
  "precipitation",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "freezing_level_height",
  "weather_code",
];
const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "weather_code",
  "snowfall_sum",
  "rain_sum",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
];

let warnedFreeTier = false;

export type OpenMeteoEndpoint = "commercial" | "free";

export function openMeteoEndpoint(): { base: string; kind: OpenMeteoEndpoint; key: string | null } {
  const key = process.env.OPEN_METEO_API_KEY?.trim();
  if (key) return { base: "https://customer-api.open-meteo.com/v1/forecast", kind: "commercial", key };
  if (!warnedFreeTier) {
    warnedFreeTier = true;
    console.warn(
      "[open-meteo] OPEN_METEO_API_KEY is not set; using the free endpoint, which is licensed for non-commercial use only",
    );
  }
  return { base: "https://api.open-meteo.com/v1/forecast", kind: "free", key: null };
}

export function buildForecastUrl(opts: {
  lat: number;
  lon: number;
  elevationM?: number | null;
  forecastDays?: number;
  pastDays?: number;
  hourly?: boolean;
}): string {
  const ep = openMeteoEndpoint();
  const p = new URLSearchParams({
    latitude: opts.lat.toFixed(4),
    longitude: opts.lon.toFixed(4),
    daily: DAILY_VARS.join(","),
    current: "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: String(opts.forecastDays ?? 16),
    past_days: String(opts.pastDays ?? 1),
  });
  if (opts.hourly !== false) p.set("hourly", HOURLY_VARS.join(","));
  if (isNum(opts.elevationM)) p.set("elevation", String(Math.round(opts.elevationM)));
  if (ep.key) p.set("apikey", ep.key);
  return `${ep.base}?${p.toString()}`;
}

export type OpenMeteoResponse = {
  elevation?: number;
  timezone?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: string;
    temperature_2m?: number | null;
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    wind_gusts_10m?: number | null;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    snowfall?: (number | null)[];
    rain?: (number | null)[];
    precipitation?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    wind_gusts_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
    freezing_level_height?: (number | null)[];
    weather_code?: (number | null)[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    weather_code?: (number | null)[];
    snowfall_sum?: (number | null)[];
    rain_sum?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    wind_gusts_10m_max?: (number | null)[];
    wind_direction_10m_dominant?: (number | null)[];
    uv_index_max?: (number | null)[];
  };
};

export async function fetchOpenMeteo(url: string): Promise<OpenMeteoResponse> {
  return fetchJson<OpenMeteoResponse>(url, { timeoutMs: 20_000 });
}

/** WMO weather code → short label (sentence case, matches NWS wording). */
export function wmoToShort(code: number | null | undefined): string | null {
  if (!isNum(code)) return null;
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code === 66 || code === 67) return "Freezing rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return null;
}

export type OpenMeteoDay = {
  date: string; // resort-local
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_in: number | null;
  rain_in: number | null;
  precip_in: number | null;
  precip_chance: number | null;
  wind_mph_max: number | null;
  gust_mph_max: number | null;
  wind_dir_deg: number | null;
  uv_index_max: number | null;
};

/** Daily rows exactly as Open-Meteo returned them (includes past_days). */
export function parseDaily(j: OpenMeteoResponse): OpenMeteoDay[] {
  const d = j.daily;
  if (!d?.time) return [];
  return d.time.map((date, i) => ({
    date,
    temp_high_f: roundOrNull(d.temperature_2m_max?.[i]),
    temp_low_f: roundOrNull(d.temperature_2m_min?.[i]),
    conditions_short: wmoToShort(d.weather_code?.[i]),
    snow_in: roundOrNull(d.snowfall_sum?.[i], 1),
    rain_in: roundOrNull(d.rain_sum?.[i], 2),
    precip_in: roundOrNull(d.precipitation_sum?.[i], 2),
    precip_chance: roundOrNull(d.precipitation_probability_max?.[i]),
    wind_mph_max: roundOrNull(d.wind_speed_10m_max?.[i]),
    gust_mph_max: roundOrNull(d.wind_gusts_10m_max?.[i]),
    wind_dir_deg: roundOrNull(d.wind_direction_10m_dominant?.[i]),
    uv_index_max: roundOrNull(d.uv_index_max?.[i], 1),
  }));
}

export type OpenMeteoHour = {
  /** ISO-8601 UTC ("...Z"). Open-Meteo returns local wall-clock; we shift by utc_offset_seconds. */
  time: string;
  local_date: string;
  temp_f: number | null;
  snow_in: number | null;
  rain_in: number | null;
  precip_in: number | null;
  wind_mph: number | null;
  gust_mph: number | null;
  wind_dir: string | null;
  freezing_level_ft: number | null;
  conditions_short: string | null;
};

/** Hourly rows converted to UTC instants. */
export function parseHourly(j: OpenMeteoResponse): OpenMeteoHour[] {
  const h = j.hourly;
  if (!h?.time) return [];
  const offset = isNum(j.utc_offset_seconds) ? j.utc_offset_seconds : 0;
  return h.time.map((local, i) => {
    const utcMs = Date.parse(`${local}:00Z`) - offset * 1000;
    return {
      time: new Date(utcMs).toISOString().replace(/\.\d{3}Z$/, "Z"),
      local_date: local.slice(0, 10),
      temp_f: roundOrNull(h.temperature_2m?.[i]),
      snow_in: roundOrNull(h.snowfall?.[i], 2),
      rain_in: roundOrNull(h.rain?.[i], 2),
      precip_in: roundOrNull(h.precipitation?.[i], 2),
      wind_mph: roundOrNull(h.wind_speed_10m?.[i]),
      gust_mph: roundOrNull(h.wind_gusts_10m?.[i]),
      wind_dir: compass(h.wind_direction_10m?.[i]),
      freezing_level_ft: roundOrNull(h.freezing_level_height?.[i]),
      conditions_short: wmoToShort(h.weather_code?.[i]),
    };
  });
}

export type OpenMeteoCurrent = {
  time: string | null;
  temp_f: number | null;
  wind_mph: number | null;
  gust_mph: number | null;
  wind_dir_deg: number | null;
};

export function parseCurrent(j: OpenMeteoResponse): OpenMeteoCurrent {
  const c = j.current;
  return {
    time: c?.time ?? null,
    temp_f: roundOrNull(c?.temperature_2m),
    wind_mph: roundOrNull(c?.wind_speed_10m),
    gust_mph: roundOrNull(c?.wind_gusts_10m),
    wind_dir_deg: roundOrNull(c?.wind_direction_10m),
  };
}

/** Freezing level (ft) at the hour nearest `now`, or null. */
export function freezingLevelNow(hours: OpenMeteoHour[], now: Date = new Date()): number | null {
  let best: OpenMeteoHour | null = null;
  let bestDiff = Infinity;
  for (const h of hours) {
    const diff = Math.abs(Date.parse(h.time) - now.getTime());
    if (diff < bestDiff && isNum(h.freezing_level_ft)) {
      best = h;
      bestDiff = diff;
    }
  }
  return best ? round(best.freezing_level_ft!, 0) : null;
}
