// Stage 22 — rebuild data/stage-22-trail-data.sql + CSVs from scratch by
// processing every batch-NN-strategy-{a,b,c}.json file under
// data/stage-22/. Idempotent — overwrites prior output. Same consensus
// rules as scripts/stage-22-consensus.mjs.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("data/stage-22");
// PREFER sanitized files (with fabricated values stripped) when present.
// Falls back to original .json files for batches not yet sanitized.
// Strategy IDs accepted: a, b, c, d (original 3 + deep-dive), and the
// stage-22.5 strict re-verify squad e1, e2, e3, e4, e5.
const STRAT_RE = /^((?:pilot|batch-\d+|deepdive-\d+|reverify-\d+))-strategy-((?:[abcd]|e[12345]))\.(?:sanitized\.)?json$/;
const allFiles = readdirSync(DIR);
const sanitizedFiles = allFiles.filter((f) => /\.sanitized\.json$/.test(f) && STRAT_RE.test(f));
const sanitizedBase = new Set(sanitizedFiles.map((f) => f.replace(".sanitized.json", "")));
const files = [
  ...sanitizedFiles,
  ...allFiles.filter((f) => STRAT_RE.test(f) && !f.includes(".sanitized.") && !sanitizedBase.has(f.replace(".json", ""))),
];

// Group by batch id (deep-dives + reverify are their own batch ids —
// that's fine, the consensus merges values per-slug below).
const byBatch = new Map();
for (const f of files) {
  const m = f.match(STRAT_RE);
  if (!m) continue;
  const [, batchId, letter] = m;
  if (!byBatch.has(batchId)) byBatch.set(batchId, {});
  const records = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  byBatch.get(batchId)[letter] = records;
}

console.log(`Processing ${byBatch.size} batches:`);
for (const [b] of byBatch) console.log(`  ${b}`);

// Build a slug → list of source records map across ALL batches/strategies.
// A slug may appear in batch-XX (A/B/C), deepdive-YY (D), AND reverify-ZZ
// (E1-E5) — consider every source when computing consensus.
const STRATEGIES = ["a", "b", "c", "d", "e1", "e2", "e3", "e4", "e5"];
const sourcesBySlug = new Map();
for (const [batchId, strategies] of byBatch) {
  for (const letter of STRATEGIES) {
    const records = strategies[letter] ?? [];
    for (const r of records) {
      if (!r?.slug) continue;
      if (!sourcesBySlug.has(r.slug)) sourcesBySlug.set(r.slug, []);
      sourcesBySlug.get(r.slug).push({ ...r, _batchId: batchId, _strategy: letter });
    }
  }
}
// Also remember which batch ID a slug FIRST belonged to (for grouping output).
const firstBatchBySlug = new Map();
for (const [batchId, strategies] of byBatch) {
  // skip deepdive batches when assigning "primary" batch — they're auxiliary
  if (batchId.startsWith("deepdive-")) continue;
  for (const letter of ["a", "b", "c"]) {
    for (const r of strategies[letter] ?? []) {
      if (r?.slug && !firstBatchBySlug.has(r.slug)) firstBatchBySlug.set(r.slug, batchId);
    }
  }
}

// Tolerance: trails count within ±5 OR ±10%, whichever larger.
function trailsAgree(values) {
  if (values.length < 2) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const tol = Math.max(5, max * 0.1);
  return max - min <= tol;
}
function pctAgree(values) {
  if (values.length < 2) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min <= 5;
}
function median(values) {
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const allUpdates = [];      // SQL rows
const allLow = [];          // CSV rows for LOW confidence
const allBroken = [];       // CSV rows for dead URLs

// Build per-slug consensus from ALL available sources (A, B, C, plus D
// deep-dive when present).
const allSlugs = Array.from(sourcesBySlug.keys()).sort();
for (const slug of allSlugs) {
  const sources = sourcesBySlug.get(slug);
  const aSrc = sources.find((s) => s._strategy === "a");
  const dSrc = sources.find((s) => s._strategy === "d");
  // Deep-dive's own consensus_confidence is a strong signal — if D itself
  // declared HIGH/MEDIUM after cross-checking, we trust it as a 2-source
  // equivalent.
  const dTrust = dSrc?.consensus_confidence === "HIGH" || dSrc?.consensus_confidence === "MEDIUM";

  // ---- trails_total
  const trailsAll = sources
    .map((s) => s.trails_total)
    .filter((v) => v != null && Number.isFinite(v) && v > 0);
  let trailsValue = null;
  let trailsConfidence = "NONE";
  if (trailsAll.length >= 3) {
    // Find the largest cluster that mutually agrees.
    const sorted = [...trailsAll].sort((x, y) => x - y);
    let bestCluster = [];
    for (let i = 0; i < sorted.length; i++) {
      const cluster = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        if (trailsAgree([cluster[0], sorted[j]])) cluster.push(sorted[j]);
      }
      if (cluster.length > bestCluster.length) bestCluster = cluster;
    }
    if (bestCluster.length >= 3) {
      trailsValue = median(bestCluster);
      trailsConfidence = "HIGH";
    } else if (bestCluster.length === 2) {
      trailsValue = median(bestCluster);
      trailsConfidence = "MEDIUM";
    } else {
      trailsConfidence = "LOW";
      trailsValue = median(trailsAll);
    }
  } else if (trailsAll.length === 2) {
    if (trailsAgree(trailsAll)) {
      trailsValue = median(trailsAll);
      trailsConfidence = "MEDIUM";
    } else {
      // 2 disagree — keep the median but mark LOW so it won't be
      // written. Don't trust single-source D anymore.
      trailsValue = median(trailsAll);
      trailsConfidence = "LOW";
    }
  } else if (trailsAll.length === 1) {
    // Single source = always LOW. No more deepdive single-source promotion.
    trailsValue = trailsAll[0];
    trailsConfidence = "LOW";
  }

  // ---- difficulty_pct per level
  const levels = ["beginner", "intermediate", "advanced", "expert"];
  const pctValues = {};
  const pctConfidence = {};
  for (const lvl of levels) {
    const vs = sources
      .map((s) => s.difficulty_pct?.[lvl])
      .filter((v) => v != null && Number.isFinite(v) && v >= 0 && v <= 100);
    let value = null;
    let conf = "NONE";
    if (vs.length >= 3) {
      const sorted = [...vs].sort((x, y) => x - y);
      let bestCluster = [];
      for (let i = 0; i < sorted.length; i++) {
        const cluster = [sorted[i]];
        for (let j = i + 1; j < sorted.length; j++) {
          if (pctAgree([cluster[0], sorted[j]])) cluster.push(sorted[j]);
        }
        if (cluster.length > bestCluster.length) bestCluster = cluster;
      }
      if (bestCluster.length >= 3) {
        value = median(bestCluster);
        conf = "HIGH";
      } else if (bestCluster.length === 2) {
        value = median(bestCluster);
        conf = "MEDIUM";
      } else {
        conf = "LOW";
        value = median(vs);
      }
    } else if (vs.length === 2) {
      if (pctAgree(vs)) {
        value = median(vs);
        conf = "MEDIUM";
      } else {
        // 2 disagree → LOW (don't trust single-source D).
        value = median(vs);
        conf = "LOW";
      }
    } else if (vs.length === 1) {
      // Single source = always LOW.
      value = vs[0];
      conf = "LOW";
    }
    pctValues[lvl] = value;
    pctConfidence[lvl] = conf;
  }

  // Sanity check: filled pcts sum to ~100.
  const filled = levels.filter((l) => pctValues[l] != null).map((l) => pctValues[l]);
  const sum = filled.reduce((s, v) => s + v, 0);
  const pctsSane = filled.length === 0 || (sum >= 90 && sum <= 110);
  if (!pctsSane) {
    for (const lvl of levels) {
      if (pctValues[lvl] != null) pctConfidence[lvl] = "LOW";
    }
  }

  const websiteAlive = aSrc?.website_alive;
  const websiteUrl = aSrc?.website_url ?? null;
  const batchId = firstBatchBySlug.get(slug) ?? "unknown";

  const updatableTrails = trailsValue != null && (trailsConfidence === "HIGH" || trailsConfidence === "MEDIUM");
  const updatablePcts = pctsSane && levels.some((l) => pctValues[l] != null && (pctConfidence[l] === "HIGH" || pctConfidence[l] === "MEDIUM"));

  if (updatableTrails || updatablePcts) {
    allUpdates.push({
      batchId, slug,
      trails_total: updatableTrails ? trailsValue : null,
      pcts: levels.reduce((acc, l) => {
        if (pctValues[l] != null && (pctConfidence[l] === "HIGH" || pctConfidence[l] === "MEDIUM") && pctsSane) {
          acc[l] = pctValues[l];
        }
        return acc;
      }, {}),
      confidence: {
        trails: trailsConfidence,
        ...Object.fromEntries(levels.map((l) => [l, pctConfidence[l]])),
      },
      hadDeepDive: dSrc != null,
    });
  } else {
    allLow.push({
      batchId, slug,
      reason: trailsAll.length === 0 && filled.length === 0 ? "no data" : "all sources disagree or single source",
      trails: trailsAll,
      pctValues,
      pctConfidence,
      sources: sources.map((s) => ({ strategy: s._strategy, batch: s._batchId, trails: s.trails_total, pct: s.difficulty_pct, src: s.source_url })),
    });
  }

  if (websiteAlive === false) {
    allBroken.push({
      batchId, slug,
      website_url: websiteUrl,
      notes: aSrc?.notes ?? "",
    });
  }
}

// Dedupe broken websites by slug (keep first occurrence)
const seenBroken = new Set();
const dedupedBroken = [];
for (const b of allBroken) {
  if (seenBroken.has(b.slug)) continue;
  seenBroken.add(b.slug);
  dedupedBroken.push(b);
}

console.log(`\n=== Totals across all batches ===`);
console.log(`Updates:          ${allUpdates.length}`);
console.log(`Low-confidence:   ${allLow.length}`);
console.log(`Broken websites:  ${dedupedBroken.length}`);

// Emit SQL
const sqlPath = path.resolve("data/stage-22-trail-data.sql");
let sql = "-- Stage 22 — multi-agent verified trail data\n";
sql += "-- Generated by scripts/stage-22-build-all.mjs from all batch files\n";
sql += `-- Total updates: ${allUpdates.length} (HIGH + MEDIUM confidence values)\n`;
sql += "-- Confidence levels: HIGH = 3-of-3 agents agree, MEDIUM = 2-of-3 agree\n\n";
sql += "BEGIN;\n\n";
let lastBatch = "";
for (const u of allUpdates) {
  if (u.batchId !== lastBatch) {
    sql += `-- ===== ${u.batchId} =====\n`;
    lastBatch = u.batchId;
  }
  const set = [];
  if (u.trails_total != null) set.push(`total_trails = ${u.trails_total}`);
  for (const [lvl, val] of Object.entries(u.pcts)) {
    set.push(`difficulty_pct_${lvl} = ${val}`);
  }
  set.push(`last_verified_at = now()`);
  const conf = Object.entries(u.confidence)
    .filter(([, v]) => v !== "NONE")
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  sql += `-- ${u.slug} [${conf}]\n`;
  sql += `UPDATE resorts SET ${set.join(", ")} WHERE slug = '${u.slug}';\n`;
}
sql += "\nCOMMIT;\n";
writeFileSync(sqlPath, sql);
console.log(`Wrote ${sqlPath}`);

// Emit low-confidence CSV
const lowPath = path.resolve("data/stage-22-low-confidence.csv");
let lowCsv = "batch,slug,reason,trails_observed,pct_observed,sources_json\n";
for (const l of allLow) {
  const row = [
    l.batchId, l.slug, l.reason,
    JSON.stringify(l.trails ?? []),
    JSON.stringify(l.pctValues ?? {}),
    JSON.stringify(l.sources ?? []),
  ];
  lowCsv += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
}
writeFileSync(lowPath, lowCsv);
console.log(`Wrote ${lowPath}`);

// Emit broken-websites CSV
const brokenPath = path.resolve("data/stage-22-broken-websites.csv");
let brokenCsv = "slug,website_url,notes\n";
for (const b of dedupedBroken) {
  brokenCsv += [b.slug, b.website_url ?? "", b.notes ?? ""]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",") + "\n";
}
writeFileSync(brokenPath, brokenCsv);
console.log(`Wrote ${brokenPath}`);

// Also emit JSON of LOW slugs for the deep-dive re-attempt pass
const lowSlugs = allLow.map((l) => l.slug);
const lowSlugsPath = path.resolve("data/stage-22/low-confidence-slugs.json");
writeFileSync(lowSlugsPath, JSON.stringify(lowSlugs, null, 2));
console.log(`Wrote ${lowSlugsPath} (${lowSlugs.length} slugs)`);
