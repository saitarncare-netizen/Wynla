// One-shot audit: list current 30 Featured + score top Listed candidates for
// promotion to Featured (target: 50 total). Run once to inform curation.
//
// Usage: node scripts/audit-featured-candidates.mjs > output/featured-audit.json
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

// Parse .env.local manually so this script doesn't need a dotenv dependency.
{
  const envPath = path.resolve(".env.local");
  const text = readFileSync(envPath, "utf8");
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
  .select(
    "id, slug, name, state, region, tier, passes, vertical_drop, total_trails, total_acres, hero_image_url, website_url",
  )
  .eq("active", true)
  .order("vertical_drop", { ascending: false, nullsFirst: false });

if (error) {
  console.error(error);
  process.exit(1);
}

const featured = data.filter((r) => r.tier === "featured");
const listed = data.filter((r) => r.tier === "listed");

// Promotion score: prestige proxy. Higher = better candidate.
//   +3  multi-pass (Epic / Ikon / MC) — flagship resorts tend to be on multiple passes
//   +2  has hero_image_url — promotion is faster (no need to find photo)
//   +1  vertical_drop > 2000 ft (large mountain)
//   +1  vertical_drop > 1500 ft (medium-large)
//   +2  on Mountain Collective (highly curated, prestige signal)
//   +1  on Ikon (selective)
//   +1  on Epic (selective)
//   +1  total_trails > 100
//   +1  total_acres > 1500
const score = (r) => {
  const passes = r.passes ?? [];
  let s = 0;
  if (passes.length >= 2) s += 3;
  if (r.hero_image_url) s += 2;
  if ((r.vertical_drop ?? 0) > 2000) s += 1;
  if ((r.vertical_drop ?? 0) > 1500) s += 1;
  if (passes.includes("mountain-collective")) s += 2;
  if (passes.includes("ikon")) s += 1;
  if (passes.includes("epic")) s += 1;
  if ((r.total_trails ?? 0) > 100) s += 1;
  if ((r.total_acres ?? 0) > 1500) s += 1;
  return s;
};

const candidates = listed
  .map((r) => ({ ...r, _score: score(r) }))
  .sort((a, b) => b._score - a._score);

const out = {
  total_active: data.length,
  featured_count: featured.length,
  listed_count: listed.length,
  hero_image_coverage: {
    overall: `${data.filter((r) => r.hero_image_url).length} / ${data.length}`,
    featured: `${featured.filter((r) => r.hero_image_url).length} / ${featured.length}`,
    listed: `${listed.filter((r) => r.hero_image_url).length} / ${listed.length}`,
  },
  current_featured: featured.map((r) => ({
    slug: r.slug,
    name: r.name,
    state: r.state,
    passes: r.passes,
    has_hero: !!r.hero_image_url,
  })),
  top_30_promotion_candidates: candidates.slice(0, 30).map((r) => ({
    slug: r.slug,
    name: r.name,
    state: r.state,
    passes: r.passes,
    vertical_drop: r.vertical_drop,
    total_trails: r.total_trails,
    total_acres: r.total_acres,
    has_hero: !!r.hero_image_url,
    score: r._score,
  })),
};

console.log(JSON.stringify(out, null, 2));
