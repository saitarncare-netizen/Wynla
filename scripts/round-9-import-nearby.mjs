// Round 9 (2026-06) — DB importer for the OSM nearby sweep output.
//
// Reads the incremental sweep file output/round-9-progress.json (the
// source of truth — written after every resort, so this works even if
// the sweep was killed before its final round-9-{restaurants,activities}
// .json write). Splits records by kind, cleans, and bulk-loads into
// nearby_restaurants + nearby_activities.
//
// Run:  SUPABASE_SERVICE_ROLE_KEY=... node scripts/round-9-import-nearby.mjs
//
// Idempotency: the two nearby tables carry a PARTIAL unique index
//   (resort_id, osm_id) WHERE osm_id IS NOT NULL
// which PostgREST's `on_conflict` cannot infer (Postgres 42P10 — a
// partial index needs the predicate spelled out in ON CONFLICT, and
// PostgREST can't supply it). So instead of upserting we clear this
// source's rows first (DELETE WHERE source=osm) then plain-INSERT.
// Re-running therefore refreshes cleanly without duplicating.
//
// Cleaning applied here (matches the fixed fetch-script rules):
//   - drop rows without an osm_id (the unique index requires it)
//   - dedup by (resort_id, osm_id) — guards the rare OSM node/way id
//     collision that would otherwise trip the unique index
//   - whitelist categories to the DB CHECK constraint; in particular
//     'tubing' is dropped because the fetch pipeline derived it from
//     tourism=theme_park, which surfaced go-karts / caverns / a
//     haunted house — none of them tubing. "Wrong > missing."

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const SUPABASE_URL = "https://yhmzkeeaiknsotydaucs.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const CHUNK = 200;

// Allowed categories per table — must match the DB CHECK constraints.
// 'tubing' is intentionally absent: theme_park is too noisy a proxy.
const RESTAURANT_CATS = new Set(["local", "fast_food", "family", "cafe", "fine_dining"]);
const ACTIVITY_CATS = new Set([
  "hot_springs", "museum", "brewery", "shopping", "ice_skating",
  "snowshoe", "spa", "winery", "sled_dog", "gondola_sightseeing", "sleigh_ride",
]);

// OSM `website` tags are often scheme-less ("www.foo.com"). Stored
// raw, the card's <a href> would resolve as a RELATIVE link on the
// resort page (wynla.app/resort/<slug>/www.foo.com — broken). Prepend
// https:// for bare domains; null out anything that isn't URL-shaped.
function normalizeUrl(u) {
  if (!u) return null;
  const s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return "https://" + s;
  return null;
}

// Strip the in-flight `kind` field, keep only DB columns, normalize url.
function toRow({ kind, ...rest }) {
  return { ...rest, website_url: normalizeUrl(rest.website_url) };
}

function clean(rows, catSet) {
  const seen = new Set();
  const out = [];
  let droppedCat = 0, droppedNull = 0, droppedDup = 0;
  for (const r of rows) {
    if (r.osm_id == null) { droppedNull++; continue; }
    if (!catSet.has(r.category)) { droppedCat++; continue; }
    const k = `${r.resort_id}:${r.osm_id}`;
    if (seen.has(k)) { droppedDup++; continue; }
    seen.add(k);
    out.push(toRow(r));
  }
  return { out, droppedCat, droppedNull, droppedDup };
}

async function clearSource(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?source=eq.osm`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: "return=minimal",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ! clear ${table}: ${res.status} ${text.slice(0, 200)}`);
    process.exit(1);
  }
  console.log(`  ${table}: cleared existing source=osm rows`);
}

async function bulkInsert(table, rows) {
  if (rows.length === 0) {
    console.log(`  ${table}: nothing to insert`);
    return;
  }
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`  ! insert ${table} batch ${i}: ${res.status} ${text.slice(0, 300)}`);
      process.exit(1);
    }
    process.stdout.write(`  ${table}: inserted ${i + slice.length}/${rows.length}\n`);
  }
}

// Source of truth: the incremental progress file.
const progress = JSON.parse(readFileSync(join(ROOT, "output/round-9-progress.json"), "utf8"));
const records = Array.isArray(progress.records) ? progress.records : [];
const rawRestaurants = records.filter((r) => r.kind === "restaurant");
const rawActivities = records.filter((r) => r.kind === "activity");

const r = clean(rawRestaurants, RESTAURANT_CATS);
const a = clean(rawActivities, ACTIVITY_CATS);

console.log(`> resorts swept: ${(progress.done || []).length}`);
console.log(`> restaurants: ${r.out.length} kept (dropped ${r.droppedCat} bad-cat, ${r.droppedNull} null-osm, ${r.droppedDup} dup)`);
console.log(`> activities:  ${a.out.length} kept (dropped ${a.droppedCat} bad-cat, ${a.droppedNull} null-osm, ${a.droppedDup} dup)`);

await clearSource("nearby_restaurants");
await clearSource("nearby_activities");
await bulkInsert("nearby_restaurants", r.out);
await bulkInsert("nearby_activities", a.out);
console.log("done.");
