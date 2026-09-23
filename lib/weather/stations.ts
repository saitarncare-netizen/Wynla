// Station discovery: which weather stations describe a given resort.
//
// Mapping happens once per resort (cached in forecast_json.stations,
// re-done every 30 days or when every mapped station has gone silent).
// The selection rule from the data research: within ~15 km, prefer the
// highest station, but it must actually be reporting — the NWS list
// includes thousands of COOP/CoCoRaHS sites that never publish
// automated observations, so every candidate is checked live before it
// is accepted.

import { listSnotelStations, pickSnotel, SNOTEL_STATES, type SnotelStation } from "./awdb";
import type { SnotelRef, StationRef } from "./forecastJson";
import {
  fetchObservations,
  listStationsForGrid,
  listStationsForState,
  mergeObservations,
  type NwsPoint,
  type NwsStation,
} from "./nws";
import { haversineKm, isNum, round } from "./units";

export const STATION_MAX_KM = 15;
export const STATION_MAP_TTL_DAYS = 30;
const LIVE_WITHIN_HOURS = 6;
const MAX_CANDIDATES_TO_PROBE = 6;
const MAX_STATIONS = 3;

export type ResortPoint = {
  lat: number;
  lon: number;
  state: string | null;
  baseElevationFt: number | null;
  summitElevationFt: number | null;
};

export function midElevationFt(r: ResortPoint): number | null {
  if (isNum(r.baseElevationFt) && isNum(r.summitElevationFt)) {
    return Math.round((r.baseElevationFt + r.summitElevationFt) / 2);
  }
  return r.summitElevationFt ?? r.baseElevationFt ?? null;
}

/** Rank candidates: inside the radius, highest first, nearest as tiebreak. */
export function rankCandidates(
  stations: NwsStation[],
  resort: ResortPoint,
  maxKm = STATION_MAX_KM,
): Array<NwsStation & { distance_km: number }> {
  return stations
    .map((s) => ({ ...s, distance_km: round(haversineKm(resort.lat, resort.lon, s.lat, s.lon), 1) }))
    .filter((s) => s.distance_km <= maxKm)
    .sort((a, b) => {
      const ea = a.elevation_ft ?? -1;
      const eb = b.elevation_ft ?? -1;
      if (eb !== ea) return eb - ea;
      return a.distance_km - b.distance_km;
    });
}

/** Per-run memo so 40 resorts in Colorado share one state listing. */
export class StationDirectory {
  private nwsByState = new Map<string, Promise<NwsStation[]>>();
  private snotelByState = new Map<string, Promise<SnotelStation[]>>();

  nwsStations(state: string): Promise<NwsStation[]> {
    let p = this.nwsByState.get(state);
    if (!p) {
      p = listStationsForState(state).catch(() => []);
      this.nwsByState.set(state, p);
    }
    return p;
  }

  snotelStations(state: string): Promise<SnotelStation[]> {
    if (!SNOTEL_STATES.has(state)) return Promise.resolve([]);
    let p = this.snotelByState.get(state);
    if (!p) {
      p = listSnotelStations(state).catch((): SnotelStation[] => []);
      this.snotelByState.set(state, p);
    }
    return p;
  }
}

async function isLive(stationId: string, now: Date): Promise<boolean> {
  try {
    const obs = await fetchObservations(stationId, { limit: 3 });
    const merged = mergeObservations(obs);
    if (!merged?.observed_at) return false;
    const ageH = (now.getTime() - Date.parse(merged.observed_at)) / 3_600_000;
    return ageH <= LIVE_WITHIN_HOURS && (merged.temp_f !== null || merged.wind_mph !== null);
  } catch {
    return false;
  }
}

/**
 * Choose up to three live NWS stations for a resort. Order of the
 * returned list is the order of preference (index 0 = primary).
 */
export async function mapNwsStations(
  resort: ResortPoint,
  point: NwsPoint | null,
  dir: StationDirectory,
  now: Date = new Date(),
): Promise<StationRef[]> {
  const pool: NwsStation[] = resort.state ? await dir.nwsStations(resort.state) : [];
  let ranked = rankCandidates(pool, resort);
  if (ranked.length === 0 && point) {
    // Border resorts or states with a thin list: fall back to the
    // gridpoint's own (airport-heavy) station list at a wider radius.
    try {
      ranked = rankCandidates(await listStationsForGrid(point), resort, 40);
    } catch {
      ranked = [];
    }
  }
  const chosen: StationRef[] = [];
  for (const c of ranked.slice(0, MAX_CANDIDATES_TO_PROBE)) {
    if (chosen.length >= MAX_STATIONS) break;
    if (await isLive(c.id, now)) {
      chosen.push({
        id: c.id,
        name: c.name,
        elevation_ft: c.elevation_ft,
        distance_km: c.distance_km,
        lat: c.lat,
        lon: c.lon,
      });
    }
  }
  return chosen;
}

export async function mapSnotel(resort: ResortPoint, dir: StationDirectory): Promise<SnotelRef[]> {
  if (!resort.state || !SNOTEL_STATES.has(resort.state)) return [];
  const stations = await dir.snotelStations(resort.state);
  const pick = pickSnotel(stations, {
    lat: resort.lat,
    lon: resort.lon,
    midElevationFt: midElevationFt(resort),
  });
  if (!pick) return [];
  return [
    {
      triplet: pick.station.triplet,
      name: pick.station.name,
      elevation_ft: pick.station.elevation_ft,
      distance_km: pick.distance_km,
    },
  ];
}

/** True when the cached mapping is missing or older than the TTL. */
export function mappingIsStale(mappedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!mappedAt) return true;
  const t = Date.parse(mappedAt);
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t > STATION_MAP_TTL_DAYS * 86_400_000;
}
