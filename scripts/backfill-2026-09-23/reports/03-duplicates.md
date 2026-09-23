# Step 3 — duplicates, stacked pins, Aspen

Report generated 2026-09-23T05:10:31.929Z (dry run). Applied runs: 03-duplicates-2026-09-23_04-56-29.json (10 rows), 03-duplicates-2026-09-23_04-59-40.json (2 rows)

| metric | count |
|---|---|
| rows deactivated (active=false) | 4 |
| coordinates corrected | 4 |
| Aspen mountains filled | 4 |
| aggregate aspen-snowmass deactivated | yes |
| rows updated (all applied runs) | 12 |
| still proposed by this run | 0 |

No favorites, trips, reviews or snow alerts referenced the deactivated ids (checked 2026-09-23).
Deactivated: aspen-snowmass, sunburst-area, tyrol-basin-and-snowboard, schuss-shanty-creek.

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
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T04:56 | big-boulder | latitude | 41.111 | 41.0490822 |  |
| 2026-09-23T04:56 | big-boulder | longitude | -75.652 | -75.6022198 |  |
| 2026-09-23T04:56 | aspen-mountain | vertical_drop | NULL | 3267 |  |
| 2026-09-23T04:56 | aspen-mountain | total_acres | NULL | 673 |  |
| 2026-09-23T04:56 | aspen-mountain | webcam_url | NULL | https://www.aspensnowmass.com/four-mountains/aspen-mountain/mountain-cams |  |
| 2026-09-23T04:56 | aspen-mountain | city | NULL | Aspen |  |
| 2026-09-23T04:56 | aspen-highlands | vertical_drop | NULL | 3635 |  |
| 2026-09-23T04:56 | aspen-highlands | total_acres | NULL | 1010 |  |
| 2026-09-23T04:56 | aspen-highlands | city | NULL | Aspen |  |
| 2026-09-23T04:56 | buttermilk | vertical_drop | NULL | 2030 |  |
| 2026-09-23T04:56 | buttermilk | total_acres | NULL | 435 |  |
| 2026-09-23T04:56 | buttermilk | city | NULL | Aspen |  |
| 2026-09-23T04:56 | snowmass | vertical_drop | NULL | 4406 |  |
| 2026-09-23T04:56 | snowmass | total_acres | NULL | 3362 |  |
| 2026-09-23T04:56 | snowmass | city | NULL | Snowmass Village |  |
| 2026-09-23T04:56 | tyrol-basin | latitude | 43.0931 | 43.0460807 |  |
| 2026-09-23T04:56 | tyrol-basin | longitude | -89.7019 | -89.7850082 |  |
| 2026-09-23T04:56 | tyrol-basin | vertical_drop | NULL | 300 |  |
| 2026-09-23T04:56 | sunburst | latitude | 43.4467 | 43.4940578 |  |
| 2026-09-23T04:56 | sunburst | longitude | -88.2089 | -88.2241075 |  |
| 2026-09-23T04:56 | sunburst | vertical_drop | NULL | 196 |  |
| 2026-09-23T04:56 | sunburst | lift_types | NULL | {"tram":0,"gondola":0,"surface":3,"fixed_quad":0,"bubble_chair":0,"fixed_double":3,"fixed_triple":0,"magic_carpet":1,"hi |  |
| 2026-09-23T04:56 | sunburst | high_speed_lifts | NULL | 0 |  |
| 2026-09-23T04:56 | sunburst | season_end_date | NULL | 2026-03-15 |  |
| 2026-09-23T04:56 | aspen-snowmass | active | true | false |  |
| 2026-09-23T04:56 | sunburst-area | active | true | false |  |
| 2026-09-23T04:56 | tyrol-basin-and-snowboard | active | true | false |  |
| 2026-09-23T04:59 | shanty-creek | latitude | 44.9786 | 44.940947 |  |
| 2026-09-23T04:59 | shanty-creek | longitude | -85.1922 | -85.1357063 |  |
| 2026-09-23T04:59 | shanty-creek | vertical_drop | NULL | 450 |  |
| 2026-09-23T04:59 | shanty-creek | lift_types | {"tram":0,"gondola":0,"surface":2,"fixed_quad":5,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":1,"hi | {"tram":0,"gondola":0,"surface":1,"fixed_quad":1,"bubble_chair":0,"fixed_double":2,"fixed_triple":2,"magic_carpet":1,"hi |  |
| 2026-09-23T04:59 | shanty-creek | passes | ["independent"] | ["indy"] |  |
| 2026-09-23T04:59 | schuss-shanty-creek | active | true | false |  |
