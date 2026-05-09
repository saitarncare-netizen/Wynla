// Reads back the Fastwork freelancer's filled CSV and emits SQL UPDATE
// statements for difficulty_pct_* columns. Stage 18 schema.
//
// Run: node scripts/sync-fastwork-csv.mjs <path-to-filled-csv>
// Default path: data/fastwork-trail-data-output.csv
//
// Output: data/trail-breakdown-fastwork-apply.sql — paste into Supabase.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(REPO_ROOT, "data/fastwork-trail-data-output.csv");

if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  console.error(
    "Pass the freelancer's filled CSV path, or save it as data/fastwork-trail-data-output.csv",
  );
  process.exit(1);
}

function parseCsvRow(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const ls = text.split(/\r?\n/).filter(Boolean);
  const h = parseCsvRow(ls[0]);
  return ls.slice(1).map((l) => {
    const c = parseCsvRow(l);
    const r = {};
    h.forEach((k, i) => (r[k] = c[i] ?? ""));
    return r;
  });
}

function asInt(v, { min = 0, max = 100 } = {}) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
console.log(`Loaded ${rows.length} rows from ${path.relative(REPO_ROOT, inputPath)}`);

const updates = [];
let blanks = 0;
let noSource = 0;
let badSum = 0;

for (const r of rows) {
  if (!r.slug || !/^[a-z0-9-]+$/.test(r.slug)) continue;
  const b = asInt(r.verified_pct_beginner);
  const i = asInt(r.verified_pct_intermediate);
  const a = asInt(r.verified_pct_advanced);
  const e = asInt(r.verified_pct_expert);
  const park = asInt(r.verified_terrain_park_count, { min: 0, max: 50 });
  const hasAnyPct = b != null || i != null || a != null || e != null;
  if (!hasAnyPct && park == null) {
    blanks++;
    continue;
  }
  // If any pct is set, the four pcts present must sum to ~100. Allow
  // 95-105 for rounding + 3-tier resorts where expert is intentionally
  // blank (in which case sum of beg+int+adv may be ~100 already).
  if (hasAnyPct) {
    const presentSum = (b ?? 0) + (i ?? 0) + (a ?? 0) + (e ?? 0);
    // 3-tier resort: only beg/int/adv set, sum 95-105 still OK.
    if (presentSum < 95 || presentSum > 105) {
      console.warn(`⚠  ${r.slug}: pcts sum to ${presentSum} (outside 95-105) — skipping`);
      badSum++;
      continue;
    }
  }
  if (hasAnyPct && (!r.verified_source_url || !r.verified_source_url.trim())) {
    console.warn(`⚠  ${r.slug}: pct values but no source URL — skipping`);
    noSource++;
    continue;
  }
  updates.push({
    slug: r.slug,
    name: r.name,
    pct_b: b,
    pct_i: i,
    pct_a: a,
    pct_e: e,
    park,
    source: r.verified_source_url?.trim() ?? "",
    notes: r.freelancer_notes,
  });
}

console.log(`Updates ready: ${updates.length}`);
console.log(`  - ${blanks} rows left blank (no public data)`);
if (noSource > 0) console.warn(`  - ${noSource} rows skipped (no source URL)`);
if (badSum > 0) console.warn(`  - ${badSum} rows skipped (pcts didn't sum to 95-105)`);

const sqlLines = [
  "-- Trail breakdown sync — Fastwork freelancer hand-verified PERCENTAGES.",
  "-- Apply via Supabase SQL editor.",
  `-- Total updates: ${updates.length}`,
  "",
  "BEGIN;",
  "",
];

for (const u of updates) {
  const sets = [];
  if (u.pct_b != null) sets.push(`difficulty_pct_beginner = ${u.pct_b}`);
  if (u.pct_i != null) sets.push(`difficulty_pct_intermediate = ${u.pct_i}`);
  if (u.pct_a != null) sets.push(`difficulty_pct_advanced = ${u.pct_a}`);
  if (u.pct_e != null) sets.push(`difficulty_pct_expert = ${u.pct_e}`);
  if (u.park != null) {
    sets.push(`terrain_park_count = ${u.park}`);
    if (u.park > 0) sets.push(`has_terrain_park = true`);
  }
  if (sets.length === 0) continue;
  const slugSql = String(u.slug).replace(/'/g, "''");
  sqlLines.push(`-- ${u.name}  (source: ${u.source})`);
  if (u.notes && u.notes.trim()) {
    sqlLines.push(`--   note: ${u.notes.trim().replace(/\n/g, " ")}`);
  }
  sqlLines.push(`UPDATE resorts SET ${sets.join(", ")} WHERE slug = '${slugSql}';`);
  sqlLines.push("");
}

sqlLines.push("COMMIT;");
sqlLines.push("");

const sqlPath = path.join(REPO_ROOT, "data/trail-breakdown-fastwork-apply.sql");
fs.writeFileSync(sqlPath, sqlLines.join("\n"), "utf8");
console.log(`Wrote SQL: ${path.relative(REPO_ROOT, sqlPath)}`);
console.log("");
console.log("Next steps:");
console.log("  1. Open data/trail-breakdown-fastwork-apply.sql, skim a few rows for sanity");
console.log("  2. Paste into https://supabase.com/dashboard/project/yhmzkeeaiknsotydaucs/sql/new");
console.log("  3. Click Run");
