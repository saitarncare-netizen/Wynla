// Builds the freelancer worksheet for Fastwork. Stage 18 pivoted from
// trail counts to percentages. Worksheet asks the freelancer for:
//   verified_pct_beginner, verified_pct_intermediate,
//   verified_pct_advanced, verified_pct_expert (must sum ≈ 100)
//   verified_terrain_park_count (kept as integer, separate from %)
//
// Merges the latest agent-LOW guesses (counts converted to %) into
// agent_guess_pct_* columns so the freelancer has a head-start where
// available — verifying is much faster than researching from scratch.
//
// Output: data/fastwork-trail-data-input.csv
//
// Run: node scripts/build-fastwork-csv.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const SUPABASE_URL = "https://yhmzkeeaiknsotydaucs.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobXprZWVhaWtuc290eWRhdWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTAyMTcsImV4cCI6MjA5MzMyNjIxN30.7s8DMxVY3Qsijw9p90AIwxdECvs3AZfbwFMP10JB88c";

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

// Pull agent-derived % leads. The Stage 18 batches (.tmp-pct-trail-batch-*.csv)
// hold the latest, freshest guesses; if not yet generated, fall back to
// converting the Stage 16 LOW count rows into approximate %.
function loadPctLeads() {
  const leads = new Map(); // slug → {pct_b, pct_i, pct_a, pct_e, park, source, notes}
  for (let i = 1; i <= 5; i++) {
    const p = path.join(REPO_ROOT, `.tmp-pct-trail-batch-${i}.csv`);
    if (!fs.existsSync(p)) continue;
    for (const r of parseCsv(fs.readFileSync(p, "utf8"))) {
      leads.set(r.slug, {
        pct_b: r.pct_beginner,
        pct_i: r.pct_intermediate,
        pct_a: r.pct_advanced,
        pct_e: r.pct_expert,
        park: r.terrain_park_count,
        source: r.sources,
        notes: r.notes,
      });
    }
  }
  if (leads.size > 0) return leads;

  // Fallback: convert Stage 16 LOW count rows to approximate % so the
  // worksheet still ships with leads even before the % agent run.
  const reviewPath = path.join(REPO_ROOT, "data/trail-breakdown-review.csv");
  if (!fs.existsSync(reviewPath)) return leads;
  for (const r of parseCsv(fs.readFileSync(reviewPath, "utf8"))) {
    const b = Number(r.trails_beginner) || 0;
    const i = Number(r.trails_intermediate) || 0;
    const a = Number(r.trails_advanced) || 0;
    const e = Number(r.trails_expert) || 0;
    const sum = b + i + a + e;
    if (sum === 0) continue;
    leads.set(r.slug, {
      pct_b: Math.round((b / sum) * 100),
      pct_i: Math.round((i / sum) * 100),
      pct_a: Math.round((a / sum) * 100),
      pct_e: Math.round((e / sum) * 100),
      park: r.terrain_park_count,
      source: r.sources,
      notes: (r.notes ? r.notes + "; " : "") + "converted from agent count guess",
    });
  }
  return leads;
}

const leads = loadPctLeads();
console.log(`Loaded ${leads.size} agent leads.`);

// Pull resorts that still have no pct yet.
const url =
  `${SUPABASE_URL}/rest/v1/resorts?select=slug,name,state,website_url,total_trails,difficulty_pct_beginner&active=eq.true&difficulty_pct_beginner=is.null&order=name`;
const res = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
if (!res.ok) {
  console.error("Failed to fetch resorts:", res.status, await res.text());
  process.exit(1);
}
const missing = await res.json();
console.log(`Loaded ${missing.length} resorts still missing pct data.`);

const headers = [
  "slug",
  "name",
  "state",
  "website_url",
  "current_total_trails",
  "agent_guess_pct_beginner",
  "agent_guess_pct_intermediate",
  "agent_guess_pct_advanced",
  "agent_guess_pct_expert",
  "agent_guess_terrain_park_count",
  "agent_source",
  "agent_notes",
  // ── Freelancer fills these columns ──
  "verified_pct_beginner",
  "verified_pct_intermediate",
  "verified_pct_advanced",
  "verified_pct_expert",
  "verified_terrain_park_count",
  "verified_source_url",
  "freelancer_notes",
];

const lines = [csvLine(headers)];
for (const r of missing) {
  const lead = leads.get(r.slug);
  lines.push(
    csvLine([
      r.slug,
      r.name,
      r.state,
      r.website_url ?? "",
      r.total_trails ?? "",
      lead?.pct_b ?? "",
      lead?.pct_i ?? "",
      lead?.pct_a ?? "",
      lead?.pct_e ?? "",
      lead?.park ?? "",
      lead?.source ?? "",
      lead?.notes ?? "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  );
}

const outPath = path.join(REPO_ROOT, "data/fastwork-trail-data-input.csv");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(REPO_ROOT, outPath)} (${missing.length} rows).`);

const withLeads = missing.filter((r) => leads.has(r.slug));
console.log(`  - ${withLeads.length} have agent leads (faster to verify)`);
console.log(`  - ${missing.length - withLeads.length} need full research`);
