// Stage 20 — find duplicate resort rows in the DB.
//
// Pulls all active resorts from Supabase, finds pairs whose names are
// similar (Levenshtein >= 0.80) AND whose pins are within 5 km of each
// other, picks a canonical for each pair, and emits a SQL migration
// flipping the duplicates to active=false.
//
// Run: `node scripts/find-dupe-resorts.mjs`
// Outputs:
//   - data/stage-20-dedupe.sql (the migration)
//   - stdout: a human-readable diff so the user can spot-check.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

{
  const text = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // .env.local may have SUPABASE_SERVICE_ROLE_KEY="" (empty placeholder),
  // which `??` would still pick. Use `||` so we fall through to anon.
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Levenshtein distance — small implementation, no library dep.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let cur = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const next = Math.min(cur + 1, prev[j] + 1, prev[j - 1] + cost);
      prev[j - 1] = cur;
      cur = next;
    }
    prev[b.length] = cur;
  }
  return prev[b.length];
}

function similarity(a, b) {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  const max = Math.max(al.length, bl.length);
  if (max === 0) return 1;
  return 1 - levenshtein(al, bl) / max;
}

// Strip generic ski-resort suffixes so e.g. "Mohawk Mountain" vs
// "Mohawk Mountain Ski Area" matches at >0.99 instead of ~0.65.
function normName(name) {
  return name
    .toLowerCase()
    .replace(/\b(ski area|ski resort|mountain resort|resort|mountain|ski club|ski hill|snow park)\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function richness(r) {
  // Count populated "important" columns. The row with more data wins.
  let n = 0;
  if (r.vertical_drop != null) n++;
  if (r.total_trails != null) n++;
  if (r.total_acres != null) n++;
  if (r.website_url) n++;
  if (r.last_verified_at) n++;
  if (r.has_night_skiing != null) n++;
  if (r.passes && r.passes.length > 0) n++;
  if (r.tier === "featured") n += 2; // featured wins decisively
  return n;
}

const { data: resorts, error } = await supabase
  .from("resorts")
  .select(
    "id, slug, name, state, latitude, longitude, vertical_drop, total_trails, total_acres, website_url, last_verified_at, has_night_skiing, passes, tier, active",
  )
  .eq("active", true);

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

console.log(`Loaded ${resorts.length} active resorts`);

const pairs = [];
const NAME_THRESHOLD = 0.8;
const DISTANCE_KM = 5;

for (let i = 0; i < resorts.length; i++) {
  for (let j = i + 1; j < resorts.length; j++) {
    const a = resorts[i];
    const b = resorts[j];
    const lat1 = Number(a.latitude);
    const lon1 = Number(a.longitude);
    const lat2 = Number(b.latitude);
    const lon2 = Number(b.longitude);
    if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) continue;
    const distKm = haversineKm(lat1, lon1, lat2, lon2);
    if (distKm > DISTANCE_KM) continue;
    const sim = similarity(normName(a.name), normName(b.name));
    if (sim < NAME_THRESHOLD) continue;
    pairs.push({ a, b, sim, distKm });
  }
}

// Resolve clusters: a slug may dupe with multiple others. Build a graph
// and keep the canonical per connected component.
const adj = new Map();
for (const r of resorts) adj.set(r.id, new Set());
for (const { a, b } of pairs) {
  adj.get(a.id).add(b.id);
  adj.get(b.id).add(a.id);
}
const byId = new Map(resorts.map((r) => [r.id, r]));
const visited = new Set();
const clusters = [];
for (const r of resorts) {
  if (visited.has(r.id)) continue;
  if (adj.get(r.id).size === 0) continue;
  const stack = [r.id];
  const cluster = [];
  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    cluster.push(byId.get(id));
    for (const n of adj.get(id)) if (!visited.has(n)) stack.push(n);
  }
  if (cluster.length >= 2) clusters.push(cluster);
}

clusters.sort((c1, c2) => c2.length - c1.length || c1[0].name.localeCompare(c2[0].name));

const losers = [];
const reportRows = [];

for (const cluster of clusters) {
  // Pick canonical: highest richness; tie → shorter slug; tie → alpha.
  cluster.sort((a, b) => {
    const dr = richness(b) - richness(a);
    if (dr !== 0) return dr;
    const ds = a.slug.length - b.slug.length;
    if (ds !== 0) return ds;
    return a.slug.localeCompare(b.slug);
  });
  const winner = cluster[0];
  const dropped = cluster.slice(1);
  losers.push(...dropped);
  const minSim = (() => {
    let m = 1;
    for (const d of dropped) {
      const s = similarity(normName(winner.name), normName(d.name));
      if (s < m) m = s;
    }
    return m;
  })();
  const maxDist = (() => {
    let m = 0;
    for (const d of dropped) {
      const lat1 = Number(winner.latitude);
      const lon1 = Number(winner.longitude);
      const lat2 = Number(d.latitude);
      const lon2 = Number(d.longitude);
      const km = haversineKm(lat1, lon1, lat2, lon2);
      if (km > m) m = km;
    }
    return m;
  })();
  reportRows.push({
    winnerSlug: winner.slug,
    winnerName: winner.name,
    state: winner.state,
    winnerRichness: richness(winner),
    losers: dropped.map((d) => ({
      slug: d.slug,
      name: d.name,
      richness: richness(d),
    })),
    sim: minSim,
    distKm: maxDist,
  });
}

console.log(`\nFound ${clusters.length} duplicate cluster(s) covering ${losers.length} loser row(s):\n`);
for (const row of reportRows) {
  console.log(
    `  KEEP ${row.winnerSlug}  (richness ${row.winnerRichness}, ${row.state})`,
  );
  console.log(`       "${row.winnerName}"`);
  for (const l of row.losers) {
    console.log(
      `   DROP ${l.slug}  (richness ${l.richness}) — "${l.name}"`,
    );
  }
  console.log(
    `   sim=${row.sim.toFixed(2)}  dist=${row.distKm.toFixed(2)}km`,
  );
  console.log();
}

if (losers.length === 0) {
  console.log("No duplicates found at the current thresholds. No SQL written.");
  process.exit(0);
}

const lines = [];
lines.push("-- Stage 20 — duplicate resort dedupe");
lines.push("-- Generated by scripts/find-dupe-resorts.mjs");
lines.push("-- Pairs: name similarity >= 0.8 (after normalizing 'Ski Area'/'Resort' suffixes)");
lines.push("--        AND great-circle distance <= 5km.");
lines.push("-- Canonical row picked by: most populated columns (richness),");
lines.push("--                          ties broken by shorter slug.");
lines.push("--");
lines.push(`-- Active resorts before: ${resorts.length}`);
lines.push(`-- Rows to deactivate:    ${losers.length}`);
lines.push(`-- Active resorts after:  ${resorts.length - losers.length}`);
lines.push("");
lines.push("BEGIN;");
lines.push("");
for (const row of reportRows) {
  lines.push(`-- Cluster: keep '${row.winnerSlug}' (${row.winnerName}, ${row.state})`);
  for (const l of row.losers) {
    lines.push(`--   drop '${l.slug}' — "${l.name}"`);
  }
}
lines.push("");
const slugList = losers.map((l) => `'${l.slug}'`).join(", ");
lines.push("UPDATE resorts SET active = false WHERE slug IN (");
lines.push(`  ${slugList}`);
lines.push(");");
lines.push("");
lines.push("COMMIT;");
lines.push("");

const sqlPath = path.resolve("data/stage-20-dedupe.sql");
writeFileSync(sqlPath, lines.join("\n"));
console.log(`Wrote ${sqlPath}`);
