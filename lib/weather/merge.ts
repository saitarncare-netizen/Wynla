// Blend rules: turn the per-source parses into the v2 forecast_json,
// the legacy weather_cache scalar columns and the weather_history row.
//
// Headline policy (from the data-accuracy research):
//   - Days 1-7: NWS forecaster-edited quantitative grids are the
//     headline (snow, ice, QPF, temps, gusts). Open-Meteo fills what NWS
//     lacks (UV, summit snowfall, freezing level) and stands in when a
//     day's NWS layer is empty.
//   - Days 8-16: Open-Meteo only, flagged source: "open-meteo".
//   - Hourly: Open-Meteo at base and summit for the next 48 h.
//   - Current wind / temperature: a live station observation beats the
//     model; the model is used only when no station reported recently.
//   - weather_history (yesterday): measured > observed > modelled, with
//     the chosen source recorded per column so the UI and the classifier
//     can say which is which.

import type {
  ForecastDay,
  ForecastHour,
  ForecastJsonV2,
  ForecastSources,
  MeasuredSnow,
  SnotelObservation,
  SnotelRef,
  StationObservation,
  StationRef,
} from "./forecastJson";
import type { NwsDay, DailyObsSummary } from "./nws";
import type { OpenMeteoCurrent, OpenMeteoDay, OpenMeteoHour } from "./openMeteo";
import { shiftDate, weekdayShort } from "./time";
import { compass, isNum, meanOrNull, round, roundOrNull } from "./units";

export const OPEN_METEO_ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)";
export const NWS_ATTRIBUTION = "Forecast and observations from the US National Weather Service";
export const NOHRSC_ATTRIBUTION = "Measured snow from NOAA NOHRSC";
export const SNOTEL_ATTRIBUTION = "Snow depth from USDA NRCS SNOTEL";

/** Window that still counts as "current" for a station observation. */
export const OBS_FRESH_HOURS = 3;
const MAX_DAYS = 16;
const HOURLY_HORIZON_H = 48;

export type OpenMeteoParsed = {
  days: OpenMeteoDay[];
  hours: OpenMeteoHour[];
  current: OpenMeteoCurrent;
  timeZone: string | null;
  utcOffsetSeconds: number | null;
  elevationFt: number | null;
};

export type MergeInput = {
  now: Date;
  timeZone: string | null;
  today: string; // resort-local 'YYYY-MM-DD'
  nwsDays: NwsDay[];
  omBase: OpenMeteoParsed | null;
  omSummit: OpenMeteoParsed | null;
};

function windShort(mph: number | null): string | null {
  return isNum(mph) ? `${Math.round(mph)} mph` : null;
}

/** The 16-day strip. NWS headline where it has a usable day, else Open-Meteo. */
export function mergeDays(input: MergeInput): ForecastDay[] {
  const nwsByDate = new Map(input.nwsDays.map((d) => [d.date, d]));
  const baseByDate = new Map((input.omBase?.days ?? []).map((d) => [d.date, d]));
  const summitByDate = new Map((input.omSummit?.days ?? []).map((d) => [d.date, d]));
  const flByDate = new Map<string, number>();
  for (const h of input.omBase?.hours ?? []) {
    if (!isNum(h.freezing_level_ft)) continue;
    flByDate.set(h.local_date, Math.max(flByDate.get(h.local_date) ?? -Infinity, h.freezing_level_ft));
  }

  const out: ForecastDay[] = [];
  for (let i = 0; i < MAX_DAYS; i++) {
    const date = shiftDate(input.today, i);
    const nws = nwsByDate.get(date);
    const om = baseByDate.get(date);
    const summit = summitByDate.get(date);
    // A NWS day is usable when its accumulation layers cover at least
    // half the day; the strip's last day is usually a stub.
    const useNws = !!nws && nws.coverage >= 0.5;
    if (!useNws && !om) continue;
    const fl = flByDate.get(date);
    if (useNws && nws) {
      out.push({
        date,
        weekday: weekdayShort(date),
        temp_high_f: nws.temp_high_f ?? om?.temp_high_f ?? null,
        temp_low_f: nws.temp_low_f ?? om?.temp_low_f ?? null,
        conditions_short: nws.conditions_short ?? om?.conditions_short ?? null,
        snow_in: nws.snow_in ?? om?.snow_in ?? null,
        precip_chance: nws.precip_chance ?? om?.precip_chance ?? null,
        wind_short: windShort(nws.wind_mph_max ?? om?.wind_mph_max ?? null),
        wind_dir_short: compass(nws.wind_dir_deg ?? om?.wind_dir_deg),
        uv_index_max: om?.uv_index_max ?? null,
        snow_summit_in: summit?.snow_in ?? null,
        ice_in: nws.ice_in,
        qpf_in: nws.qpf_in,
        gust_mph: nws.gust_mph_max ?? om?.gust_mph_max ?? null,
        freezing_level_ft: isNum(fl) ? Math.round(fl) : null,
        source: "nws",
        nws_coverage: round(nws.coverage, 2),
      });
    } else if (om) {
      out.push({
        date,
        weekday: weekdayShort(date),
        temp_high_f: om.temp_high_f,
        temp_low_f: om.temp_low_f,
        conditions_short: om.conditions_short,
        snow_in: om.snow_in,
        precip_chance: om.precip_chance,
        wind_short: windShort(om.wind_mph_max),
        wind_dir_short: compass(om.wind_dir_deg),
        uv_index_max: om.uv_index_max,
        snow_summit_in: summit?.snow_in ?? null,
        ice_in: null,
        qpf_in: om.precip_in,
        gust_mph: om.gust_mph_max,
        freezing_level_ft: isNum(fl) ? Math.round(fl) : null,
        source: "open-meteo",
      });
    }
  }
  return out;
}

/** Next 48 h hourly at base, with summit temperature/snow alongside. */
export function mergeHourly(input: MergeInput): ForecastHour[] {
  const base = input.omBase?.hours ?? [];
  if (base.length === 0) return [];
  const summitByTime = new Map((input.omSummit?.hours ?? []).map((h) => [h.time, h]));
  const from = input.now.getTime() - 3_600_000;
  const to = input.now.getTime() + HOURLY_HORIZON_H * 3_600_000;
  return base
    .filter((h) => {
      const t = Date.parse(h.time);
      return t >= from && t <= to;
    })
    .map((h) => {
      const s = summitByTime.get(h.time);
      return {
        time: h.time,
        temp_f: h.temp_f,
        temp_summit_f: s?.temp_f ?? null,
        snow_in: h.snow_in,
        snow_summit_in: s?.snow_in ?? null,
        rain_in: h.rain_in,
        wind_mph: h.wind_mph,
        gust_mph: h.gust_mph,
        wind_dir: h.wind_dir,
        freezing_level_ft: h.freezing_level_ft,
        conditions_short: h.conditions_short,
      };
    });
}

export type CurrentWind = {
  wind_mph_avg: number | null;
  wind_mph_gust: number | null;
  wind_dir_deg: number | null;
  wind_dir_short: string | null;
  source: "station" | "open-meteo" | null;
};

/** Live station wind when fresh, else the model's current wind. */
export function pickCurrentWind(
  primary: StationObservation | null,
  omCurrent: OpenMeteoCurrent | null,
  now: Date,
): CurrentWind {
  if (primary?.observed_at) {
    const ageH = (now.getTime() - Date.parse(primary.observed_at)) / 3_600_000;
    if (ageH <= OBS_FRESH_HOURS && (isNum(primary.wind_mph) || isNum(primary.gust_mph))) {
      return {
        wind_mph_avg: primary.wind_mph,
        wind_mph_gust: primary.gust_mph,
        wind_dir_deg: null,
        wind_dir_short: primary.wind_dir,
        source: "station",
      };
    }
  }
  if (omCurrent && (isNum(omCurrent.wind_mph) || isNum(omCurrent.gust_mph))) {
    return {
      wind_mph_avg: omCurrent.wind_mph,
      wind_mph_gust: omCurrent.gust_mph,
      wind_dir_deg: omCurrent.wind_dir_deg,
      wind_dir_short: compass(omCurrent.wind_dir_deg),
      source: "open-meteo",
    };
  }
  return { wind_mph_avg: null, wind_mph_gust: null, wind_dir_deg: null, wind_dir_short: null, source: null };
}

/** One readable sentence for weather_cache.conditions_long. */
export function describeToday(day: ForecastDay | undefined, wind: CurrentWind): string | null {
  if (!day) return null;
  const parts: string[] = [];
  if (day.conditions_short) parts.push(`${day.conditions_short}.`);
  if (isNum(day.snow_in) && day.snow_in >= 0.5) {
    const summit =
      isNum(day.snow_summit_in) && day.snow_summit_in > day.snow_in
        ? `, up to ${round(day.snow_summit_in, 1)} in at the summit`
        : "";
    parts.push(`Forecast snowfall ${round(day.snow_in, 1)} in at the base${summit}.`);
  }
  if (isNum(day.ice_in) && day.ice_in >= 0.05) parts.push(`Ice accumulation ${round(day.ice_in, 2)} in.`);
  if (isNum(day.temp_high_f) && isNum(day.temp_low_f)) {
    parts.push(`High ${day.temp_high_f}°F, low ${day.temp_low_f}°F.`);
  } else if (isNum(day.temp_high_f)) {
    parts.push(`High ${day.temp_high_f}°F.`);
  }
  if (isNum(wind.wind_mph_avg)) {
    const gust = isNum(wind.wind_mph_gust) && wind.wind_mph_gust > wind.wind_mph_avg ? `, gusts to ${wind.wind_mph_gust} mph` : "";
    const dir = wind.wind_dir_short ? ` from the ${wind.wind_dir_short}` : "";
    parts.push(`Wind ${wind.wind_mph_avg} mph${dir}${gust}.`);
  } else if (isNum(day.gust_mph) && day.gust_mph >= 25) {
    parts.push(`Gusts to ${day.gust_mph} mph.`);
  }
  if (isNum(day.freezing_level_ft)) parts.push(`Freezing level ${day.freezing_level_ft.toLocaleString("en-US")} ft.`);
  return parts.length ? parts.join(" ") : null;
}

// ---------- weather_history (observed / measured, for yesterday) ----------

/** Column shape of weather_history, unchanged from the original cron. */
export type HistoryRow = {
  resort_id: number;
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | null;
  rain_24h_in: number | null;
  precip_24h_in: number | null;
  wind_mph_avg: number | null;
  wind_dir_short: string | null;
  conditions_short: string | null;
};

export type HistoryInputs = {
  resortId: number;
  date: string; // yesterday, resort-local
  sfav2In: number | null;
  /** End of the analysis window (ISO UTC) — recorded in the source label
   *  because the 24 h window ends at 00Z/12Z, not at local midnight. */
  sfav2ValidEnd?: string | null;
  snotel: SnotelObservation | null;
  stationDay: DailyObsSummary | null;
  /** The station behind `stationDay` (id + elevation go into the label). */
  station?: { id: string; elevation_ft: number | null } | null;
  /** Open-Meteo base daily row for `date` (past_days=1 gives it). */
  omDay: OpenMeteoDay | null;
  /** Open-Meteo base hours on `date`, for a modelled wind average. */
  omHours: OpenMeteoHour[];
};

/**
 * Build yesterday's history row from the best available evidence and
 * record the provenance of every column. Returns null when there is
 * nothing at all to write (better a gap than a row of nulls that the
 * classifier would read as "calm and dry").
 */
export function buildHistoryRow(
  i: HistoryInputs,
): { row: HistoryRow; sources: Record<string, string> } | null {
  const src: Record<string, string> = {};
  const pick = <T>(candidates: Array<[string, T | null | undefined]>): T | null => {
    for (const c of candidates) {
      const v = c[1];
      if (v !== null && v !== undefined) return v;
    }
    return null;
  };
  const label = <T>(col: string, candidates: Array<[string, T | null | undefined]>): T | null => {
    for (const [l, v] of candidates) {
      if (v !== null && v !== undefined) {
        src[col] = l;
        return v;
      }
    }
    return null;
  };

  const snotelIsForDate = i.snotel?.observed_date === i.date ? i.snotel : null;
  // Labels carry the site and its elevation so a reader of the row can
  // tell a summit reading from a base one.
  const snotelLabel = snotelIsForDate
    ? `snotel:${snotelIsForDate.triplet}${elevationSuffix(snotelIsForDate.elevation_ft)}`
    : "snotel";
  const stationLabel = i.station ? `station:${i.station.id}${elevationSuffix(i.station.elevation_ft)}` : "station";
  const analysisLabel = i.sfav2ValidEnd
    ? `nohrsc-analysis:24h-to-${i.sfav2ValidEnd.replace(/:\d\d(?:\.\d+)?Z$/, "Z")}`
    : "nohrsc-analysis";
  const temp_high_f = label<number>("temp_high_f", [
    [snotelLabel, snotelIsForDate?.temp_max_f],
    [stationLabel, i.stationDay?.temp_high_f],
    ["open-meteo", i.omDay?.temp_high_f],
  ]);
  const temp_low_f = label<number>("temp_low_f", [
    [snotelLabel, snotelIsForDate?.temp_min_f],
    [stationLabel, i.stationDay?.temp_low_f],
    ["open-meteo", i.omDay?.temp_low_f],
  ]);
  // Depth change is a floor on snowfall (settlement only lowers it), so
  // it never beats the analysis but does beat the model.
  const snotelDelta =
    isNum(snotelIsForDate?.depth_change_in) && snotelIsForDate!.depth_change_in! > 0
      ? round(snotelIsForDate!.depth_change_in!, 1)
      : null;
  const snow_24h_in = label<number>("snow_24h_in", [
    [analysisLabel, i.sfav2In],
    [`snotel-depth-change:${snotelIsForDate?.triplet ?? "?"}`, snotelDelta],
    ["open-meteo", i.omDay?.snow_in],
  ]);
  const rain_24h_in = label<number>("rain_24h_in", [["open-meteo", i.omDay?.rain_in]]);
  const precip_24h_in = label<number>("precip_24h_in", [
    [snotelLabel, snotelIsForDate?.precip_in],
    [stationLabel, i.stationDay && i.stationDay.sample_count >= 12 ? i.stationDay.precip_in : null],
    ["open-meteo", i.omDay?.precip_in],
  ]);
  const omWind = meanOrNull(i.omHours.map((h) => h.wind_mph));
  const wind_mph_avg = label<number>("wind_mph_avg", [
    [stationLabel, i.stationDay?.wind_mph_avg],
    ["open-meteo", isNum(omWind) ? Math.round(omWind) : null],
  ]);
  const wind_dir_short = pick<string>([
    [stationLabel, i.stationDay?.wind_dir_short],
    ["open-meteo", compass(i.omDay?.wind_dir_deg)],
  ]);
  const conditions_short = pick<string>([["open-meteo", i.omDay?.conditions_short]]);

  const anything =
    temp_high_f !== null || temp_low_f !== null || snow_24h_in !== null || precip_24h_in !== null;
  if (!anything) return null;
  return {
    row: {
      resort_id: i.resortId,
      observed_date: i.date,
      temp_high_f,
      temp_low_f,
      snow_24h_in: roundOrNull(snow_24h_in, 1),
      rain_24h_in: roundOrNull(rain_24h_in, 2),
      precip_24h_in: roundOrNull(precip_24h_in, 2),
      wind_mph_avg,
      wind_dir_short,
      conditions_short,
    },
    sources: src,
  };
}

function elevationSuffix(ft: number | null | undefined): string {
  return isNum(ft) ? `@${Math.round(ft)}ft` : "";
}

// ---------- assembling the v2 document ----------

export type AssembleInput = {
  now: Date;
  days: ForecastDay[];
  hourly: ForecastHour[];
  obs: StationObservation[];
  obsFetchedAt: string | null;
  measured: MeasuredSnow | null;
  stations: { nws: StationRef[]; snotel: SnotelRef[]; mapped_at: string | null };
  sources: ForecastSources;
  freezingLevelFt: number | null;
};

export function assembleForecastJson(a: AssembleInput): ForecastJsonV2 {
  return {
    v: 2,
    updated_at: a.now.toISOString(),
    days: a.days,
    hourly: a.hourly,
    obs: { primary: a.obs[0] ?? null, stations: a.obs, fetched_at: a.obsFetchedAt },
    measured: a.measured,
    stations: a.stations,
    sources: a.sources,
    freezing_level_ft: a.freezingLevelFt,
  };
}

/** Sum of the last `n` daily snow values (newest first list), null when none. */
export function sumRecentSnow(values: Array<number | null | undefined>, n: number): number | null {
  const xs = values.slice(0, n).filter(isNum);
  return xs.length ? round(xs.reduce((s, v) => s + v, 0), 1) : null;
}
