// Combines the 5 .tmp-trail-batch-*.csv files written by the parallel
// research agents into:
//   - data/trail-breakdown-apply.sql  (HIGH + MEDIUM rows; UPDATE statements)
//   - data/trail-breakdown-review.csv (LOW rows; manual review later)
//   - data/trail-breakdown-skip.csv   (SKIP rows; for visibility)
//
// Strict policy per the user's "accuracy > coverage" stance:
// - HIGH and MEDIUM rows are applied automatically (after the user
//   reviews + runs the .sql file in the Supabase SQL editor).
// - LOW rows are derived from percentages and prone to ±5-trail
//   rounding error; saved to a review CSV for manual confirmation.
// - SKIP rows are kept for posterity only.
//
// Run from repo root:
//   node scripts/process-trail-csvs.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const TMP_DIR = REPO_ROOT;
const OUT_DIR = path.join(REPO_ROOT, "data");

// Proper CSV parser — handles quoted fields with embedded commas.
// Each row's cells are split on commas outside any double quotes.
function parseCsvRow(line) {
  const cells = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Doubled-up quote inside a quoted field = literal quote
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (ch === "," && !inQuote) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const headers = parseCsvRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvRow(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvLine(cells) {
  return cells.map(csvCell).join(",");
}

function asInt(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

const all = [];
for (let i = 1; i <= 5; i++) {
  const p = path.join(TMP_DIR, `.tmp-trail-batch-${i}.csv`);
  if (!fs.existsSync(p)) {
    console.error(`Missing batch file: ${p}`);
    process.exit(1);
  }
  parseCsv(fs.readFileSync(p, "utf8")).forEach((r) => {
    r._batch = i;
    all.push(r);
  });
}

console.log(`Loaded ${all.length} rows across 5 batches.`);

// Bucket by confidence
const buckets = { HIGH: [], MEDIUM: [], LOW: [], SKIP: [], OTHER: [] };
for (const r of all) {
  const conf = (r.confidence || "").toUpperCase();
  if (buckets[conf]) buckets[conf].push(r);
  else buckets.OTHER.push(r);
}

console.log(
  `Confidence distribution: HIGH=${buckets.HIGH.length}  MEDIUM=${buckets.MEDIUM.length}  LOW=${buckets.LOW.length}  SKIP=${buckets.SKIP.length}  OTHER=${buckets.OTHER.length}`,
);

if (buckets.OTHER.length > 0) {
  console.warn(`⚠  ${buckets.OTHER.length} rows with unrecognized confidence — investigate:`);
  buckets.OTHER.slice(0, 10).forEach((r) => {
    console.warn(`  ${r.slug}: confidence="${r.confidence}"`);
  });
}

// Apply policy: HIGH + MEDIUM with at least ONE populated field go to SQL.
// "Populated field" = any of {trails_beginner, trails_intermediate,
// trails_advanced, trails_expert, terrain_park_count}.
const approved = [];
const emptyApproved = [];
for (const r of [...buckets.HIGH, ...buckets.MEDIUM]) {
  const b = asInt(r.trails_beginner);
  const i = asInt(r.trails_intermediate);
  const a = asInt(r.trails_advanced);
  const e = asInt(r.trails_expert);
  const p = asInt(r.terrain_park_count);
  const hasAny = b != null || i != null || a != null || e != null || p != null;
  if (!hasAny) {
    emptyApproved.push(r);
    continue;
  }
  approved.push({
    slug: r.slug,
    name: r.name,
    confidence: r.confidence,
    trails_beginner: b,
    trails_intermediate: i,
    trails_advanced: a,
    trails_expert: e,
    terrain_park_count: p,
    has_terrain_park: p != null && p > 0 ? true : null,
    sources: r.sources,
    notes: r.notes,
  });
}

console.log(`Approved for DB apply: ${approved.length} rows.`);
if (emptyApproved.length > 0) {
  console.log(`  (${emptyApproved.length} HIGH/MEDIUM rows had all 5 cells blank — dropped.)`);
}

// Build SQL — one UPDATE per resort. Only sets columns that have a
// value; preserves existing data otherwise. Each row commented with
// the agent's confidence + sources so the user can spot-check before
// running.
const sqlLines = [
  "-- Trail breakdown sync — generated by scripts/process-trail-csvs.mjs",
  "-- Apply via Supabase SQL editor (https://supabase.com/dashboard/project/yhmzkeeaiknsotydaucs/sql/new)",
  "-- Source: parallel WebFetch agents, Wikipedia + resort sites, cross-verified.",
  "-- Policy: only HIGH + MEDIUM confidence; LOW (% derived) saved to data/trail-breakdown-review.csv for manual review.",
  "--",
  `-- Total updates: ${approved.length}`,
  "",
  "BEGIN;",
  "",
];

for (const r of approved) {
  const sets = [];
  if (r.trails_beginner != null) sets.push(`trails_beginner = ${r.trails_beginner}`);
  if (r.trails_intermediate != null) sets.push(`trails_intermediate = ${r.trails_intermediate}`);
  if (r.trails_advanced != null) sets.push(`trails_advanced = ${r.trails_advanced}`);
  if (r.trails_expert != null) sets.push(`trails_expert = ${r.trails_expert}`);
  if (r.terrain_park_count != null) sets.push(`terrain_park_count = ${r.terrain_park_count}`);
  if (r.has_terrain_park === true) sets.push(`has_terrain_park = true`);
  const slugSql = String(r.slug).replace(/'/g, "''");
  sqlLines.push(`-- [${r.confidence}] ${r.name}`);
  if (r.notes && String(r.notes).trim()) {
    sqlLines.push(`--   note: ${String(r.notes).trim().replace(/\n/g, " ")}`);
  }
  sqlLines.push(`UPDATE resorts SET ${sets.join(", ")} WHERE slug = '${slugSql}';`);
  sqlLines.push("");
}

sqlLines.push("COMMIT;");
sqlLines.push("");

const sqlPath = path.join(OUT_DIR, "trail-breakdown-apply.sql");
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(sqlPath, sqlLines.join("\n"), "utf8");
console.log(`Wrote SQL: ${path.relative(REPO_ROOT, sqlPath)}`);

// Review CSV — LOW rows, full source/notes preserved. User can hand-verify
// against the source URL, then either edit + use, or drop.
const reviewHeaders = [
  "slug",
  "name",
  "trails_beginner",
  "trails_intermediate",
  "trails_advanced",
  "trails_expert",
  "terrain_park_count",
  "confidence",
  "sources",
  "notes",
];
const reviewLines = [csvLine(reviewHeaders)];
for (const r of buckets.LOW) {
  reviewLines.push(
    csvLine([
      r.slug,
      r.name,
      r.trails_beginner,
      r.trails_intermediate,
      r.trails_advanced,
      r.trails_expert,
      r.terrain_park_count,
      r.confidence,
      r.sources,
      r.notes,
    ]),
  );
}
const reviewPath = path.join(OUT_DIR, "trail-breakdown-review.csv");
fs.writeFileSync(reviewPath, reviewLines.join("\n"), "utf8");
console.log(`Wrote review CSV: ${path.relative(REPO_ROOT, reviewPath)} (${buckets.LOW.length} rows)`);

// Skip CSV — bookkeeping for resorts where no public data was found.
const skipLines = [csvLine(["slug", "name", "notes"])];
for (const r of buckets.SKIP) {
  skipLines.push(csvLine([r.slug, r.name, r.notes]));
}
const skipPath = path.join(OUT_DIR, "trail-breakdown-skip.csv");
fs.writeFileSync(skipPath, skipLines.join("\n"), "utf8");
console.log(`Wrote skip CSV: ${path.relative(REPO_ROOT, skipPath)} (${buckets.SKIP.length} rows)`);

console.log("");
console.log("Coverage projection:");
console.log(`  Currently in DB: 30 / 451 (6.6%)`);
console.log(`  After applying approved SQL: ${30 + approved.length} / 451 (${(((30 + approved.length) / 451) * 100).toFixed(1)}%)`);
console.log(`  Plus review CSV available for manual top-up: +${buckets.LOW.length} rows = ${((30 + approved.length + buckets.LOW.length) / 451 * 100).toFixed(1)}% theoretical max`);
