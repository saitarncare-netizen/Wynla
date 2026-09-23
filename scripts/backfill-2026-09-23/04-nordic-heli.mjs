// Step 4 — retire cross-country-only centers and the heli-ski operator.
//
// Why: 26 active rows have total_lifts = 0. Most are nordic trail
// centers that arrived with the Indy Pass import; one is a helicopter
// skiing operator. None of them is a lift-served ski area, so they
// count toward "resorts near you", sit at the bottom of every /state
// sort and render as medium pins with no stats. They become
// active=false (never deleted) with the reason recorded below.
//
// Every slug in DEACTIVATE was checked on 2026-09-23 against its own
// website (or, where the row has none, a web search) — the evidence is
// in reports/04-nordic-heli.md. Small alpine hills that merely lack lift
// data are explicitly KEPT: mount-ashwabay (chairlift + T-bar, lifts
// NULL), quarry-road-trails (rope-tow ski hill alongside its XC
// trails), apple-mountain (defunct alpine hill; operating_status was
// set to 'closed' in step 1).
//
//   node scripts/backfill-2026-09-23/04-nordic-heli.mjs [--apply]

import { select, run, writeReport, appliedChangesTable, appliedRows, appliedRunsLine } from "./_lib.mjs";

const STEP = "04-nordic-heli";

// slug -> [kind, evidence]
const DEACTIVATE = {
  "rikert-outdoor-center": ["nordic", "rikertoutdoor.com — cross-country programs and clinics only; Middlebury Snowbowl is the separate alpine area"],
  "bethel-village-trails": ["nordic", "woodsandtrails.org — 'cross country skiing, fat biking, and snowshoeing at the Bethel Village Trails'"],
  "northern-maine-community-trails": ["nordic", "nmctrails.org — 'Nordic Skiing' trail center, no lifts"],
  "rangeley-lakes-trail-center": ["nordic", "Rangeley Region Cross Country Ski Club, 55 km groomed nordic trails at the base of Saddleback (skimaine.com/rangeleylakestrailcenter)"],
  maplelag: ["nordic", "maplelag.com — 'Destination Cross-Country Ski Center'"],
  loppet: ["nordic", "loppet.org — Theodore Wirth Park nordic trails, no lift-served terrain"],
  "crosscut-sports-center": ["nordic", "crosscutmt.org — 'human-powered recreation', nordic skiing adjacent to Bridger Bowl"],
  "dog-creek-lodge-nordic-center": ["nordic", "dogcreeklodge.com — '27+ kilometers of groomed nordic trail systems'"],
  "homestake-lodge": ["nordic", "homestakelodge.com — cross-country ski lodge, 35 km groomed trails (Indy Pass XC listing)"],
  "loge-glacier": ["nordic", "logecamps.com — lodging property in Essex, MT with groomed nordic tracks; no lifts"],
  "franconia-village-xc-area": ["nordic", "franconiainn.com — 'Franconia Village XC Ski Center', 30 km nordic trails"],
  "great-glen-trails-outdoor-center": ["nordic", "greatglentrails.com — classic and skate cross-country only"],
  "jackson-xc": ["nordic", "jacksonxc.org — Jackson Ski Touring Foundation, 150 km cross-country trails"],
  "high-point-xc-center": ["nordic", "xcskihighpoint.com — 'High Point Cross Country Ski Center'"],
  "enchanted-forest-xc": ["nordic", "enchantedforestxc.com — XC skiing and snowshoeing only"],
  "garnet-hill-xc": ["nordic", "garnet-hill.com — snowcat-groomed private ski trails; alpine skiing is at nearby Gore"],
  "catamount-outdoor-family-center": ["nordic", "catamountoutdoor.org — nordic ski and mountain-bike trail network, no lifts"],
  "trapp-family-lodge": ["nordic", "vontrappresort.com — cross-country ski center only"],
  "woodstock-nordic-center": ["nordic", "woodstockinn.com — 45 km nordic trails (Indy Pass XC listing)"],
  "plain-valley-trails": ["nordic", "skiplain.com — '25 km of groomed trails' for XC skiing"],
  "minocqua-winter-park": ["nordic", "minocquawinterpark.org — 65 miles of groomed cross-country trails"],
  "white-grass-touring": ["nordic", "whitegrass.com — 'Cross-country skiing and snowshoeing' touring center"],
  "turpin-meadow-ranch": ["nordic", "turpinmeadowranch.com — guest ranch with a Nordic Center, no lifts"],
  "north-cascade-heli": ["heli", "heli-ski.com — helicopter skiing operator, '300,000 acres of pure backcountry heli-skiing terrain'"],
};

const rows = await select(
  "resorts",
  "select=id,slug,name,state,active,total_lifts,has_xc_skiing,website_url,passes&active=eq.true&or=(total_lifts.eq.0,total_lifts.is.null)&order=id.asc",
);

const changes = [];
const kept = [];
for (const r of rows) {
  if (DEACTIVATE[r.slug]) changes.push({ id: r.id, slug: r.slug, before: r, patch: { active: false } });
  else kept.push(`${r.slug} (${r.state}) — lifts=${r.total_lifts ?? "NULL"}, kept as an alpine area`);
}
const notFound = Object.keys(DEACTIVATE).filter((s) => !rows.some((r) => r.slug === s));

const result = await run(STEP, "resorts", changes, ["active"]);

const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP), ...pending];
writeReport(
  STEP,
  `# Step 4 — nordic-only centers and heli-ski operator retired

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| active rows with 0 / NULL lifts at this run | ${rows.length} |
| deactivated as nordic-only | ${all.filter((c) => DEACTIVATE[c.slug]?.[0] === "nordic").length} |
| deactivated as heli-ski | ${all.filter((c) => DEACTIVATE[c.slug]?.[0] === "heli").length} |
| kept (alpine hill without lift data) | ${kept.length} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |

${notFound.length ? `Already inactive (deactivated by an earlier run): ${notFound.join(", ")}\n` : ""}
## Kept
${kept.map((k) => `- ${k}`).join("\n") || "- none"}

## Deactivated, with evidence (checked 2026-09-23)
${Object.entries(DEACTIVATE)
  .map(([slug, [kind, why]]) => `- ${slug} — ${kind}: ${why}`)
  .join("\n")}

## Changes
${appliedChangesTable(STEP, pending)}
`,
);
