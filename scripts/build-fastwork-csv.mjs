// Builds the freelancer worksheet for Fastwork. Merges:
//   1. Current resorts list (still NULL after Stage 16 SQL applied)
//   2. Agent's LOW-confidence leads from data/trail-breakdown-review.csv
//      (gives the freelancer a head-start: "agent guessed X — verify")
//
// Output:
//   data/fastwork-trail-data-input.csv — single sheet for the freelancer
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

const reviewPath = path.join(REPO_ROOT, "data/trail-breakdown-review.csv");
const review = fs.existsSync(reviewPath) ? parseCsv(fs.readFileSync(reviewPath, "utf8")) : [];
const reviewBySlug = new Map(review.map((r) => [r.slug, r]));

console.log(`Loaded ${review.length} agent LOW leads.`);

// Pull current resort list from Supabase, filter to those still NULL.
const url =
  `${SUPABASE_URL}/rest/v1/resorts?select=slug,name,state,website_url,total_trails,trails_beginner&active=eq.true&trails_beginner=is.null&order=name`;
const res = await fetch(url, { headers: { apikey: SUPABASE_KEY } });
if (!res.ok) {
  console.error("Failed to fetch resorts:", res.status, await res.text());
  process.exit(1);
}
const missing = await res.json();
console.log(`Loaded ${missing.length} resorts still missing trail data.`);

const headers = [
  "slug",
  "name",
  "state",
  "website_url",
  "current_total_trails",
  "agent_guess_beginner",
  "agent_guess_intermediate",
  "agent_guess_advanced",
  "agent_guess_expert",
  "agent_guess_terrain_park_count",
  "agent_source",
  "agent_notes",
  // ── Freelancer fills these columns ──
  "verified_beginner",
  "verified_intermediate",
  "verified_advanced",
  "verified_expert",
  "verified_terrain_park_count",
  "verified_source_url",
  "freelancer_notes",
];

const lines = [csvLine(headers)];
for (const r of missing) {
  const lead = reviewBySlug.get(r.slug);
  lines.push(
    csvLine([
      r.slug,
      r.name,
      r.state,
      r.website_url ?? "",
      r.total_trails ?? "",
      lead?.trails_beginner ?? "",
      lead?.trails_intermediate ?? "",
      lead?.trails_advanced ?? "",
      lead?.trails_expert ?? "",
      lead?.terrain_park_count ?? "",
      lead?.sources ?? "",
      lead?.notes ?? "",
      "", // verified_beginner
      "", // verified_intermediate
      "", // verified_advanced
      "", // verified_expert
      "", // verified_terrain_park_count
      "", // verified_source_url
      "", // freelancer_notes
    ]),
  );
}

const outPath = path.join(REPO_ROOT, "data/fastwork-trail-data-input.csv");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(REPO_ROOT, outPath)} (${missing.length} rows).`);

// Also generate a "with leads" subset — resorts where the agent had a
// guess. Freelancer can prioritize these (faster to verify than to
// research from scratch).
const withLeads = missing.filter((r) => reviewBySlug.has(r.slug));
console.log(`  - ${withLeads.length} have agent leads (faster to verify)`);
console.log(`  - ${missing.length - withLeads.length} need full research`);
