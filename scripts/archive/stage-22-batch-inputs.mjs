// Stage 22 — generate batch input JSON files for remaining 422 resorts.
// Skips pilot (first 20). Writes data/stage-22/batch-{NN}-input.json for
// the orchestrator agents to read.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const all = JSON.parse(readFileSync(path.resolve("data/stage-22-resorts.json"), "utf8"));
const remaining = all.slice(20); // skip the 20 pilot resorts
const BATCH_SIZE = 30;
const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

console.log(`Remaining resorts: ${remaining.length}`);
console.log(`Batch size: ${BATCH_SIZE}`);
console.log(`Total batches: ${totalBatches}`);

for (let i = 0; i < totalBatches; i++) {
  const batchNum = String(i + 2).padStart(2, "0"); // batch-02, batch-03, ... (pilot = batch 01)
  const slice = remaining.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  const payload = slice.map((r) => ({
    slug: r.slug,
    name: r.name,
    state: r.state,
    website_url: r.website_url,
    current_total_trails: r.total_trails,
    current_difficulty_pct: {
      beginner: r.difficulty_pct_beginner,
      intermediate: r.difficulty_pct_intermediate,
      advanced: r.difficulty_pct_advanced,
      expert: r.difficulty_pct_expert,
    },
  }));
  const outPath = path.resolve(`data/stage-22/batch-${batchNum}-input.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`  ${outPath}  (${slice.length} resorts: ${slice[0].slug} → ${slice[slice.length - 1].slug})`);
}
