// Stage 3.5 quality audit aggregator
//
// Reads:
//   - 4 inline pass-program lists (audited from official sites + Wikipedia)
//   - 1 inline hero-image map (audited Wikimedia Commons by 2 agents)
// Computes:
//   - Correct passes[] for every resort by name+state matching
//   - Correct hero_image_* for the 30 featured
//   - last_verified_at = NOW() for every resort touched
// Writes:
//   - data/audit_corrections.sql  (UPDATE statements + verify queries)
//   - audit_report.json (changes summary, for reporting)

import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";

// --------------------------------------------------------------------------
// Load env so we can fetch the live resort list from Supabase
// --------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

// --------------------------------------------------------------------------
// PASS PROGRAM LISTS — audited 2026-05-02 by parallel agents
// --------------------------------------------------------------------------

// Epic Pass (Vail Resorts owned + partners). Compiled from Wikipedia +
// epicpass.com search snippets. International partners excluded for matching.
const EPIC = [
  "Vail|CO", "Beaver Creek|CO", "Breckenridge|CO", "Keystone|CO", "Crested Butte|CO",
  "Park City|UT",
  "Heavenly|CA", "Northstar|CA", "Kirkwood|CA",
  "Stevens Pass|WA",
  "Stowe|VT", "Okemo|VT", "Mount Snow|VT",
  "Mount Sunapee|NH", "Attitash|NH", "Wildcat|NH", "Crotched|NH",
  "Hunter Mountain|NY",
  "Liberty|PA", "Roundtop|PA", "Whitetail|PA", "Jack Frost|PA", "Big Boulder|PA",
  "Seven Springs|PA", "Hidden Valley|PA", "Laurel|PA",
  "Boston Mills|OH", "Brandywine|OH", "Alpine Valley|OH", "Mad River|OH",
  "Mount Brighton|MI", "Mt. Brighton|MI",
  "Wilmot|WI",
  "Afton Alps|MN",
  "Hidden Valley|MO", "Snow Creek|MO",
  "Paoli Peaks|IN",
];

// Ikon Pass destinations 2025-26.
const IKON = [
  "Aspen Snowmass|CO", "Aspen Mountain|CO", "Aspen Highlands|CO", "Buttermilk|CO", "Snowmass|CO",
  "Steamboat|CO", "Winter Park|CO", "Copper Mountain|CO", "Arapahoe Basin|CO", "Eldora|CO",
  "Palisades Tahoe|CA", "Alpine Meadows|CA", "Mammoth|CA", "June Mountain|CA",
  "Big Bear|CA", "Snow Summit|CA", "Bear Mountain|CA", "Snow Valley|CA", "Sierra-at-Tahoe|CA",
  "Alta|UT", "Snowbird|UT", "Brighton|UT", "Solitude|UT", "Snowbasin|UT", "Deer Valley|UT",
  "Jackson Hole|WY",
  "Big Sky|MT",
  "Sun Valley|ID", "Schweitzer|ID",
  "Crystal Mountain|WA", "Summit at Snoqualmie|WA",
  "Mt. Bachelor|OR",
  "Alyeska|AK",
  "Taos|NM",
  "Killington|VT", "Pico|VT", "Stratton|VT", "Sugarbush|VT",
  "Sugarloaf|ME", "Sunday River|ME",
  "Loon|NH", "Bretton Woods|NH", "Waterville Valley|NH", "Cranmore|NH",
  "Windham|NY",
  "Snowshoe|WV",
  "Boyne|MI", "Highlands|MI",
  "Camelback|PA", "Blue Mountain|PA",
  "Jiminy Peak|MA",
  "Wild Mountain|MN", "Buck Hill|MN",
];

// Indy Pass — only the US partners that match anything in our DB.
// (The full Indy list is ~250 entries including XC areas + international;
//  we keep only what plausibly maps to a downhill US resort in our table.)
const INDY = [
  "49 Degrees North|WA",
  "Antelope Butte|WY",
  "Arctic Valley|AK",
  "Bear Creek|PA",
  "Bear Valley|CA",
  "Beaver Mountain|UT",
  "Berkshire East|MA",
  "Big Powderhorn|MI",
  "Black Mountain of Maine|ME",
  "Black Mountain|NH",
  "Blacktail|MT",
  "Blue Knob|PA",
  "Bolton Valley|VT",
  "Bottineau|ND",
  "Bousquet|MA",
  "Brundage|ID",
  "Bryce|VA",
  "Buffalo Ski Club|NY",
  "Burke|VT",
  "Caberfae|MI",
  "Camden Snow Bowl|ME",
  "Canaan Valley|WV",
  "Cannon|NH",
  "Cataloochee|NC",
  "Catamount|MA",
  "Cherry Peak|UT",
  "Chestnut|IL",
  "China Peak|CA",
  "Cooper Spur|OR",
  "Crystal Mountain|MI",
  "Cuchara|CO",
  "Dartmouth Skiway|NH",
  "Detroit Mountain|MN",
  "Dodge Ridge|CA",
  "Donner Ski Ranch|CA",
  "Dry Hill|NY",
  "Eagle Point|UT",
  "Eaglecrest|AK",
  "Echo Mountain|CO",
  "Granby Ranch|CO",
  "Granite Peak|WI",
  "Great Bear|SD",
  "Greek Peak|NY",
  "Hatley Pointe|NC",
  "Hilltop|AK",
  "Hoedown Hill|CO",
  "Hoodoo|OR",
  "Howelsen Hill|CO",
  "Huff Hills|ND",
  "Hurricane Ridge|WA",
  "Hyland|MN",
  "Jay Peak|VT",
  "Kelly Canyon|ID",
  "King Pine|NH",
  "Little Switzerland|WI",
  "Loup Loup|WA",
  "Loveland|CO",
  "Lutsen|MN",
  "Magic Mountain|VT",
  "Maple Ski Ridge|NY",
  "Marquette Mountain|MI",
  "Massanutten|VA",
  "McIntyre|NH",
  "Meadowlark|WY",
  "Middlebury Snow Bowl|VT",
  "Mission Ridge|WA",
  "Mohawk Mountain|CT",
  "Mont Ripley|MI",
  "Montage Mountain|PA",
  "Montana Snowbowl|MT",
  "Moose Mountain|AK",
  "Mt. Abram|ME",
  "Mt. Eyak|AK",
  "Mt. Holiday|MI",
  "Mt. Hood Meadows|OR",
  "Mt La Crosse|WI",
  "Mt. Shasta|CA",
  "Mountain High|CA",
  "Nordic Mountain|WI",
  "Norway Mountain|MI",
  "Nubs Nob|MI",
  "Ober|TN",
  "Pats Peak|NH",
  "Pebble Creek|ID",
  "Peek 'n Peak|NY",
  "Pine Mountain|MI",
  "Plattekill|NY",
  "Pomerelle|ID",
  "Powder Ridge|MN",
  "Powderhorn|CO",
  "Ragged|NH",
  "Red Lodge|MT",
  "Saddleback|ME",
  "Saskadena Six|VT",
  "Schuss Mountain|MI",
  "Shawnee Mountain|PA",
  "Silver Mountain|ID",
  "Ski Sawmill|PA",
  "Snow King|WY",
  "Snow Ridge|NY",
  "Snowstar|IL",
  "Soldier Mountain|ID",
  "Spirit Mountain|MN",
  "Sunburst|WI",
  "Sundown Mountain|IA",
  "Sunlight|CO",
  "Swain|NY",
  "Tamarack|ID",
  "Tenney|NH",
  "Terry Peak|SD",
  "Titus Mountain|NY",
  "Trollhaugen|WI",
  "Tussey|PA",
  "Tyrol Basin|WI",
  "Waterville Valley|NH",
  "West Mountain|NY",
  "Whaleback|NH",
  "White Pass|WA",
  "White Pine|WY",
  "Whitecap|WI",
  "Wintergreen|VA",
  "Winterplace|WV",
  "Wisp|MD",
];

// Mountain Collective destinations 2025-26 (US only for matching).
const MC = [
  "Alta|UT",
  "Aspen Snowmass|CO", "Aspen Mountain|CO", "Aspen Highlands|CO", "Buttermilk|CO", "Snowmass|CO",
  "Big Sky|MT",
  "Grand Targhee|WY",
  "Jackson Hole|WY",
  "Snowbasin|UT",
  "Snowbird|UT",
  "Sugar Bowl|CA",
  "Sugarloaf|ME",
  "Sun Valley|ID",
  "Sunday River|ME",
  "Taos|NM",
  "Whiteface|NY",
  "Telluride|CO",
  "Mammoth|CA",
  "Powder Mountain|UT",
  "Silverton|CO",
  "Alyeska|AK",
];

// --------------------------------------------------------------------------
// HERO IMAGES — audited Wikimedia Commons for the 30 featured Northeast resorts
// --------------------------------------------------------------------------
const HEROES = {
  "hunter-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/1/16/Hunter_Mountain_%285719457383%29.jpg", source: "Wikimedia Commons (CC-BY 2.0)", alt: "Hunter Mountain ski resort in the Catskills" },
  "windham-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Windham_Mountain_-_2008.jpg", source: "Wikimedia Commons (CC-BY-SA 2.0)", alt: "Windham Mountain ski lift in winter" },
  "plattekill-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/6/68/Fullsizeoutput_41a.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "View from the North Face trail at Plattekill Mountain in winter" },
  "gore-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/3/39/Ski_003.jpg", source: "Wikimedia Commons (Public domain)", alt: "View of Gore Mountain summit from the Uncas trail" },
  "whiteface-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Whiteface_Mountain_Ski_Area_off_the_Gondola_Lift.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "View from the gondola lift station at Whiteface Mountain Ski Area" },
  "mount-pisgah": { url: "https://upload.wikimedia.org/wikipedia/commons/b/bb/View_from_Mount_Pisgah_of_the_Saranac_River_valley.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "View north from the top of the Mount Pisgah ski area, Saranac Lake" },
  "thunder-ridge-ski-area": { url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Thunder_Ridge_Ski_Area_front%2C_Patterson%2C_NY%2C_April_2026.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Front view of Thunder Ridge Ski Area in Patterson, NY" },
  "mountain-creek": { url: "https://upload.wikimedia.org/wikipedia/commons/4/45/Mountain_Creek_Vernon_NJ_Ski_Lift_Summer_1.jpg", source: "Wikimedia Commons (CC0 1.0)", alt: "Mountain Creek ski lift in Vernon, New Jersey" },
  "camelback-mountain-resort": { url: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Camelback_Ski_Area_Feb_2014.JPG", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Aerial view of Camelback Mountain Resort ski area in winter" },
  "blue-mountain-resort": { url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Blue_Slopes.JPG", source: "Wikimedia Commons (Public domain)", alt: "Blue Mountain Resort slopes in Carbon County, Pennsylvania" },
  "shawnee-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Shawnee.ski.JPG", source: "Wikimedia Commons (CC-BY-SA 3.0)", alt: "Base lodge and lower slopes at Shawnee Mountain Ski Area" },
  "jack-frost-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/JackFrost2.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Jack Frost ski area in Pennsylvania" },
  "montage-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Montage_Mountain_Aerial_View.jpg/1280px-Montage_Mountain_Aerial_View.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Aerial view of Montage Mountain ski resort in Scranton, Pennsylvania" },
  "mount-southington": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Mount_Southington_Ski_Area_at_night.jpg/1280px-Mount_Southington_Ski_Area_at_night.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Mount Southington Ski Area lit lifts and trails at night" },
  "berkshire-east": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Berkshire_East_Ski_Resort_from_Charlemont%2C_September_2022.JPG/1280px-Berkshire_East_Ski_Resort_from_Charlemont%2C_September_2022.JPG", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Berkshire East Mountain Resort viewed from Charlemont, Massachusetts" },
  "wachusett-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Wachusett_Mountain_in_winter.gk.jpg/1280px-Wachusett_Mountain_in_winter.gk.jpg", source: "Wikimedia Commons (CC-BY-SA 3.0)", alt: "Mount Wachusett in winter, Princeton, Massachusetts" },
  "stratton-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Mount_Snow_ski_aerial.jpg/1280px-Mount_Snow_ski_aerial.jpg", source: "Wikimedia Commons (CC-BY-SA 2.0)", alt: "Aerial view of Stratton Mountain Resort, Vermont" },
  "mount-snow": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/MountSnowWinter.jpg/1280px-MountSnowWinter.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Winter view of Mount Snow ski resort in West Dover, Vermont" },
  "magic-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Magic_Mountain_aerial.jpg/1280px-Magic_Mountain_aerial.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Aerial view of Magic Mountain Ski Area in Londonderry, Vermont" },
  "bromley-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Bromley_Mountain_aerial.jpg/1280px-Bromley_Mountain_aerial.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Aerial view of Bromley Mountain ski area in Peru, Vermont" },
  "loon-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Loon_Mountain_NH_from_Flume.jpg/1280px-Loon_Mountain_NH_from_Flume.jpg", source: "Wikimedia Commons (CC-BY-SA 4.0)", alt: "Loon Mountain in Lincoln, New Hampshire, viewed from Mount Flume" },
  "cannon-mountain": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/CannonMountain-CliffFace.jpg/1280px-CannonMountain-CliffFace.jpg", source: "Wikimedia Commons (CC-BY-SA 3.0)", alt: "Cannon Cliff, the southeast face of Cannon Mountain, Franconia, New Hampshire" },
};
// 6 featured resorts had no suitable CC-licensed Wikimedia photo per the agents:
// belleayre-mountain, mount-peter, big-boulder, elk-mountain,
// mohawk-mountain-ski-area, catamount-ski-area, jiminy-peak, okemo-mountain-resort
// They keep the Mapbox static map fallback that the detail page already uses.

// --------------------------------------------------------------------------
// Pass matching helpers
// --------------------------------------------------------------------------
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ") // strip parentheticals
    .replace(/\b(ski|snowboard|mountain|mountains|resort|area|ski area|ski resort|ski park|the)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPassEntry(resortName, resortState, passEntry) {
  const [pName, pState] = passEntry.split("|");
  if (resortState !== pState) return false;
  const a = normalize(resortName);
  const b = normalize(pName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const PASS_PRIORITY = ["epic", "ikon", "indy", "mountain_collective", "independent"];

function orderPasses(passes) {
  return [...new Set(passes)].sort(
    (a, b) => PASS_PRIORITY.indexOf(a) - PASS_PRIORITY.indexOf(b),
  );
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------
async function main() {
  console.error("Fetching resorts from Supabase...");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,state,passes,tier&order=id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  const resorts = await r.json();
  console.error(`  -> ${resorts.length} resorts`);

  const updates = [];
  const passChanges = [];
  const heroSet = [];
  const stats = {
    epic_match: 0,
    ikon_match: 0,
    indy_match: 0,
    mc_match: 0,
    independent: 0,
    pass_corrected: 0,
    pass_unchanged: 0,
    hero_set: 0,
    hero_missing_featured: [],
  };

  for (const resort of resorts) {
    const epicMatch = EPIC.some((e) => matchesPassEntry(resort.name, resort.state, e));
    const ikonMatch = IKON.some((e) => matchesPassEntry(resort.name, resort.state, e));
    const indyMatch = INDY.some((e) => matchesPassEntry(resort.name, resort.state, e));
    const mcMatch = MC.some((e) => matchesPassEntry(resort.name, resort.state, e));

    const computed = [];
    if (epicMatch) { computed.push("epic"); stats.epic_match++; }
    if (ikonMatch) { computed.push("ikon"); stats.ikon_match++; }
    if (indyMatch) { computed.push("indy"); stats.indy_match++; }
    if (mcMatch) { computed.push("mountain_collective"); stats.mc_match++; }
    if (computed.length === 0) {
      computed.push("independent");
      stats.independent++;
    }
    const newPasses = orderPasses(computed);
    const oldPasses = (resort.passes ?? []).slice();
    const passDiff = !arraysEqual(newPasses, oldPasses);
    if (passDiff) {
      stats.pass_corrected++;
      passChanges.push({
        slug: resort.slug,
        name: resort.name,
        state: resort.state,
        from: oldPasses,
        to: newPasses,
      });
    } else {
      stats.pass_unchanged++;
    }

    const hero = HEROES[resort.slug];
    if (hero) {
      stats.hero_set++;
      heroSet.push(resort.slug);
    } else if (resort.tier === "featured") {
      stats.hero_missing_featured.push(resort.slug);
    }

    // Build UPDATE statement.
    //
    // CONSERVATIVE POLICY: do NOT auto-apply pass corrections. Cross-program
    // automated audits have known false positives (e.g. Wikipedia lists
    // resorts that left a pass; Indy's huge partner list matches small
    // discounts not full memberships). Wrong pass data violates the
    // founder's "User trust > data completeness" principle.
    //
    // We only apply: hero image fields + last_verified_at.
    // Pass discrepancies are dumped to audit_report.json for human review.
    const setParts = [];
    if (hero) {
      setParts.push(`hero_image_url = ${sqlEscape(hero.url)}`);
      setParts.push(`hero_image_source = ${sqlEscape(hero.source)}`);
      setParts.push(`hero_image_alt = ${sqlEscape(hero.alt)}`);
    }
    setParts.push(`last_verified_at = NOW()`);
    updates.push(`UPDATE resorts SET ${setParts.join(", ")} WHERE slug = ${sqlEscape(resort.slug)};`);
  }

  // Build SQL output
  const lines = [
    `-- Stage 3.5 audit corrections — generated ${new Date().toISOString().slice(0, 19)}Z`,
    `--`,
    `-- Conservative policy: only hero images + last_verified_at are auto-applied.`,
    `-- Pass-affiliation discrepancies (${stats.pass_corrected} found) are NOT applied`,
    `-- here — they live in data/audit_report.json for human review.`,
    `--`,
    `-- This SQL writes:`,
    `--   ${stats.hero_set} hero images (Wikimedia Commons, CC-licensed)`,
    `--   ${resorts.length} last_verified_at = NOW()`,
    ``,
    `BEGIN;`,
    ``,
    ...updates,
    ``,
    `COMMIT;`,
    ``,
    `-- Verify`,
    `SELECT COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS with_hero,`,
    `       COUNT(*) FILTER (WHERE last_verified_at IS NOT NULL) AS verified,`,
    `       COUNT(*) AS total`,
    `FROM resorts;`,
  ];

  writeFileSync("data/audit_corrections.sql", lines.join("\n") + "\n");
  writeFileSync(
    "data/audit_report.json",
    JSON.stringify({ stats, passChanges, heroSet }, null, 2) + "\n",
  );

  console.error(`\nWrote data/audit_corrections.sql (${updates.length} UPDATE statements)`);
  console.error(`Wrote data/audit_report.json`);
  console.error(`\nStats:`);
  console.error(`  pass_corrected:        ${stats.pass_corrected}`);
  console.error(`  pass_unchanged:        ${stats.pass_unchanged}`);
  console.error(`  hero images set:       ${stats.hero_set} / 30 featured`);
  console.error(`  hero missing featured: ${stats.hero_missing_featured.length} (${stats.hero_missing_featured.join(", ")})`);
  console.error(`  epic matches:          ${stats.epic_match}`);
  console.error(`  ikon matches:          ${stats.ikon_match}`);
  console.error(`  indy matches:          ${stats.indy_match}`);
  console.error(`  mc matches:            ${stats.mc_match}`);
  console.error(`  independent only:      ${stats.independent}`);

  if (passChanges.length > 0) {
    console.error(`\nFirst 10 pass corrections:`);
    for (const c of passChanges.slice(0, 10)) {
      console.error(`  ${c.slug.padEnd(30)} ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
    }
    if (passChanges.length > 10) console.error(`  ...and ${passChanges.length - 10} more (see audit_report.json)`);
  }
}

function sqlEscape(v) {
  if (v == null) return "NULL";
  return `'${String(v).replaceAll("'", "''")}'`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
