// Step 3 — duplicate rows, stacked pins and the five Aspen rows.
//
// Every value below was checked against a source on 2026-09-23; the
// URLs are in reports/03-duplicates.md. Rows are never deleted: a
// duplicate becomes active=false so its id survives for favorites,
// trips and any external link.
//
// 3a. Tyrol Basin x2 and Sunburst x2 (WI): keep the original slug row
//     (it carries region + airport and is the URL people have seen),
//     merge the better values from the newer row into it, deactivate
//     the newer row.
// 3b. Jack Frost / Big Boulder (PA) share one coordinate. Jack Frost's
//     pin matches its official location; Big Boulder is moved to its
//     own base area (OpenStreetMap winter_sports polygon).
// 3c. Aspen: fill the four real mountains from their Wikipedia infoboxes
//     (official aspensnowmass.com pages carry no stats), make sure their
//     passes match the aggregate row, hand the aggregate row's webcam to
//     Aspen Mountain (whose cams it points at), then deactivate the
//     aggregate 'aspen-snowmass' row.
//
//   node scripts/backfill-2026-09-23/03-duplicates.mjs [--apply]

import { select, run, writeReport, appliedChangesTable, appliedRows, appliedRunsLine } from "./_lib.mjs";

const STEP = "03-duplicates";
const SLUGS = [
  "tyrol-basin",
  "tyrol-basin-and-snowboard",
  "sunburst",
  "sunburst-area",
  "shanty-creek",
  "schuss-shanty-creek",
  "jack-frost-mountain",
  "big-boulder",
  "aspen-snowmass",
  "aspen-mountain",
  "aspen-highlands",
  "buttermilk",
  "snowmass",
];
const COLUMNS = [
  "active",
  "latitude",
  "longitude",
  "vertical_drop",
  "total_acres",
  "total_trails",
  "total_lifts",
  "base_elevation_ft",
  "summit_elevation_ft",
  "annual_snowfall_in",
  "website_url",
  "webcam_url",
  "lift_types",
  "high_speed_lifts",
  "season_end_date",
  "passes",
  "city",
  "hero_image_url",
  "hero_image_credit",
  "hero_image_source",
  "hero_image_alt",
  "hero_image_attribution",
  "hero_image_verified_winter",
];

const rows = await select("resorts", `select=*&slug=in.(${SLUGS.join(",")})&order=id.asc`);
const by = Object.fromEntries(rows.map((r) => [r.slug, r]));
const missing = SLUGS.filter((s) => !by[s]);
if (missing.length) throw new Error(`rows not found: ${missing.join(", ")}`);

const changes = [];
const add = (slug, patch) => {
  const r = by[slug];
  // Only write what actually differs so the dry run shows real changes.
  const diff = Object.fromEntries(
    Object.entries(patch).filter(([k, v]) => JSON.stringify(r[k]) !== JSON.stringify(v)),
  );
  if (Object.keys(diff).length) changes.push({ id: r.id, slug, before: r, patch: diff });
};

// ---- 3a. WI duplicates -------------------------------------------------
{
  const keep = by["tyrol-basin"];
  const dup = by["tyrol-basin-and-snowboard"];
  add("tyrol-basin", {
    // OSM: "Tyrol Basin Ski And Snowboard Area, 3487 Bohn Road" — the
    // kept row's old pin sat 6 km north-east of the hill.
    latitude: 43.0460807,
    longitude: -89.7850082,
    vertical_drop: keep.vertical_drop ?? dup.vertical_drop, // 300 ft (Wikipedia + dup row)
    season_end_date: keep.season_end_date ?? dup.season_end_date,
  });
  add("tyrol-basin-and-snowboard", { active: false });
}
{
  const keep = by["sunburst"];
  const dup = by["sunburst-area"];
  add("sunburst", {
    // OSM: "Sunburst Ski Area, Prospect Drive, Town of Kewaskum" — the
    // kept row's pin was 5 km south of the hill.
    latitude: 43.4940578,
    longitude: -88.2241075,
    vertical_drop: keep.vertical_drop ?? dup.vertical_drop, // 196 ft (dup row)
    lift_types: keep.lift_types ?? dup.lift_types, // step 1 nulled the {note} object
    high_speed_lifts: keep.high_speed_lifts ?? dup.high_speed_lifts,
    season_end_date: keep.season_end_date ?? dup.season_end_date,
  });
  add("sunburst-area", { active: false });
}

// ---- 3a'. Shanty Creek (MI): 'shanty-creek' + 'schuss-shanty-creek' are
// the same resort — Schuss Mountain is Shanty Creek's ski hill (the
// Summit Mountain side no longer runs lifts). Keep the shorter slug,
// take the ski-hill pin, the Indy Pass membership and the fuller lift
// breakdown from the newer row, retire the newer row.
{
  const keep = by["shanty-creek"];
  const dup = by["schuss-shanty-creek"];
  add("shanty-creek", {
    latitude: dup.latitude,
    longitude: dup.longitude,
    vertical_drop: keep.vertical_drop ?? dup.vertical_drop, // 450 ft
    passes: dup.passes, // ["indy"] — Schuss Mountain at Shanty Creek is an Indy Pass resort
    lift_types: dup.lift_types,
    high_speed_lifts: keep.high_speed_lifts ?? dup.high_speed_lifts,
    season_end_date: keep.season_end_date ?? dup.season_end_date,
  });
  add("schuss-shanty-creek", { active: false });
}

// ---- 3b. Big Boulder gets its own coordinate ----------------------------
add("big-boulder", {
  // OpenStreetMap winter_sports area "Big Boulder Ski Resort Area, Lake
  // Harmony" (41.0490822, -75.6022198); Apple Maps lists the lodge at
  // 357 Big Boulder Dr as 41.050168, -75.601279 — same spot.
  latitude: 41.0490822,
  longitude: -75.6022198,
});

// ---- 3c. Aspen ----------------------------------------------------------
const agg = by["aspen-snowmass"];
const aspenPasses = agg.passes; // ["ikon", "mountain_collective"]
const fillNull = (slug, values) =>
  add(slug, Object.fromEntries(Object.entries(values).filter(([k]) => by[slug][k] == null)));

// Wikipedia infoboxes, fetched 2026-09-23 (see report for URLs).
fillNull("aspen-mountain", {
  vertical_drop: 3267,
  total_acres: 673,
  base_elevation_ft: 7945,
  summit_elevation_ft: 11212,
  annual_snowfall_in: 300,
  total_trails: 76,
  total_lifts: 9,
  city: "Aspen",
  // The aggregate row's cams link points at Aspen Mountain's cameras.
  webcam_url: agg.webcam_url,
});
fillNull("aspen-highlands", {
  vertical_drop: 3635, // lift-served: Loge Peak 11,675 ft - base 8,040 ft
  total_acres: 1010,
  base_elevation_ft: 8040,
  summit_elevation_ft: 11675,
  annual_snowfall_in: 300,
  total_trails: 118,
  total_lifts: 5,
  city: "Aspen",
});
fillNull("buttermilk", {
  vertical_drop: 2030,
  total_acres: 435,
  base_elevation_ft: 7870,
  summit_elevation_ft: 9900,
  annual_snowfall_in: 200,
  total_trails: 44,
  total_lifts: 8,
  city: "Aspen",
});
fillNull("snowmass", {
  vertical_drop: 4406,
  total_acres: 3362,
  base_elevation_ft: 8104,
  summit_elevation_ft: 12510,
  annual_snowfall_in: 300,
  total_trails: 94,
  total_lifts: 17,
  city: "Snowmass Village",
});
for (const s of ["aspen-mountain", "aspen-highlands", "buttermilk", "snowmass"]) {
  add(s, { passes: aspenPasses, website_url: by[s].website_url ?? "https://www.aspensnowmass.com" });
}
// Move the aggregate row's hero to Snowmass only if Snowmass has none.
if (agg.hero_image_url && !by["snowmass"].hero_image_url) {
  add("snowmass", {
    hero_image_url: agg.hero_image_url,
    hero_image_credit: agg.hero_image_credit,
    hero_image_source: agg.hero_image_source,
    hero_image_alt: agg.hero_image_alt,
    hero_image_attribution: agg.hero_image_attribution,
    hero_image_verified_winter: agg.hero_image_verified_winter,
  });
}
// Deactivate the aggregate only when all four mountains are complete.
const REQUIRED = ["vertical_drop", "total_acres", "total_trails", "total_lifts", "base_elevation_ft", "summit_elevation_ft", "annual_snowfall_in", "website_url"];
const complete = ["aspen-mountain", "aspen-highlands", "buttermilk", "snowmass"].every((s) => {
  const merged = { ...by[s], ...(changes.find((c) => c.slug === s)?.patch ?? {}) };
  return REQUIRED.every((k) => merged[k] != null);
});
if (complete) add("aspen-snowmass", { active: false });
else console.log("Aspen mountains still incomplete; aggregate row kept active.");

const result = await run(STEP, "resorts", changes, COLUMNS);

// The step was applied in two runs (WI/PA/Aspen, then Shanty Creek);
// counts cover every applied run plus whatever this run still proposes.
const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP).map((r) => ({ slug: r.slug, patch: r.after })), ...pending];

writeReport(
  STEP,
  `# Step 3 — duplicates, stacked pins, Aspen

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| rows deactivated (active=false) | ${all.filter((c) => c.patch.active === false).length} |
| coordinates corrected | ${all.filter((c) => "latitude" in c.patch).length} |
| Aspen mountains filled | ${["aspen-mountain", "aspen-highlands", "buttermilk", "snowmass"].filter((s) => all.some((c) => c.slug === s)).length} |
| aggregate aspen-snowmass deactivated | ${complete ? "yes" : "no (mountains incomplete)"} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |

No favorites, trips, reviews or snow alerts referenced the deactivated ids (checked 2026-09-23).
Deactivated: ${all.filter((c) => c.patch.active === false).map((c) => c.slug).join(", ") || "none"}.

## Sources
- Tyrol Basin: OpenStreetMap Nominatim "Tyrol Basin Ski And Snowboard Area, 3487 Bohn Road, Town of Vermont, WI" (43.0460807, -89.7850082); vertical 300 ft — https://en.wikipedia.org/wiki/Tyrol_Basin
- Sunburst: OpenStreetMap Nominatim "Sunburst Ski Area, Prospect Drive, Town of Kewaskum, WI" (43.4940578, -88.2241075)
- Shanty Creek: OnTheSnow lists the resort as "Schuss Mountain at Shanty Creek" (https://www.onthesnow.com/michigan/projected-openings); Indy Pass lists Schuss Mountain at Shanty Creek; both rows share shantycreek.com, 42 trails and the same trail map. Pin moved to the Schuss Mountain base (44.940947, -85.1357063, the newer row's geocode).
- Big Boulder: OpenStreetMap Nominatim "Big Boulder Ski Resort Area, Lake Harmony" (41.0490822, -75.6022198), corroborated by Apple Maps for 357 Big Boulder Dr (41.050168, -75.601279). Jack Frost stays at (41.111, -75.652), which matches jfbb.com's published 41°06'26.9"N 75°39'11.2"W.
- Aspen Mountain: https://en.wikipedia.org/wiki/Aspen_Mountain_(ski_area) — vertical 3,267 ft, base 7,945 ft, summit 11,212 ft, 673 acres, 76 runs, 9 lifts, 300 in/yr
- Aspen Highlands: https://en.wikipedia.org/wiki/Aspen_Highlands — base 8,040 ft, 1,010 acres, 118 runs, 5 lifts, 300 in/yr; lift-served summit 11,675 ft already on the row, so vertical = 3,635 ft (Wikipedia's 3,638 ft rounds the same lift-served figure; Highland Peak 12,392 ft is hike-to)
- Buttermilk: https://en.wikipedia.org/wiki/Buttermilk_(ski_area) — vertical 2,030 ft, base 7,870 ft, summit 9,900 ft, 435 acres, 44 runs, 8 lifts, 200 in/yr
- Snowmass: https://en.wikipedia.org/wiki/Snowmass_(ski_area) — vertical 4,406 ft, base 8,104 ft, summit 12,510 ft, 3,362 acres, 94 runs; 17 lifts already on the row
- Season 2026-27 for Aspen Mountain from aspensnowmass.com: November 26, 2026 to April 18, 2027 (written in step 6).

## Changes
${appliedChangesTable(STEP, pending)}
`,
);
