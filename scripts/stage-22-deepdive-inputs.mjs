// Stage 22 — split LOW-confidence slugs into deep-dive batches (25/batch).

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const lowSlugs = JSON.parse(readFileSync(path.resolve("data/stage-22/low-confidence-slugs.json"), "utf8"));
const allResorts = JSON.parse(readFileSync(path.resolve("data/stage-22-resorts.json"), "utf8"));
const bySlug = new Map(allResorts.map((r) => [r.slug, r]));

const BATCH = 25;
const total = Math.ceil(lowSlugs.length / BATCH);
console.log(`LOW resorts: ${lowSlugs.length}, batches of ${BATCH} → ${total} batches`);

for (let i = 0; i < total; i++) {
  const slice = lowSlugs.slice(i * BATCH, (i + 1) * BATCH);
  const payload = slice.map((slug) => {
    const r = bySlug.get(slug);
    return r
      ? {
          slug: r.slug,
          name: r.name,
          state: r.state,
          website_url: r.website_url,
        }
      : { slug };
  });
  const batchId = `deepdive-${String(i + 1).padStart(2, "0")}`;
  const outPath = path.resolve(`data/stage-22/${batchId}-input.json`);
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`  ${outPath}  (${slice.length} resorts: ${slice[0]} → ${slice[slice.length - 1]})`);
}
