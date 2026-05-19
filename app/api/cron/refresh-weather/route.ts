// Daily weather refresh, invoked by Vercel Cron (see vercel.json) at
// 12:00 UTC = 7am EST = 4am PST. Vercel signs cron requests with a
// header that we verify so anyone hitting this URL by accident /
// maliciously gets a 401 instead of triggering 451 outbound API calls.
//
// The actual fetch logic lives in scripts/fetch-resort-weather.mjs and
// is duplicated here as a server-side function. We don't import the
// .mjs script directly because Next.js' build pipeline doesn't reach
// into scripts/. Long-term these can share a lib/ helper if the script
// becomes runtime-shaped.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — comfortable for 451 resorts × 8 concurrency.

const NWS_HEADERS = {
  "User-Agent": "Wynla/1.0 (https://ridewise-rcko.vercel.app)",
  Accept: "application/geo+json",
};

const CONCURRENCY = 8;

type Resort = {
  id: number;
  latitude: number | string;
  longitude: number | string;
};
type CacheRow = {
  resort_id: number;
  nws_grid_office: string | null;
  nws_grid_x: number | null;
  nws_grid_y: number | null;
};

function compass(deg: number | null): string | null {
  if (deg == null || !Number.isFinite(deg)) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

async function fetchJson<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function getGridpoint(
  lat: number,
  lng: number,
  cached: CacheRow | undefined,
): Promise<{ office: string; x: number; y: number }> {
  if (
    cached?.nws_grid_office &&
    cached?.nws_grid_x != null &&
    cached?.nws_grid_y != null
  ) {
    return { office: cached.nws_grid_office, x: cached.nws_grid_x, y: cached.nws_grid_y };
  }
  const j = await fetchJson<{
    properties?: { gridId?: string; gridX?: number; gridY?: number };
  }>(`https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`, {
    headers: NWS_HEADERS,
  });
  const props = j?.properties;
  if (!props?.gridId || props.gridX == null || props.gridY == null) {
    throw new Error("no gridpoint");
  }
  return { office: props.gridId, x: props.gridX, y: props.gridY };
}

type NwsPeriod = {
  isDaytime: boolean;
  temperature: number;
  shortForecast: string;
  detailedForecast: string;
  startTime?: string;
  windSpeed?: string;
  windDirection?: string;
  probabilityOfPrecipitation?: { value: number | null };
};
type NwsForecast = {
  properties?: { periods?: NwsPeriod[] };
};

function sumSnowInches(strings: (string | undefined)[]): number {
  let total = 0;
  for (const s of strings) {
    if (!s) continue;
    const re = /(\d+(?:\.\d+)?)\s*(?:to\s+(\d+(?:\.\d+)?)\s+)?inch(?:es)?\s+of\s+(?:new\s+)?snow/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const lo = parseFloat(m[1]);
      const hi = m[2] ? parseFloat(m[2]) : lo;
      total += (lo + hi) / 2;
    }
  }
  return Math.round(total * 10) / 10;
}

function parseNws(forecast: NwsForecast) {
  const periods = forecast?.properties?.periods ?? [];
  if (periods.length === 0) return null;
  const today = periods.find((p) => p.isDaytime) ?? periods[0];
  const tonight = periods.find((p) => !p.isDaytime) ?? null;
  const snow24 = sumSnowInches([today.detailedForecast, tonight?.detailedForecast]);
  const next2 = periods.slice(2, 4).map((p) => p.detailedForecast);
  const snow48 = snow24 + sumSnowInches(next2);

  // 7-day rollup grouped by calendar date.
  const byDate = new Map<string, { day?: NwsPeriod; night?: NwsPeriod }>();
  for (const p of periods) {
    const date = p.startTime?.slice(0, 10);
    if (!date) continue;
    const slot = byDate.get(date) ?? {};
    if (p.isDaytime) slot.day = p;
    else slot.night = p;
    byDate.set(date, slot);
  }
  const forecastDays = Array.from(byDate.entries()).slice(0, 7).map(([date, slot]) => {
    const primary = slot.day ?? slot.night;
    const snow = sumSnowInches([slot.day?.detailedForecast, slot.night?.detailedForecast]);
    return {
      date,
      weekday: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      temp_high_f: slot.day?.temperature ?? primary?.temperature ?? null,
      temp_low_f: slot.night?.temperature ?? null,
      conditions_short: primary?.shortForecast ?? null,
      snow_in: snow || 0,
      precip_chance: primary?.probabilityOfPrecipitation?.value ?? null,
      wind_short: primary?.windSpeed ?? null,
      wind_dir_short: primary?.windDirection ?? null,
    };
  });

  return {
    temp_high_f: today.isDaytime ? today.temperature : tonight?.temperature ?? null,
    temp_low_f: today.isDaytime ? tonight?.temperature ?? null : today.temperature,
    conditions_short: today.shortForecast ?? null,
    conditions_long: today.detailedForecast ?? null,
    precip_chance: today.probabilityOfPrecipitation?.value ?? null,
    snow_24h_in: snow24 || null,
    snow_48h_in: snow48 || null,
    forecast_json: forecastDays,
  };
}

type OpenMeteo = {
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    weathercode?: (number | null)[];
    snowfall_sum?: (number | null)[];
    rain_sum?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    wind_direction_10m_dominant?: (number | null)[];
  };
};
function parseMeteo(j: OpenMeteo) {
  const cur = j?.current;
  if (!cur) return {};
  const dir = typeof cur.wind_direction_10m === "number" ? Math.round(cur.wind_direction_10m) : null;
  return {
    wind_mph_avg: typeof cur.wind_speed_10m === "number" ? Math.round(cur.wind_speed_10m) : null,
    wind_mph_gust: typeof cur.wind_gusts_10m === "number" ? Math.round(cur.wind_gusts_10m) : null,
    wind_dir_deg: dir,
    wind_dir_short: compass(dir),
  };
}

// Inaugural Season 2026 — Snow Surface Forecast support.
// Extract today's rain + total precip from Open-Meteo's daily array
// (NWS narrative doesn't expose these as clean numbers). Returns null
// when the daily payload is missing or today isn't represented.
function todaysPrecipFromMeteo(
  j: OpenMeteo,
): { rain_24h_in: number | null; precip_24h_in: number | null } {
  const d = j?.daily;
  if (!d?.time?.length) return { rain_24h_in: null, precip_24h_in: null };
  // Day index 0 in Open-Meteo's daily window is "today" (timezone=auto
  // is set in the request URL, so this is local-resort today, not UTC).
  const rain = d.rain_sum?.[0];
  const precip = d.precipitation_sum?.[0];
  return {
    rain_24h_in: typeof rain === "number" ? Math.round(rain * 100) / 100 : null,
    precip_24h_in: typeof precip === "number" ? Math.round(precip * 100) / 100 : null,
  };
}

// WMO weather codes → short human label. Maps Open-Meteo's `weathercode`
// numeric output into the same short-text shape NWS returns, so the
// forecast_json rows stay uniform across the day-1-7 (NWS) and day-8-10
// (Open-Meteo) halves of the strip.
function wmoToShort(code: number | null | undefined): string | null {
  if (code == null) return null;
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return null;
}

// Convert Open-Meteo daily output to our forecast_json shape — same
// keys as parseNws's forecastDays so the frontend doesn't know or care
// where each day's data came from.
function meteoToForecastDays(j: OpenMeteo) {
  const d = j?.daily;
  if (!d?.time) return [];
  return d.time.map((date, i) => {
    const dirDeg = d.wind_direction_10m_dominant?.[i] ?? null;
    return {
      date,
      weekday: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      temp_high_f: d.temperature_2m_max?.[i] != null ? Math.round(d.temperature_2m_max[i]!) : null,
      temp_low_f: d.temperature_2m_min?.[i] != null ? Math.round(d.temperature_2m_min[i]!) : null,
      conditions_short: wmoToShort(d.weathercode?.[i]),
      snow_in: d.snowfall_sum?.[i] != null ? Math.round(d.snowfall_sum[i]! * 10) / 10 : 0,
      precip_chance: d.precipitation_probability_max?.[i] ?? null,
      wind_short: d.wind_speed_10m_max?.[i] != null ? `${Math.round(d.wind_speed_10m_max[i]!)} mph` : null,
      wind_dir_short: compass(dirDeg != null ? Math.round(dirDeg) : null),
    };
  });
}

// Merge NWS days 1-7 with Open-Meteo days 8-10. Prefer NWS where both
// have data for the same date (NWS is more accurate for the US window
// it covers). Tail-fill from Open-Meteo for dates NWS doesn't reach.
function mergeForecasts(
  nws: ReturnType<typeof parseNws>,
  meteoDays: ReturnType<typeof meteoToForecastDays>,
): ReturnType<typeof parseNws> {
  if (!nws) return nws;
  if (!meteoDays.length) return nws;
  const seen = new Set(nws.forecast_json.map((d) => d.date));
  const tail = meteoDays.filter((d) => !seen.has(d.date));
  const combined = [...nws.forecast_json, ...tail].slice(0, 10);
  return { ...nws, forecast_json: combined };
}

async function refreshOne(resort: Resort, cached: CacheRow | undefined) {
  const lat = Number(resort.latitude);
  const lng = Number(resort.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { resort_id: resort.id, fetch_error: "bad coords", fetch_source: "failed" };
  }
  try {
    const grid = await getGridpoint(lat, lng, cached);
    // Single combined Open-Meteo call: `current` for wind + `daily` for
    // the 10-day forecast. NWS still drives days 1-7 (US-tuned); Open-
    // Meteo's daily array is only used to tail-fill days 8-10 where NWS
    // simply doesn't reach.
    const meteoUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,snowfall_sum,rain_sum,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant` +
      `&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph&timezone=auto&forecast_days=10`;
    const [nws, meteo] = await Promise.all([
      fetchJson<NwsForecast>(
        `https://api.weather.gov/gridpoints/${grid.office}/${grid.x},${grid.y}/forecast`,
        { headers: NWS_HEADERS },
      ).catch((e) => ({ error: String(e) }) as { error: string }),
      fetchJson<OpenMeteo>(meteoUrl).catch((e) => ({ error: String(e) }) as { error: string }),
    ]);
    const nwsParsed = "error" in nws ? null : parseNws(nws);
    const meteoParsed = "error" in meteo ? {} : parseMeteo(meteo);
    const meteoDays = "error" in meteo ? [] : meteoToForecastDays(meteo);
    const merged = nwsParsed ? mergeForecasts(nwsParsed, meteoDays) : null;
    // Inaugural Season — today's rain + total precip for the
    // weather_history daily snapshot. Pulled from Open-Meteo only;
    // NWS narrative doesn't expose these as clean numbers.
    const todaysPrecip =
      "error" in meteo
        ? { rain_24h_in: null, precip_24h_in: null }
        : todaysPrecipFromMeteo(meteo);
    const errs = [
      "error" in nws ? `nws:${nws.error.slice(0, 80)}` : null,
      "error" in meteo ? `meteo:${meteo.error.slice(0, 80)}` : null,
    ].filter(Boolean).join("; ");
    return {
      resort_id: resort.id,
      nws_grid_office: grid.office,
      nws_grid_x: grid.x,
      nws_grid_y: grid.y,
      ...(merged ?? {}),
      ...meteoParsed,
      // Side-channel fields for weather_history. Picked off in the
      // GET handler below and stripped before the weather_cache upsert.
      __rain_24h_in: todaysPrecip.rain_24h_in,
      __precip_24h_in: todaysPrecip.precip_24h_in,
      forecast_for_date: new Date().toISOString().slice(0, 10),
      fetched_at: new Date().toISOString(),
      fetch_source: nwsParsed && meteoDays.length ? "nws+meteo10d" : nwsParsed ? "nws-only" : "partial",
      fetch_error: errs || null,
    };
  } catch (e) {
    return {
      resort_id: resort.id,
      __rain_24h_in: null,
      __precip_24h_in: null,
      fetched_at: new Date().toISOString(),
      fetch_source: "failed",
      fetch_error: String((e as Error)?.message ?? e).slice(0, 240),
    };
  }
}

export async function GET(request: Request) {
  // Vercel Cron sends "Authorization: Bearer ${CRON_SECRET}".
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, reason: "missing supabase env" }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: resortsData, error } = await supabase
    .from("resorts")
    .select("id, latitude, longitude")
    .eq("active", true);
  if (error || !resortsData) {
    return NextResponse.json({ ok: false, reason: error?.message ?? "no resorts" }, { status: 500 });
  }
  const resorts: Resort[] = resortsData as Resort[];

  const { data: existing } = await supabase
    .from("weather_cache")
    .select("resort_id, nws_grid_office, nws_grid_x, nws_grid_y");
  const cacheBy = new Map(((existing as CacheRow[] | null) ?? []).map((c) => [c.resort_id, c]));

  const rows: Record<string, unknown>[] = new Array(resorts.length);
  let i = 0;
  async function worker() {
    while (i < resorts.length) {
      const idx = i++;
      rows[idx] = await refreshOne(resorts[idx], cacheBy.get(resorts[idx].id));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Build the parallel weather_history snapshot rows BEFORE we strip
  // the __side-channel fields from the weather_cache payload. One row
  // per resort per UTC calendar day.
  const today = new Date().toISOString().slice(0, 10);
  type HistoryRow = {
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
  const historyRows: HistoryRow[] = rows
    .filter((r) => r.fetch_source !== "failed" && typeof r.resort_id === "number")
    .map((r) => ({
      resort_id: r.resort_id as number,
      observed_date: today,
      temp_high_f: (r.temp_high_f as number | null) ?? null,
      temp_low_f: (r.temp_low_f as number | null) ?? null,
      snow_24h_in: (r.snow_24h_in as number | null) ?? null,
      rain_24h_in: (r.__rain_24h_in as number | null) ?? null,
      precip_24h_in: (r.__precip_24h_in as number | null) ?? null,
      wind_mph_avg: (r.wind_mph_avg as number | null) ?? null,
      wind_dir_short: (r.wind_dir_short as string | null) ?? null,
      conditions_short: (r.conditions_short as string | null) ?? null,
    }));

  // Strip the side-channel fields before weather_cache upsert — the
  // table doesn't have these columns and Supabase will reject the row.
  const cacheRows = rows.map((r) => {
    const { __rain_24h_in: _rain, __precip_24h_in: _precip, ...rest } = r;
    void _rain;
    void _precip;
    return rest;
  });

  // Upsert weather_cache in chunks (existing behaviour).
  const CHUNK = 100;
  let upsertErrors = 0;
  for (let off = 0; off < cacheRows.length; off += CHUNK) {
    const { error: upErr } = await supabase
      .from("weather_cache")
      .upsert(cacheRows.slice(off, off + CHUNK), { onConflict: "resort_id" });
    if (upErr) upsertErrors++;
  }

  // Upsert weather_history in chunks. Append-only conceptually;
  // UNIQUE (resort_id, observed_date) lets cron retries be idempotent.
  // Failure here is logged but doesn't fail the request — the surface
  // forecast quietly degrades to lower confidence rather than blocking
  // the daily weather refresh.
  let historyErrors = 0;
  for (let off = 0; off < historyRows.length; off += CHUNK) {
    const { error: histErr } = await supabase
      .from("weather_history")
      .upsert(historyRows.slice(off, off + CHUNK), {
        onConflict: "resort_id,observed_date",
      });
    if (histErr) historyErrors++;
  }

  const ok = rows.filter((r) => r.fetch_source !== "failed").length;
  return NextResponse.json({
    ok: true,
    refreshed: ok,
    total: rows.length,
    upsertErrors,
    historyInserted: historyRows.length,
    historyErrors,
  });
}
