// Stage 22 — cross-validate 3 agent outputs and emit:
//   - data/stage-22-trail-data.sql  (HIGH + MEDIUM confidence updates)
//   - data/stage-22-low-confidence.csv  (manual review)
//   - data/stage-22-broken-websites.csv  (verified dead URLs)
//
// Run: `node scripts/stage-22-consensus.mjs <batch-id>`
//   reads:  data/stage-22/<batch-id>-strategy-{a,b,c}.json
//   writes/appends the SQL + CSVs above
//   prints a per-resort summary
//
// Numeric consensus rules (per resort):
//   trails_total (integer):
//     3-of-3 within ±5 → HIGH, use median
//     2-of-3 within ±5 → MEDIUM, use median of those two
//     all disagree     → LOW, skip
//   difficulty_pct.{level} (0-100):
//     3-of-3 within ±5 → HIGH, use median
//     2-of-3 within ±5 → MEDIUM, use median
//     all disagree     → LOW, skip that level
//   website_alive:
//     true if Strategy A says alive AND has source_url
//     false if Strategy A reports HTTP error / placeholder
//   website_url:
//     if alive: keep existing; if dead: flag in CSV (we DON'T null it
//     in DB — broken urls get a manual review pass later)
//
// Difficulty consistency: after picking each level, if pcts sum to
// 95-105 keep them. Outside that → LOW (probably mismatched sources).

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import path from "node:path";

const batchId = process.argv[2];
if (!batchId) {
  console.error("Usage: node scripts/stage-22-consensus.mjs <batch-id>");
  process.exit(1);
}

const DIR = path.resolve("data/stage-22");
function loadStrategy(letter) {
  const p = path.join(DIR, `${batchId}-strategy-${letter}.json`);
  if (!existsSync(p)) {
    console.error(`Missing ${p}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

const A = loadStrategy("a");
const B = loadStrategy("b");
const C = loadStrategy("c");

// Index by slug for easy lookup
const idxA = new Map(A.map((r) => [r.slug, r]));
const idxB = new Map(B.map((r) => [r.slug, r]));
const idxC = new Map(C.map((r) => [r.slug, r]));

const slugs = Array.from(
  new Set([...A.map((r) => r.slug), ...B.map((r) => r.slug), ...C.map((r) => r.slug)]),
).sort();

// Tolerance: trails count within ±5 OR ±10%, whichever larger.
function trailsAgree(values) {
  if (values.length < 2) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const tol = Math.max(5, max * 0.1);
  return max - min <= tol;
}
// Pct within ±5 points.
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

const updates = [];           // SQL rows for HIGH/MEDIUM
const lowConfidence = [];     // CSV rows for LOW
const brokenWebsites = [];    // CSV rows for dead URLs

for (const slug of slugs) {
  const a = idxA.get(slug);
  const b = idxB.get(slug);
  const c = idxC.get(slug);

  // ---- trails_total
  const trails = [a?.trails_total, b?.trails_total, c?.trails_total].filter(
    (v) => v != null && Number.isFinite(v) && v > 0,
  );
  let trailsValue = null;
  let trailsConfidence = "NONE";
  if (trails.length === 3 && trailsAgree(trails)) {
    trailsValue = median(trails);
    trailsConfidence = "HIGH";
  } else if (trails.length >= 2) {
    // find pairs that agree
    for (let i = 0; i < trails.length; i++) {
      for (let j = i + 1; j < trails.length; j++) {
        if (trailsAgree([trails[i], trails[j]])) {
          trailsValue = median([trails[i], trails[j]]);
          trailsConfidence = "MEDIUM";
          break;
        }
      }
      if (trailsValue) break;
    }
    if (!trailsValue) trailsConfidence = "LOW";
  } else if (trails.length === 1) {
    trailsConfidence = "LOW";
    trailsValue = trails[0]; // single source — still LOW
  }

  // ---- difficulty_pct per level
  const levels = ["beginner", "intermediate", "advanced", "expert"];
  const pctValues = {};
  const pctConfidence = {};
  for (const lvl of levels) {
    const vs = [a?.difficulty_pct?.[lvl], b?.difficulty_pct?.[lvl], c?.difficulty_pct?.[lvl]]
      .filter((v) => v != null && Number.isFinite(v) && v >= 0 && v <= 100);
    let value = null;
    let conf = "NONE";
    if (vs.length === 3 && pctAgree(vs)) {
      value = median(vs);
      conf = "HIGH";
    } else if (vs.length >= 2) {
      for (let i = 0; i < vs.length; i++) {
        for (let j = i + 1; j < vs.length; j++) {
          if (pctAgree([vs[i], vs[j]])) {
            value = median([vs[i], vs[j]]);
            conf = "MEDIUM";
            break;
          }
        }
        if (value !== null) break;
      }
      if (value === null) conf = "LOW";
    } else if (vs.length === 1) {
      value = vs[0];
      conf = "LOW";
    }
    pctValues[lvl] = value;
    pctConfidence[lvl] = conf;
  }

  // Sanity check: pcts that have values must roughly sum to 100.
  const filled = levels.filter((l) => pctValues[l] != null).map((l) => pctValues[l]);
  const sum = filled.reduce((s, v) => s + v, 0);
  const pctsSane = filled.length === 0 || (sum >= 90 && sum <= 110);
  if (!pctsSane) {
    // Demote all difficulty entries to LOW
    for (const lvl of levels) {
      if (pctValues[lvl] != null) pctConfidence[lvl] = "LOW";
    }
  }

  // ---- website status
  const websiteAlive = a?.website_alive;
  const websiteUrl = a?.website_url ?? null;

  // ---- decide if this resort gets a SQL update
  // Rule: update if trailsConfidence is HIGH/MEDIUM OR any pct is HIGH/MEDIUM
  // and the pct sum is sane (otherwise too noisy to commit).
  const updatableTrails = trailsValue != null && (trailsConfidence === "HIGH" || trailsConfidence === "MEDIUM");
  const updatablePcts = pctsSane && levels.some((l) => pctValues[l] != null && (pctConfidence[l] === "HIGH" || pctConfidence[l] === "MEDIUM"));

  if (updatableTrails || updatablePcts) {
    updates.push({
      slug,
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
      sources: {
        a: a?.source_url,
        b: b?.source_url,
        c: c?.source_url,
      },
    });
  } else if (trails.length === 0 && filled.length === 0) {
    lowConfidence.push({ slug, reason: "no data from any source", a, b, c });
  } else {
    lowConfidence.push({
      slug,
      reason: "all sources disagree or single source",
      trails,
      pctValues,
      pctConfidence,
      a, b, c,
    });
  }

  // ---- websites
  if (websiteAlive === false) {
    brokenWebsites.push({
      slug,
      website_url: websiteUrl,
      notes: a?.notes ?? "",
    });
  }
}

console.log(`\n=== Batch ${batchId} consensus ===`);
console.log(`Total slugs:      ${slugs.length}`);
console.log(`Updatable rows:   ${updates.length}`);
console.log(`Low-confidence:   ${lowConfidence.length}`);
console.log(`Broken websites:  ${brokenWebsites.length}`);

// ---- emit SQL (append; first batch creates header)
const sqlPath = path.resolve("data/stage-22-trail-data.sql");
const sqlNew = !existsSync(sqlPath);
let sqlBlock = "";
if (sqlNew) {
  sqlBlock += "-- Stage 22 — multi-agent verified trail data\n";
  sqlBlock += "-- Generated by scripts/stage-22-consensus.mjs per batch\n";
  sqlBlock += "-- Each UPDATE block represents one resort; HIGH and MEDIUM\n";
  sqlBlock += "-- confidence values only (LOW + single-source skipped).\n\n";
  sqlBlock += "BEGIN;\n\n";
}
sqlBlock += `-- ===== Batch ${batchId} (${updates.length} resorts) =====\n`;
for (const u of updates) {
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
  sqlBlock += `-- ${u.slug} [${conf}]\n`;
  sqlBlock += `UPDATE resorts SET ${set.join(", ")} WHERE slug = '${u.slug}';\n`;
}
sqlBlock += "\n";

appendFileSync(sqlPath, sqlBlock);
console.log(`Appended to ${sqlPath}`);

// ---- emit low-confidence CSV
const lowPath = path.resolve("data/stage-22-low-confidence.csv");
const lowNew = !existsSync(lowPath);
if (lowNew) {
  appendFileSync(
    lowPath,
    "batch,slug,reason,a_trails,b_trails,c_trails,a_pcts,b_pcts,c_pcts,a_source,b_source,c_source\n",
  );
}
for (const l of lowConfidence) {
  const row = [
    batchId,
    l.slug,
    l.reason,
    l.a?.trails_total ?? "",
    l.b?.trails_total ?? "",
    l.c?.trails_total ?? "",
    JSON.stringify(l.a?.difficulty_pct ?? null),
    JSON.stringify(l.b?.difficulty_pct ?? null),
    JSON.stringify(l.c?.difficulty_pct ?? null),
    l.a?.source_url ?? "",
    l.b?.source_url ?? "",
    l.c?.source_url ?? "",
  ];
  appendFileSync(lowPath, row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n");
}
console.log(`Appended to ${lowPath}`);

// ---- emit broken-websites CSV
const brokenPath = path.resolve("data/stage-22-broken-websites.csv");
const brokenNew = !existsSync(brokenPath);
if (brokenNew) {
  appendFileSync(brokenPath, "batch,slug,website_url,notes\n");
}
for (const b of brokenWebsites) {
  appendFileSync(
    brokenPath,
    [batchId, b.slug, b.website_url ?? "", b.notes ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",") + "\n",
  );
}
console.log(`Appended to ${brokenPath}`);

// ---- print per-resort summary
console.log("\n--- Per-resort summary ---");
for (const u of updates) {
  const conf = u.confidence;
  console.log(`  ✓ ${u.slug.padEnd(30)} trails=${u.trails_total ?? "—"} (${conf.trails}) | ${Object.entries(u.pcts).map(([k, v]) => `${k[0]}${v}`).join("/") || "no pcts"}`);
}
for (const l of lowConfidence) {
  console.log(`  ✗ ${l.slug.padEnd(30)} ${l.reason}`);
}
for (const b of brokenWebsites) {
  console.log(`  🔗 ${b.slug.padEnd(30)} BROKEN: ${b.website_url ?? "(no url)"}`);
}
