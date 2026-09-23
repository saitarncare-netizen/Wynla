// NRCS SNOTEL via the AWDB REST API (Western US + Alaska, public domain,
// no key). Verified live 2026-09-23:
//   GET https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/stations?stationTriplets=*:UT:SNTL&activeOnly=true
//     → [{ stationTriplet: "1308:UT:SNTL", name: "Atwater", latitude, longitude, elevation (ft), dataTimeZone }]
//     (the documented min/maxLatitude filters are ignored by the server, so we filter client-side)
//   GET .../v1/data?stationTriplets=1308:UT:SNTL&elements=SNWD,WTEQ,TMAX,TMIN,TAVG,PRCP&duration=DAILY&beginDate=...&endDate=...&periodRef=END
//     → [{ stationTriplet, data: [{ stationElement: { elementCode, storedUnitCode }, values: [{ date, value }] }] }]
//   Units: SNWD/WTEQ/PRCP in inches, temps in °F (storedUnitCode confirms).
//   Hourly data exists for many sites but was empty for the sampled
//   station, so the daily series is the dependable source.

import { fetchJson } from "./http";
import { haversineKm, isNum, round } from "./units";

const AWDB_BASE = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";
const JSON_HEADERS = { Accept: "application/json" };

/** States with SNOTEL coverage. Everything else skips AWDB entirely. */
export const SNOTEL_STATES = new Set([
  "AK", "AZ", "CA", "CO", "ID", "MT", "NM", "NV", "OR", "SD", "UT", "WA", "WY",
]);

export type SnotelStation = {
  triplet: string;
  name: string | null;
  lat: number;
  lon: number;
  elevation_ft: number | null;
};

type StationMeta = {
  stationTriplet?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
};

export async function listSnotelStations(state: string): Promise<SnotelStation[]> {
  if (!SNOTEL_STATES.has(state)) return [];
  const p = new URLSearchParams({
    stationTriplets: `*:${state}:SNTL`,
    activeOnly: "true",
    returnForecastPointMetadata: "false",
    returnReservoirMetadata: "false",
    returnStationElements: "false",
  });
  const j = await fetchJson<StationMeta[]>(`${AWDB_BASE}/stations?${p}`, {
    headers: JSON_HEADERS,
    timeoutMs: 25_000,
  });
  return (Array.isArray(j) ? j : [])
    .filter((s) => s.stationTriplet && isNum(s.latitude) && isNum(s.longitude))
    .map((s) => ({
      triplet: s.stationTriplet!,
      name: s.name ?? null,
      lat: s.latitude!,
      lon: s.longitude!,
      elevation_ft: isNum(s.elevation) ? Math.round(s.elevation) : null,
    }));
}

/**
 * Nearest SNOTEL site that plausibly shares the resort's snowpack:
 * within `maxKm` and within `maxElevDeltaFt` of the resort's mid-mountain
 * elevation (the ±300 m rule from the data research).
 */
export function pickSnotel(
  stations: SnotelStation[],
  resort: { lat: number; lon: number; midElevationFt: number | null },
  maxKm = 15,
  maxElevDeltaFt = 985,
): { station: SnotelStation; distance_km: number } | null {
  let best: { station: SnotelStation; distance_km: number } | null = null;
  for (const s of stations) {
    const d = haversineKm(resort.lat, resort.lon, s.lat, s.lon);
    if (d > maxKm) continue;
    if (
      isNum(resort.midElevationFt) &&
      isNum(s.elevation_ft) &&
      Math.abs(s.elevation_ft - resort.midElevationFt) > maxElevDeltaFt
    ) {
      continue;
    }
    if (!best || d < best.distance_km) best = { station: s, distance_km: round(d, 1) };
  }
  return best;
}

type DataResponse = Array<{
  stationTriplet?: string;
  data?: Array<{
    stationElement?: { elementCode?: string; storedUnitCode?: string };
    values?: Array<{ date?: string; value?: number | null }>;
  }>;
}>;

export type SnotelDaily = {
  date: string;
  snow_depth_in: number | null;
  swe_in: number | null;
  temp_max_f: number | null;
  temp_min_f: number | null;
  temp_avg_f: number | null;
  precip_in: number | null;
};

/** Daily series (oldest → newest) for the last `days` days. */
export async function fetchSnotelDaily(
  triplet: string,
  days = 4,
  now: Date = new Date(),
): Promise<SnotelDaily[]> {
  const end = now.toISOString().slice(0, 10);
  const begin = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  const p = new URLSearchParams({
    stationTriplets: triplet,
    elements: "SNWD,WTEQ,TMAX,TMIN,TAVG,PRCP",
    duration: "DAILY",
    beginDate: begin,
    endDate: end,
    periodRef: "END",
  });
  const j = await fetchJson<DataResponse>(`${AWDB_BASE}/data?${p}`, {
    headers: JSON_HEADERS,
    timeoutMs: 25_000,
  });
  return parseSnotelDaily(j);
}

export function parseSnotelDaily(j: DataResponse): SnotelDaily[] {
  const byDate = new Map<string, SnotelDaily>();
  const row = (date: string) => {
    let r = byDate.get(date);
    if (!r) {
      r = {
        date,
        snow_depth_in: null,
        swe_in: null,
        temp_max_f: null,
        temp_min_f: null,
        temp_avg_f: null,
        precip_in: null,
      };
      byDate.set(date, r);
    }
    return r;
  };
  for (const station of Array.isArray(j) ? j : []) {
    for (const series of station.data ?? []) {
      const code = series.stationElement?.elementCode;
      for (const v of series.values ?? []) {
        if (!v.date || !isNum(v.value)) continue;
        const r = row(v.date.slice(0, 10));
        switch (code) {
          case "SNWD":
            r.snow_depth_in = round(v.value, 1);
            break;
          case "WTEQ":
            r.swe_in = round(v.value, 2);
            break;
          case "TMAX":
            r.temp_max_f = Math.round(v.value);
            break;
          case "TMIN":
            r.temp_min_f = Math.round(v.value);
            break;
          case "TAVG":
            r.temp_avg_f = Math.round(v.value);
            break;
          case "PRCP":
            r.precip_in = round(v.value, 2);
            break;
          default:
            break;
        }
      }
    }
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
