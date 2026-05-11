// Stage 22.5 — prepare re-verification batches for LOW-confidence slugs.
// Splits the 45 remaining LOWs into 2 batches for 5-agent re-check.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const lows = JSON.parse(readFileSync(path.resolve("data/stage-22/low-confidence-slugs.json"), "utf8"));
const all = JSON.parse(readFileSync(path.resolve("data/stage-22-resorts.json"), "utf8"));
const bySlug = new Map(all.map((r) => [r.slug, r]));

const BATCH = Math.ceil(lows.length / 2);
console.log(`LOW slugs: ${lows.length}, splitting into 2 batches of ~${BATCH}`);

for (let i = 0; i < 2; i++) {
  const slice = lows.slice(i * BATCH, (i + 1) * BATCH);
  const payload = slice.map((slug) => {
    const r = bySlug.get(slug);
    return r ? { slug: r.slug, name: r.name, state: r.state, website_url: r.website_url } : { slug };
  });
  const id = `reverify-${String(i + 1).padStart(2, "0")}`;
  const out = path.resolve(`data/stage-22/${id}-input.json`);
  writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(`  ${out}  (${slice.length} resorts)`);
}
