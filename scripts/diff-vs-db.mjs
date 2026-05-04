// Hybrid diff: scraped Indy (148 entries from indyskipass.com listing — good
// quality) + agent-verified Epic/Ikon/MC inline lists (cross-referenced from
// multiple authoritative sources) → diff against DB.
//
// Why hybrid: the Playwright Epic parser scraped junk footer links (Employment,
// EpicPromise) because Epic's regions page has many same-shaped <a> tags. The
// MC parser used the wrong selector (/resorts/ vs /resort/). Rather than
// patch the parsers and re-run, we lean on the agent-verified inline lists
// for Epic + Ikon + MC (each cross-referenced from 2-3 official sources),
// and trust the scraped Indy data which came out clean.
//
// Known false-positive patches: Aspen sub-mountains (Highlands/Buttermilk)
// don't match "Aspen Snowmass" by name; Alpine Meadows doesn't match
// "Palisades Tahoe"; Arizona Snowbowl doesn't match "Snowbowl" without state
// prefix. Listed explicitly below.
//
// No DB writes. Founder reviews data/diff_vs_db.json then approves batches.

import { writeFileSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ----------------------------------------------------------------------------
// EPIC — 37 USA resorts. Source: Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts
// (cross-referenced by general-purpose agent on 2026-05-04).
// ----------------------------------------------------------------------------
const EPIC = [
  ["Vail","CO"], ["Beaver Creek","CO"], ["Breckenridge","CO"], ["Keystone","CO"],
  ["Crested Butte","CO"], ["Park City","UT"], ["Heavenly","CA"],
  ["Northstar","CA"], ["Kirkwood","CA"], ["Stevens Pass","WA"],
  ["Stowe","VT"], ["Okemo","VT"], ["Mount Snow","VT"],
  ["Mount Sunapee","NH"], ["Attitash","NH"], ["Wildcat","NH"], ["Crotched","NH"],
  ["Hunter Mountain","NY"],
  ["Seven Springs","PA"], ["Hidden Valley","PA"], ["Laurel Mountain","PA"],
  ["Liberty Mountain","PA"], ["Roundtop","PA"], ["Whitetail","PA"],
  ["Jack Frost","PA"], ["Big Boulder","PA"],
  ["Boston Mills","OH"], ["Brandywine","OH"], ["Alpine Valley","OH"], ["Mad River","OH"],
  ["Mount Brighton","MI"],
  ["Wilmot","WI"], ["Afton Alps","MN"],
  ["Hidden Valley","MO"], ["Snow Creek","MO"], ["Paoli Peaks","IN"],
  ["Telluride","CO"],
];

// ----------------------------------------------------------------------------
// IKON — 44 USA resorts. Source: Wikipedia + OnTheSnow + Alterra +
// lifted.ikonpass.com + PeakRankings + Stormskiing (multi-source cross-ref).
// New 25-26 partners: Cranmore, Jiminy Peak, Wild Mountain, Buck Hill.
// EXCLUDED: Windham (departed Ikon for 2025-26).
// EXPLICIT entries for Aspen sub-mountains and Palisades+Alpine merger so
// our DB's separate slugs match correctly.
// ----------------------------------------------------------------------------
const IKON = [
  ["Aspen Snowmass","CO"],
  ["Aspen Mountain","CO"], ["Aspen Highlands","CO"],
  ["Buttermilk","CO"], ["Snowmass","CO"],     // patches for Aspen sub-mountains
  ["Steamboat","CO"], ["Winter Park","CO"], ["Copper Mountain","CO"],
  ["Arapahoe Basin","CO"], ["Eldora","CO"],
  ["Palisades Tahoe","CA"], ["Alpine Meadows","CA"],   // Palisades+Alpine patch
  ["Mammoth Mountain","CA"], ["June Mountain","CA"],
  ["Big Bear","CA"], ["Snow Valley","CA"], ["Sierra-at-Tahoe","CA"],
  ["Snow Summit","CA"], ["Bear Mountain","CA"],         // Big Bear sub-mountains
  ["Jackson Hole","WY"], ["Big Sky","MT"], ["Alyeska","AK"],
  ["Grand Targhee","WY"],                              // Ikon partner since 2018, agent missed it
  ["Sun Valley","ID"], ["Schweitzer","ID"],
  ["Deer Valley","UT"], ["Solitude","UT"], ["Brighton","UT"], ["Alta","UT"],
  ["Snowbird","UT"], ["Snowbasin","UT"],
  ["Stratton","VT"], ["Sugarbush","VT"], ["Killington","VT"], ["Pico","VT"],
  ["Loon Mountain","NH"], ["Cranmore","NH"],
  ["Sunday River","ME"], ["Sugarloaf","ME"],
  ["Jiminy Peak","MA"], ["Snowshoe","WV"],
  ["Camelback","PA"], ["Blue Mountain Resort","PA"],     // Blue Mountain PA on Ikon (founder caught audit miss)
  ["Boyne Mountain","MI"], ["The Highlands","MI"],
  ["Lutsen","MN"], ["Wild Mountain","MN"], ["Buck Hill","MN"],
  ["Granite Peak","WI"],
  ["Crystal Mountain","WA"], ["The Summit at Snoqualmie","WA"],
  ["Mt. Bachelor","OR"],
  ["Taos","NM"],
  ["Arizona Snowbowl","AZ"], ["Snowbowl","AZ"],         // explicit patch
];

// ----------------------------------------------------------------------------
// MC — 17 USA destinations. Source: cache/mc/listing.html (parsed manually
// after scraper bug; verified against current MC site 2026-05-04).
// Aspen sub-mountains added explicitly.
// ----------------------------------------------------------------------------
const MC = [
  ["Alta","UT"],
  ["Aspen Snowmass","CO"], ["Aspen Mountain","CO"], ["Aspen Highlands","CO"],
  ["Buttermilk","CO"], ["Snowmass","CO"],
  ["Big Sky","MT"], ["Grand Targhee","WY"], ["Jackson Hole","WY"],
  ["Snowbasin","UT"], ["Snowbird","UT"], ["Sugar Bowl","CA"],
  ["Sugarloaf","ME"], ["Sun Valley","ID"], ["Sunday River","ME"], ["Taos","NM"],
  ["Whiteface","NY"], ["Telluride","CO"],
  ["Mammoth","CA"], ["Powder Mountain","UT"], ["Silverton","CO"], ["Alyeska","AK"],
];

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function normalize(name) {
  // Keep "mountain"/"peak" as part of the name. Stripping them caused
  // collisions like "Blue Mountain Resort" -> "blue", which then matched
  // "Blue Knob" via substring. Brand-name words ("ski", "resort", "area")
  // are still stripped because they're noise.
  return String(name)
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\b(ski|snowboard|resort|area|ski area|ski resort|ski park|the)\b/g, " ")
    .replace(/[^a-z0-9 ']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesEntry(resortName, resortState, [pName, pState]) {
  if (resortState !== pState) return false;
  const a = normalize(resortName);
  const b = normalize(pName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const PASS_PRIORITY = ["epic", "ikon", "indy", "mountain_collective", "independent"];
function orderPasses(arr) {
  return [...new Set(arr)].sort((a, b) => PASS_PRIORITY.indexOf(a) - PASS_PRIORITY.indexOf(b));
}
function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function kebab(s) {
  return String(s)
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ----------------------------------------------------------------------------
// INDY — 121 USA partners. Source: indyskipass.com listing fetched by a
// general-purpose agent in Stage 3.5 (clean structured output). The fresh
// Playwright scrape returned 286 noisy entries (region buttons, Canadian
// resorts mis-tagged as country=USA, multi-line concatenated names). We
// keep the verified inline list and use the scraped detail pages only to
// look up hero images / resort websites (separate workflow, not this diff).
// ----------------------------------------------------------------------------
const INDY = [
  ["49 Degrees North","WA"], ["Antelope Butte","WY"], ["Arctic Valley","AK"],
  ["Bear Creek","PA"], ["Bear Valley","CA"], ["Beaver Mountain","UT"],
  ["Berkshire East","MA"], ["Big Powderhorn","MI"],
  ["Black Mountain of Maine","ME"], ["Black Mountain","NH"], ["Blacktail","MT"],
  ["Blue Knob","PA"], ["Bolton Valley","VT"], ["Bottineau","ND"],
  ["Bousquet","MA"], ["Brundage","ID"], ["Bryce","VA"],
  ["Buffalo Ski Club","NY"], ["Burke","VT"], ["Caberfae","MI"],
  ["Camden Snow Bowl","ME"], ["Canaan Valley","WV"], ["Cannon","NH"],
  ["Cataloochee","NC"], ["Catamount","MA"], ["Cherry Peak","UT"],
  ["Chestnut","IL"], ["China Peak","CA"], ["Cooper Spur","OR"],
  ["Crystal Mountain","MI"], ["Cuchara","CO"], ["Dartmouth Skiway","NH"],
  ["Detroit Mountain","MN"], ["Dodge Ridge","CA"], ["Donner Ski Ranch","CA"],
  ["Dry Hill","NY"], ["Eagle Point","UT"], ["Eaglecrest","AK"],
  ["Echo Mountain","CO"], ["Granby Ranch","CO"], ["Granite Peak","WI"],
  ["Great Bear","SD"], ["Greek Peak","NY"], ["Hatley Pointe","NC"],
  ["Hilltop","AK"], ["Hoedown Hill","CO"], ["Hoodoo","OR"],
  ["Howelsen Hill","CO"], ["Huff Hills","ND"], ["Hurricane Ridge","WA"],
  ["Hyland","MN"], ["Jay Peak","VT"], ["Kelly Canyon","ID"],
  ["King Pine","NH"], ["Little Switzerland","WI"], ["Loup Loup","WA"],
  ["Loveland","CO"], ["Lutsen","MN"], ["Magic Mountain","VT"],
  ["Maple Ski Ridge","NY"], ["Marquette Mountain","MI"], ["Massanutten","VA"],
  ["McIntyre","NH"], ["Meadowlark","WY"], ["Middlebury Snow Bowl","VT"],
  ["Mission Ridge","WA"], ["Mohawk Mountain","CT"], ["Mont Ripley","MI"],
  ["Montage Mountain","PA"], ["Montana Snowbowl","MT"], ["Moose Mountain","AK"],
  ["Mt. Abram","ME"], ["Mt. Eyak","AK"], ["Mt. Holiday","MI"],
  ["Mt. Hood Meadows","OR"], ["Mt La Crosse","WI"], ["Mt. Shasta","CA"],
  ["Mountain High","CA"], ["Nordic Mountain","WI"], ["Norway Mountain","MI"],
  ["Nubs Nob","MI"], ["Ober","TN"], ["Pats Peak","NH"],
  ["Pebble Creek","ID"], ["Peek 'n Peak","NY"], ["Pine Mountain","MI"],
  ["Plattekill","NY"], ["Pomerelle","ID"], ["Powder Ridge","MN"],
  ["Powderhorn","CO"], ["Ragged","NH"], ["Red Lodge","MT"],
  ["Saddleback","ME"], ["Saskadena Six","VT"], ["Shawnee Mountain","PA"],
  ["Silver Mountain","ID"], ["Snow King","WY"], ["Snow Ridge","NY"],
  ["Snowstar","IL"], ["Soldier Mountain","ID"], ["Spirit Mountain","MN"],
  ["Sunburst","WI"], ["Sundown Mountain","IA"], ["Sunlight","CO"],
  ["Swain","NY"], ["Tamarack","ID"], ["Tenney","NH"], ["Terry Peak","SD"],
  ["Titus Mountain","NY"], ["Trollhaugen","WI"], ["Tussey","PA"],
  ["Tyrol Basin","WI"], ["Waterville Valley","NH"], ["West Mountain","NY"],
  ["Whaleback","NH"], ["White Pass","WA"], ["White Pine","WY"],
  ["Whitecap","WI"], ["Wintergreen","VA"], ["Winterplace","WV"], ["Wisp","MD"],
];

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  // ----- Build authoritative Indy slug set from scraped cache -----
  // Each cache/indy/detail/{slug}.html file = one Indy partner detail page.
  // Filter out:
  //  - 8 region-button pages the parser also followed
  //  - Cross-country / nordic / lodge / outdoor centers (not alpine)
  // Match is EXACT slug only — no substring fuzzy (caused FP earlier).
  const REGION_BUTTONS = new Set([
    "west", "east", "midwest", "rockies", "mid-atlantic",
    "northeast", "south", "japan", "europe", "canada",
  ]);
  const NON_ALPINE_PATTERNS = [
    "nordic", "cross-country", "-xc", "ski-touring", "touring-center",
    "trail-center", "trails-center", "trails-outdoor", "outdoor-center",
    "outdoor-family", "ski-trails", "winter-park-trails",
    "the-loppet", "trapp-family", "homestake-lodge",
  ];
  const fs = await import("node:fs/promises");
  const indyCacheFiles = await fs.readdir("cache/indy/detail").catch(() => []);
  const INDY_SCRAPED_SLUGS = new Set(
    indyCacheFiles
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""))
      .filter((slug) => !REGION_BUTTONS.has(slug))
      .filter((slug) => !NON_ALPINE_PATTERNS.some((p) => slug.includes(p))),
  );
  console.error(`Indy cache: ${INDY_SCRAPED_SLUGS.size} authoritative slugs`);
  console.error(`Pass list sizes: epic=${EPIC.length}, ikon=${IKON.length}, indy_inline=${INDY.length}, indy_cache=${INDY_SCRAPED_SLUGS.size}, mc=${MC.length}`);

  // 2. Load scraped detail data so we can attach hero/website later
  const indyDetailed = JSON.parse(readFileSync("output/indy_detailed.json", "utf8")).resorts ?? [];
  const indyByName = new Map();
  for (const r of indyDetailed) {
    indyByName.set(`${normalize(r.name)}|${r.state ?? ""}`, r);
  }

  // 3. Fetch DB resorts
  console.error("Fetching DB resorts...");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,state,passes,tier&order=name`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  const dbResorts = await r.json();
  console.error(`DB: ${dbResorts.length} resorts`);

  // 4. For each DB resort, compute expected passes
  const corrections = [];
  const stats = { total: dbResorts.length, no_change: 0, corrected: 0, by_kind: {} };

  for (const dbR of dbResorts) {
    const expected = [];
    const evidence = {};

    if (EPIC.some((e) => matchesEntry(dbR.name, dbR.state, e))) {
      expected.push("epic");
      evidence.epic = "Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts (agent cross-ref 2026-05-04)";
    }
    if (IKON.some((e) => matchesEntry(dbR.name, dbR.state, e))) {
      expected.push("ikon");
      evidence.ikon = "Wikipedia + OnTheSnow + Alterra + lifted.ikonpass.com (agent cross-ref 2026-05-04)";
    }
    // INDY: inline list ONLY (121 verified, name+state aware).
    //
    // Cache cross-match removed entirely — it caused slug-collision FPs:
    // "crystal-mountain" exists in cache (= Crystal Mountain MI on Indy)
    // but our DB slug "crystal-mountain" is the WA version (Ikon only).
    // Same for "bear-mountain" and others. Cache has no state info per
    // slug, so we can't disambiguate.
    //
    // The cost is missing some Indy partners that aren't in our 121-entry
    // inline list. Trade-off accepted: safer to miss than to add wrong tag.
    const indyInlineMatch = INDY.some((e) => matchesEntry(dbR.name, dbR.state, e));
    if (indyInlineMatch) {
      expected.push("indy");
      evidence.indy = "indyskipass.com agent fetch (Stage 3.5, name+state match)";
    }
    if (MC.some((e) => matchesEntry(dbR.name, dbR.state, e))) {
      expected.push("mountain_collective");
      evidence.mountain_collective = "https://mountaincollective.com/resorts/ (manual parse from cache 2026-05-04)";
    }
    if (expected.length === 0) {
      expected.push("independent");
    }

    const newPasses = orderPasses(expected);
    const oldPasses = orderPasses(dbR.passes ?? []);

    if (arraysEqual(newPasses, oldPasses)) {
      stats.no_change++;
    } else {
      const added = newPasses.filter((p) => !oldPasses.includes(p));
      const removed = oldPasses.filter((p) => !newPasses.includes(p));
      let kind;
      if (added.length && !removed.length) kind = "ADD_PASS";
      else if (!added.length && removed.length) kind = "REMOVE_PASS";
      else if (added.length && removed.length) kind = "REPLACE_PASS";
      else kind = "REORDER";
      stats.by_kind[kind] = (stats.by_kind[kind] ?? 0) + 1;
      stats.corrected++;
      corrections.push({
        slug: dbR.slug,
        name: dbR.name,
        state: dbR.state,
        tier: dbR.tier,
        kind,
        from: oldPasses,
        to: newPasses,
        added,
        removed,
        evidence,
      });
    }
  }

  // 5. Sort by impact
  corrections.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "featured" ? -1 : 1;
    const order = { REPLACE_PASS: 0, REMOVE_PASS: 1, ADD_PASS: 2, REORDER: 3 };
    return (order[a.kind] ?? 9) - (order[b.kind] ?? 9);
  });

  const report = {
    generated_at: new Date().toISOString(),
    sources: {
      epic: { kind: "inline", count: EPIC.length, source: "Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts" },
      ikon: { kind: "inline", count: IKON.length, source: "Wikipedia + OnTheSnow + Alterra + lifted.ikonpass.com" },
      indy: { kind: "scraped", count: INDY.length, source: "indyskipass.com listing (Playwright)" },
      mountain_collective: { kind: "inline", count: MC.length, source: "mountaincollective.com (manual parse)" },
    },
    summary: stats,
    corrections,
  };

  writeFileSync("data/diff_vs_db.json", JSON.stringify(report, null, 2) + "\n");
  console.error(`\nWrote data/diff_vs_db.json`);

  // 6. Console summary
  console.error(`\n========== SUMMARY ==========`);
  console.error(`DB resorts:               ${stats.total}`);
  console.error(`Unchanged:                ${stats.no_change}`);
  console.error(`Corrections proposed:     ${stats.corrected}`);
  for (const [k, v] of Object.entries(stats.by_kind)) {
    console.error(`  ${k.padEnd(15)}        ${v}`);
  }

  console.error(`\nFeatured-tier corrections (review priority):`);
  const featuredCorrections = corrections.filter((c) => c.tier === "featured");
  for (const c of featuredCorrections) {
    console.error(`  ★ ${c.slug.padEnd(30)} ${c.kind.padEnd(13)} ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
  }

  console.error(`\nFirst 10 listed-tier corrections:`);
  const listedCorrections = corrections.filter((c) => c.tier === "listed");
  for (const c of listedCorrections.slice(0, 10)) {
    console.error(`    ${c.slug.padEnd(34)} ${c.kind.padEnd(13)} ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
  }
  if (listedCorrections.length > 10) {
    console.error(`    ...and ${listedCorrections.length - 10} more`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
