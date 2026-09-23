// Combine the 10 verify-batch-{N}-results.json files into a single SQL
// file that's pasted into the Supabase SQL Editor (Chrome MCP path) for
// production application.
//
// Why no DB call here: production DB writes go through the SQL Editor
// (sandboxed away from anon-key UPDATE on `resorts`).
//
// Behavior:
//   • For each entry that has ≥1 verified field:
//       UPDATE resorts
//         SET <each field> = <value>,
//             last_verified_at = NOW()
//         WHERE id = <id>;
//   • Entries with empty fields are SKIPPED.
//   • Field allowlist + bounds drop hallucinated or out-of-range values.
//   • Idempotent: re-running with the same results writes the same values.
//
// Run:  node scripts/combine-and-apply-verify.mjs
//
// Output:
//   • data/sql/stage-7-verify-451.sql — the generated SQL (always written)
//   • Console: stats summary
//
// Then: copy the SQL → Supabase SQL Editor → Run.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

// --- Field whitelist + type rules ---
// Matches Wynla DB schema for the resorts table. Anything outside this
// allowlist is silently dropped, so a hallucinated key in agent output
// can't reach the DB.
const ALLOWED_FIELDS = {
  vertical_drop:        "int",
  total_trails:         "int",
  total_lifts:          "int",
  total_acres:          "int",
  elevation_summit:     "int",
  elevation_base:       "int",
  longest_run_miles:    "decimal",
  trails_beginner:      "int",
  trails_intermediate:  "int",
  trails_advanced:      "int",
  trails_expert:        "int",
  has_terrain_park:     "bool",
  terrain_park_count:   "int",
  has_glades:           "bool",
  has_halfpipe:         "bool",
  has_night_skiing:     "bool",
  weekday_hours:        "text",
  weekend_hours:        "text",
  typical_season_start: "text",
  typical_season_end:   "text",
  address:              "text",
  city:                 "text",
};

// Sanity bounds — agents sometimes mis-extract (e.g. confuse acres for trails).
// Out-of-range values get dropped with a warning rather than written.
const BOUNDS = {
  vertical_drop:        [0, 5000],     // Cdn record ~7k; US ski resort cap ~4400
  total_trails:         [0, 350],      // Whistler Blackcomb ~200
  total_lifts:          [0, 60],       // Vail ~31
  total_acres:          [0, 10000],    // Park City ~7300
  elevation_summit:     [0, 14000],    // CO 14ers
  elevation_base:       [0, 11500],
  longest_run_miles:    [0, 10],       // Sky Tavern's full length ~9
  trails_beginner:      [0, 200],
  trails_intermediate:  [0, 200],
  trails_advanced:      [0, 200],
  trails_expert:        [0, 200],
  terrain_park_count:   [0, 20],
};

function sanitizeField(key, val, slug) {
  const type = ALLOWED_FIELDS[key];
  if (!type) return { ok: false, reason: `unknown field ${key}` };
  if (val === null || val === undefined) return { ok: false, reason: "null" };

  if (type === "int") {
    const n = Number(val);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, reason: `not int: ${val}` };
    const [lo, hi] = BOUNDS[key];
    if (n < lo || n > hi) return { ok: false, reason: `out of bounds [${lo}, ${hi}]: ${n}` };
    return { ok: true, value: n };
  }
  if (type === "decimal") {
    const n = Number(val);
    if (!Number.isFinite(n)) return { ok: false, reason: `not number: ${val}` };
    const [lo, hi] = BOUNDS[key];
    if (n < lo || n > hi) return { ok: false, reason: `out of bounds [${lo}, ${hi}]: ${n}` };
    return { ok: true, value: Number(n.toFixed(2)) };
  }
  if (type === "bool") {
    if (typeof val !== "boolean") return { ok: false, reason: `not bool: ${val}` };
    return { ok: true, value: val };
  }
  if (type === "text") {
    if (typeof val !== "string") return { ok: false, reason: `not string: ${val}` };
    const t = val.trim();
    if (!t) return { ok: false, reason: "empty string" };
    if (t.length > 500) return { ok: false, reason: `text too long (${t.length})` };
    return { ok: true, value: t };
  }
  return { ok: false, reason: "unhandled type" };
}

function quoteSql(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const allUpdates = [];
const stats = {
  batches_seen: 0,
  resorts_seen: 0,
  resorts_with_fields: 0,
  resorts_unreachable: 0,
  total_field_writes: 0,
  rejected_fields: {},
};

for (let i = 1; i <= 10; i++) {
  const file = path.resolve(`output/verify-batch-${i}-results.json`);
  if (!existsSync(file)) {
    console.warn(`[batch ${i}] missing — skipping`);
    continue;
  }
  stats.batches_seen++;
  const arr = JSON.parse(readFileSync(file, "utf8"));
  for (const entry of arr) {
    stats.resorts_seen++;
    const fields = entry.fields ?? {};
    const fieldKeys = Object.keys(fields);
    if (fieldKeys.length === 0) {
      if ((entry.notes ?? "").toLowerCase().includes("unreachable")) stats.resorts_unreachable++;
      continue;
    }
    const sanitized = {};
    for (const k of fieldKeys) {
      const r = sanitizeField(k, fields[k], entry.slug);
      if (!r.ok) {
        stats.rejected_fields[k] = (stats.rejected_fields[k] ?? 0) + 1;
        continue;
      }
      sanitized[k] = r.value;
    }
    if (Object.keys(sanitized).length === 0) continue;
    allUpdates.push({ id: entry.id, slug: entry.slug, fields: sanitized });
    stats.resorts_with_fields++;
    stats.total_field_writes += Object.keys(sanitized).length;
  }
}

// --- Build SQL ---
const sqlLines = [];
sqlLines.push("-- Stage 7: Verify all 451 resorts from official websites");
sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
sqlLines.push(`-- Resorts touched: ${allUpdates.length}`);
sqlLines.push(`-- Field writes: ${stats.total_field_writes}`);
sqlLines.push("");
sqlLines.push("BEGIN;");
sqlLines.push("");
for (const u of allUpdates) {
  const sets = Object.entries(u.fields).map(([k, v]) => `${k} = ${quoteSql(v)}`);
  sets.push("last_verified_at = NOW()");
  sqlLines.push(`-- ${u.slug}`);
  sqlLines.push(`UPDATE resorts SET ${sets.join(", ")} WHERE id = ${u.id};`);
}
sqlLines.push("");
sqlLines.push("COMMIT;");

const sqlPath = path.resolve("data/sql/stage-7-verify-451.sql");
mkdirSync(path.dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, sqlLines.join("\n"));

console.log(`\n=== Stats ===`);
console.log(JSON.stringify(stats, null, 2));
console.log(`\nSQL written to: ${sqlPath}`);
console.log(`\nNext: copy the SQL into Supabase SQL Editor and Run.`);
