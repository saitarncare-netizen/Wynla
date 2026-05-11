// Stage 22 — pull active resorts with current trail-data state.
// Output: data/stage-22-resorts.json (input for the AI-scrape orchestrator)

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
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
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { data, error } = await supabase
  .from("resorts")
  .select(
    "id, slug, name, state, website_url, total_trails, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, last_verified_at",
  )
  .eq("active", true)
  .order("slug");

if (error) {
  console.error("Supabase error:", error.message);
  process.exit(1);
}

console.log(`Pulled ${data.length} active resorts`);

const completePct = data.filter(
  (r) =>
    r.difficulty_pct_beginner != null &&
    r.difficulty_pct_intermediate != null &&
    r.difficulty_pct_advanced != null &&
    r.difficulty_pct_expert != null,
).length;
const hasTrails = data.filter((r) => r.total_trails != null).length;
const hasWebsite = data.filter((r) => r.website_url != null).length;

console.log(`  has total_trails:        ${hasTrails}/${data.length}`);
console.log(`  has full difficulty_pct: ${completePct}/${data.length}`);
console.log(`  has website_url:         ${hasWebsite}/${data.length}`);

const outPath = path.resolve("data/stage-22-resorts.json");
writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Wrote ${outPath}`);
