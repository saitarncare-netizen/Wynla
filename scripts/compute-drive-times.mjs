// Compute drive times from 4 origin cities to every active resort using
// Mapbox Matrix API (one call per origin × 24-destination chunk → ~76 calls
// total instead of 1804). Output: data/drive_times.sql ready to apply via
// Supabase SQL Editor.
//
// Run: node scripts/compute-drive-times.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
//           NEXT_PUBLIC_MAPBOX_TOKEN in .env.local

import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAPBOX_TOKEN = env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY || !MAPBOX_TOKEN) {
  console.error("Missing env vars in .env.local");
  process.exit(1);
}

const ORIGINS = [
  { name: "NYC",          lat: 40.7128, lon: -74.006  },
  { name: "Boston",       lat: 42.3601, lon: -71.0589 },
  { name: "Philadelphia", lat: 39.9526, lon: -75.1652 },
  { name: "Hartford",     lat: 41.7637, lon: -72.6851 },
];

// Mapbox Matrix API limits coordinates per request — free tier allows 25
// (1 origin + up to 24 destinations). Stay one under to be safe.
const CHUNK_SIZE = 24;

console.error("Fetching active resorts from Supabase...");
const resp = await fetch(
  `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,latitude,longitude&active=eq.true&order=id&limit=2000`,
  { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
);
const resorts = (await resp.json()).filter(
  (r) => r.latitude != null && r.longitude != null,
);
console.error(`  -> ${resorts.length} resorts with coordinates`);

const t0 = Date.now();
const results = [];
let calls = 0;

for (const origin of ORIGINS) {
  for (let i = 0; i < resorts.length; i += CHUNK_SIZE) {
    const chunk = resorts.slice(i, i + CHUNK_SIZE);
    // Matrix request: ;-joined coords list, source index = 0 (origin),
    // destinations = 1..N (the resorts in this chunk).
    const coords = [
      `${origin.lon},${origin.lat}`,
      ...chunk.map((r) => `${Number(r.longitude)},${Number(r.latitude)}`),
    ].join(";");
    const destinationsParam = chunk.map((_, idx) => idx + 1).join(";");

    const url =
      `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
      `?sources=0&destinations=${destinationsParam}&annotations=duration,distance` +
      `&access_token=${MAPBOX_TOKEN}`;

    const r = await fetch(url);
    calls += 1;
    if (!r.ok) {
      console.error(`  ! HTTP ${r.status} for ${origin.name} chunk @ ${i}`);
      const body = await r.text();
      console.error(`     body: ${body.slice(0, 200)}`);
      // Brief backoff and retry once
      await new Promise((res) => setTimeout(res, 2000));
      const r2 = await fetch(url);
      if (!r2.ok) {
        console.error(`  ! retry failed; skipping chunk`);
        continue;
      }
      Object.assign(r, r2);
    }
    const data = await r.json();
    if (!data.durations?.[0] || !data.distances?.[0]) {
      console.error(`  ! malformed response for ${origin.name} chunk @ ${i}`);
      continue;
    }
    const durations = data.durations[0];   // 1 source × N destinations
    const distances = data.distances[0];

    for (let j = 0; j < chunk.length; j++) {
      const dur = durations[j];
      const dist = distances[j];
      if (dur == null) continue;            // unreachable (rare; e.g. island resort)
      results.push({
        resort_id: chunk[j].id,
        resort_slug: chunk[j].slug,
        origin_name: origin.name,
        origin_lat: origin.lat,
        origin_lon: origin.lon,
        duration_seconds: Math.round(dur),
        distance_meters: dist == null ? null : Math.round(dist),
      });
    }

    // Throttle gently — well under Mapbox free-tier 600/min limit.
    await new Promise((res) => setTimeout(res, 200));
  }
  process.stderr.write(`  ${origin.name}: done (${results.filter((x) => x.origin_name === origin.name).length} routes)\n`);
}

console.error(`\n${calls} Matrix API calls, ${results.length} routes in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

// Build SQL. Schema already exists in DB (created in earlier phase) —
// but include CREATE IF NOT EXISTS so this script remains self-contained
// for fresh environments. Use TRUNCATE to fully refresh; rows are derivable.
const lines = [
  `-- Drive time cache: ${ORIGINS.length} origins x ${resorts.length} resorts = ${results.length} rows`,
  `-- Computed ${new Date().toISOString().slice(0, 19)}Z via Mapbox Matrix API`,
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
  `BEGIN;`,
  `TRUNCATE drive_time_cache RESTART IDENTITY;`,
  ``,
  `INSERT INTO drive_time_cache (resort_id, origin_name, origin_lat, origin_lon, duration_seconds, distance_meters) VALUES`,
];

const values = results.map(
  (r) =>
    `  (${r.resort_id}, '${r.origin_name}', ${r.origin_lat}, ${r.origin_lon}, ${r.duration_seconds}, ${r.distance_meters ?? "NULL"})`,
);
lines.push(values.join(",\n") + ";");
lines.push("");
lines.push("-- Verify: row count per origin");
lines.push("SELECT origin_name, COUNT(*) FROM drive_time_cache GROUP BY origin_name ORDER BY origin_name;");
lines.push("");
lines.push("COMMIT;");

writeFileSync("data/drive_times.sql", lines.join("\n") + "\n");
console.error(`Wrote data/drive_times.sql (${results.length} INSERTs)`);

// Print quick summary
console.error("\nQuick stats:");
for (const origin of ORIGINS) {
  const fromOrigin = results.filter((r) => r.origin_name === origin.name);
  if (fromOrigin.length === 0) continue;
  const avgHours = fromOrigin.reduce((s, r) => s + r.duration_seconds, 0) / fromOrigin.length / 3600;
  const minHours = Math.min(...fromOrigin.map((r) => r.duration_seconds)) / 3600;
  const maxHours = Math.max(...fromOrigin.map((r) => r.duration_seconds)) / 3600;
  console.error(
    `  ${origin.name.padEnd(13)} avg ${avgHours.toFixed(1)}h, range ${minHours.toFixed(1)}h - ${maxHours.toFixed(1)}h`,
  );
}
