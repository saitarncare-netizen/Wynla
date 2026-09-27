// One-shot helper: pull every active resort from Supabase, split into N
// batches, write each batch as JSON so a Phase 2 agent can read its slice
// and run WebFetch verification independently.
//
// Run:  node scripts/fetch-resorts-for-verify.mjs
// Out:  output/verify-batch-{1..10}.json

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

{
  const text = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data, error } = await supabase
  .from("resorts")
  .select("id, slug, name, state, region, website_url, tier")
  .eq("active", true)
  .order("id");

if (error) {
  console.error("DB error:", error);
  process.exit(1);
}

const all = data ?? [];
console.log(`Fetched ${all.length} active resorts`);

const N_BATCHES = 10;
const outDir = path.resolve("output");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const batches = Array.from({ length: N_BATCHES }, () => []);
all.forEach((r, i) => batches[i % N_BATCHES].push(r));

batches.forEach((batch, i) => {
  const file = path.join(outDir, `verify-batch-${i + 1}.json`);
  writeFileSync(file, JSON.stringify(batch, null, 2));
  console.log(`  batch ${i + 1}: ${batch.length} resorts → ${file}`);
});

const withWebsite = all.filter((r) => r.website_url).length;
console.log(`\n  Total: ${all.length} | with website_url: ${withWebsite} | without: ${all.length - withWebsite}`);
