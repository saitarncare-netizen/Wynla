// Reads back the Fastwork freelancer's filled CSV and emits SQL UPDATE
// statements for review. Same shape as scripts/process-trail-csvs.mjs
// but takes only verified_* columns (the freelancer's hand-checked
// values) and ignores agent_guess_* (those were just leads).
//
// Run from repo root:
//   node scripts/sync-fastwork-csv.mjs <path-to-filled-csv>
//
// Default path: data/fastwork-trail-data-output.csv
//
// Output: data/trail-breakdown-fastwork-apply.sql — paste into the
// Supabase SQL editor like the agent SQL.

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

function asInt(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
console.log(`Loaded ${rows.length} rows from ${path.relative(REPO_ROOT, inputPath)}`);

const updates = [];
let blanks = 0;
let invalidSlugs = 0;

for (const r of rows) {
  if (!r.slug || !/^[a-z0-9-]+$/.test(r.slug)) {
    invalidSlugs++;
    continue;
  }
  const b = asInt(r.verified_beginner);
  const i = asInt(r.verified_intermediate);
  const a = asInt(r.verified_advanced);
  const e = asInt(r.verified_expert);
  const p = asInt(r.verified_terrain_park_count);
  const hasAny = b != null || i != null || a != null || e != null || p != null;
  if (!hasAny) {
    blanks++;
    continue;
  }
  // Source URL is required when any verified value is set — guards
  // against the freelancer skipping the citation column.
  if (!r.verified_source_url || !r.verified_source_url.trim()) {
    console.warn(`⚠  ${r.slug}: verified data but no source URL — skipping`);
    continue;
  }
  updates.push({
    slug: r.slug,
    name: r.name,
    trails_beginner: b,
    trails_intermediate: i,
    trails_advanced: a,
    trails_expert: e,
    terrain_park_count: p,
    has_terrain_park: p != null && p > 0 ? true : null,
    source: r.verified_source_url.trim(),
    notes: r.freelancer_notes,
  });
}

console.log(`Updates ready: ${updates.length}`);
console.log(`  - ${blanks} rows left blank (no public data)`);
if (invalidSlugs > 0) {
  console.warn(`  - ${invalidSlugs} rows had invalid slugs — skipped`);
}

const sqlLines = [
  "-- Trail breakdown sync — Fastwork freelancer hand-verified data.",
  "-- Apply via Supabase SQL editor.",
  `-- Total updates: ${updates.length}`,
  "",
  "BEGIN;",
  "",
];

for (const u of updates) {
  const sets = [];
  if (u.trails_beginner != null) sets.push(`trails_beginner = ${u.trails_beginner}`);
  if (u.trails_intermediate != null) sets.push(`trails_intermediate = ${u.trails_intermediate}`);
  if (u.trails_advanced != null) sets.push(`trails_advanced = ${u.trails_advanced}`);
  if (u.trails_expert != null) sets.push(`trails_expert = ${u.trails_expert}`);
  if (u.terrain_park_count != null) sets.push(`terrain_park_count = ${u.terrain_park_count}`);
  if (u.has_terrain_park === true) sets.push(`has_terrain_park = true`);
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
