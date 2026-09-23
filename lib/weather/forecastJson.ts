// Versioned shape of weather_cache.forecast_json.
//
// v1 (before 2026-09-23) was a bare array of 10 ForecastDay rows. v2 is
// an object that keeps that array under `days` and adds hourly detail,
// observations, measured snow and per-source provenance. Readers must
// go through forecastDaysFrom() so both shapes keep rendering while
// rows roll over from v1 to v2 during the first refresh.

/** One calendar day of the forecast strip. Keys in this block are the
 *  v1 contract the resort page + surface classifier already consume. */
export type ForecastDay = {
  date: string; // 'YYYY-MM-DD' in resort-local time
  weekday: string; // 'Tue'
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  /** Forecast snowfall for the day at BASE elevation (inches). */
  snow_in: number | null;
  precip_chance: number | null; // 0-100
  wind_short: string | null; // e.g. "12 mph"
  wind_dir_short: string | null; // e.g. "NW"
  uv_index_max?: number | null;
  // ---- v2 additions (all optional so v1 readers stay type-compatible) ----
  /** Forecast snowfall at SUMMIT elevation (inches), Open-Meteo. */
  snow_summit_in?: number | null;
  /** Ice accumulation (inches), NWS iceAccumulation. */
  ice_in?: number | null;
  /** Liquid-equivalent precipitation (inches), NWS QPF. */
  qpf_in?: number | null;
  /** Peak wind gust (mph). */
  gust_mph?: number | null;
  /** Daily max freezing level (feet above sea level), Open-Meteo. */
  freezing_level_ft?: number | null;
  /** Which source produced the headline numbers for this day. */
  source?: "nws" | "open-meteo";
};

export type ForecastHour = {
  time: string; // ISO-8601 UTC
  temp_f: number | null;
  temp_summit_f: number | null;
  snow_in: number | null; // base elevation, that hour
  snow_summit_in: number | null;
  rain_in: number | null;
  wind_mph: number | null;
  gust_mph: number | null;
  wind_dir: string | null;
  freezing_level_ft: number | null;
  conditions_short: string | null;
};

export type StationRef = {
  id: string;
  name: string | null;
  elevation_ft: number | null;
  distance_km: number;
  lat: number;
  lon: number;
};

export type SnotelRef = {
  triplet: string;
  name: string | null;
  elevation_ft: number | null;
  distance_km: number;
};

export type StationObservation = {
  station_id: string;
  station_name: string | null;
  elevation_ft: number | null;
  distance_km: number;
  observed_at: string | null; // ISO-8601 of the newest merged observation
  temp_f: number | null;
  wind_mph: number | null;
  gust_mph: number | null;
  wind_dir: string | null;
  precip_1h_in: number | null;
  conditions_short: string | null;
};

export type SnotelObservation = {
  triplet: string;
  name: string | null;
  elevation_ft: number | null;
  distance_km: number;
  /** Date (station-local) of the daily values below. */
  observed_date: string | null;
  snow_depth_in: number | null;
  swe_in: number | null;
  temp_max_f: number | null;
  temp_min_f: number | null;
  temp_avg_f: number | null;
  precip_in: number | null;
  /** Depth change vs the previous day (settlement makes this < true snowfall). */
  depth_change_in: number | null;
};

export type MeasuredSnow = {
  /** Resort-local calendar date these values describe (yesterday). */
  for_date: string | null;
  /** NOHRSC National Snowfall Analysis, 24 h ending at `sfav2_valid_end`, inches. */
  sfav2_24h_in: number | null;
  sfav2_valid_end: string | null; // ISO-8601 UTC
  sfav2_file: string | null;
  /** SNODAS snow depth / SWE at the resort point (natural snow, no snowmaking). */
  snodas_depth_in: number | null;
  snodas_swe_in: number | null;
  snodas_valid: string | null;
  /** Raw pixel values as returned by NOAA's map service, kept for auditing units. */
  snodas_raw: { depth: number | null; swe: number | null } | null;
  snotel: SnotelObservation | null;
  /** Which source fed each weather_history column. */
  history_sources: Record<string, string> | null;
};

export type ForecastSources = {
  nws: {
    office: string;
    x: number;
    y: number;
    grid_elevation_ft: number | null;
    update_time: string | null;
    time_zone: string | null;
    ok: boolean;
    error: string | null;
  } | null;
  open_meteo: {
    endpoint: "commercial" | "free";
    base_elevation_ft: number | null;
    summit_elevation_ft: number | null;
    time_zone: string | null;
    utc_offset_seconds: number | null;
    ok: boolean;
    error: string | null;
  } | null;
  attribution: string[];
};

export type ForecastJsonV2 = {
  v: 2;
  updated_at: string;
  days: ForecastDay[];
  hourly: ForecastHour[];
  obs: {
    primary: StationObservation | null;
    stations: StationObservation[];
    fetched_at: string | null;
  };
  measured: MeasuredSnow | null;
  stations: {
    nws: StationRef[];
    snotel: SnotelRef[];
    mapped_at: string | null;
  };
  sources: ForecastSources;
  /** Current freezing level (feet) from the hour nearest now, base query. */
  freezing_level_ft: number | null;
};

export function isForecastJsonV2(v: unknown): v is ForecastJsonV2 {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    (v as { v?: unknown }).v === 2 &&
    Array.isArray((v as { days?: unknown }).days)
  );
}

/** Read the day strip from either the legacy v1 array or the v2 object.
 *  Always returns an array so existing `.length` / `.slice` callers work. */
export function forecastDaysFrom(value: unknown): ForecastDay[] {
  if (Array.isArray(value)) return value as ForecastDay[];
  if (isForecastJsonV2(value)) return value.days;
  return [];
}
