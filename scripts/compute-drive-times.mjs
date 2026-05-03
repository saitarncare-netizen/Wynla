// Compute drive times from 4 origin cities to every resort in Supabase.
// Output: data/drive_times.sql (CREATE TABLE + RLS + INSERT for drive_time_cache)
//
// Run: node scripts/compute-drive-times.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MAPBOX_TOKEN in .env.local

import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAPBOX_TOKEN = env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !MAPBOX_TOKEN) {
  console.error("Missing env vars in .env.local");
  process.exit(1);
}

const origins = [
  { name: "NYC",          lat: 40.7128, lon: -74.006  },
  { name: "Boston",       lat: 42.3601, lon: -71.0589 },
  { name: "Philadelphia", lat: 39.9526, lon: -75.1652 },
  { name: "Hartford",     lat: 41.7637, lon: -72.6851 },
];

console.error("Fetching resorts from Supabase...");
const resp = await fetch(
  `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,latitude,longitude&order=id`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
);
const resorts = await resp.json();
console.error(`  -> ${resorts.length} resorts`);

console.error(`Computing ${origins.length * resorts.length} drive times in parallel...`);
const t0 = Date.now();

const tasks = [];
for (const origin of origins) {
  for (const resort of resorts) {
    tasks.push(
      fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/` +
          `${origin.lon},${origin.lat};${resort.longitude},${resort.latitude}` +
          `?access_token=${MAPBOX_TOKEN}&overview=false`,
      )
        .then((r) => r.json())
        .then((data) => {
          const route = data.routes?.[0];
          if (!route) {
            console.error(`  ! no route: ${origin.name} -> ${resort.slug}`);
            return null;
          }
          return {
            resort_id: resort.id,
            resort_slug: resort.slug,
            origin_name: origin.name,
            origin_lat: origin.lat,
            origin_lon: origin.lon,
            duration_seconds: Math.round(route.duration),
            distance_meters: Math.round(route.distance),
          };
        }),
    );
  }
}

const results = (await Promise.all(tasks)).filter(Boolean);
console.error(`  -> ${results.length} routes in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Build SQL
const lines = [
  `-- Drive time cache: ${origins.length} origins x ${resorts.length} resorts = ${results.length} rows`,
  `-- Computed ${new Date().toISOString().slice(0, 19)}Z via Mapbox Directions API`,
  ``,
  `CREATE TABLE IF NOT EXISTS drive_time_cache (`,
  `  id BIGSERIAL PRIMARY KEY,`,
  `  resort_id BIGINT REFERENCES resorts(id) ON DELETE CASCADE,`,
  `  origin_name TEXT NOT NULL,`,
  `  origin_lat DECIMAL(10, 7) NOT NULL,`,
  `  origin_lon DECIMAL(10, 7) NOT NULL,`,
  `  duration_seconds INTEGER NOT NULL,`,
  `  distance_meters INTEGER,`,
  `  computed_at TIMESTAMPTZ DEFAULT NOW(),`,
  `  UNIQUE(resort_id, origin_name)`,
  `);`,
  ``,
  `CREATE INDEX IF NOT EXISTS idx_drive_time_resort ON drive_time_cache(resort_id);`,
  `CREATE INDEX IF NOT EXISTS idx_drive_time_origin ON drive_time_cache(origin_name);`,
  ``,
  `ALTER TABLE drive_time_cache ENABLE ROW LEVEL SECURITY;`,
  `DROP POLICY IF EXISTS "Public read drive times" ON drive_time_cache;`,
  `CREATE POLICY "Public read drive times" ON drive_time_cache FOR SELECT USING (true);`,
  ``,
  `-- Re-runnable: clear existing data first`,
  `TRUNCATE drive_time_cache RESTART IDENTITY;`,
  ``,
  `INSERT INTO drive_time_cache (resort_id, origin_name, origin_lat, origin_lon, duration_seconds, distance_meters) VALUES`,
];

const values = results.map(
  (r) =>
    `  (${r.resort_id}, '${r.origin_name}', ${r.origin_lat}, ${r.origin_lon}, ${r.duration_seconds}, ${r.distance_meters})`,
);
lines.push(values.join(",\n") + ";");
lines.push("");
lines.push("-- Verify: row count per origin");
lines.push("SELECT origin_name, COUNT(*) FROM drive_time_cache GROUP BY origin_name ORDER BY origin_name;");
lines.push("");
lines.push("-- Closest 5 resorts from NYC");
lines.push(
  `SELECT r.name, ROUND(dt.duration_seconds/3600.0, 2) AS hours_from_nyc, ROUND(dt.distance_meters/1609.34, 1) AS miles
FROM drive_time_cache dt JOIN resorts r ON r.id = dt.resort_id
WHERE dt.origin_name = 'NYC' ORDER BY dt.duration_seconds LIMIT 5;`,
);

writeFileSync("data/drive_times.sql", lines.join("\n") + "\n");
console.error(`Wrote data/drive_times.sql (${lines.length} lines, ${results.length} INSERTs)`);

// Print quick summary
console.error("\nQuick stats:");
for (const origin of origins) {
  const fromOrigin = results.filter((r) => r.origin_name === origin.name);
  const avgHours = fromOrigin.reduce((s, r) => s + r.duration_seconds, 0) / fromOrigin.length / 3600;
  const minHours = Math.min(...fromOrigin.map((r) => r.duration_seconds)) / 3600;
  const maxHours = Math.max(...fromOrigin.map((r) => r.duration_seconds)) / 3600;
  console.error(
    `  ${origin.name.padEnd(13)} avg ${avgHours.toFixed(1)}h, range ${minHours.toFixed(1)}h - ${maxHours.toFixed(1)}h`,
  );
}
