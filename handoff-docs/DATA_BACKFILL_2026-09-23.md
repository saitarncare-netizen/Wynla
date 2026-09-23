# Resort data backfill — 2026-09-23

Package "backfill" of the Season 1 rebuild (audit theme E4, findings data-quality-1/4/6/7/8/9/10, resort-panel-detail-18, plus season dates for off-season mode). Everything below was applied to the production `resorts` table on 2026-09-23 through PostgREST with the service-role key, one UPDATE per row, no DELETEs. Every applied run has a backup in `scripts/backfill-2026-09-23/backups/` that `restore.mjs` can PATCH back verbatim.

The package went through an adversarial review the same day; the second pass (steps 4-7 re-run, step 7 added, code follow-ups) is folded into the sections below rather than described separately.

## Result at a glance

| what | before | after |
|---|---|---|
| active resorts | 425 | 395 |
| rows whose `lift_types` still used Phase 0 keys (High-speed / No-surface filters broken) | 30 | 0 |
| rows with free text or closure flags inside `lift_types` | 9 | 0 |
| active rows with NULL `vertical_drop` | 166 (197 before the nordic rows went) | 37 |
| Aspen rows on the map | 5 (aggregate + 4 with empty stats) | 4 mountains with full stats; Snowmass + Aspen Mountain carry the featured tier |
| duplicate pairs (Tyrol Basin, Sunburst, Shanty Creek) | 3 pairs | merged, 3 rows retired, old URLs 301 to the kept row |
| Jack Frost / Big Boulder stacked on one pin | yes | separate pins |
| cross-country-only centers and heli-ski operator listed as resorts | 24 | 0 (active=false) |
| permanently closed areas still rendering as normal pins | 2 (Sleeping Giant, Apple Mountain) + Homewood wrongly marked closed | 0 (two retired; Homewood back to active — it sells public 2026-27 passes) |
| active rows with a broken difficulty mix (partial or not summing to 98–102) | 96 (91 after the nordic rows went) | 1 (Alpine Valley MI, two buckets, no source) |
| pass resorts (Epic/Ikon/Indy/MC) with a 2026-27 `season_open_text` | 9 / 235 | 205 / 235 |
| pass resorts with `season_close_text` | 10 / 235 | 204 / 235 |
| all active rows with `season_open_text` | 17 / 395 | 320 / 395 (42 announced by the operator, 261 projected and labelled so, 17 curated texts kept) |
| nearby cards showing `Steak_house` / `Donut;Coffee_shop` / street names | yes | prettified or hidden at render time (2,404 of 7,992 descriptions are addresses and are hidden) |

## How it was done

Scripts live in `scripts/backfill-2026-09-23/` and share `_lib.mjs`:

- the key is read from `.env.local` and never printed;
- a dry run prints `slug | column | before -> after`; nothing is written without `--apply`;
- on `--apply` the affected rows are snapshotted to `backups/<step>-<timestamp>.json` (before and after values, plus the source) immediately before the first PATCH;
- rows are never deleted — "remove" means `active=false`;
- each step regenerates `reports/<step>.md` from its backups, so a plain dry run after the fact reproduces the full change list with counts;
- steps 5 and 6 re-derive every row from the values in their FIRST backup, so a policy change re-runs cleanly and writes only what differs from the live row.

`00-fetch-onthesnow.mjs` pulls each resort's public OnTheSnow page (one request per page, 1.5 s apart) into `reports/onthesnow-cache.json`. That cache is the evidence for steps 2, 5 and 6: projected 2026-27 opening and closing dates, the stats block and the terrain mix. Name matching is per state and reviewed by hand; one bad candidate (Woodward Park City vs Park City) is excluded in the script, and a trail-count sanity check stops a same-name aggregate page (Aspen Snowmass) from feeding stats to a single mountain.

Undo any step with `node scripts/backfill-2026-09-23/restore.mjs backups/<file>.json --apply`.

## Step by step

### 1. `lift_types` canonical keys — 39 rows

`01-lift-types.mjs`. 30 marquee rows (Vail, Park City, Snowbird, Jackson Hole, Big Sky, Mammoth, Killington, Palisades, Steamboat, Telluride, Beaver Creek, Keystone, Copper, A-Basin, Stowe, Sugarbush, Sun Valley, Heavenly, Northstar, Kirkwood, Winter Park, Loveland, Crested Butte, Brighton, Snowbasin, Solitude, Mad River Glen, Mt Eyak, Breckenridge, Aspen Snowmass) remapped `chair_detach -> high_speed_quad`, `chair_fixed -> fixed_quad`, `tbar + poma + rope -> surface`, `carpet -> magic_carpet`, gondola/tram kept. 9 rows lost `note` / `verified` / `defunct` / `defunct_status` keys (4 of them held nothing else and ended the step with `lift_types = NULL`: woodward-park-city, soda-springs, song-mountain, mount-ashwabay; sunburst also went NULL here and then received a full inventory from its duplicate in step 3 — the step 1 backup's `after` column for sunburst shows that later state, the `before` column used by restore.mjs is correct). `high_speed_lifts` filled on 17 rows where it was NULL. Two rows whose only closure signal was a flag inside the JSON got `operating_status = 'closed'`: sleeping-giant and apple-mountain (both retired in step 4).

Readers now go through one helper, `lib/liftTypes.ts::liftCounts()`, used by the map filters (`components/Map/MapPage.tsx`, both filter blocks) and the resort page Lifts stat (`app/resort/[slug]/page.tsx`). It also counts `high_speed_eight` / `high_speed_triple` (Loon, Boyne, Red Lodge were ignored before) and coerces with `Number()` so a string value can never break a filter. The Lifts stat shows the higher of the JSON sum and the curated `high_speed_lifts` column: 19 rows (Breckenridge 13 vs 10, Jackson Hole 5 vs 2, Stowe 6 vs 4, ...) carry a legacy JSON that undercounts detachables; they are listed under Notes in `reports/01-lift-types.md` for a lift-inventory pass. Unit tests in `lib/liftTypes.test.ts`.

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

The retired aggregate was `tier = featured` and referenced in code, so three follow-ups ship with this package:

- `07-featured-tier.mjs` set `tier = featured` on `snowmass` and `aspen-mountain` (the featured tier drives the +30 pin score and the featured pin layer in `components/Map/MapView.tsx`, the 0.9 sitemap priority and `?featured=1`; Highlands and Buttermilk stay listed so the layer does not stack four Aspen pins).
- `lib/lists.ts` ("Ikon Pass Must-Ski — Seven anchors") and `lib/guides.tsx` now link `snowmass` instead of the retired slug, so the list keeps seven resorts and the guide link no longer 404s.
- `next.config.ts` 301s `/resort/aspen-snowmass -> /resort/snowmass`, `/resort/tyrol-basin-and-snowboard -> /resort/tyrol-basin`, `/resort/sunburst-area -> /resort/sunburst`, `/resort/schuss-shanty-creek -> /resort/shanty-creek` (Google-indexed URLs and old shares keep working; the resort page only serves active rows).

No favorites, trips, reviews or snow alerts referenced any retired id.

### 4. Nordic-only centers, the heli-ski operator and closed areas — 26 retired, 1 status corrected

`04-nordic-heli.mjs`. Each of the 24 nordic/heli rows was checked against its own website (or a web search when the row had none); the evidence line per slug is in `reports/04-nordic-heli.md`. 23 cross-country centers (Rikert, Trapp Family Lodge, Jackson XC, Great Glen, Maplelag, Minocqua Winter Park, White Grass, ...) and North Cascade Heli are active=false. Kept on purpose: mount-ashwabay (real alpine hill, lift data missing) and quarry-road-trails (rope-tow ski hill next to its XC trails).

Nothing on the map reads `operating_status`, so a closed row that stays `active=true` renders as a normal pin and can be added to a trip (finding data-quality-18). The second run therefore retired the two permanently closed alpine areas — sleeping-giant (sold to HMH Capital, summer park, no ski operations) and apple-mountain (defunct) — and put homewood-mountain-resort back to `operating_status = 'active'`: skihomewood.com sells 2026-27 season passes to the public and ran a public 2025-26 season that closed on 2026-03-17. No active row carries `operating_status = 'closed'` any more, so the map is correct without a UI change; the five `seasonal` rows are unchanged.

### 5. Difficulty mix — 92 rows corrected, 1 left

`05-difficulty-mix.mjs`. Policy after review: a resort's own published split is the source of truth and is normalised, never replaced. Rules, applied to each row's original values (from the first backup):

- 5 rows where percentages had been typed into the `trails_*` count columns (Aspen Mountain, Mt Bachelor, Lutsen, ...) — copied into `difficulty_pct_*`, counts cleared.
- 54 rows with four buckets summing between 70 and 150 but outside 98–102 — scaled to exactly 100 with largest-remainder rounding (Killington [17, 39, 39, 14] -> [15, 36, 36, 13]; Jackson Hole [10, 40, 38, 18] -> [9, 37, 36, 17]).
- 25 rows with one NULL bucket while the other three summed to 98–102 (Alta, Solitude, Stevens Pass, Palisades, ...) — the missing bucket is 0.
- 6 rows with one NULL bucket and the other three summing to 65–97 — the missing bucket is the remainder to 100 (Bretton Woods expert 19, Cannon beginner 16, Mad River Glen expert 11).
- 1 pass resort (Okemo, only two buckets of its own) — OnTheSnow's published mix.

Normalising a row's own numbers is arithmetic, not research, so it was applied to the 32 independents in the set as well. The first two runs had replaced 33 pass resorts with OnTheSnow's mix (a third-party aggregator with its own bucket definitions; several rows moved further from the resort's own figures); the third run restored their own normalised values — the report marks those rows "replaces the OnTheSnow mix". Left: alpine-valley-mi (independent, two buckets, no source).

### 6. Season dates for off-season mode — 320 rows

`06-season-dates.mjs`. Two source classes, kept apart in the data:

- Announced (42 rows): operator announcements — Vail Resorts 2026-08-18 release, Ikon Pass 2026-27 opening-date list, Aspen Snowmass season page. Written as `season_open_text = "November 13, 2026"`; an announcement replaces whatever text the row had.
- Projected (261 rows): OnTheSnow resort page "Projected Opening / Closing", then the OnTheSnow state table (opening only). Written as `"December 4, 2026 (projected)"`, and only where the row had no text of its own — 17 curated texts ("late November", "Thanksgiving", "Day after Thanksgiving", "May 17") are kept because the operator's typical pattern beats a third-party guess. The first run had overwritten 23 of them; the third run put them back.

`lib/seasonDates.ts` ignores the qualifier when parsing and exposes `openProjected` / `closeProjected` on `SeasonInfo`; `components/SeasonCountdown.tsx` renders "Projected to open in N days · Dec 4" and "Open until Apr 11 (projected) · N days left" so a projection is never shown as an announcement. A row whose kept opening text names no month ("Thanksgiving") gets no projected closing text, because the parser would read a lone future close as "open until". Evergreen `typical_season_start / _end` ("Mid-November" / "Mid-April") were filled only where NULL. Coverage tables and the 75 rows with no source at all are in `reports/06-season-dates.md`; `lib/seasonDates.test.ts` pins both text formats to the parser.

Not done as the brief phrased it: fetching each of the ~300 operator sites one by one. Most independents publish no 2026-27 date in September, and the operator announcements that exist were taken from the three consolidated lists above; the projected class is labelled as such in the data and the UI instead.

### 7. Nearby descriptions — code only

`lib/nearbyCategories.ts::prettifyDescription()` turns raw OSM tag values into copy ("Steak_house" -> "Steak house", "Donut;Coffee_shop" -> "Donut, coffee shop", "bbq" -> "BBQ") and returns "" for the importer's street-address fallback, which `components/NearbyGroup.tsx` then hides. After review the normalisation only touches values that look like OSM tags (single tokens or semicolon lists); free text keeps its own capitalisation ("Whitehall Mall", "Ski Shop, Climbing Gear, Used Gear"). An address is recognised by shape — at most six words ending in a street word with an optional compass suffix ("Main Street West", "Wealthy Street Southeast"), a route or lettered county-road number ("US 2 East", "State Highway 23A", "(CA-140)", "County Highway K"), a Utah grid address ("West 200 South"), a French-style leading street word ("Rue des Pins"), or a house number / ZIP — so "St. Bernard Grill" and "Drive-in burgers" pass through. Checked against all 7,992 live descriptions: 2,404 are hidden as addresses, the rest render. Tests in `lib/nearbyCategories.test.ts`. The DB rows were not rewritten; the durable fix is dropping the `addr:street` fallback in `scripts/round-9-fetch-nearby.mjs` on the next nearby refresh.

## Re-running

```
node scripts/backfill-2026-09-23/00-fetch-onthesnow.mjs            # refresh the OnTheSnow cache (~10 min)
node scripts/backfill-2026-09-23/0N-<step>.mjs                     # dry run + report
node scripts/backfill-2026-09-23/0N-<step>.mjs --apply             # write, with backup
node scripts/backfill-2026-09-23/restore.mjs backups/<file>.json --apply
```

Each step is idempotent: a second run proposes only what still differs. Steps 5 and 6 derive from the first backup, so restoring a later backup and re-running reproduces the same end state.

## Founder checklist after merge

- Open wynla.app, turn on the High-speed chair filter and confirm Vail / Park City / Snowbird stay on the map.
- Open /resort/vail: the hero shows "Opens in N days · Nov 13" (announced) and the Lifts stat reads "31 (18 HS chair + 2 gondola)". Open /resort/killington: the hero shows "Projected to open in N days · Nov 11".
- Open /resort/aspen-snowmass and confirm it lands on /resort/snowmass; /lists/ikon-pass-must-ski shows seven resorts.
- Around 2026-10-25, ask for step 6 to be re-run (`00-fetch-onthesnow.mjs --refresh`, then `06-season-dates.mjs --apply`) so any resort that moved its opening day is picked up before the season starts.

## Still open (not in this package)

- 37 rows without `vertical_drop` and 75 without season dates are small independents; a manual pass or a second source (skimap.org, resort sites) would close them.
- 19 rows where the curated `high_speed_lifts` column and the lift_types JSON disagree (reports/01-lift-types.md, Notes) need a lift-inventory pass.
- `closest_airport_distance_mi` (finding data-quality-17: 4 rows populated, 43 rows with no airport) needs an airport coordinate table; not touched.
- The nearby importer's `addr:street` fallback should be removed at source and the rows refreshed.
- `weather_cache` / `drive_time_cache` rows for the 30 newly inactive resort ids are orphans (same as the 12 older inactive ids the audit noted); harmless, worth purging in the db-audit job.
