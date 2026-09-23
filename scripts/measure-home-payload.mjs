// Measures the homepage data payload that app/page.tsx ships to the client:
// the resorts / weather_cache / drive_time_cache reads, raw and gzipped, for
// the trimmed column lists the page actually uses next to a full-row
// baseline. Re-run after any change to RESORT_COLUMNS so the before/after
// numbers in the page comments stay honest.
//
// Read-only: uses the anon key over PostgREST, never the service role.
// Usage: node scripts/measure-home-payload.mjs
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

// Parse .env.local by hand so this script needs no dotenv dependency.
// A worktree without the file (or a CI job) can pass the two vars in the
// environment instead.
try {
  const text = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (err) {
  if (err?.code !== "ENOENT") throw err;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local");
  process.exit(1);
}

// Pull the column list straight from the page so the two never drift.
const pageSource = readFileSync(path.resolve("app/page.tsx"), "utf8");
const columnsMatch = pageSource.match(/const RESORT_COLUMNS =\s*\n?\s*"([^"]+)"/);
if (!columnsMatch) {
  console.error("Could not find RESORT_COLUMNS in app/page.tsx");
  process.exit(1);
}
const RESORT_COLUMNS = columnsMatch[1].replace(/\s+/g, "");
const WEATHER_COLUMNS = "resort_id,temp_high_f,conditions_short";
// What app/page.tsx selected before the 2026-09-23 map-perf pass, kept as
// the comparison baseline (66 resort columns, 9 weather columns).
const RESORT_COLUMNS_BEFORE =
  "id,slug,name,state,region,latitude,longitude,passes,tier,vertical_drop,total_trails,total_acres,website_url,has_night_skiing,difficulty_pct_beginner,difficulty_pct_intermediate,difficulty_pct_advanced,difficulty_pct_expert,trails_beginner,trails_intermediate,trails_advanced,trails_expert,has_terrain_park,terrain_park_count,total_lifts,high_speed_lifts,base_elevation_ft,summit_elevation_ft,annual_snowfall_in,season_open_text,season_close_text,snowmaking_pct,has_tubing,has_lessons,has_rentals,has_lodging_on_mountain,has_xc_skiing,has_backcountry_access,trail_map_url,webcam_url,closest_airport_iata,closest_airport_distance_mi,hero_image_url,hero_image_alt,hero_image_attribution,snow_base_depth_in,snow_new_24h_in,snow_new_48h_in,snow_new_7d_in,trails_open_today,lifts_open_today,snow_report_status,snow_report_updated_at,ticket_price_adult_min,ticket_price_adult_max,ticket_price_currency,ticket_booking_url,ticket_price_updated_at,allows_snowboards,lift_types,currently_open,season_end_date,terrain_park_features,current_surface_class,current_surface_updated_at,has_adaptive_program";
const WEATHER_COLUMNS_BEFORE =
  "resort_id,temp_high_f,temp_low_f,conditions_short,snow_24h_in,snow_48h_in,wind_mph_avg,wind_dir_short,fetched_at";
const DRIVE_COLUMNS = "resort_id,origin_name,duration_seconds,distance_meters";
const PAGE_SIZE = 1000;

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/** One PostgREST GET; returns rows + the exact total from Content-Range. */
async function fetchRows(table, query, from = 0, to = PAGE_SIZE - 1) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: "count=exact",
      Range: `${from}-${to}`,
      "Range-Unit": "items",
    },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  }
  const total = Number(res.headers.get("content-range")?.split("/")[1] ?? NaN);
  return { rows: await res.json(), total };
}

/** Pages through the whole table the same way app/page.tsx does. */
async function fetchAll(table, query) {
  const rows = [];
  let total = null;
  while (total === null || rows.length < total) {
    const page = await fetchRows(table, query, rows.length, rows.length + PAGE_SIZE - 1);
    if (page.rows.length === 0) break;
    rows.push(...page.rows);
    total = Number.isFinite(page.total) ? page.total : rows.length;
  }
  return rows;
}

function report(label, value) {
  const json = JSON.stringify(value);
  const raw = Buffer.byteLength(json);
  const gz = gzipSync(json).length;
  const count = Array.isArray(value) ? value.length : Object.values(value).flat().length;
  console.log(`${label.padEnd(44)} ${String(count).padStart(5)} rows  ${kb(raw).padStart(10)} raw  ${kb(gz).padStart(9)} gzip`);
  return raw;
}

const resortsBefore = await fetchAll(
  "resorts",
  `select=${RESORT_COLUMNS_BEFORE}&active=eq.true&order=name`,
);
const resortsTrim = await fetchAll("resorts", `select=${RESORT_COLUMNS}&active=eq.true&order=name`);
const weatherBefore = await fetchAll("weather_cache", `select=${WEATHER_COLUMNS_BEFORE}`);
const weatherTrim = await fetchAll("weather_cache", `select=${WEATHER_COLUMNS}`);
const driveRows = await fetchAll(
  "drive_time_cache",
  `select=${DRIVE_COLUMNS}&order=origin_name,resort_id,id`,
);
const driveTuples = {};
for (const r of driveRows) {
  (driveTuples[r.origin_name] ??= []).push([r.resort_id, r.duration_seconds, r.distance_meters]);
}

console.log(
  `resorts columns: before ${RESORT_COLUMNS_BEFORE.split(",").length} -> page ${RESORT_COLUMNS.split(",").length}`,
);
const before =
  report("resorts (previous 66 columns)", resortsBefore) +
  report("weather_cache (previous 9 columns)", weatherBefore) +
  // The pre-fix page issued one unbounded select, so it only ever saw
  // the first max-rows window; measure that same truncated shape.
  report("drive_time_cache (first 1,000 rows, objects)", driveRows.slice(0, PAGE_SIZE));
console.log("");
const after =
  report("resorts (RESORT_COLUMNS)", resortsTrim) +
  report("weather_cache (3 columns)", weatherTrim) +
  report("drive_time_cache (all rows, tuples)", driveTuples);
console.log("");
console.log(`TOTAL before ${kb(before)} raw -> after ${kb(after)} raw (${(((after - before) / before) * 100).toFixed(0)}%)`);
