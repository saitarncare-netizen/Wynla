// National Weather Service (api.weather.gov) — forecast grids and
// station observations. Public domain, no key, User-Agent required.
//
// Forecast: we read the QUANTITATIVE gridpoint layers
// (/gridpoints/{office}/{x},{y}: snowfallAmount, iceAccumulation,
// quantitativePrecipitation, windGust, maxTemperature ...) instead of
// regex-parsing the prose forecast. The prose parser was structurally
// unable to see snow ("New snow accumulation of 1 to 2 inches possible"
// never matched), which is why every forecast day showed 0 in.
//
// Layers are lists of { validTime: "<ISO>/<ISO-8601 duration>", value }
// in metric units. Accumulation layers (mm) are summed per local day,
// instantaneous layers (°C, km/h) take max/min per local day.
//
// Observations: /stations?state=XX lists ~33k MADIS stations including
// SNOTEL, DOT road sensors, avalanche-center and resort-owned stations,
// not only airports. Individual observations frequently carry null
// fields, so callers merge the last few observations (mergeObservations).

import { fetchJson } from "./http";
import { localDate, parseValidTime } from "./time";
import {
  cToF,
  compass,
  isNum,
  kmhToMph,
  maxOrNull,
  meanOrNull,
  minOrNull,
  mToFt,
  mmToIn,
  round,
  roundOrNull,
  sumOrNull,
} from "./units";

const NWS_HEADERS = { Accept: "application/geo+json" };
const NWS_BASE = "https://api.weather.gov";

// ---------- /points ----------

export type NwsPoint = {
  office: string;
  x: number;
  y: number;
  timeZone: string | null;
  forecastGridData: string;
};

type PointsResponse = {
  properties?: {
    gridId?: string;
    gridX?: number;
    gridY?: number;
    timeZone?: string;
    forecastGridData?: string;
  };
};

export async function lookupPoint(lat: number, lon: number): Promise<NwsPoint> {
  const j = await fetchJson<PointsResponse>(
    `${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
    { headers: NWS_HEADERS },
  );
  const p = j.properties;
  if (!p?.gridId || !isNum(p.gridX) || !isNum(p.gridY)) {
    throw new Error("NWS /points returned no gridpoint");
  }
  return {
    office: p.gridId,
    x: p.gridX,
    y: p.gridY,
    timeZone: p.timeZone ?? null,
    forecastGridData:
      p.forecastGridData ?? `${NWS_BASE}/gridpoints/${p.gridId}/${p.gridX},${p.gridY}`,
  };
}

// ---------- /gridpoints raw layers ----------

export type LayerValue = { validTime: string; value: number | null };
type Layer = { uom?: string; values?: LayerValue[] };

type WeatherEntry = {
  coverage: string | null;
  weather: string | null;
  intensity: string | null;
};
type WeatherLayer = { values?: Array<{ validTime: string; value: WeatherEntry[] }> };

export type NwsGridResponse = {
  properties?: {
    updateTime?: string;
    elevation?: { unitCode?: string; value?: number | null };
    temperature?: Layer;
    maxTemperature?: Layer;
    minTemperature?: Layer;
    windSpeed?: Layer;
    windGust?: Layer;
    windDirection?: Layer;
    probabilityOfPrecipitation?: Layer;
    quantitativePrecipitation?: Layer;
    snowfallAmount?: Layer;
    iceAccumulation?: Layer;
    skyCover?: Layer;
    snowLevel?: Layer;
    weather?: WeatherLayer;
  };
};

export async function fetchGrid(point: NwsPoint): Promise<NwsGridResponse> {
  return fetchJson<NwsGridResponse>(point.forecastGridData, {
    headers: NWS_HEADERS,
    timeoutMs: 25_000,
  });
}

/** One parsed gridpoint day in US units. Nulls mean "layer empty". */
export type NwsDay = {
  date: string; // local calendar date
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_in: number | null;
  ice_in: number | null;
  qpf_in: number | null;
  wind_mph_max: number | null;
  gust_mph_max: number | null;
  wind_dir_deg: number | null;
  precip_chance: number | null;
  sky_cover_max: number | null;
  conditions_short: string | null;
  /** Fraction of the day (0-1) covered by at least one of the snowfall,
   *  QPF or temperature layers. Deciding on snowfall alone threw away
   *  forecaster-edited temps and PoP whenever that one layer was thin. */
  coverage: number;
};

type Bucket = {
  snowMm: number[];
  iceMm: number[];
  qpfMm: number[];
  tempC: number[];
  maxTempC: number[];
  minTempC: number[];
  windKmh: number[];
  gustKmh: number[];
  windDir: number[];
  pop: number[];
  sky: number[];
  weather: WeatherEntry[];
  /** Start-of-hour timestamps seen in the coverage-defining layers. */
  hours: Set<number>;
};

function newBucket(): Bucket {
  return {
    snowMm: [],
    iceMm: [],
    qpfMm: [],
    tempC: [],
    maxTempC: [],
    minTempC: [],
    windKmh: [],
    gustKmh: [],
    windDir: [],
    pop: [],
    sky: [],
    weather: [],
    hours: new Set(),
  };
}

/**
 * Walk a layer and call `visit` for every hour-slice of every value,
 * tagged with its local calendar date. Accumulation layers spread their
 * total evenly over the slice so a 6-hour bin straddling midnight is
 * split proportionally between the two days.
 */
function eachHour(
  layer: Layer | undefined,
  timeZone: string | null,
  visit: (date: string, value: number, hourFractionOfSlice: number, hourStartMs: number) => void,
): void {
  for (const v of layer?.values ?? []) {
    if (!isNum(v.value)) continue;
    const span = parseValidTime(v.validTime);
    if (!span) continue;
    const sliceHours = Math.max(1, Math.round((span.end - span.start) / 3_600_000));
    for (let h = 0; h < sliceHours; h++) {
      const t = span.start + h * 3_600_000;
      visit(localDate(new Date(t), timeZone), v.value, 1 / sliceHours, t);
    }
  }
}

/** Convert the raw gridpoint payload into per-day rows (US units).
 *  `now` bounds the strip: days entirely before today are dropped. */
export function parseGridDays(
  grid: NwsGridResponse,
  timeZone: string | null,
  now: Date = new Date(),
): NwsDay[] {
  const p = grid.properties ?? {};
  const buckets = new Map<string, Bucket>();
  const bucket = (date: string) => {
    let b = buckets.get(date);
    if (!b) {
      b = newBucket();
      buckets.set(date, b);
    }
    return b;
  };

  // Accumulations: spread each slice over its hours. Snowfall, QPF and
  // temperature together define how much of the day the grid covers.
  eachHour(p.snowfallAmount, timeZone, (d, v, frac, t) => {
    bucket(d).snowMm.push(v * frac);
    bucket(d).hours.add(t);
  });
  eachHour(p.iceAccumulation, timeZone, (d, v, frac) => bucket(d).iceMm.push(v * frac));
  eachHour(p.quantitativePrecipitation, timeZone, (d, v, frac, t) => {
    bucket(d).qpfMm.push(v * frac);
    bucket(d).hours.add(t);
  });
  // Instantaneous: each hour gets the slice value.
  eachHour(p.temperature, timeZone, (d, v, _frac, t) => {
    bucket(d).tempC.push(v);
    bucket(d).hours.add(t);
  });
  eachHour(p.maxTemperature, timeZone, (d, v) => bucket(d).maxTempC.push(v));
  eachHour(p.minTemperature, timeZone, (d, v) => bucket(d).minTempC.push(v));
  eachHour(p.windSpeed, timeZone, (d, v) => bucket(d).windKmh.push(v));
  eachHour(p.windGust, timeZone, (d, v) => bucket(d).gustKmh.push(v));
  eachHour(p.windDirection, timeZone, (d, v) => bucket(d).windDir.push(v));
  eachHour(p.probabilityOfPrecipitation, timeZone, (d, v) => bucket(d).pop.push(v));
  eachHour(p.skyCover, timeZone, (d, v) => bucket(d).sky.push(v));
  for (const w of p.weather?.values ?? []) {
    const span = parseValidTime(w.validTime);
    if (!span) continue;
    const hours = Math.max(1, Math.round((span.end - span.start) / 3_600_000));
    for (let h = 0; h < hours; h++) {
      const d = localDate(new Date(span.start + h * 3_600_000), timeZone);
      for (const e of w.value ?? []) if (e.weather) bucket(d).weather.push(e);
    }
  }

  const today = localDate(now, timeZone);
  return Array.from(buckets.entries())
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, b]) => {
      // maxTemperature is the forecaster's daytime high; fall back to the
      // hourly temperature curve when the layer is thin (last day).
      const hiC = maxOrNull(b.maxTempC) ?? maxOrNull(b.tempC);
      const loC = minOrNull(b.minTempC) ?? minOrNull(b.tempC);
      const snowMm = sumOrNull(b.snowMm);
      const dirMean = circularMean(b.windDir);
      return {
        date,
        temp_high_f: isNum(hiC) ? Math.round(cToF(hiC)) : null,
        temp_low_f: isNum(loC) ? Math.round(cToF(loC)) : null,
        snow_in: isNum(snowMm) ? round(mmToIn(snowMm), 1) : null,
        ice_in: mmSumToIn(b.iceMm, 2),
        qpf_in: mmSumToIn(b.qpfMm, 2),
        wind_mph_max: kmhMaxToMph(b.windKmh),
        gust_mph_max: kmhMaxToMph(b.gustKmh),
        wind_dir_deg: dirMean,
        precip_chance: roundOrNull(maxOrNull(b.pop)),
        sky_cover_max: roundOrNull(maxOrNull(b.sky)),
        conditions_short: describeConditions(b.weather, maxOrNull(b.sky)),
        coverage: Math.min(1, b.hours.size / 24),
      };
    });
}

function mmSumToIn(mm: number[], decimals: number): number | null {
  const s = sumOrNull(mm);
  return isNum(s) ? round(mmToIn(s), decimals) : null;
}

function kmhMaxToMph(kmh: number[]): number | null {
  const m = maxOrNull(kmh);
  return isNum(m) ? Math.round(kmhToMph(m)) : null;
}

function circularMean(degs: number[]): number | null {
  if (degs.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const d of degs) {
    x += Math.cos((d * Math.PI) / 180);
    y += Math.sin((d * Math.PI) / 180);
  }
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

// ---------- structured weather → short label ----------

const WEATHER_PRIORITY: Record<string, number> = {
  blizzard: 100,
  freezing_rain: 90,
  freezing_drizzle: 85,
  sleet: 84,
  ice_pellets: 84,
  snow: 80,
  snow_showers: 78,
  blowing_snow: 76,
  thunderstorms: 70,
  rain: 60,
  rain_showers: 58,
  drizzle: 50,
  fog: 40,
  freezing_fog: 42,
  haze: 30,
  smoke: 30,
  frost: 10,
};

const COVERAGE_PREFIX: Record<string, string> = {
  slight_chance: "Slight chance of",
  chance: "Chance of",
  likely: "Likely",
  definite: "",
  areas: "Areas of",
  patchy: "Patchy",
  isolated: "Isolated",
  scattered: "Scattered",
  numerous: "Numerous",
  occasional: "Occasional",
  periods_of: "Periods of",
  frequent: "Frequent",
  intermittent: "Intermittent",
  brief: "Brief",
};

function weatherLabel(w: string): string {
  return w.replace(/_/g, " ");
}

/** "Chance of snow showers", "Snow likely", "Mostly cloudy" ... sentence case. */
export function describeConditions(
  entries: WeatherEntry[],
  skyCoverMax: number | null,
): string | null {
  let best: WeatherEntry | null = null;
  let bestScore = -1;
  for (const e of entries) {
    if (!e.weather) continue;
    const score = WEATHER_PRIORITY[e.weather] ?? 20;
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  if (best?.weather) {
    const label = weatherLabel(best.weather);
    const prefix = COVERAGE_PREFIX[best.coverage ?? "definite"] ?? "";
    let text: string;
    if (best.coverage === "likely") text = `${label} likely`;
    else text = prefix ? `${prefix} ${label}` : label;
    if (best.intensity === "heavy") text = `Heavy ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (!isNum(skyCoverMax)) return null;
  if (skyCoverMax < 25) return "Sunny";
  if (skyCoverMax < 50) return "Mostly sunny";
  if (skyCoverMax < 70) return "Partly cloudy";
  if (skyCoverMax < 88) return "Mostly cloudy";
  return "Cloudy";
}

/** Grid cell elevation in feet (cell average, usually base/valley). */
export function gridElevationFt(grid: NwsGridResponse): number | null {
  const v = grid.properties?.elevation?.value;
  return isNum(v) ? Math.round(mToFt(v)) : null;
}

// ---------- stations ----------

export type NwsStation = {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  elevation_ft: number | null;
};

type StationsResponse = {
  features?: Array<{
    properties?: {
      stationIdentifier?: string;
      name?: string;
      elevation?: { value?: number | null };
    };
    geometry?: { coordinates?: [number, number] };
  }>;
  pagination?: { next?: string };
};

function toStation(f: NonNullable<StationsResponse["features"]>[number]): NwsStation | null {
  const id = f.properties?.stationIdentifier;
  const c = f.geometry?.coordinates;
  if (!id || !c || !isNum(c[0]) || !isNum(c[1])) return null;
  const elev = f.properties?.elevation?.value;
  return {
    id,
    name: f.properties?.name ?? null,
    lon: c[0],
    lat: c[1],
    elevation_ft: isNum(elev) ? Math.round(mToFt(elev)) : null,
  };
}

/** All observation stations in a state (paged, capped at `maxPages`). */
export async function listStationsForState(
  state: string,
  maxPages = 6,
): Promise<NwsStation[]> {
  const out: NwsStation[] = [];
  let url: string | undefined = `${NWS_BASE}/stations?state=${encodeURIComponent(state)}&limit=500`;
  for (let page = 0; url && page < maxPages; page++) {
    const j: StationsResponse = await fetchJson<StationsResponse>(url, {
      headers: NWS_HEADERS,
      timeoutMs: 25_000,
    });
    const feats = j.features ?? [];
    for (const f of feats) {
      const s = toStation(f);
      if (s) out.push(s);
    }
    url = feats.length === 500 ? j.pagination?.next : undefined;
  }
  return out;
}

/** Stations NWS associates with a gridpoint (airport-heavy fallback). */
export async function listStationsForGrid(point: NwsPoint): Promise<NwsStation[]> {
  const j = await fetchJson<StationsResponse>(
    `${NWS_BASE}/gridpoints/${point.office}/${point.x},${point.y}/stations`,
    { headers: NWS_HEADERS },
  );
  return (j.features ?? []).map(toStation).filter((s): s is NwsStation => s !== null);
}

// ---------- observations ----------

type QuantValue = { value?: number | null; unitCode?: string };
export type RawObservation = {
  timestamp?: string;
  temperature?: QuantValue;
  windSpeed?: QuantValue;
  windGust?: QuantValue;
  windDirection?: QuantValue;
  precipitationLastHour?: QuantValue;
  textDescription?: string;
};
type ObservationsResponse = { features?: Array<{ properties?: RawObservation }> };

export async function fetchObservations(
  stationId: string,
  opts: { limit?: number; start?: Date; end?: Date } = {},
): Promise<RawObservation[]> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.start) params.set("start", opts.start.toISOString().replace(/\.\d{3}Z$/, "Z"));
  if (opts.end) params.set("end", opts.end.toISOString().replace(/\.\d{3}Z$/, "Z"));
  const j = await fetchJson<ObservationsResponse>(
    `${NWS_BASE}/stations/${encodeURIComponent(stationId)}/observations?${params}`,
    { headers: NWS_HEADERS },
  );
  return (j.features ?? [])
    .map((f) => f.properties)
    .filter((p): p is RawObservation => !!p && typeof p.timestamp === "string");
}

export type MergedObservation = {
  observed_at: string | null;
  temp_f: number | null;
  wind_mph: number | null;
  gust_mph: number | null;
  wind_dir: string | null;
  precip_1h_in: number | null;
  conditions_short: string | null;
};

function q(v: QuantValue | undefined): number | null {
  return isNum(v?.value) ? v.value : null;
}

/** Fold the newest observations (newest first) into one record: each
 *  field takes the newest non-null value, but only from observations
 *  within `maxAgeHours` of the newest one so a stale reading can't
 *  masquerade as current. */
export function mergeObservations(
  obs: RawObservation[],
  maxAgeHours = 3,
): MergedObservation | null {
  const sorted = obs
    .filter((o) => o.timestamp && Number.isFinite(Date.parse(o.timestamp)))
    .sort((a, b) => Date.parse(b.timestamp!) - Date.parse(a.timestamp!));
  if (sorted.length === 0) return null;
  const newest = Date.parse(sorted[0].timestamp!);
  const window = sorted.filter((o) => newest - Date.parse(o.timestamp!) <= maxAgeHours * 3_600_000);
  const pick = (get: (o: RawObservation) => number | null) => {
    for (const o of window) {
      const v = get(o);
      if (v !== null) return v;
    }
    return null;
  };
  const tempC = pick((o) => q(o.temperature));
  const windKmh = pick((o) => q(o.windSpeed));
  const gustKmh = pick((o) => q(o.windGust));
  const dir = pick((o) => q(o.windDirection));
  const precipMm = pick((o) => q(o.precipitationLastHour));
  const text = window.find((o) => o.textDescription)?.textDescription ?? null;
  return {
    observed_at: sorted[0].timestamp ?? null,
    temp_f: isNum(tempC) ? Math.round(cToF(tempC)) : null,
    wind_mph: isNum(windKmh) ? Math.round(kmhToMph(windKmh)) : null,
    gust_mph: isNum(gustKmh) ? Math.round(kmhToMph(gustKmh)) : null,
    wind_dir: compass(dir),
    precip_1h_in: isNum(precipMm) ? round(mmToIn(precipMm), 2) : null,
    conditions_short: text,
  };
}

/** Daily aggregate of a station's observations for one local date. */
export type DailyObsSummary = {
  date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  wind_mph_avg: number | null;
  wind_dir_short: string | null;
  precip_in: number | null; // sum of hourly precipitation where reported
  sample_count: number;
};

export function summarizeDay(
  obs: RawObservation[],
  date: string,
  timeZone: string | null,
): DailyObsSummary | null {
  const rows = obs.filter(
    (o) => o.timestamp && localDate(new Date(o.timestamp), timeZone) === date,
  );
  if (rows.length === 0) return null;
  const temps = rows.map((o) => q(o.temperature));
  const winds = rows.map((o) => q(o.windSpeed));
  const dirs = rows.map((o) => q(o.windDirection)).filter(isNum);
  const precip = rows.map((o) => q(o.precipitationLastHour));
  const hi = maxOrNull(temps);
  const lo = minOrNull(temps);
  const wind = meanOrNull(winds);
  const p = sumOrNull(precip);
  return {
    date,
    temp_high_f: isNum(hi) ? Math.round(cToF(hi)) : null,
    temp_low_f: isNum(lo) ? Math.round(cToF(lo)) : null,
    wind_mph_avg: isNum(wind) ? Math.round(kmhToMph(wind)) : null,
    wind_dir_short: compass(circularMean(dirs)),
    precip_in: isNum(p) ? round(mmToIn(p), 2) : null,
    sample_count: rows.length,
  };
}

