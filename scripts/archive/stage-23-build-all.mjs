// Stage 23 — consensus across 5 agent strategies for 18 new fields.
// Reads data/stage-23/*-strategy-eN.json, normalizes field names (agents
// returned slight variants), then computes consensus per field:
//
//   numeric (lifts/elevations/snowfall/pct/distance):
//     ≥3 sources agreeing within tolerance → HIGH, write
//     ≥2 sources agreeing → MEDIUM, write
//     single source or all disagree → LOW, skip
//
//   boolean (has_*):
//     ≥4 of 5 voting same way → HIGH, write
//     ≥3 of 5 voting same way → MEDIUM, write
//     2-2 split or single source → LOW, skip
//
//   text (season_open_text / season_close_text):
//     ≥2 sources providing semantically similar values → MEDIUM, write
//     (normalized: lowercase, strip "th"/punct, dedupe across "mid-Nov"
//     vs "Mid November")
//
//   URL (trail_map_url / webcam_url):
//     any single source → write (these aren't really cross-validatable;
//     we accept the first valid URL we find)
//
//   IATA + airport_distance_mi:
//     IATA = string match. ≥2 → write. distance numeric tolerance ±15mi.
//
// Output: data/stage-23-trail-data.sql (UPDATEs) + low-confidence CSV.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("data/stage-23");

// Field-name aliases agents used in practice. Each canonical key maps
// to a list of variants we'll check on each record.
const FIELD_MAP = {
  total_lifts: ["total_lifts", "lifts", "lift_count"],
  high_speed_lifts: ["high_speed_lifts", "high_speed_count", "fast_lifts"],
  base_elevation_ft: ["base_elevation_ft", "base_elev_ft", "elevation_bottom_ft", "base_elevation"],
  summit_elevation_ft: ["summit_elevation_ft", "summit_elev_ft", "elevation_top_ft", "summit_elevation", "peak_elevation_ft"],
  annual_snowfall_in: ["annual_snowfall_in", "annual_snowfall_inches", "snowfall_in", "annual_snowfall"],
  season_open_text: ["season_open_text", "season_open", "typical_season_start", "open_text"],
  season_close_text: ["season_close_text", "season_close", "typical_season_end", "close_text"],
  snowmaking_pct: ["snowmaking_pct", "snowmaking_percent", "snowmaking"],
  has_tubing: ["has_tubing", "tubing"],
  has_lessons: ["has_lessons", "lessons"],
  has_rentals: ["has_rentals", "rentals"],
  has_lodging_on_mountain: ["has_lodging_on_mountain", "has_lodging", "lodging_on_mountain", "lodging"],
  has_xc_skiing: ["has_xc_skiing", "has_xc", "xc_skiing", "has_nordic"],
  has_backcountry_access: ["has_backcountry_access", "has_backcountry", "backcountry_access"],
  trail_map_url: ["trail_map_url", "trailmap_url"],
  webcam_url: ["webcam_url", "webcam"],
  closest_airport_iata: ["closest_airport_iata", "nearest_airport_code", "airport_iata", "airport_code"],
  closest_airport_distance_mi: ["closest_airport_distance_mi", "airport_distance_mi", "nearest_airport_distance"],
};

const NUMERIC_FIELDS = [
  "total_lifts", "high_speed_lifts", "base_elevation_ft", "summit_elevation_ft",
  "annual_snowfall_in", "snowmaking_pct", "closest_airport_distance_mi",
];
const BOOL_FIELDS = [
  "has_tubing", "has_lessons", "has_rentals", "has_lodging_on_mountain",
  "has_xc_skiing", "has_backcountry_access",
];
const TEXT_FIELDS = ["season_open_text", "season_close_text"];
const URL_FIELDS = ["trail_map_url", "webcam_url"];
const IATA_FIELD = "closest_airport_iata";

// Tolerances per numeric field
const TOLERANCES = {
  total_lifts: { abs: 2, pct: 0.15 },
  high_speed_lifts: { abs: 1, pct: 0.20 },
  base_elevation_ft: { abs: 100, pct: 0.05 },
  summit_elevation_ft: { abs: 100, pct: 0.03 },
  annual_snowfall_in: { abs: 25, pct: 0.15 },
  snowmaking_pct: { abs: 10, pct: 0 },
  closest_airport_distance_mi: { abs: 15, pct: 0.20 },
};

function getField(record, canonicalKey) {
  if (record == null) return null;
  const aliases = FIELD_MAP[canonicalKey] ?? [canonicalKey];
  for (const a of aliases) {
    if (record[a] != null) return record[a];
    // also check nested .fields.{alias}.value form some agents used
    if (record.fields && record.fields[a]) {
      const v = record.fields[a];
      if (v && typeof v === "object" && "value" in v) return v.value;
      if (v != null) return v;
    }
  }
  return null;
}

function isFabricated(notes) {
  if (typeof notes !== "string") return false;
  return /\b(estimat(ed|e|ing)?|typical|approx(imate(ly)?)?|guess(ed|es|ing)?|inferred|fill[- ]?in|assume(d|s|ing)?|presumed|likely|probably)\b/i.test(notes);
}

function numericAgree(a, b, tol) {
  const diff = Math.abs(a - b);
  const cap = Math.max(tol.abs, Math.max(a, b) * (tol.pct ?? 0));
  return diff <= cap;
}

function bestNumericCluster(values, tol) {
  // Find largest subset where every value agrees with the cluster median.
  const sorted = [...values].sort((x, y) => x - y);
  let best = [];
  for (let i = 0; i < sorted.length; i++) {
    const cluster = [sorted[i]];
    for (let j = i + 1; j < sorted.length; j++) {
      if (numericAgree(cluster[0], sorted[j], tol)) cluster.push(sorted[j]);
    }
    if (cluster.length > best.length) best = cluster;
  }
  return best;
}

function median(arr) {
  const s = [...arr].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function normalizeText(s) {
  if (typeof s !== "string") return null;
  return s
    .toLowerCase()
    .replace(/[.,;:()\[\]{}'"`!?]/g, "")
    .replace(/\b(early|mid|mid-|late)\b/g, (m) => m.replace("-", ""))
    .replace(/\s+/g, " ")
    .trim();
}

// Load all stage-23 strategy files, indexed by slug.
const files = readdirSync(DIR).filter((f) => /^batch-\d+-strategy-e[12345]\.json$/.test(f));
const sourcesBySlug = new Map();

for (const f of files) {
  const m = f.match(/^batch-(\d+)-strategy-(e[12345])\.json$/);
  if (!m) continue;
  const [, batchId, letter] = m;
  let records;
  try {
    records = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  } catch (err) {
    console.warn(`Skipping ${f}: invalid JSON`);
    continue;
  }
  if (!Array.isArray(records)) continue;
  for (const r of records) {
    if (!r?.slug) continue;
    // Skip records whose notes admit fabrication
    if (isFabricated(r.notes)) continue;
    if (!sourcesBySlug.has(r.slug)) sourcesBySlug.set(r.slug, []);
    sourcesBySlug.get(r.slug).push({ ...r, _strategy: letter, _batch: batchId });
  }
}

console.log(`Loaded sources for ${sourcesBySlug.size} resort slugs`);

const updates = [];
const skipped = [];

for (const [slug, sources] of sourcesBySlug) {
  const out = { slug };
  const confidence = {};
  let anyWrite = false;

  // ---- Numeric fields
  for (const field of NUMERIC_FIELDS) {
    const tol = TOLERANCES[field];
    const vals = sources
      .map((s) => {
        const v = getField(s, field);
        const n = typeof v === "number" ? v : parseFloat(v);
        return Number.isFinite(n) ? n : null;
      })
      .filter((v) => v != null);
    if (vals.length === 0) {
      confidence[field] = "NONE";
      continue;
    }
    if (vals.length === 1) {
      confidence[field] = "LOW";
      continue;
    }
    const cluster = bestNumericCluster(vals, tol);
    if (cluster.length >= 3) {
      out[field] = median(cluster);
      confidence[field] = "HIGH";
      anyWrite = true;
    } else if (cluster.length === 2) {
      out[field] = median(cluster);
      confidence[field] = "MEDIUM";
      anyWrite = true;
    } else {
      confidence[field] = "LOW";
    }
  }

  // ---- Boolean fields
  for (const field of BOOL_FIELDS) {
    const votes = sources.map((s) => getField(s, field)).filter((v) => typeof v === "boolean");
    if (votes.length === 0) {
      confidence[field] = "NONE";
      continue;
    }
    const trues = votes.filter((v) => v === true).length;
    const falses = votes.filter((v) => v === false).length;
    if (votes.length === 1) {
      confidence[field] = "LOW";
      continue;
    }
    // need majority of 3+ for MEDIUM, 4+ for HIGH (out of all votes)
    if (trues >= 4 && trues >= falses + 2) {
      out[field] = true;
      confidence[field] = "HIGH";
      anyWrite = true;
    } else if (falses >= 4 && falses >= trues + 2) {
      out[field] = false;
      confidence[field] = "HIGH";
      anyWrite = true;
    } else if (trues >= 3 && trues > falses) {
      out[field] = true;
      confidence[field] = "MEDIUM";
      anyWrite = true;
    } else if (falses >= 3 && falses > trues) {
      out[field] = false;
      confidence[field] = "MEDIUM";
      anyWrite = true;
    } else if (trues === votes.length && trues >= 2) {
      out[field] = true;
      confidence[field] = "MEDIUM";
      anyWrite = true;
    } else if (falses === votes.length && falses >= 2) {
      out[field] = false;
      confidence[field] = "MEDIUM";
      anyWrite = true;
    } else {
      confidence[field] = "LOW";
    }
  }

  // ---- Text fields (season dates)
  for (const field of TEXT_FIELDS) {
    const raw = sources.map((s) => getField(s, field)).filter((v) => typeof v === "string" && v.trim());
    if (raw.length === 0) {
      confidence[field] = "NONE";
      continue;
    }
    const norm = raw.map(normalizeText).filter(Boolean);
    const counts = new Map();
    for (const n of norm) counts.set(n, (counts.get(n) ?? 0) + 1);
    let bestKey = null;
    let bestCount = 0;
    for (const [k, c] of counts) {
      if (c > bestCount) { bestCount = c; bestKey = k; }
    }
    if (bestCount >= 2) {
      // pick the first un-normalized version of bestKey
      const idx = norm.indexOf(bestKey);
      out[field] = raw[idx];
      confidence[field] = bestCount >= 3 ? "HIGH" : "MEDIUM";
      anyWrite = true;
    } else {
      confidence[field] = "LOW";
    }
  }

  // ---- URL fields (single source acceptable)
  for (const field of URL_FIELDS) {
    const urls = sources.map((s) => getField(s, field)).filter((v) => typeof v === "string" && /^https?:\/\//.test(v));
    if (urls.length === 0) {
      confidence[field] = "NONE";
      continue;
    }
    // Prefer URLs that ≥2 agents agree on; else first one
    const counts = new Map();
    for (const u of urls) counts.set(u, (counts.get(u) ?? 0) + 1);
    let bestUrl = urls[0];
    let bestCount = 1;
    for (const [u, c] of counts) {
      if (c > bestCount) { bestCount = c; bestUrl = u; }
    }
    out[field] = bestUrl;
    confidence[field] = bestCount >= 2 ? "MEDIUM" : "LOW";
    anyWrite = true;
  }

  // ---- IATA code (3-letter)
  {
    const codes = sources
      .map((s) => getField(s, IATA_FIELD))
      .filter((v) => typeof v === "string" && /^[A-Z]{3}$/i.test(v.trim()))
      .map((v) => v.trim().toUpperCase());
    if (codes.length === 0) {
      confidence[IATA_FIELD] = "NONE";
    } else {
      const counts = new Map();
      for (const c of codes) counts.set(c, (counts.get(c) ?? 0) + 1);
      let bestCode = codes[0];
      let bestCount = 1;
      for (const [c, n] of counts) {
        if (n > bestCount) { bestCount = n; bestCode = c; }
      }
      if (bestCount >= 2 || codes.length === 1) {
        out[IATA_FIELD] = bestCode;
        confidence[IATA_FIELD] = bestCount >= 3 ? "HIGH" : bestCount >= 2 ? "MEDIUM" : "LOW";
        if (confidence[IATA_FIELD] !== "LOW") anyWrite = true;
      } else {
        confidence[IATA_FIELD] = "LOW";
      }
    }
  }

  if (anyWrite) {
    updates.push({ slug, fields: out, confidence });
  } else {
    skipped.push({ slug, confidence });
  }
}

// ---- Emit SQL
const sqlPath = path.resolve("data/stage-23-trail-data.sql");
let sql = "-- Stage 23 — 18-field cross-validated resort data\n";
sql += "-- Generated by scripts/stage-23-build-all.mjs from 80 agent JSONs (5 strategies × 16 batches)\n";
sql += `-- Total updates: ${updates.length} (HIGH + MEDIUM consensus only)\n`;
sql += "-- Confidence: numeric HIGH = 3+ sources agree, MEDIUM = 2 sources agree\n";
sql += "-- Boolean: HIGH = 4+ votes one way, MEDIUM = 3 of 5\n";
sql += "-- Text/URL/IATA: HIGH = 3+ match, MEDIUM = 2 match (URL accepts single)\n\n";
sql += "BEGIN;\n\n";

for (const u of updates) {
  const sets = [];
  for (const [field, value] of Object.entries(u.fields)) {
    if (field === "slug") continue;
    if (value === null || value === undefined) continue;
    if (typeof value === "boolean") {
      sets.push(`${field} = ${value}`);
    } else if (typeof value === "number") {
      sets.push(`${field} = ${value}`);
    } else if (typeof value === "string") {
      const esc = value.replace(/'/g, "''");
      sets.push(`${field} = '${esc}'`);
    }
  }
  if (sets.length === 0) continue;
  sets.push(`last_verified_at = now()`);
  const conf = Object.entries(u.confidence)
    .filter(([, v]) => v !== "NONE" && v !== "LOW")
    .map(([k, v]) => `${k}=${v[0]}`)
    .join(" ");
  sql += `-- ${u.slug} [${conf}]\n`;
  sql += `UPDATE resorts SET ${sets.join(", ")} WHERE slug = '${u.slug}';\n`;
}

sql += "\nCOMMIT;\n";
writeFileSync(sqlPath, sql);

console.log(`\n=== Stage 23 consensus ===`);
console.log(`Updates written:    ${updates.length}`);
console.log(`Resorts skipped:    ${skipped.length}`);

// Field-level coverage stats
const fieldStats = {};
for (const u of updates) {
  for (const f of Object.keys(u.fields)) {
    if (f === "slug") continue;
    fieldStats[f] = (fieldStats[f] ?? 0) + 1;
  }
}
console.log(`\n--- Per-field coverage ---`);
const allFields = [...NUMERIC_FIELDS, ...BOOL_FIELDS, ...TEXT_FIELDS, ...URL_FIELDS, IATA_FIELD];
for (const f of allFields) {
  console.log(`  ${f.padEnd(35)} ${fieldStats[f] ?? 0}/${updates.length + skipped.length}`);
}
console.log(`\nWrote ${sqlPath}`);
