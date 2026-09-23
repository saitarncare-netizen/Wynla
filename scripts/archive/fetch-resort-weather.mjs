// Daily refresh of weather_cache for every active resort.
//
//   Step 1: weather.gov "/points/{lat},{lng}" returns the gridpoint
//           identifier (forecast office + x/y) for the resort. We
//           cache it back into weather_cache so subsequent runs skip
//           this lookup.
//   Step 2: weather.gov "/gridpoints/{office}/{x},{y}/forecast" returns
//           today + future periods with high/low temps, conditions,
//           precip chance, and snowfall amounts. We pluck the
//           "today" period (or the next daytime period) plus tonight
//           for the snow rollup.
//   Step 3: Open-Meteo "current_weather" returns current wind speed +
//           direction. Free, generous limits, no key needed.
//
// Concurrency: 8 parallel workers — comfortably under weather.gov's
// soft 1-req/sec recommendation per IP and well below Open-Meteo's
// 10K/day allowance for one origin.
//
// Service-role auth: this script writes to weather_cache which has
// public-read RLS but no client-write policy. Writes therefore need
// SUPABASE_SERVICE_ROLE_KEY in the env (also wired into the Vercel
// env so the daily cron Edge Function can run the same logic).

import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Node doesn't auto-load .env.local the way Next.js does, so we
// shim a tiny loader here. Lines like `KEY=value` (and `KEY="value"`)
// land in process.env if not already set. Existing process.env values
// win so a CI env (Vercel) overrides what's on disk.
function loadDotEnv(path) {
  if (!fs.existsSync(path)) return;
  for (const raw of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(".env.local");
loadDotEnv(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const NWS_HEADERS = {
  // weather.gov requires a User-Agent identifying the app + contact.
  "User-Agent": "Wynla/1.0 (https://ridewise-rcko.vercel.app)",
  Accept: "application/geo+json",
};

const CONCURRENCY = 8;
const MM_PER_INCH = 25.4;

function compass(deg) {
  if (deg == null || !Number.isFinite(deg)) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

async function fetchJson(url, opts = {}) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} ${url}`);
  return r.json();
}

async function getGridpoint(lat, lng, cached) {
  if (cached?.nws_grid_office && cached?.nws_grid_x != null && cached?.nws_grid_y != null) {
    return { office: cached.nws_grid_office, x: cached.nws_grid_x, y: cached.nws_grid_y };
  }
  const j = await fetchJson(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
    { headers: NWS_HEADERS },
  );
  const props = j?.properties;
  if (!props?.gridId || props.gridX == null || props.gridY == null) {
    throw new Error("no gridpoint in /points response");
  }
  return { office: props.gridId, x: props.gridX, y: props.gridY };
}

async function getNwsForecast(grid) {
  const url = `https://api.weather.gov/gridpoints/${grid.office}/${grid.x},${grid.y}/forecast`;
  return fetchJson(url, { headers: NWS_HEADERS });
}

async function getOpenMeteoWind(lat, lng) {
  // Combined call: `current` for wind + `daily` for the 10-day forecast
  // (used to tail-fill NWS days 8-10). Same shape as the prod cron route.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant` +
    `&temperature_unit=fahrenheit&precipitation_unit=inch&wind_speed_unit=mph&timezone=auto&forecast_days=10`;
  return fetchJson(url);
}

function wmoToShort(code) {
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

function meteoToForecastDays(j) {
  const d = j?.daily;
  if (!d?.time) return [];
  return d.time.map((date, i) => {
    const dirDeg = d.wind_direction_10m_dominant?.[i] ?? null;
    return {
      date,
      weekday: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      temp_high_f: d.temperature_2m_max?.[i] != null ? Math.round(d.temperature_2m_max[i]) : null,
      temp_low_f: d.temperature_2m_min?.[i] != null ? Math.round(d.temperature_2m_min[i]) : null,
      conditions_short: wmoToShort(d.weathercode?.[i]),
      snow_in: d.snowfall_sum?.[i] != null ? Math.round(d.snowfall_sum[i] * 10) / 10 : 0,
      precip_chance: d.precipitation_probability_max?.[i] ?? null,
      wind_short: d.wind_speed_10m_max?.[i] != null ? `${Math.round(d.wind_speed_10m_max[i])} mph` : null,
      wind_dir_short: compass(dirDeg != null ? Math.round(dirDeg) : null),
    };
  });
}

function mergeForecasts(nws, meteoDays) {
  if (!nws) return nws;
  if (!meteoDays.length) return nws;
  const seen = new Set(nws.forecast_json.map((d) => d.date));
  const tail = meteoDays.filter((d) => !seen.has(d.date));
  const combined = [...nws.forecast_json, ...tail].slice(0, 10);
  return { ...nws, forecast_json: combined };
}

// Parse the NWS /forecast response into our cache row fields.
// Today's "headline" + a 7-day forecast_json array (one entry per day).
// weather.gov returns up to 14 periods (7 days × day/night); we
// aggregate adjacent day/night pairs into a single calendar-day entry.
function parseNwsForecast(forecast) {
  const periods = forecast?.properties?.periods ?? [];
  if (periods.length === 0) return null;
  const today = periods.find((p) => p.isDaytime) ?? periods[0];
  const tonight = periods.find((p) => !p.isDaytime) ?? null;

  const tempHighF = today.isDaytime ? today.temperature : tonight?.temperature ?? null;
  const tempLowF = today.isDaytime ? tonight?.temperature ?? null : today.temperature;

  const snow24 = sumSnowInches([today.detailedForecast, tonight?.detailedForecast]);
  const next2 = periods.slice(2, 4).map((p) => p?.detailedForecast ?? "");
  const snow48 = snow24 + sumSnowInches(next2);

  // 7-day rollup. Group periods by calendar date of startTime.
  const byDate = new Map();
  for (const p of periods) {
    const date = p.startTime?.slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, { day: null, night: null });
    const slot = byDate.get(date);
    if (p.isDaytime) slot.day = p;
    else slot.night = p;
  }
  const forecastDays = Array.from(byDate.entries())
    .slice(0, 7)
    .map(([date, { day, night }]) => {
      const primary = day ?? night;
      const snow = sumSnowInches([day?.detailedForecast, night?.detailedForecast]);
      return {
        date,
        weekday: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
        temp_high_f: day?.temperature ?? primary?.temperature ?? null,
        temp_low_f: night?.temperature ?? null,
        conditions_short: primary?.shortForecast ?? null,
        snow_in: snow || 0,
        precip_chance: primary?.probabilityOfPrecipitation?.value ?? null,
        wind_short: primary?.windSpeed ?? null,
        wind_dir_short: primary?.windDirection ?? null,
      };
    });

  return {
    temp_high_f: tempHighF,
    temp_low_f: tempLowF,
    conditions_short: today.shortForecast ?? null,
    conditions_long: today.detailedForecast ?? null,
    precip_chance: today.probabilityOfPrecipitation?.value ?? null,
    snow_24h_in: snow24 || null,
    snow_48h_in: snow48 || null,
    forecast_json: forecastDays,
  };
}

// Heuristic: pull "X inches of snow" from forecast prose. Returns total
// inches (sums multiple matches like "1 to 3 inches"). 0 when no match.
function sumSnowInches(strings) {
  let total = 0;
  for (const s of strings) {
    if (!s) continue;
    // "1 to 3 inches of snow", "less than one inch of new snow", etc.
    const re = /(\d+(?:\.\d+)?)\s*(?:to\s+(\d+(?:\.\d+)?)\s+)?inch(?:es)?\s+of\s+(?:new\s+)?snow/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
      const lo = parseFloat(m[1]);
      const hi = m[2] ? parseFloat(m[2]) : lo;
      total += (lo + hi) / 2;
    }
  }
  return Math.round(total * 10) / 10; // 1 decimal
}

function parseOpenMeteo(meteo) {
  const cur = meteo?.current;
  if (!cur) return {};
  const dirDeg = typeof cur.wind_direction_10m === "number" ? Math.round(cur.wind_direction_10m) : null;
  return {
    wind_mph_avg: typeof cur.wind_speed_10m === "number" ? Math.round(cur.wind_speed_10m) : null,
    wind_mph_gust: typeof cur.wind_gusts_10m === "number" ? Math.round(cur.wind_gusts_10m) : null,
    wind_dir_deg: dirDeg,
    wind_dir_short: compass(dirDeg),
  };
}

async function refreshOne(resort, cached) {
  const lat = Number(resort.latitude);
  const lng = Number(resort.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { resort_id: resort.id, fetch_error: "bad coords" };
  }
  try {
    const grid = await getGridpoint(lat, lng, cached);
    const [nws, meteo] = await Promise.all([
      getNwsForecast(grid).catch((e) => ({ error: String(e) })),
      getOpenMeteoWind(lat, lng).catch((e) => ({ error: String(e) })),
    ]);
    const nwsParsed = nws.error ? null : parseNwsForecast(nws);
    const meteoParsed = meteo.error ? {} : parseOpenMeteo(meteo);
    const meteoDays = meteo.error ? [] : meteoToForecastDays(meteo);
    const merged = nwsParsed ? mergeForecasts(nwsParsed, meteoDays) : null;
    const partialErrors = [
      nws.error ? `nws:${nws.error.slice(0, 80)}` : null,
      meteo.error ? `meteo:${meteo.error.slice(0, 80)}` : null,
    ]
      .filter(Boolean)
      .join("; ");
    return {
      resort_id: resort.id,
      nws_grid_office: grid.office,
      nws_grid_x: grid.x,
      nws_grid_y: grid.y,
      ...(merged ?? {}),
      ...meteoParsed,
      forecast_for_date: new Date().toISOString().slice(0, 10),
      fetched_at: new Date().toISOString(),
      fetch_source: nwsParsed && meteoDays.length ? "nws+meteo10d" : nwsParsed ? "nws-only" : "partial",
      fetch_error: partialErrors || null,
    };
  } catch (e) {
    return {
      resort_id: resort.id,
      fetched_at: new Date().toISOString(),
      fetch_source: "failed",
      fetch_error: String(e?.message ?? e).slice(0, 240),
    };
  }
}

async function main() {
  const slugFilter = process.argv[2]; // optional: pass a slug for single-resort test
  const query = supabase
    .from("resorts")
    .select("id, slug, name, state, latitude, longitude")
    .eq("active", true);
  if (slugFilter) query.eq("slug", slugFilter);
  const { data: resorts, error } = await query;
  if (error) {
    console.error("Failed to load resorts:", error.message);
    process.exit(1);
  }
  console.log(`Refreshing ${resorts.length} resort(s)…`);

  const { data: existingCache } = await supabase
    .from("weather_cache")
    .select("resort_id, nws_grid_office, nws_grid_x, nws_grid_y");
  const cacheBy = new Map((existingCache ?? []).map((c) => [c.resort_id, c]));

  const rows = new Array(resorts.length);
  let i = 0;
  let done = 0;
  async function worker() {
    while (i < resorts.length) {
      const idx = i++;
      const r = resorts[idx];
      rows[idx] = await refreshOne(r, cacheBy.get(r.id));
      done++;
      if (done % 25 === 0) {
        process.stderr.write(`  [${done}/${resorts.length}]\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Upsert in chunks of 100 to keep the request payload reasonable.
  const CHUNK = 100;
  for (let off = 0; off < rows.length; off += CHUNK) {
    const slice = rows.slice(off, off + CHUNK);
    const { error: upErr } = await supabase
      .from("weather_cache")
      .upsert(slice, { onConflict: "resort_id" });
    if (upErr) {
      console.error(`upsert chunk ${off} failed:`, upErr.message);
    }
  }

  const ok = rows.filter((r) => !r.fetch_error || r.fetch_source !== "failed").length;
  console.log(`\nDone. ${ok}/${rows.length} resorts updated.`);
  const failures = rows.filter((r) => r.fetch_source === "failed").slice(0, 5);
  if (failures.length) {
    console.log("First failures:");
    for (const f of failures) console.log(`  resort_id=${f.resort_id}  ${f.fetch_error}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
