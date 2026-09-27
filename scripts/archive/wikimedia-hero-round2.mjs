// Wikimedia hero-image round 2: try to find a Wikimedia Commons photo for
// every Listed resort that doesn't already have one. Conservative — we only
// accept images whose Wikipedia page summary mentions ski/snowboard/resort
// language, so we don't paste a movie poster onto "Mt. Smith".
//
// Output: data/sql/stage-6.1-hero-round2.sql ready to apply via Supabase
// SQL Editor. Idempotent (only fills NULLs).
//
// Run: node scripts/wikimedia-hero-round2.mjs

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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// ─── 1. Load candidates ────────────────────────────────────────────────
const { data: candidates, error } = await supabase
  .from("resorts")
  .select("id, slug, name, state")
  .eq("active", true)
  .is("hero_image_url", null)
  .order("name");

if (error) { console.error(error); process.exit(1); }

process.stderr.write(`Found ${candidates.length} resorts without hero image.\n`);

// ─── 2. Title generation ──────────────────────────────────────────────
// Wikipedia ski-resort articles use varied title conventions. Try in order;
// stop at the first one that resolves to a page with a relevant summary.
function titleVariants(name, state) {
  const trimmed = name
    .replace(/\s*Ski (Area|Resort)\s*$/i, "")
    .replace(/\s*Mountain Resort\s*$/i, "")
    .replace(/\s*Resort\s*$/i, "")
    .trim();
  return [
    name,                          // exact
    trimmed,                       // stripped suffix
    `${trimmed} Ski Resort`,       // common Wikipedia title
    `${trimmed} (ski resort)`,     // disambiguated
    `${trimmed}, ${stateName(state)}`, // disambig by state
    `${trimmed} (${stateName(state)})`,
  ].filter((v, i, arr) => arr.indexOf(v) === i);
}
function stateName(abbr) {
  const map = {
    AK:"Alaska", AL:"Alabama", AZ:"Arizona", CA:"California", CO:"Colorado",
    CT:"Connecticut", IA:"Iowa", ID:"Idaho", IL:"Illinois", IN:"Indiana",
    KY:"Kentucky", MA:"Massachusetts", MD:"Maryland", ME:"Maine", MI:"Michigan",
    MN:"Minnesota", MO:"Missouri", MT:"Montana", NC:"North Carolina",
    ND:"North Dakota", NE:"Nebraska", NH:"New Hampshire", NJ:"New Jersey",
    NM:"New Mexico", NV:"Nevada", NY:"New York", OH:"Ohio", OR:"Oregon",
    PA:"Pennsylvania", RI:"Rhode Island", SD:"South Dakota", TN:"Tennessee",
    UT:"Utah", VA:"Virginia", VT:"Vermont", WA:"Washington", WI:"Wisconsin",
    WV:"West Virginia", WY:"Wyoming",
  };
  return map[abbr] ?? abbr;
}

// ─── 3. Summary fetch with relevance filter ───────────────────────────
async function fetchSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Wynla/0.1 (https://wynla.app)" },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

const SKI_RX = /\b(ski|snowboard|resort|mountain|slopes?|chairlift|trail|piste|alpine)\b/i;
const REJECT_RX = /\b(film|movie|album|song|novel|band|video game|disambiguation)\b/i;

function isRelevant(summary) {
  if (!summary) return false;
  const text = `${summary.description ?? ""} ${summary.extract ?? ""}`;
  if (REJECT_RX.test(text)) return false;
  if (!SKI_RX.test(text)) return false;
  return true;
}

function imageUrl(summary) {
  // Prefer originalimage; fall back to thumbnail. Both come from upload.wikimedia.org.
  const url = summary?.originalimage?.source ?? summary?.thumbnail?.source ?? null;
  if (!url) return null;
  // Reject if the file is a generic globe/map/disambiguation icon.
  if (/Disambig|Question_book|globe|map_-_/i.test(url)) return null;
  return url;
}

// ─── 4. Per-resort resolve loop ───────────────────────────────────────
const found = [];
const skipped = [];
let i = 0;
for (const r of candidates) {
  i += 1;
  process.stderr.write(`[${i}/${candidates.length}] ${r.slug} ... `);
  let hit = null;
  for (const title of titleVariants(r.name, r.state)) {
    const s = await fetchSummary(title);
    if (s && isRelevant(s)) {
      const url = imageUrl(s);
      if (url) {
        hit = { title, url, canonicalTitle: s.title };
        break;
      }
    }
    // Polite gap between attempts for the same resort
    await new Promise((res) => setTimeout(res, 80));
  }

  if (hit) {
    found.push({
      id: r.id,
      slug: r.slug,
      name: r.name,
      hero_image_url: hit.url,
      hero_image_alt: `${r.name} ski resort`,
      hero_image_source: `Wikimedia Commons (Wikipedia: ${hit.canonicalTitle})`,
    });
    process.stderr.write(`✓ ${hit.canonicalTitle}\n`);
  } else {
    skipped.push({ id: r.id, slug: r.slug, name: r.name });
    process.stderr.write(`–\n`);
  }
}

process.stderr.write(`\nFound: ${found.length} / ${candidates.length}\n`);
process.stderr.write(`Skipped: ${skipped.length} (no relevant Wikipedia page or no Commons image)\n`);

// ─── 5. Emit SQL ──────────────────────────────────────────────────────
if (found.length === 0) {
  writeFileSync("output/wikimedia-round2-skipped.json", JSON.stringify(skipped, null, 2));
  process.stderr.write(`No matches; nothing to write.\n`);
  process.exit(0);
}

const lines = [
  `-- Wikimedia hero round 2: backfill ${found.length} Listed resorts`,
  `-- Generated ${new Date().toISOString().slice(0, 19)}Z`,
  `-- Idempotent: WHERE hero_image_url IS NULL on every UPDATE.`,
  ``,
  `BEGIN;`,
  ``,
];
for (const r of found) {
  const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
  lines.push(`-- ${r.name} (${r.slug})`);
  lines.push(`UPDATE resorts SET`);
  lines.push(`  hero_image_url = ${esc(r.hero_image_url)},`);
  lines.push(`  hero_image_alt = ${esc(r.hero_image_alt)},`);
  lines.push(`  hero_image_source = ${esc(r.hero_image_source)},`);
  lines.push(`  last_verified_at = '2026-05-07'`);
  lines.push(`WHERE slug = ${esc(r.slug)} AND active = TRUE AND hero_image_url IS NULL;`);
  lines.push(``);
}
lines.push(`-- Verify new hero coverage`);
lines.push(`SELECT`);
lines.push(`  COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS with_hero,`);
lines.push(`  COUNT(*) AS total,`);
lines.push(`  ROUND(100.0 * COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) / COUNT(*), 1) AS pct`);
lines.push(`FROM resorts WHERE active = TRUE;`);
lines.push(``);
lines.push(`COMMIT;`);

writeFileSync("data/sql/stage-6.1-hero-round2.sql", lines.join("\n") + "\n");
writeFileSync("output/wikimedia-round2-found.json", JSON.stringify(found, null, 2));
writeFileSync("output/wikimedia-round2-skipped.json", JSON.stringify(skipped, null, 2));
process.stderr.write(`\nWrote data/sql/stage-6.1-hero-round2.sql\n`);
