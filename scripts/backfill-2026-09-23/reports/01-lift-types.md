# Step 1 — lift_types canonical keys

Report generated 2026-09-23T05:37:38.686Z (dry run). Applied runs: 01-lift-types-2026-09-23_04-53-00.json (39 rows)

| metric | count |
|---|---|
| rows with lift_types now | 433 |
| legacy key set remapped (chair_detach/chair_fixed/tbar/poma/rope/carpet) | 30 |
| junk keys dropped (note/verified/defunct/defunct_status) | 9 |
| high_speed_lifts filled from lift_types | 17 |
| operating_status -> closed | 2 |
| rows updated (all applied runs) | 39 |
| still proposed by this run | 0 |

Closure evidence: sleeping-giant — Cowboy State Daily 2026-02-10 (buyer HMH Capital plans a summer park, no ski operations; ski area closed since 2025-26) https://cowboystatedaily.com/2026/02/10/sleeping-giant-ski-area-near-cody-has-a-buyer-but-not-one-who-wants-a-ski-resort/ · apple-mountain — flagged defunct in its own lift_types JSON and in audit finding data-quality-9.

Readers updated in the same change set: components/Map/MapPage.tsx (High-speed / No-surface filters now also count high_speed_eight + high_speed_triple and coerce with Number()), app/resort/[slug]/page.tsx (Lifts stat; it shows the higher of the JSON sum and the curated high_speed_lifts column because of the mismatches listed under Notes).

Audit-trail note: in backups/01-lift-types-2026-09-23_04-53-00.json the `after` column for sunburst shows a full lift inventory plus high_speed_lifts=0; this step wrote lift_types=NULL for that row ({note, verified} only) and the inventory came from step 3, which merged it from the sunburst-area duplicate. The `before` column, which restore.mjs uses, is correct. Four rows (woodward-park-city, soda-springs, song-mountain, mount-ashwabay) ended this step with lift_types=NULL, not five.

## Notes
- hunter-mountain: high_speed_lifts=3 but lift_types sums to 4 (left as is)
- belleayre-mountain: high_speed_lifts=2 but lift_types sums to 1 (left as is)
- gore-mountain: high_speed_lifts=4 but lift_types sums to 3 (left as is)
- whiteface-mountain: high_speed_lifts=2 but lift_types sums to 1 (left as is)
- mountain-creek: high_speed_lifts=3 but lift_types sums to 2 (left as is)
- stratton-mountain: high_speed_lifts=6 but lift_types sums to 5 (left as is)
- mount-snow: high_speed_lifts=6 but lift_types sums to 5 (left as is)
- okemo-mountain-resort: high_speed_lifts=7 but lift_types sums to 5 (left as is)
- loon-mountain: high_speed_lifts=5 but lift_types sums to 4 (left as is)
- aspen-mountain: high_speed_lifts=3 but lift_types sums to 2 (left as is)
- beaver-creek: high_speed_lifts=12 but lift_types sums to 13 (left as is)
- breckenridge: high_speed_lifts=13 but lift_types sums to 10 (left as is)
- jackson-hole: high_speed_lifts=5 but lift_types sums to 2 (left as is)
- yellowstone-club: high_speed_lifts=7 but lift_types sums to 1 (left as is)
- heavenly-mountain-resort: high_speed_lifts=12 but lift_types sums to 10 (left as is)
- arizona-snowbowl: high_speed_lifts=2 but lift_types sums to 1 (left as is)
- sunday-river: high_speed_lifts=4 but lift_types sums to 3 (left as is)
- bretton-woods: high_speed_lifts=5 but lift_types sums to 4 (left as is)
- stowe-mountain-resort: high_speed_lifts=6 but lift_types sums to 4 (left as is)
- the-highlands: high_speed_lifts=2 but lift_types sums to 1 (left as is)
- lutsen-mountains: high_speed_lifts=3 but lift_types sums to 2 (left as is)
- villa-olivia: high_speed_lifts=0 but lift_types sums to 1 (left as is)

## Changes
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T04:53 | arapahoe-basin | lift_types | {"poma":0,"rope":1,"tbar":0,"tram":0,"carpet":2,"gondola":0,"chair_fixed":4,"chair_detach":2} | {"tram":0,"gondola":0,"surface":1,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | arapahoe-basin | high_speed_lifts | NULL | 2 |  |
| 2026-09-23T04:53 | beaver-creek | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":7,"gondola":3,"chair_fixed":3,"chair_detach":13} | {"tram":0,"gondola":3,"surface":0,"fixed_quad":3,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":7,"hi |  |
| 2026-09-23T04:53 | breckenridge | lift_types | {"poma":0,"rope":1,"tbar":1,"tram":0,"carpet":10,"gondola":1,"chair_fixed":4,"chair_detach":10} | {"tram":0,"gondola":1,"surface":2,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":10,"h |  |
| 2026-09-23T04:53 | copper-mountain | lift_types | {"poma":0,"rope":0,"tbar":3,"tram":0,"carpet":5,"gondola":1,"chair_fixed":9,"chair_detach":6} | {"tram":0,"gondola":1,"surface":3,"fixed_quad":9,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":5,"hi |  |
| 2026-09-23T04:53 | copper-mountain | high_speed_lifts | NULL | 6 |  |
| 2026-09-23T04:53 | crested-butte | lift_types | {"poma":0,"rope":0,"tbar":2,"tram":0,"carpet":3,"gondola":0,"chair_fixed":6,"chair_detach":4} | {"tram":0,"gondola":0,"surface":2,"fixed_quad":6,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | keystone | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":8,"gondola":2,"chair_fixed":4,"chair_detach":7} | {"tram":0,"gondola":2,"surface":0,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":8,"hi |  |
| 2026-09-23T04:53 | loveland | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":2,"gondola":0,"chair_fixed":8,"chair_detach":1} | {"tram":0,"gondola":0,"surface":0,"fixed_quad":8,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | steamboat | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":1,"gondola":4,"chair_fixed":6,"chair_detach":9} | {"tram":0,"gondola":4,"surface":0,"fixed_quad":6,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":1,"hi |  |
| 2026-09-23T04:53 | steamboat | high_speed_lifts | NULL | 9 |  |
| 2026-09-23T04:53 | telluride | lift_types | {"poma":0,"rope":0,"tbar":1,"tram":0,"carpet":3,"gondola":4,"chair_fixed":4,"chair_detach":7} | {"tram":0,"gondola":4,"surface":1,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | telluride | high_speed_lifts | NULL | 7 |  |
| 2026-09-23T04:53 | vail | lift_types | {"poma":4,"rope":0,"tbar":0,"tram":0,"carpet":7,"gondola":2,"chair_fixed":3,"chair_detach":18} | {"tram":0,"gondola":2,"surface":4,"fixed_quad":3,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":7,"hi |  |
| 2026-09-23T04:53 | winter-park | lift_types | {"poma":0,"rope":1,"tbar":1,"tram":0,"carpet":3,"gondola":3,"chair_fixed":8,"chair_detach":9} | {"tram":0,"gondola":3,"surface":2,"fixed_quad":8,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | winter-park | high_speed_lifts | NULL | 9 |  |
| 2026-09-23T04:53 | brighton | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":2,"gondola":0,"chair_fixed":1,"chair_detach":6} | {"tram":0,"gondola":0,"surface":0,"fixed_quad":1,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | brighton | high_speed_lifts | NULL | 6 |  |
| 2026-09-23T04:53 | park-city | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":4,"gondola":5,"chair_fixed":17,"chair_detach":15} | {"tram":0,"gondola":5,"surface":0,"fixed_quad":17,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":4,"h |  |
| 2026-09-23T04:53 | snowbasin | lift_types | {"poma":0,"rope":1,"tbar":0,"tram":1,"carpet":2,"gondola":2,"chair_fixed":1,"chair_detach":6} | {"tram":1,"gondola":2,"surface":1,"fixed_quad":1,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | snowbasin | high_speed_lifts | NULL | 6 |  |
| 2026-09-23T04:53 | snowbird | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":1,"carpet":3,"gondola":0,"chair_fixed":6,"chair_detach":4} | {"tram":1,"gondola":0,"surface":0,"fixed_quad":6,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | snowbird | high_speed_lifts | NULL | 4 |  |
| 2026-09-23T04:53 | solitude | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":1,"gondola":0,"chair_fixed":4,"chair_detach":4} | {"tram":0,"gondola":0,"surface":0,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":1,"hi |  |
| 2026-09-23T04:53 | solitude | high_speed_lifts | NULL | 4 |  |
| 2026-09-23T04:53 | woodward-park-city | lift_types | {"note":"Powdr action sports facility, lift inventory unverified","verified":false} | NULL |  |
| 2026-09-23T04:53 | jackson-hole | lift_types | {"poma":0,"rope":1,"tbar":0,"tram":1,"carpet":1,"gondola":2,"chair_fixed":7,"chair_detach":2} | {"tram":1,"gondola":2,"surface":1,"fixed_quad":7,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":1,"hi |  |
| 2026-09-23T04:53 | sleeping-giant | lift_types | {"tram":0,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":1,"fixed_triple":2,"magic_carpet":1,"de | {"tram":0,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":1,"fixed_triple":2,"magic_carpet":1,"hi |  |
| 2026-09-23T04:53 | sleeping-giant | operating_status | active | closed |  |
| 2026-09-23T04:53 | big-sky | lift_types | {"poma":0,"rope":2,"tbar":3,"tram":1,"carpet":8,"gondola":2,"chair_fixed":14,"chair_detach":10} | {"tram":1,"gondola":2,"surface":5,"fixed_quad":14,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":8,"h |  |
| 2026-09-23T04:53 | big-sky | high_speed_lifts | NULL | 10 |  |
| 2026-09-23T04:53 | sun-valley | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":2,"gondola":1,"chair_fixed":4,"chair_detach":10} | {"tram":0,"gondola":1,"surface":0,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | sun-valley | high_speed_lifts | NULL | 10 |  |
| 2026-09-23T04:53 | skiland | lift_types | {"note":"buses transport skiers to summit + 1 rope tow","tram":0,"gondola":0,"surface":1,"fixed_quad":0,"bubble_chair":0 | {"tram":0,"gondola":0,"surface":1,"fixed_quad":0,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":0,"hi |  |
| 2026-09-23T04:53 | palisades-tahoe | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":1,"carpet":3,"gondola":3,"chair_fixed":15,"chair_detach":10} | {"tram":1,"gondola":3,"surface":0,"fixed_quad":15,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"h |  |
| 2026-09-23T04:53 | palisades-tahoe | high_speed_lifts | NULL | 10 |  |
| 2026-09-23T04:53 | heavenly-mountain-resort | lift_types | {"poma":0,"rope":2,"tbar":0,"tram":1,"carpet":5,"gondola":1,"chair_fixed":8,"chair_detach":10} | {"tram":1,"gondola":1,"surface":2,"fixed_quad":8,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":5,"hi |  |
| 2026-09-23T04:53 | northstar-california | lift_types | {"poma":0,"rope":0,"tbar":1,"tram":0,"carpet":5,"gondola":3,"chair_fixed":3,"chair_detach":7} | {"tram":0,"gondola":3,"surface":1,"fixed_quad":3,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":5,"hi |  |
| 2026-09-23T04:53 | kirkwood-mountain-resort | lift_types | {"poma":0,"rope":1,"tbar":1,"tram":0,"carpet":2,"gondola":0,"chair_fixed":9,"chair_detach":2} | {"tram":0,"gondola":0,"surface":2,"fixed_quad":9,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | soda-springs | lift_types | {"note":"primary sources lacked lift inventory","verified":false} | NULL |  |
| 2026-09-23T04:53 | mammoth-mountain | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":6,"gondola":3,"chair_fixed":10,"chair_detach":12} | {"tram":0,"gondola":3,"surface":0,"fixed_quad":10,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":6,"h |  |
| 2026-09-23T04:53 | mammoth-mountain | high_speed_lifts | NULL | 12 |  |
| 2026-09-23T04:53 | spout-springs | lift_types | {"tram":0,"defunct":true,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":2,"fixed_triple":0,"magi | {"tram":0,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":2,"fixed_triple":0,"magic_carpet":0,"hi |  |
| 2026-09-23T04:53 | killington | lift_types | {"poma":0,"rope":1,"tbar":1,"tram":0,"carpet":3,"gondola":2,"chair_fixed":8,"chair_detach":6} | {"tram":0,"gondola":2,"surface":2,"fixed_quad":8,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | killington | high_speed_lifts | NULL | 6 |  |
| 2026-09-23T04:53 | sugarbush | lift_types | {"poma":0,"rope":0,"tbar":2,"tram":0,"carpet":3,"gondola":0,"chair_fixed":8,"chair_detach":5} | {"tram":0,"gondola":0,"surface":2,"fixed_quad":8,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":3,"hi |  |
| 2026-09-23T04:53 | sugarbush | high_speed_lifts | NULL | 5 |  |
| 2026-09-23T04:53 | stowe-mountain-resort | lift_types | {"poma":0,"rope":0,"tbar":0,"tram":0,"carpet":2,"gondola":2,"chair_fixed":4,"chair_detach":4} | {"tram":0,"gondola":2,"surface":0,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":2,"hi |  |
| 2026-09-23T04:53 | mad-river-glen | lift_types | {"poma":0,"rope":1,"tbar":0,"tram":0,"carpet":0,"gondola":0,"chair_fixed":4,"chair_detach":0} | {"tram":0,"gondola":0,"surface":1,"fixed_quad":4,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":0,"hi |  |
| 2026-09-23T04:53 | song-mountain | lift_types | {"note":"lift count not verifiable from accessible sources","verified":false} | NULL |  |
| 2026-09-23T04:53 | apple-mountain | lift_types | {"tram":0,"defunct":true,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magi | {"tram":0,"gondola":0,"surface":0,"fixed_quad":0,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":0,"hi |  |
| 2026-09-23T04:53 | apple-mountain | operating_status | active | closed |  |
| 2026-09-23T04:53 | sunburst | lift_types | {"note":"specific lift counts not published","verified":false} | {"tram":0,"gondola":0,"surface":3,"fixed_quad":0,"bubble_chair":0,"fixed_double":3,"fixed_triple":0,"magic_carpet":1,"hi |  |
| 2026-09-23T04:53 | sunburst | high_speed_lifts | NULL | 0 |  |
| 2026-09-23T04:53 | mount-ashwabay | lift_types | {"note":"lift breakdown unverified — small nonprofit, ~65 acres","verified":false} | NULL |  |
| 2026-09-23T04:53 | mt-eyak | lift_types | {"poma":0,"rope":1,"tbar":0,"tram":0,"carpet":0,"gondola":0,"chair_fixed":1,"chair_detach":0} | {"tram":0,"gondola":0,"surface":1,"fixed_quad":1,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":0,"hi |  |
| 2026-09-23T04:53 | aspen-snowmass | lift_types | {"poma":1,"rope":0,"tbar":1,"tram":0,"carpet":5,"gondola":3,"chair_fixed":10,"chair_detach":18} | {"tram":0,"gondola":3,"surface":2,"fixed_quad":10,"bubble_chair":0,"fixed_double":0,"fixed_triple":0,"magic_carpet":5,"h |  |
| 2026-09-23T04:53 | aspen-snowmass | high_speed_lifts | NULL | 18 |  |
