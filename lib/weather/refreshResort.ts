// Refresh ONE resort end to end: forecast (NWS + Open-Meteo base/summit),
// station observations, and — once per local day — the measured layer
// (NOHRSC analysis, SNODAS, SNOTEL, station daily summary) that feeds
// weather_history. Used by the daily/30-minute cron and by the
// on-request /api/refresh/resort/[id] route.
//
// Failure policy: a resort only counts as failed when NO forecast source
// answered. Anything else degrades field by field and records what went
// wrong in forecast_json.sources / the run's warnings. A failed resort
// never overwrites its previous good row — the writer only touches
// fetch_source / fetch_error for it, and fetched_at keeps pointing at the
// last GOOD forecast so the page's "synced" time and /api/health stay
// honest (see writeOutcomes + lastAttemptAt).

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSnotelDaily } from "./awdb";
import {
  type ForecastJsonV2,
  type ForecastSources,
  type MeasuredSnow,
  type SnotelObservation,
  type StationObservation,
} from "./forecastJson";
import { errorText, isAbortError, runWithDeadline } from "./http";
import {
  assembleForecastJson,
  buildHistoryRow,
  describeToday,
  mergeDays,
  mergeHourly,
  NOHRSC_ATTRIBUTION,
  NWS_ATTRIBUTION,
  OPEN_METEO_ATTRIBUTION,
  pickCurrentWind,
  SNOTEL_ATTRIBUTION,
  sumRecentSnow,
  type HistoryRow,
  type OpenMeteoParsed,
} from "./merge";
import { fetchSnodasPoint, isConus, Sfav2Sampler, type Sfav2Latest } from "./nohrsc";
import {
  fetchGrid,
  fetchObservations,
  gridElevationFt,
  lookupPoint,
  mergeObservations,
  parseGridDays,
  summarizeDay,
  type NwsDay,
  type NwsPoint,
} from "./nws";
import {
  buildForecastUrl,
  fetchOpenMeteo,
  freezingLevelNow,
  openMeteoEndpoint,
  parseCurrent,
  parseDaily,
  parseHourly,
} from "./openMeteo";
import {
  mapNwsStations,
  mapSnotel,
  mappingIsStale,
  StationDirectory,
  type ResortPoint,
} from "./stations";
import { localDate, shiftDate } from "./time";
import { ftToM, isNum, round } from "./units";

// ---------- input row shapes (subset of the live schema) ----------

export type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  base_elevation_ft: number | null;
  elevation_base: number | null;
  summit_elevation_ft: number | null;
  elevation_summit: number | null;
  vertical_drop: number | null;
  snow_report_status: string | null;
};

/**
 * The slice of weather_cache a refresh needs. The full forecast_json (48 h
 * hourly at two elevations, obs, 16 days) is 10-15 MB across 425 rows;
 * a run only needs the station mapping, the measured layer and the time
 * zone, so those are selected as JSON sub-paths (PostgREST `alias:col->key`,
 * verified against the live database 2026-09-23).
 */
export type CacheRow = {
  resort_id: number;
  nws_grid_office: string | null;
  nws_grid_x: number | null;
  nws_grid_y: number | null;
  fetched_at: string | null;
  fetch_source: string | null;
  fetch_error: string | null;
  /** Null until a forecast has ever been written for the resort. */
  forecast_for_date: string | null;
  /** forecast_json->stations (null for legacy v1 rows and empty rows). */
  stations: ForecastJsonV2["stations"] | null;
  /** forecast_json->measured */
  measured: MeasuredSnow | null;
  /** forecast_json->sources->nws->>time_zone */
  time_zone: string | null;
};

export const RESORT_COLUMNS =
  "id, slug, name, state, latitude, longitude, base_elevation_ft, elevation_base, summit_elevation_ft, elevation_summit, vertical_drop, snow_report_status";
export const CACHE_COLUMNS =
  "resort_id, nws_grid_office, nws_grid_x, nws_grid_y, fetched_at, fetch_source, fetch_error, forecast_for_date, " +
  "stations:forecast_json->stations, measured:forecast_json->measured, time_zone:forecast_json->sources->nws->>time_zone";

/** fetch_error prefix written when every forecast source failed. It keeps
 *  the failure time without touching fetched_at (the last good forecast). */
const FAILED_AT_RE = /^failed@(\S+): /;

export function failureMarker(now: Date, error: string): string {
  return `failed@${now.toISOString()}: ${error}`.slice(0, 240);
}

/** Epoch ms of the last refresh ATTEMPT (success or failure); 0 when never
 *  tried. This is the 45-minute lock, so a broken resort is retried at the
 *  in-season cadence rather than on every invocation. */
export function lastAttemptAt(cache: CacheRow | undefined | null): number {
  if (!cache) return 0;
  const fetched = cache.fetched_at ? Date.parse(cache.fetched_at) : NaN;
  const m = cache.fetch_source === "failed" ? cache.fetch_error?.match(FAILED_AT_RE) : null;
  const failed = m ? Date.parse(m[1]) : NaN;
  return Math.max(Number.isFinite(fetched) ? fetched : 0, Number.isFinite(failed) ? failed : 0);
}

function validStations(v: unknown): ForecastJsonV2["stations"] | null {
  if (typeof v !== "object" || v === null) return null;
  const s = v as Partial<ForecastJsonV2["stations"]>;
  if (!Array.isArray(s.nws) || !Array.isArray(s.snotel)) return null;
  return { nws: s.nws, snotel: s.snotel, mapped_at: typeof s.mapped_at === "string" ? s.mapped_at : null };
}

// ---------- outcome shapes ----------

export type WeatherCacheWrite = {
  resort_id: number;
  nws_grid_office: string | null;
  nws_grid_x: number | null;
  nws_grid_y: number | null;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  conditions_long: string | null;
  precip_chance: number | null;
  snow_24h_in: number | null;
  snow_48h_in: number | null;
  wind_mph_avg: number | null;
  wind_mph_gust: number | null;
  wind_dir_deg: number | null;
  wind_dir_short: string | null;
  forecast_for_date: string;
  fetched_at: string;
  fetch_source: string;
  fetch_error: string | null;
  forecast_json: ForecastJsonV2;
};

export type ResortSnowWrite = {
  id: number;
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
};

export type RefreshOutcome =
  | {
      ok: true;
      resort_id: number;
      cacheRow: WeatherCacheWrite;
      historyRow: HistoryRow | null;
      warnings: string[];
    }
  | { ok: false; resort_id: number; error: string };

/** Samplers for the latest 24 h / 48 h / 72 h analyses, shared by a run. */
export type Sfav2Samplers = { h24: Sfav2Sampler | null; h48: Sfav2Sampler | null; h72: Sfav2Sampler | null };

export function makeSfav2Samplers(latest: Sfav2Latest | null): Sfav2Samplers {
  return {
    h24: latest?.h24 ? new Sfav2Sampler(latest.h24) : null,
    h48: latest?.h48 ? new Sfav2Sampler(latest.h48) : null,
    h72: latest?.h72 ? new Sfav2Sampler(latest.h72) : null,
  };
}

export type RefreshContext = {
  now: Date;
  directory: StationDirectory;
  /** Latest snowfall-analysis files, shared by the whole run (null = unavailable). */
  sfav2: Sfav2Samplers;
  /** Whether this call may run the once-a-day measured layer. */
  allowMeasured: boolean;
};

// ---------- helpers ----------

function coordinate(v: number | string | null): number {
  // Number(null) is 0, which would silently place a resort with no
  // coordinates at 0°,0° in the Gulf of Guinea.
  if (v === null || v === "") return NaN;
  return Number(v);
}

function resortPoint(r: ResortRow): ResortPoint | null {
  const lat = coordinate(r.latitude);
  const lon = coordinate(r.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null;
  const base = r.base_elevation_ft ?? r.elevation_base ?? null;
  let summit = r.summit_elevation_ft ?? r.elevation_summit ?? null;
  if (!isNum(summit) && isNum(base) && isNum(r.vertical_drop) && r.vertical_drop > 0) {
    summit = base + r.vertical_drop;
  }
  return { lat, lon, state: r.state, baseElevationFt: base, summitElevationFt: summit };
}

async function loadOpenMeteo(
  lat: number,
  lon: number,
  elevationFt: number | null,
): Promise<OpenMeteoParsed> {
  const url = buildForecastUrl({
    lat,
    lon,
    elevationM: isNum(elevationFt) ? ftToM(elevationFt) : null,
    forecastDays: 16,
    pastDays: 1,
  });
  const j = await fetchOpenMeteo(url);
  return {
    days: parseDaily(j),
    hours: parseHourly(j),
    current: parseCurrent(j),
    timeZone: j.timezone ?? null,
    utcOffsetSeconds: isNum(j.utc_offset_seconds) ? j.utc_offset_seconds : null,
    elevationFt: isNum(j.elevation) ? Math.round(j.elevation * 3.28084) : null,
  };
}

async function readStationObs(
  stations: ForecastJsonV2["stations"]["nws"],
): Promise<StationObservation[]> {
  const results = await Promise.all(
    stations.map(async (s) => {
      try {
        const merged = mergeObservations(await fetchObservations(s.id, { limit: 4 }));
        if (!merged) return null;
        return {
          station_id: s.id,
          station_name: s.name,
          elevation_ft: s.elevation_ft,
          distance_km: s.distance_km,
          ...merged,
        } satisfies StationObservation;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is StationObservation => r !== null);
}

/** Yesterday's SNOTEL daily values plus the depth change vs the day before. */
async function readSnotel(
  ref: ForecastJsonV2["stations"]["snotel"][number],
  yesterday: string,
  now: Date,
): Promise<SnotelObservation | null> {
  const series = await fetchSnotelDaily(ref.triplet, 4, now);
  const y = series.find((d) => d.date === yesterday) ?? series[series.length - 1] ?? null;
  if (!y) return null;
  const prev = series.find((d) => d.date === shiftDate(y.date, -1)) ?? null;
  const delta =
    isNum(y.snow_depth_in) && isNum(prev?.snow_depth_in) ? round(y.snow_depth_in - prev!.snow_depth_in!, 1) : null;
  return {
    triplet: ref.triplet,
    name: ref.name,
    elevation_ft: ref.elevation_ft,
    distance_km: ref.distance_km,
    observed_date: y.date,
    snow_depth_in: y.snow_depth_in,
    swe_in: y.swe_in,
    temp_max_f: y.temp_max_f,
    temp_min_f: y.temp_min_f,
    temp_avg_f: y.temp_avg_f,
    precip_in: y.precip_in,
    depth_change_in: delta,
  };
}

/** Measured layer is due when we have no row for yesterday yet, or a
 *  newer snowfall analysis has been issued since the last one we read. */
export function measuredIsDue(
  previous: MeasuredSnow | null,
  yesterday: string,
  sfav2File: string | null,
): boolean {
  if (!previous) return true;
  if (previous.for_date !== yesterday) return true;
  if (sfav2File && previous.sfav2_file !== sfav2File) return true;
  return false;
}

// ---------- the orchestrator ----------

export async function refreshResort(
  resort: ResortRow,
  cached: CacheRow | undefined,
  ctx: RefreshContext,
): Promise<RefreshOutcome> {
  const point = resortPoint(resort);
  if (!point) return { ok: false, resort_id: resort.id, error: "bad coordinates" };
  const warnings: string[] = [];
  const prevStations = validStations(cached?.stations);
  const prevMeasured = cached?.measured ?? null;

  // 1. NWS gridpoint (cached in weather_cache columns; /points otherwise).
  let nwsPoint: NwsPoint | null = null;
  let nwsError: string | null = null;
  const cachedTz = cached?.time_zone ?? null;
  if (cached?.nws_grid_office && isNum(cached.nws_grid_x) && isNum(cached.nws_grid_y)) {
    nwsPoint = {
      office: cached.nws_grid_office,
      x: cached.nws_grid_x,
      y: cached.nws_grid_y,
      timeZone: cachedTz,
      forecastGridData: `https://api.weather.gov/gridpoints/${cached.nws_grid_office}/${cached.nws_grid_x},${cached.nws_grid_y}`,
    };
  } else {
    try {
      nwsPoint = await lookupPoint(point.lat, point.lon);
    } catch (e) {
      nwsError = `points: ${errorText(e)}`;
    }
  }

  // 2. Forecast sources in parallel.
  const summitDistinct =
    isNum(point.summitElevationFt) &&
    (!isNum(point.baseElevationFt) || point.summitElevationFt - point.baseElevationFt >= 500);
  const [gridRes, baseRes, summitRes] = await Promise.allSettled([
    nwsPoint ? fetchGrid(nwsPoint) : Promise.reject(new Error(nwsError ?? "no gridpoint")),
    loadOpenMeteo(point.lat, point.lon, point.baseElevationFt),
    summitDistinct
      ? loadOpenMeteo(point.lat, point.lon, point.summitElevationFt)
      : Promise.resolve<OpenMeteoParsed | null>(null),
  ]);
  const omBase = baseRes.status === "fulfilled" ? baseRes.value : null;
  const omSummit = summitRes.status === "fulfilled" ? summitRes.value : null;
  if (baseRes.status === "rejected") warnings.push(`open-meteo base: ${errorText(baseRes.reason)}`);
  if (summitRes.status === "rejected") warnings.push(`open-meteo summit: ${errorText(summitRes.reason)}`);
  if (gridRes.status === "rejected") {
    nwsError = errorText(gridRes.reason);
    warnings.push(`nws grid: ${nwsError}`);
  }

  // Time zone: NWS /points is authoritative; Open-Meteo agrees in practice.
  const timeZone = nwsPoint?.timeZone ?? omBase?.timeZone ?? cachedTz;
  const today = localDate(ctx.now, timeZone);
  const yesterday = shiftDate(today, -1);

  let nwsDays: NwsDay[] = [];
  let gridElevation: number | null = null;
  let gridUpdate: string | null = null;
  if (gridRes.status === "fulfilled") {
    nwsDays = parseGridDays(gridRes.value, timeZone, ctx.now);
    gridElevation = gridElevationFt(gridRes.value);
    gridUpdate = gridRes.value.properties?.updateTime ?? null;
    if (nwsDays.length === 0) {
      nwsError = "grid returned no usable days";
      warnings.push(`nws grid: ${nwsError}`);
    }
  }
  if (nwsDays.length === 0 && !omBase) {
    return { ok: false, resort_id: resort.id, error: `no forecast source answered (${nwsError ?? "nws"}; open-meteo failed)` };
  }

  // 3. Station mapping (cached, refreshed every 30 days) + latest observations.
  let stations = prevStations ?? { nws: [], snotel: [], mapped_at: null };
  if (mappingIsStale(stations.mapped_at, ctx.now)) {
    try {
      const [nws, snotel] = await Promise.all([
        mapNwsStations(point, nwsPoint, ctx.directory, ctx.now),
        mapSnotel(point, ctx.directory),
      ]);
      stations = { nws, snotel, mapped_at: ctx.now.toISOString() };
    } catch (e) {
      warnings.push(`station mapping: ${errorText(e)}`);
    }
  }
  const obs = await readStationObs(stations.nws);
  // If every mapped station has gone quiet, force a re-map next run.
  if (stations.nws.length > 0 && obs.length === 0) stations = { ...stations, mapped_at: null };

  // 4. Measured layer (once per local day, or when a newer analysis exists).
  let measured: MeasuredSnow | null = prevMeasured;
  let historyRow: HistoryRow | null = null;
  const sfav2File = ctx.sfav2.h24?.file.name ?? null;
  if (ctx.allowMeasured && measuredIsDue(measured, yesterday, sfav2File)) {
    // History temps come from the LOWEST live station (the mapping is
    // ranked highest first, so that is the last entry): the surface
    // classifier wants base-area highs and lows, not the summit's. The
    // highest station still feeds the live "now" observation.
    const historyStation = stations.nws.length ? stations.nws[stations.nws.length - 1] : null;
    const sample = (s: Sfav2Sampler | null) => (s ? s.sample(point.lat, point.lon) : Promise.resolve(null));
    const [sfav2Res, sfav2Res48, sfav2Res72, snodasRes, snotelRes, stationDayRes] = await Promise.allSettled([
      sample(ctx.sfav2.h24),
      sample(ctx.sfav2.h48),
      sample(ctx.sfav2.h72),
      isConus(point.lat, point.lon) ? fetchSnodasPoint(point.lat, point.lon) : Promise.resolve(null),
      stations.snotel[0] ? readSnotel(stations.snotel[0], yesterday, ctx.now) : Promise.resolve(null),
      historyStation
        ? fetchObservations(historyStation.id, {
            start: new Date(ctx.now.getTime() - 40 * 3_600_000),
            end: ctx.now,
            limit: 500,
          }).then((o) => summarizeDay(o, yesterday, timeZone))
        : Promise.resolve(null),
    ]);
    const settled = <T>(r: PromiseSettledResult<T>, label: string): T | null => {
      if (r.status === "fulfilled") return r.value;
      warnings.push(`${label}: ${errorText(r.reason)}`);
      return null;
    };
    const sfav2In = settled(sfav2Res, "nohrsc sfav2 24h");
    const sfav2In48 = settled(sfav2Res48, "nohrsc sfav2 48h");
    const sfav2In72 = settled(sfav2Res72, "nohrsc sfav2 72h");
    const snodas = settled(snodasRes, "snodas");
    const snotel = settled(snotelRes, "snotel");
    const stationDay = settled(stationDayRes, "station history");
    const omDay = omBase?.days.find((d) => d.date === yesterday) ?? null;
    const omHours = omBase?.hours.filter((h) => h.local_date === yesterday) ?? [];
    const built = buildHistoryRow({
      resortId: resort.id,
      date: yesterday,
      sfav2In,
      sfav2ValidEnd: ctx.sfav2.h24?.file.validEnd ?? null,
      snotel,
      stationDay,
      station: historyStation ? { id: historyStation.id, elevation_ft: historyStation.elevation_ft } : null,
      omDay,
      omHours,
    });
    historyRow = built?.row ?? null;
    measured = {
      for_date: yesterday,
      sfav2_24h_in: sfav2In,
      sfav2_48h_in: sfav2In48,
      sfav2_72h_in: sfav2In72,
      sfav2_valid_end: ctx.sfav2.h24?.file.validEnd ?? null,
      sfav2_file: sfav2File,
      snodas_depth_in: snodas?.depth_in ?? null,
      snodas_swe_in: snodas?.swe_in ?? null,
      snodas_valid: snodas?.valid ?? null,
      snodas_raw: snodas?.raw ?? null,
      snotel,
      history_sources: built?.sources ?? null,
    };
  }

  // 5. Merge into the v2 document + legacy scalar columns.
  const mergeInput = { now: ctx.now, timeZone, today, nwsDays, omBase, omSummit };
  const days = mergeDays(mergeInput);
  const hourly = mergeHourly(mergeInput);
  const wind = pickCurrentWind(obs[0] ?? null, omBase?.current ?? null, ctx.now);
  const ep = openMeteoEndpoint();
  const attribution = [NWS_ATTRIBUTION];
  if (omBase) attribution.push(OPEN_METEO_ATTRIBUTION);
  if (measured?.sfav2_24h_in != null || measured?.snodas_depth_in != null) attribution.push(NOHRSC_ATTRIBUTION);
  if (measured?.snotel) attribution.push(SNOTEL_ATTRIBUTION);
  const sources: ForecastSources = {
    nws: nwsPoint
      ? {
          office: nwsPoint.office,
          x: nwsPoint.x,
          y: nwsPoint.y,
          grid_elevation_ft: gridElevation,
          update_time: gridUpdate,
          time_zone: timeZone,
          ok: nwsDays.length > 0,
          error: nwsDays.length > 0 ? null : nwsError,
        }
      : null,
    open_meteo: {
      endpoint: ep.kind,
      base_elevation_ft: omBase?.elevationFt ?? null,
      summit_elevation_ft: omSummit?.elevationFt ?? null,
      time_zone: omBase?.timeZone ?? null,
      utc_offset_seconds: omBase?.utcOffsetSeconds ?? null,
      ok: !!omBase,
      error: baseRes.status === "rejected" ? errorText(baseRes.reason) : null,
    },
    attribution,
  };
  const forecastJson = assembleForecastJson({
    now: ctx.now,
    days,
    hourly,
    obs,
    obsFetchedAt: obs.length ? ctx.now.toISOString() : null,
    measured,
    stations,
    sources,
    freezingLevelFt: omBase ? freezingLevelNow(omBase.hours, ctx.now) : null,
  });
  const todayDay = days[0];
  const tomorrow = days[1];
  const fetchSource = nwsDays.length > 0 && omBase ? "nws+open-meteo" : nwsDays.length > 0 ? "nws" : "open-meteo";
  const cacheRow: WeatherCacheWrite = {
    resort_id: resort.id,
    nws_grid_office: nwsPoint?.office ?? cached?.nws_grid_office ?? null,
    nws_grid_x: nwsPoint?.x ?? cached?.nws_grid_x ?? null,
    nws_grid_y: nwsPoint?.y ?? cached?.nws_grid_y ?? null,
    temp_high_f: todayDay?.temp_high_f ?? null,
    temp_low_f: todayDay?.temp_low_f ?? null,
    conditions_short: todayDay?.conditions_short ?? null,
    conditions_long: describeToday(todayDay, wind),
    precip_chance: todayDay?.precip_chance ?? null,
    snow_24h_in: todayDay?.snow_in ?? null,
    snow_48h_in:
      isNum(todayDay?.snow_in) || isNum(tomorrow?.snow_in)
        ? round((todayDay?.snow_in ?? 0) + (tomorrow?.snow_in ?? 0), 1)
        : null,
    wind_mph_avg: wind.wind_mph_avg,
    wind_mph_gust: wind.wind_mph_gust,
    wind_dir_deg: wind.wind_dir_deg,
    wind_dir_short: wind.wind_dir_short,
    forecast_for_date: today,
    fetched_at: ctx.now.toISOString(),
    fetch_source: fetchSource,
    fetch_error: warnings.length ? warnings.join("; ").slice(0, 240) : null,
    forecast_json: forecastJson,
  };
  return { ok: true, resort_id: resort.id, cacheRow, historyRow, warnings };
}

// ---------- persistence ----------

export type WriteStats = {
  cacheUpserted: number;
  cacheFailedMarked: number;
  historyUpserted: number;
  resortSnowUpdated: number;
  dbErrors: string[];
};

/**
 * Persist a batch of outcomes. Successful rows are upserted whole;
 * failed resorts get only fetch_source/fetch_error written (one row at a
 * time, so PostgREST's column-union upsert can't null out yesterday's
 * forecast — the audit's finding api-crons-email-6). fetched_at is left
 * alone on failure: it is the time of the last GOOD forecast, which is
 * what the resort page shows as "synced" and what /api/health measures.
 */
export async function writeOutcomes(
  supabase: SupabaseClient,
  outcomes: RefreshOutcome[],
  opts: {
    resortsById: Map<number, ResortRow>;
    recentHistory: Map<number, Array<{ observed_date: string; snow_24h_in: number | null }>>;
    now?: Date;
  },
): Promise<WriteStats> {
  const now = opts.now ?? new Date();
  const stats: WriteStats = {
    cacheUpserted: 0,
    cacheFailedMarked: 0,
    historyUpserted: 0,
    resortSnowUpdated: 0,
    dbErrors: [],
  };
  const good = outcomes.filter((o): o is Extract<RefreshOutcome, { ok: true }> => o.ok);
  const bad = outcomes.filter((o): o is Extract<RefreshOutcome, { ok: false }> => !o.ok);

  if (good.length) {
    const { error } = await supabase
      .from("weather_cache")
      .upsert(good.map((o) => o.cacheRow), { onConflict: "resort_id" });
    if (error) stats.dbErrors.push(`weather_cache: ${error.message}`);
    else stats.cacheUpserted += good.length;
  }
  for (const o of bad) {
    // Single-row upsert of three columns: updates only those columns on an
    // existing row, and creates a marker row for a resort that has never
    // succeeded so the 45-minute lock applies to it too.
    const { error } = await supabase
      .from("weather_cache")
      .upsert(
        { resort_id: o.resort_id, fetch_source: "failed", fetch_error: failureMarker(now, o.error) },
        { onConflict: "resort_id" },
      );
    if (error) stats.dbErrors.push(`weather_cache(failed ${o.resort_id}): ${error.message}`);
    else stats.cacheFailedMarked++;
  }

  const history = good.map((o) => o.historyRow).filter((r): r is HistoryRow => r !== null);
  if (history.length) {
    const { error } = await supabase
      .from("weather_history")
      .upsert(history, { onConflict: "resort_id,observed_date" });
    if (error) stats.dbErrors.push(`weather_history: ${error.message}`);
    else stats.historyUpserted += history.length;
  }

  // Measured snowfall → resorts.snow_new_* for resorts WITHOUT a licensed
  // report (status 'reported' rows belong to the snow-report provider).
  // 48 h prefers the NOHRSC 48 h analysis (one measured window) over a sum
  // of two daily rows; 7 d has no analysis product and stays a sum.
  const snowWrites: ResortSnowWrite[] = [];
  for (const o of good) {
    if (!o.historyRow) continue;
    const resort = opts.resortsById.get(o.resort_id);
    if (resort?.snow_report_status === "reported") continue;
    const prior = (opts.recentHistory.get(o.resort_id) ?? []).filter(
      (h) => h.observed_date !== o.historyRow!.observed_date,
    );
    const series = [o.historyRow, ...prior]
      .sort((a, b) => (a.observed_date < b.observed_date ? 1 : -1))
      .map((h) => h.snow_24h_in);
    const measured48 = o.cacheRow.forecast_json.measured?.sfav2_48h_in ?? null;
    snowWrites.push({
      id: o.resort_id,
      snow_new_24h_in: isNum(o.historyRow.snow_24h_in) ? Math.round(o.historyRow.snow_24h_in) : null,
      snow_new_48h_in: roundInt(isNum(measured48) ? measured48 : sumRecentSnow(series, 2)),
      snow_new_7d_in: roundInt(sumRecentSnow(series, 7)),
    });
  }
  const BATCH = 20;
  for (let off = 0; off < snowWrites.length; off += BATCH) {
    const results = await Promise.all(
      snowWrites.slice(off, off + BATCH).map(({ id, ...cols }) =>
        supabase.from("resorts").update(cols).eq("id", id),
      ),
    );
    for (const r of results) {
      if (r.error) stats.dbErrors.push(`resorts snow: ${r.error.message}`);
      else stats.resortSnowUpdated++;
    }
  }
  return stats;
}

function roundInt(v: number | null): number | null {
  return isNum(v) ? Math.round(v) : null;
}

// ---------- budgeted refresh ----------

/**
 * refreshResort() under a hard budget. Every fetch in its chain inherits
 * the deadline signal (see lib/weather/http.ts), so when the budget runs
 * out the sockets are cancelled and the resort is reported as failed with
 * "deadline" — instead of the whole function being killed by Vercel with
 * the batch's results, the cron_runs row and the log line all lost.
 */
export async function refreshResortWithin(
  resort: ResortRow,
  cached: CacheRow | undefined,
  ctx: RefreshContext,
  budgetMs: number,
): Promise<RefreshOutcome> {
  const ac = new AbortController();
  const seconds = Math.max(0, Math.round(budgetMs / 1000));
  const deadlineOutcome: RefreshOutcome = {
    ok: false,
    resort_id: resort.id,
    error: `deadline: not finished within ${seconds} s`,
  };
  const onAbort = new Promise<RefreshOutcome>((resolve) => {
    ac.signal.addEventListener("abort", () => resolve(deadlineOutcome), { once: true });
  });
  const timer = setTimeout(() => ac.abort(), Math.max(0, budgetMs));
  try {
    return await Promise.race([runWithDeadline(ac.signal, () => refreshResort(resort, cached, ctx)), onAbort]);
  } catch (e) {
    return isAbortError(e) ? deadlineOutcome : { ok: false, resort_id: resort.id, error: errorText(e, 240) };
  } finally {
    clearTimeout(timer);
  }
}
