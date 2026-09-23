# Resort data backfill — 2026-09-23

Package "backfill" of the Season 1 rebuild (audit theme E4, findings data-quality-1/4/6/7/8/9/10, resort-panel-detail-18, plus season dates for off-season mode). Everything below was applied to the production `resorts` table on 2026-09-23 through PostgREST with the service-role key, one UPDATE per row, no DELETEs. Every applied run has a backup in `scripts/backfill-2026-09-23/backups/` that `restore.mjs` can PATCH back verbatim.

## Result at a glance

| what | before | after |
|---|---|---|
| active resorts | 425 | 397 |
| rows whose `lift_types` still used Phase 0 keys (High-speed / No-surface filters broken) | 30 | 0 |
| rows with free text or closure flags inside `lift_types` | 9 | 0 |
| active rows with NULL `vertical_drop` | 166 (197 before the nordic rows went) | 37 |
| Aspen rows on the map | 5 (aggregate + 4 with empty stats) | 4 mountains with full stats |
| duplicate pairs (Tyrol Basin, Sunburst, Shanty Creek) | 3 pairs | merged, 3 rows retired |
| Jack Frost / Big Boulder stacked on one pin | yes | separate pins |
| cross-country-only centers and heli-ski operator listed as resorts | 24 | 0 (active=false) |
| active rows with a broken difficulty mix (partial or not summing to 98–102) | 96 (91 after the nordic rows went) | 31 (all non-pass or without a clean source) |
| pass resorts (Epic/Ikon/Indy/MC) with a 2026-27 `season_open_text` | 14 / 273 | 243 / 273 |
| pass resorts with `season_close_text` | 14 / 273 | 241 / 273 |
| all active rows with `season_open_text` | 17 / 397 | 319 / 397 |
| nearby cards showing `Steak_house` / `Donut;Coffee_shop` / street names | yes | prettified or hidden at render time |

## How it was done

Scripts live in `scripts/backfill-2026-09-23/` and share `_lib.mjs`:

- the key is read from `.env.local` and never printed;
- a dry run prints `slug | column | before -> after`; nothing is written without `--apply`;
- on `--apply` the affected rows are snapshotted to `backups/<step>-<timestamp>.json` (before and after values, plus the source) immediately before the first PATCH;
- rows are never deleted — "remove" means `active=false`;
- each step regenerates `reports/<step>.md` from its backups, so a plain dry run after the fact reproduces the full change list with counts.

`00-fetch-onthesnow.mjs` pulls each resort's public OnTheSnow page (one request per page, 1.5 s apart) into `reports/onthesnow-cache.json`. That cache is the evidence for steps 2, 5 and 6: projected 2026-27 opening and closing dates, the stats block and the terrain mix. Name matching is per state and reviewed by hand; one bad candidate (Woodward Park City vs Park City) is excluded in the script, and a trail-count sanity check stops a same-name aggregate page (Aspen Snowmass) from feeding stats to a single mountain.

Undo any step with `node scripts/backfill-2026-09-23/restore.mjs backups/<file>.json --apply`.

## Step by step

### 1. `lift_types` canonical keys — 39 rows

`01-lift-types.mjs`. 30 marquee rows (Vail, Park City, Snowbird, Jackson Hole, Big Sky, Mammoth, Killington, Palisades, Steamboat, Telluride, Beaver Creek, Keystone, Copper, A-Basin, Stowe, Sugarbush, Sun Valley, Heavenly, Northstar, Kirkwood, Winter Park, Loveland, Crested Butte, Brighton, Snowbasin, Solitude, Mad River Glen, Mt Eyak, Breckenridge, Aspen Snowmass) remapped `chair_detach -> high_speed_quad`, `chair_fixed -> fixed_quad`, `tbar + poma + rope -> surface`, `carpet -> magic_carpet`, gondola/tram kept. 9 rows lost `note` / `verified` / `defunct` / `defunct_status` keys (5 of them held nothing else and are now NULL). `high_speed_lifts` filled on 17 rows where it was NULL. Two rows whose only closure signal was a flag inside the JSON now carry `operating_status = 'closed'`: sleeping-giant (sold to HMH Capital, reopening as a summer park, no ski operations) and apple-mountain.

Readers now go through one helper, `lib/liftTypes.ts::liftCounts()`, used by the map filters (`components/Map/MapPage.tsx`, both filter blocks) and the resort page Lifts stat (`app/resort/[slug]/page.tsx`). It also counts `high_speed_eight` / `high_speed_triple` (Loon, Boyne, Red Lodge were ignored before) and coerces with `Number()` so a string value can never break a filter. Unit tests in `lib/liftTypes.test.ts`.

Left alone: snowshoe-mountain stores `null` for four canonical keys (readers treat null as 0); a real lift inventory is needed, not a guess.

### 2. `vertical_drop` — 129 rows filled, 37 still NULL

`02-vertical-drop.mjs`. 90 rows from `summit - base` on the row itself (accepted only in the 100–6,000 ft range), 39 rows from OnTheSnow's published vertical (source URL per row in the report). The 37 remaining are small independent hills with no elevations anywhere plus alpine-meadows (folded into Palisades on OnTheSnow) and indianhead/blackjack (Snowriver's two peaks; OnTheSnow lists the combined resort). No `vertical_drop_source` column was added (no DDL possible from here); the per-row source is in `reports/02-vertical-drop.md` and the backup.

### 3. Duplicates, stacked pins, Aspen — 12 rows, 4 retired

`03-duplicates.mjs`.

- Tyrol Basin: kept `tyrol-basin`, moved its pin to the base lodge at 3487 Bohn Road (it sat 6 km away), vertical 300 ft; `tyrol-basin-and-snowboard` retired.
- Sunburst: kept `sunburst`, pin moved to Prospect Drive, Kewaskum (5 km off), vertical 196 ft, lift breakdown merged from the newer row; `sunburst-area` retired.
- Shanty Creek: kept `shanty-creek`, took the Schuss Mountain pin, Indy Pass membership and lift breakdown from `schuss-shanty-creek`, which is retired.
- Big Boulder moved from Jack Frost's coordinate to its own base at Lake Harmony (OpenStreetMap winter_sports area, corroborated by Apple Maps for 357 Big Boulder Dr). Jack Frost's pin already matched jfbb.com's published location.
- Aspen: the four mountains got vertical, acres, city and (Aspen Mountain) the aggregate row's webcam link from their Wikipedia infoboxes (the official aspensnowmass.com pages carry no stats); elevations, trails, lifts and snowfall were already on the rows and match. Passes already matched the aggregate row. The aggregate `aspen-snowmass` row is retired (active=false); it had no hero image to move.

No favorites, trips, reviews or snow alerts referenced any retired id.

### 4. Nordic-only centers and the heli-ski operator — 24 retired

`04-nordic-heli.mjs`. Each of the 24 was checked against its own website (or a web search when the row had none); the evidence line per slug is in `reports/04-nordic-heli.md`. 23 cross-country centers (Rikert, Trapp Family Lodge, Jackson XC, Great Glen, Maplelag, Minocqua Winter Park, White Grass, ...) and North Cascade Heli are now active=false. Kept on purpose: mount-ashwabay (real alpine hill, lift data missing), quarry-road-trails (rope-tow ski hill next to its XC trails) and apple-mountain (defunct alpine hill, now marked closed).

### 5. Difficulty mix — 62 rows fixed, 31 left

`05-difficulty-mix.mjs`. Three kinds of fix, each with its source in the report: 5 rows where percentages had been typed into the `trails_*` count columns (Aspen Mountain, Mt Bachelor, Lutsen, ...) — copied into `difficulty_pct_*`, counts cleared; 24 rows where one bucket was NULL while the other three already summed to ~100 (Alta, Solitude, Stevens Pass, ...) — the missing bucket is 0; 33 pass resorts replaced with OnTheSnow's published mix (Killington's advanced 39 -> 30, Bretton Woods, Steamboat, Jackson Hole, Snowshoe, ...). The 31 left are independents (no pass, out of scope for research) or pass resorts where OnTheSnow has no complete mix; listed in the report.

### 6. Season dates for off-season mode — 319 rows

`06-season-dates.mjs`. Precedence: operator announcement (Vail Resorts 2026-08-18 release, Ikon Pass 2026-27 list, Aspen Snowmass season page) > OnTheSnow resort page > OnTheSnow state table. Written as `season_open_text = "November 13, 2026"` / `season_close_text = "April 11, 2027"` (exact, so `lib/seasonDates.ts` shows "Opens in N days · Nov 13"), and evergreen `typical_season_start / _end` ("Mid-November" / "Mid-April") only where those were NULL. Closed resorts (Homewood, Sleeping Giant, Apple Mountain) were deliberately left without dates even though OnTheSnow still projects them. Coverage tables and the 75 rows with no source at all are in `reports/06-season-dates.md`. `lib/seasonDates.test.ts` pins the text format to the parser.

### 7. Nearby descriptions — code only

`lib/nearbyCategories.ts::prettifyDescription()` turns raw OSM tags into copy ("Steak_house" -> "Steak house", "Donut;Coffee_shop" -> "Donut, coffee shop", "bbq" -> "BBQ") and returns "" for the importer's street-address fallback ("Main Street", "U.S. Route 4 East"), which `components/NearbyGroup.tsx` then hides; the old `capitalize` class (which produced "Bar And Grill") is gone. Tests in `lib/nearbyCategories.test.ts`. The DB rows were not rewritten: 2,295 of 7,992 descriptions are street names and the right fix is dropping the `addr:street` fallback in `scripts/round-9-fetch-nearby.mjs` on the next nearby refresh.

## Re-running

```
node scripts/backfill-2026-09-23/00-fetch-onthesnow.mjs            # refresh the OnTheSnow cache (~10 min)
node scripts/backfill-2026-09-23/0N-<step>.mjs                     # dry run + report
node scripts/backfill-2026-09-23/0N-<step>.mjs --apply             # write, with backup
node scripts/backfill-2026-09-23/restore.mjs backups/<file>.json --apply
```

Each step is idempotent: a second run proposes only what still differs.

## Still open (not in this package)

- 37 rows without `vertical_drop` and 75 without season dates are small independents; a manual pass or a second source (skimap.org, resort sites) would close them.
- `closest_airport_distance_mi` (finding data-quality-17) and sending `operating_status` to the map (data-quality-18, UI part) were not touched.
- The nearby importer's `addr:street` fallback should be removed at source and the rows refreshed.
- OnTheSnow dates are projections; a light re-run of step 6 in late October will pick up date changes before opening day.
