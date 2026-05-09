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

type NwsForecast = {
  properties?: {
    periods?: {
      isDaytime: boolean;
      temperature: number;
      shortForecast: string;
      detailedForecast: string;
      probabilityOfPrecipitation?: { value: number | null };
    }[];
  };
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
  return {
    temp_high_f: today.isDaytime ? today.temperature : tonight?.temperature ?? null,
    temp_low_f: today.isDaytime ? tonight?.temperature ?? null : today.temperature,
    conditions_short: today.shortForecast ?? null,
    conditions_long: today.detailedForecast ?? null,
    precip_chance: today.probabilityOfPrecipitation?.value ?? null,
    snow_24h_in: snow24 || null,
    snow_48h_in: snow48 || null,
  };
}

type OpenMeteo = {
  current?: {
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
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

async function refreshOne(resort: Resort, cached: CacheRow | undefined) {
  const lat = Number(resort.latitude);
  const lng = Number(resort.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { resort_id: resort.id, fetch_error: "bad coords", fetch_source: "failed" };
  }
  try {
    const grid = await getGridpoint(lat, lng, cached);
    const [nws, meteo] = await Promise.all([
      fetchJson<NwsForecast>(
        `https://api.weather.gov/gridpoints/${grid.office}/${grid.x},${grid.y}/forecast`,
        { headers: NWS_HEADERS },
      ).catch((e) => ({ error: String(e) }) as { error: string }),
      fetchJson<OpenMeteo>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph&timezone=auto`,
      ).catch((e) => ({ error: String(e) }) as { error: string }),
    ]);
    const nwsParsed = "error" in nws ? null : parseNws(nws);
    const meteoParsed = "error" in meteo ? {} : parseMeteo(meteo);
    const errs = [
      "error" in nws ? `nws:${nws.error.slice(0, 80)}` : null,
      "error" in meteo ? `meteo:${meteo.error.slice(0, 80)}` : null,
    ].filter(Boolean).join("; ");
    return {
      resort_id: resort.id,
      nws_grid_office: grid.office,
      nws_grid_x: grid.x,
      nws_grid_y: grid.y,
      ...(nwsParsed ?? {}),
      ...meteoParsed,
      forecast_for_date: new Date().toISOString().slice(0, 10),
      fetched_at: new Date().toISOString(),
      fetch_source: nwsParsed ? "nws+meteo" : "partial",
      fetch_error: errs || null,
    };
  } catch (e) {
    return {
      resort_id: resort.id,
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

  // Upsert in chunks
  const CHUNK = 100;
  let upsertErrors = 0;
  for (let off = 0; off < rows.length; off += CHUNK) {
    const { error: upErr } = await supabase
      .from("weather_cache")
      .upsert(rows.slice(off, off + CHUNK), { onConflict: "resort_id" });
    if (upErr) upsertErrors++;
  }
  const ok = rows.filter((r) => r.fetch_source !== "failed").length;
  return NextResponse.json({
    ok: true,
    refreshed: ok,
    total: rows.length,
    upsertErrors,
  });
}
