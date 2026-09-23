// Quick existence check for the 20 flagship resorts I'm planning to promote
// to Featured. Output: which exist, which need to be added, current data state.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
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

// Candidate slugs — based on the featured-audit output + flagship Epic resorts
// that scoring missed (single-pass but iconic).
const SLUGS = [
  // Triple-pass / Ikon+MC West (already in DB, high score)
  "snowbasin", "sun-valley", "alta", "snowbird", "big-sky", "sunday-river",
  "aspen-snowmass", "jackson-hole", "telluride", "alyeska-resort", "sugarloaf",
  "arapahoe-basin", "taos-ski-valley",
  // Famous Epic-only flagships (might be in DB as Listed)
  "vail", "beaver-creek", "park-city", "heavenly", "northstar-california",
  "breckenridge", "keystone", "crested-butte", "kirkwood",
  // East / Midwest flagships
  "killington", "stowe", "sugarbush-resort", "jay-peak", "bretton-woods",
  "lutsen-mountains", "mammoth-mountain",
];

const { data, error } = await supabase
  .from("resorts")
  .select(
    "id, slug, name, state, tier, passes, vertical_drop, total_trails, total_lifts, total_acres, hero_image_url, total_acres, elevation_summit, elevation_base, longest_run_miles, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, has_glades, has_halfpipe, has_night_skiing, address, city, website_url, trail_map_url, ticket_booking_url, weekday_hours, weekend_hours, typical_season_start, typical_season_end",
  )
  .eq("active", true)
  .in("slug", SLUGS);

if (error) {
  console.error(error);
  process.exit(1);
}

const found = new Map(data.map((r) => [r.slug, r]));
const missing = SLUGS.filter((s) => !found.has(s));

const fieldCompleteness = (r) => {
  const fields = [
    "vertical_drop", "total_trails", "total_lifts", "total_acres",
    "elevation_summit", "elevation_base", "longest_run_miles",
    "trails_beginner", "trails_intermediate", "trails_advanced", "trails_expert",
    "has_terrain_park", "has_glades", "has_halfpipe", "has_night_skiing",
    "address", "city", "website_url", "trail_map_url",
    "weekday_hours", "weekend_hours", "typical_season_start", "typical_season_end",
    "hero_image_url",
  ];
  let filled = 0;
  for (const f of fields) {
    if (r[f] !== null && r[f] !== undefined) filled += 1;
  }
  return `${filled}/${fields.length}`;
};

console.log(JSON.stringify({
  searched: SLUGS.length,
  found_count: data.length,
  missing_slugs: missing,
  found: data
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      state: r.state,
      tier: r.tier,
      passes: r.passes,
      has_hero: !!r.hero_image_url,
      vertical: r.vertical_drop,
      trails: r.total_trails,
      acres: r.total_acres,
      lifts: r.total_lifts,
      completeness: fieldCompleteness(r),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug)),
}, null, 2));
