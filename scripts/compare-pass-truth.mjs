// Stage 3.6 — pass-truth comparison
//
// Reads:
//   - Inline Indy + Epic + Ikon + MC USA lists (audited 2026-05-04 against
//     official Indy site listing, Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts,
//     OnTheSnow + Alterra + lifted.ikonpass.com + PeakRankings, and the
//     Mountain Collective official site)
//   - Live Supabase resorts table
// Outputs:
//   - data/comparison_report.json
//
// No DB writes. No SQL. Output is for human review.

import { writeFileSync, readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim())),
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --------------------------------------------------------------------------
// EPIC — 37 USA resorts. Source: Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts.
// Includes Telluride as Partner Limited.
// --------------------------------------------------------------------------
const EPIC = [
  ["Vail","CO"], ["Beaver Creek","CO"], ["Breckenridge","CO"], ["Keystone","CO"],
  ["Crested Butte","CO"], ["Park City","UT"], ["Heavenly","CA"],
  ["Northstar California","CA"], ["Kirkwood","CA"], ["Stevens Pass","WA"],
  ["Stowe","VT"], ["Okemo","VT"], ["Mount Snow","VT"],
  ["Mount Sunapee","NH"], ["Attitash","NH"], ["Wildcat Mountain","NH"], ["Crotched Mountain","NH"],
  ["Hunter Mountain","NY"],
  ["Seven Springs","PA"], ["Hidden Valley","PA"], ["Laurel Mountain","PA"],
  ["Liberty Mountain","PA"], ["Roundtop Mountain","PA"], ["Whitetail","PA"],
  ["Jack Frost","PA"], ["Big Boulder","PA"],
  ["Boston Mills","OH"], ["Brandywine","OH"], ["Alpine Valley","OH"], ["Mad River Mountain","OH"],
  ["Mount Brighton","MI"],
  ["Wilmot Mountain","WI"], ["Afton Alps","MN"],
  ["Hidden Valley","MO"], ["Snow Creek","MO"], ["Paoli Peaks","IN"],
  ["Telluride","CO"],
];

// --------------------------------------------------------------------------
// IKON — 44 USA resorts (full Alterra + partners). Source: Wikipedia/Ikon_Pass +
// OnTheSnow + Alterra + lifted.ikonpass.com + PeakRankings + Stormskiing.
// New partners for 25-26: Cranmore, Jiminy Peak, Wild Mountain, Buck Hill.
// EXCLUDED: Windham (departed Ikon for 2025-26).
// --------------------------------------------------------------------------
const IKON = [
  ["Aspen Snowmass","CO"], ["Steamboat","CO"], ["Winter Park","CO"], ["Copper Mountain","CO"],
  ["Arapahoe Basin","CO"], ["Eldora","CO"],
  ["Palisades Tahoe","CA"], ["Mammoth Mountain","CA"], ["June Mountain","CA"],
  ["Big Bear","CA"], ["Snow Valley","CA"], ["Sierra-at-Tahoe","CA"],
  ["Jackson Hole","WY"], ["Big Sky","MT"], ["Alyeska","AK"],
  ["Sun Valley","ID"], ["Schweitzer","ID"],
  ["Deer Valley","UT"], ["Solitude","UT"], ["Brighton","UT"], ["Alta","UT"],
  ["Snowbird","UT"], ["Snowbasin","UT"],
  ["Stratton","VT"], ["Sugarbush","VT"], ["Killington","VT"], ["Pico","VT"],
  ["Loon Mountain","NH"], ["Cranmore","NH"],
  ["Sunday River","ME"], ["Sugarloaf","ME"],
  ["Jiminy Peak","MA"], ["Snowshoe","WV"],
  ["Camelback","PA"],
  ["Boyne Mountain","MI"], ["The Highlands","MI"],
  ["Lutsen","MN"], ["Wild Mountain","MN"], ["Buck Hill","MN"],
  ["Granite Peak","WI"],
  ["Crystal Mountain","WA"], ["The Summit at Snoqualmie","WA"],
  ["Mt. Bachelor","OR"], ["Taos","NM"],
];

// --------------------------------------------------------------------------
// INDY — partial USA list from indyskipass.com WebFetch (73 resorts). Indy
// has ~150 USA partners total; this is alphabetical first half. Known
// not-yet-captured (alphabetically after "Mohawk Mountain") — worth flagging.
// --------------------------------------------------------------------------
const INDY = [
  ["49 Degrees North","WA"], ["Andes Tower Hills","MN"], ["Antelope Butte","WY"],
  ["Arctic Valley","AK"], ["Bear Creek","PA"], ["Bear Valley Mountain Resort","CA"],
  ["Beaver Mountain","UT"], ["Berkshire East Mountain Resort","MA"],
  ["Big Moose","ME"], ["Big Powderhorn","MI"], ["Big Rock Mountain","ME"],
  ["Black Mountain of Maine","ME"], ["Black Mountain Ski Area","NH"],
  ["Blacktail Mountain Resort","MT"], ["Blue Knob All Season Resort","PA"],
  ["Bolton Valley Resort","VT"], ["Bottineau Winter Park","ND"],
  ["Bousquet Mountain","MA"], ["Brundage Mountain Resort","ID"], ["Bryce Resort","VA"],
  ["Buffalo Ski Club","NY"], ["Burke Mountain","VT"], ["Caberfae Peaks","MI"],
  ["Camden Snow Bowl","ME"], ["Canaan Valley","WV"], ["Cannon Mountain","NH"],
  ["Cataloochee Ski Area","NC"], ["Catamount Mountain Resort","MA"],
  ["Cherry Peak","UT"], ["Chestnut Mountain Resort","IL"], ["China Peak","CA"],
  ["Cooper Spur Ski Area","OR"], ["Crystal Mountain","MI"], ["Cuchara","CO"],
  ["Dartmouth Skiway","NH"], ["Detroit Mountain","MN"], ["Dodge Ridge","CA"],
  ["Donner Ski Ranch","CA"], ["Dry Hill Ski Area","NY"], ["Eagle Point","UT"],
  ["Eaglecrest","AK"], ["Echo Mountain","CO"], ["Granby Ranch","CO"],
  ["Granite Peak","WI"], ["Great Bear Ski Valley","SD"],
  ["Greek Peak Mountain Resort","NY"], ["Hatley Pointe","NC"],
  ["Hilltop Ski Area","AK"], ["Hoodoo","OR"], ["Howelsen Hill","CO"],
  ["Huff Hills Ski Area","ND"], ["Hunt Hollow Ski Club","NY"],
  ["Hurricane Ridge","WA"], ["Hyland Hills","MN"], ["Jay Peak Resort","VT"],
  ["Kelly Canyon","ID"], ["King Pine","NH"], ["Little Switzerland","WI"],
  ["Lost Trail Powder Mountain","MT"], ["Lost Valley","ME"],
  ["Loup Loup Ski Bowl","WA"], ["Loveland Ski Area","CO"], ["Lutsen Mountains","MN"],
  ["Magic Mountain","VT"], ["Magic Mountain Idaho","ID"], ["Maple Ski Ridge","NY"],
  ["Marquette Mountain","MI"], ["Massanutten Resort","VA"],
  ["McIntyre Ski Area","NH"], ["Meadowlark Ski Resort","WY"],
  ["Middlebury Snowbowl","VT"], ["Mission Ridge","WA"], ["Mohawk Mountain","CT"],
  // After "Mohawk Mountain" (M) the Indy list continues to: Montage, Montana
  // Snowbowl, Mont Ripley, Moose Mountain (AK Skiland), Mt Abram, Mt Eyak,
  // Mt Holiday, Mt Hood Meadows, Mt La Crosse, Mt Shasta Ski Park,
  // Mountain High, Nordic Mountain, Norway Mountain, Nubs Nob, Ober Mountain,
  // Pats Peak, Pebble Creek, Peek 'n Peak, Pine Mountain, Plattekill,
  // Pomerelle, Powder Ridge, Powderhorn, Ragged, Red Lodge, Saddleback,
  // Saskadena Six, Schuss Mountain, Shawnee Mountain, Silver Mountain,
  // Ski Sawmill, Snow King, Snow Ridge, Snowstar, Soldier Mountain,
  // Spirit Mountain, Sunburst, Sundown Mountain, Sunlight, Swain, Tamarack,
  // Tenney, Terry Peak, Titus Mountain, Trollhaugen, Tussey, Tyrol Basin,
  // Waterville Valley, West Mountain, Whaleback, White Pass, White Pine,
  // Whitecap, Wintergreen, Winterplace, Wisp.
  // These were validated against the previous Stage 3.5 agent fetch. Adding now.
  ["Montage Mountain","PA"], ["Montana Snowbowl","MT"], ["Mont Ripley","MI"],
  ["Moose Mountain","AK"], ["Mt. Abram","ME"], ["Mt. Eyak","AK"],
  ["Mt. Hood Meadows","OR"], ["Mt La Crosse","WI"], ["Mt. Shasta","CA"],
  ["Mountain High","CA"], ["Nordic Mountain","WI"], ["Norway Mountain","MI"],
  ["Nubs Nob","MI"], ["Ober Mountain","TN"], ["Pats Peak","NH"],
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

// --------------------------------------------------------------------------
// MC — 17 USA destinations. Source: mountaincollective.com/resorts (verified
// in Stage 3.5; updates for 25-26 incorporated).
// --------------------------------------------------------------------------
const MC = [
  ["Alta","UT"], ["Aspen Snowmass","CO"], ["Big Sky","MT"], ["Grand Targhee","WY"],
  ["Jackson Hole","WY"], ["Snowbasin","UT"], ["Snowbird","UT"], ["Sugar Bowl","CA"],
  ["Sugarloaf","ME"], ["Sun Valley","ID"], ["Sunday River","ME"], ["Taos","NM"],
  ["Whiteface","NY"], ["Telluride","CO"], ["Mammoth","CA"], ["Powder Mountain","UT"],
  ["Silverton","CO"], ["Alyeska","AK"],
];

// --------------------------------------------------------------------------
// Matching helpers
// --------------------------------------------------------------------------
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\b(ski|snowboard|mountain|mountains|resort|area|ski area|ski resort|ski park|the)\b/g, " ")
    .replace(/[^a-z0-9 ']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(resortName, resortState, [pName, pState]) {
  if (resortState !== pState) return false;
  const a = normalize(resortName);
  const b = normalize(pName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

const PRIORITY = ["epic", "ikon", "indy", "mountain_collective", "independent"];
function order(arr) {
  return [...new Set(arr)].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b));
}
function eq(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }

// --------------------------------------------------------------------------
async function main() {
  console.error("Fetching resorts from Supabase...");
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,state,passes,tier&order=name`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  );
  const resorts = await r.json();
  console.error(`  -> ${resorts.length} resorts in DB`);

  const corrections = [];
  const unchanged = [];
  const summary = { total: resorts.length, no_change: 0, change: 0, by_change_kind: {} };

  for (const resort of resorts) {
    const expected = [];
    if (EPIC.some((e) => matches(resort.name, resort.state, e))) expected.push("epic");
    if (IKON.some((e) => matches(resort.name, resort.state, e))) expected.push("ikon");
    if (INDY.some((e) => matches(resort.name, resort.state, e))) expected.push("indy");
    if (MC.some((e) => matches(resort.name, resort.state, e))) expected.push("mountain_collective");
    if (expected.length === 0) expected.push("independent");
    const newPasses = order(expected);
    const oldPasses = order(resort.passes ?? []);

    if (eq(newPasses, oldPasses)) {
      summary.no_change++;
      unchanged.push({ slug: resort.slug, passes: oldPasses });
    } else {
      summary.change++;
      const added = newPasses.filter((p) => !oldPasses.includes(p));
      const removed = oldPasses.filter((p) => !newPasses.includes(p));
      let kind;
      if (added.length && !removed.length) kind = "ADD_PASS";
      else if (!added.length && removed.length) kind = "REMOVE_PASS";
      else if (added.length && removed.length) kind = "REPLACE_PASS";
      else kind = "REORDER";
      summary.by_change_kind[kind] = (summary.by_change_kind[kind] ?? 0) + 1;
      corrections.push({
        slug: resort.slug,
        name: resort.name,
        state: resort.state,
        tier: resort.tier,
        from: oldPasses,
        to: newPasses,
        added,
        removed,
        kind,
      });
    }
  }

  // Group corrections by kind, then by impact (featured first, then by removal severity)
  corrections.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier === "featured" ? -1 : 1;
    const order = { REPLACE_PASS: 0, REMOVE_PASS: 1, ADD_PASS: 2, REORDER: 3 };
    return order[a.kind] - order[b.kind];
  });

  const report = {
    generated_at: new Date().toISOString(),
    sources: {
      indy: { url: "https://www.indyskipass.com/our-resorts", count_us: INDY.length, method: "WebFetch listing (partial; Stage 3.5 agent fetched 250 entries from same URL)" },
      epic: { url: "https://en.wikipedia.org/wiki/Epic_Pass", count_us: EPIC.length, method: "Multi-source agent: Wikipedia/Epic_Pass + Wikipedia/Vail_Resorts" },
      ikon: { url: "https://en.wikipedia.org/wiki/Ikon_Pass", count_us: IKON.length, method: "Multi-source agent: Wikipedia + OnTheSnow + Alterra + lifted.ikonpass.com + PeakRankings + Stormskiing" },
      mountain_collective: { url: "https://mountaincollective.com/resorts/", count_us: MC.length, method: "Stage 3.5 agent fetch + Stage 2 cross-check" },
    },
    summary,
    corrections,
    unchanged_count: unchanged.length,
  };

  writeFileSync("data/comparison_report.json", JSON.stringify(report, null, 2) + "\n");

  console.error(`\nWrote data/comparison_report.json`);
  console.error(`\nSummary:`);
  console.error(`  total resorts:       ${summary.total}`);
  console.error(`  unchanged:           ${summary.no_change}`);
  console.error(`  changes:             ${summary.change}`);
  for (const [k, v] of Object.entries(summary.by_change_kind)) {
    console.error(`    ${k.padEnd(15)} ${v}`);
  }

  // Top 20 changes preview
  console.error(`\nTop 20 changes (featured first, then severity):`);
  for (const c of corrections.slice(0, 20)) {
    const tag = c.tier === "featured" ? "★" : " ";
    console.error(`  ${tag} ${c.slug.padEnd(30)} ${c.kind.padEnd(13)} ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
  }
  if (corrections.length > 20) console.error(`  ...and ${corrections.length - 20} more`);
}

main().catch((e) => { console.error(e); process.exit(1); });
