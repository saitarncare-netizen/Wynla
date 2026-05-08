// Re-emit data/sql/stage-7-verify-451.sql with a guardrail: for any resort
// where the freshly-extracted numeric field is < 70% of an existing
// non-NULL DB value, DROP that field from the update (likely the site
// showed today's "open" count, not the total).
//
// Output:
//   • data/sql/stage-7-verify-451-filtered.sql — the safer SQL
//   • Console: how many fields were dropped + which resorts hit the guard

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Re-read all batch results (mirror of combine script)
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
const BOUNDS = {
  vertical_drop:        [0, 5000],
  total_trails:         [0, 350],
  total_lifts:          [0, 60],
  total_acres:          [0, 10000],
  elevation_summit:     [0, 14000],
  elevation_base:       [0, 11500],
  longest_run_miles:    [0, 10],
  trails_beginner:      [0, 200],
  trails_intermediate:  [0, 200],
  trails_advanced:      [0, 200],
  trails_expert:        [0, 200],
  terrain_park_count:   [0, 20],
};
const NUMERIC_FIELDS_TO_GUARD = [
  "vertical_drop", "total_trails", "total_lifts", "total_acres",
  "elevation_summit", "elevation_base", "longest_run_miles",
];

function sanitizeField(key, val) {
  const type = ALLOWED_FIELDS[key];
  if (!type) return { ok: false };
  if (val === null || val === undefined) return { ok: false };
  if (type === "int") {
    const n = Number(val);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false };
    const [lo, hi] = BOUNDS[key];
    if (n < lo || n > hi) return { ok: false };
    return { ok: true, value: n };
  }
  if (type === "decimal") {
    const n = Number(val);
    if (!Number.isFinite(n)) return { ok: false };
    const [lo, hi] = BOUNDS[key];
    if (n < lo || n > hi) return { ok: false };
    return { ok: true, value: Number(n.toFixed(2)) };
  }
  if (type === "bool") {
    if (typeof val !== "boolean") return { ok: false };
    return { ok: true, value: val };
  }
  if (type === "text") {
    if (typeof val !== "string") return { ok: false };
    const t = val.trim();
    if (!t || t.length > 500) return { ok: false };
    return { ok: true, value: t };
  }
  return { ok: false };
}
function quoteSql(v) {
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Pull existing values for guardrail comparison
const { data: existingRows } = await supabase
  .from("resorts")
  .select("id, slug, " + Object.keys(ALLOWED_FIELDS).join(", "))
  .eq("active", true);
const byId = new Map(existingRows.map((r) => [r.id, r]));

const allUpdates = [];
const dropped = [];

for (let i = 1; i <= 10; i++) {
  const file = path.resolve(`output/verify-batch-${i}-results.json`);
  if (!existsSync(file)) continue;
  const arr = JSON.parse(readFileSync(file, "utf8"));
  for (const entry of arr) {
    const fields = entry.fields ?? {};
    if (Object.keys(fields).length === 0) continue;
    const existing = byId.get(entry.id);
    const sanitized = {};
    for (const k of Object.keys(fields)) {
      const r = sanitizeField(k, fields[k]);
      if (!r.ok) continue;
      // Downgrade guardrail: if both old and new are numeric and new < 0.70 * old, DROP.
      if (NUMERIC_FIELDS_TO_GUARD.includes(k) && existing && existing[k] != null) {
        const oldVal = Number(existing[k]);
        const newVal = Number(r.value);
        if (Number.isFinite(oldVal) && oldVal > 0 && newVal < 0.70 * oldVal) {
          dropped.push({ id: entry.id, slug: entry.slug, field: k, old: oldVal, new: newVal });
          continue;
        }
      }
      sanitized[k] = r.value;
    }
    if (Object.keys(sanitized).length === 0) continue;
    allUpdates.push({ id: entry.id, slug: entry.slug, fields: sanitized });
  }
}

const sqlLines = [];
sqlLines.push("-- Stage 7: Verify all 451 resorts (downgrade-guarded)");
sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
sqlLines.push(`-- Resorts touched: ${allUpdates.length}`);
sqlLines.push(`-- Guardrail-dropped fields: ${dropped.length}`);
sqlLines.push("");
sqlLines.push("BEGIN;");
sqlLines.push("");
let totalWrites = 0;
for (const u of allUpdates) {
  const sets = Object.entries(u.fields).map(([k, v]) => `${k} = ${quoteSql(v)}`);
  sets.push("last_verified_at = NOW()");
  totalWrites += Object.keys(u.fields).length;
  sqlLines.push(`-- ${u.slug}`);
  sqlLines.push(`UPDATE resorts SET ${sets.join(", ")} WHERE id = ${u.id};`);
}
sqlLines.push("");
sqlLines.push("COMMIT;");

const sqlPath = path.resolve("data/sql/stage-7-verify-451-filtered.sql");
writeFileSync(sqlPath, sqlLines.join("\n"));

console.log(`\n=== Filtered stats ===`);
console.log(`  resorts touched: ${allUpdates.length}`);
console.log(`  total field writes: ${totalWrites}`);
console.log(`  guard-dropped: ${dropped.length}`);
console.log(`\n=== Guard-dropped fields (likely "today's open" not "total") ===`);
for (const d of dropped) {
  console.log(`  ${d.slug} (id=${d.id}): ${d.field}  ${d.old} → ${d.new}  DROPPED`);
}
console.log(`\nSQL written to: ${sqlPath}`);
