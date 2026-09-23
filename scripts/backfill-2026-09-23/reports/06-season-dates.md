# Step 6 — 2026-27 season dates

Report generated 2026-09-23T05:37:40.113Z (dry run). Applied runs: 06-season-dates-2026-09-23_05-10-17.json (322 rows), 06-season-dates-2026-09-23_05-11-47.json (3 rows), 06-season-dates-2026-09-23_05-37-25.json (316 rows)
Coverage "before" is the state before this step ever wrote; "after" includes everything applied plus what this run still proposes.

| coverage | before | after |
|---|---|---|
| pass resorts (Epic/Ikon/Indy/MC) with season_open_text | 9 / 235 | 205 / 235 |
| pass resorts with season_close_text | 10 / 235 | 204 / 235 |
| pass resorts with typical start + end | 14 / 235 | 207 / 235 |
| all active with season_open_text | 17 / 395 | 320 / 395 |
| all active with season_close_text | 17 / 395 | 318 / 395 |
| all active with typical start + end | 24 / 395 | 321 / 395 |

| season_open_text after this step, by source class | rows |
|---|---|
| announced by the operator (Vail Resorts release / Ikon Pass list / Aspen Snowmass), written as "November 13, 2026" | 42 |
| projected by OnTheSnow, written as "December 4, 2026 (projected)" — countdown says "Projected to open in N days" | 261 |
| curated text the row already had, kept as is ("late November", "Thanksgiving", ...) | 17 |

| this run's proposals by class | rows |
|---|---|
| announced | 42 |
| projected | 263 |
| curated text kept (only typical_* or close filled) | 15 |
| rows updated (all applied runs, a row rewritten by a later run counts again) | 641 |
| still proposed by this run | 0 |

The first applied run (05-10-17) had overwritten 23 curated texts with projections and written projections without a qualifier; the third run restores those texts and rewrites every projected date with the "(projected)" qualifier. Projections remain subject to snow; a light re-run in late October picks up date changes before opening day.

## No source found (75)
- mount-pisgah (NY, indy)
- catamount-ski-area (MA, indy)
- chapman-hill (CO, independent)
- cranor-ski-hill (CO, independent)
- hesperus-ski-area (CO, independent)
- hoedown-hill (CO, indy)
- lake-city-ski-hill (CO, independent)
- lees-ski-hill (CO, independent)
- cherry-peak (UT, indy)
- soldier-hollow (UT, independent)
- woodward-park-city (UT, independent)
- antelope-butte (WY, indy)
- beartooth-basin (WY, independent)
- lookout-pass (MT, independent)
- turner-mountain (MT, independent)
- bear-paw (MT, independent)
- yellowstone-club (MT, independent)
- cottonwood-butte (ID, independent)
- snowhaven (ID, independent)
- little-ski-hill (ID, indy)
- rotarun (ID, independent)
- arctic-valley (AK, indy)
- skiland (AK, indy)
- alpine-meadows (CA, ikon)
- mt-waterman (CA, independent)
- summit-ski-area (OR, independent)
- ferguson-ridge (OR, independent)
- warner-canyon (OR, independent)
- loup-loup (WA, indy)
- hurricane-ridge (WA, indy)
- badger-mountain-wa (WA, independent)
- echo-valley (WA, independent)
- mt-lemmon-ski-valley (AZ, independent)
- big-rock (ME, indy)
- eaton-mountain (ME, independent)
- titcomb-mountain (ME, independent)
- spruce-mountain-ski-area (ME, independent)
- powderhouse-hill (ME, independent)
- granite-gorge (NH, independent)
- mcintyre-ski-area (NH, indy)
- campton-mountain (NH, independent)
- middlebury-snow-bowl (VT, indy)
- ascutney-outdoors (VT, independent)
- cochrans-ski-area (VT, independent)
- northeast-slopes (VT, independent)
- lyndon-outing-club (VT, independent)
- quechee-club (VT, independent)
- victor-constant-ski-area (NY, independent)
- laurel-mountain (PA, epic)
- blue-knob (PA, indy)
- eagle-rock-resort (PA, independent)
- mystic-mountain (PA, independent)
- alpine-valley-mi (MI, independent)
- otsego-resort (MI, independent)
- the-rock-snowpark (WI, independent)
- mount-ashwabay (WI, independent)
- detroit-mountain (MN, indy)
- ski-gull (MN, independent)
- mount-itasca (MN, independent)
- sleepy-hollow (IA, independent)
- frost-fire-park (ND, indy)
- huff-hills (ND, indy)
- bottineau-winter-park (ND, indy)
- oglebay-resort (WV, independent)
- cloudmont-ski-resort (AL, independent)
- mt-eyak (AK, indy)
- cuchara (CO, indy)
- quarry-road-trails (ME, indy)
- thrill-hills (ND, indy)
- skaneateles-club (NY, indy)
- great-bear-valley (SD, indy)
- leavenworth-winter-sports-club (WA, indy)
- camp-10-area (WI, indy)
- crystal-ridge (WI, independent)
- paul-bunyan-hill (WI, indy)

## Changes (with source)
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T05:10 | hunter-mountain | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/new-york/hunter-mountain/ski-resort |
| 2026-09-23T05:10 | hunter-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/hunter-mountain/ski-resort |
| 2026-09-23T05:10 | windham-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:10 | windham-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:10 | windham-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:10 | windham-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:10 | belleayre-mountain | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:10 | belleayre-mountain | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:10 | belleayre-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:10 | belleayre-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:10 | plattekill-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:10 | plattekill-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:10 | plattekill-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:10 | plattekill-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:10 | gore-mountain | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:10 | gore-mountain | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:10 | gore-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:10 | gore-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:10 | whiteface-mountain | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whiteface-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whiteface-mountain | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whiteface-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:10 | thunder-ridge-ski-area | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:10 | thunder-ridge-ski-area | typical_season_start | NULL | Late December | https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:10 | thunder-ridge-ski-area | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:10 | thunder-ridge-ski-area | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:10 | mount-peter | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:10 | mount-peter | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:10 | mount-peter | season_close_text | mid March | March 21, 2027 | https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:10 | mount-peter | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:10 | mountain-creek | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:10 | mountain-creek | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:10 | mountain-creek | season_close_text | mid March | March 21, 2027 | https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:10 | mountain-creek | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:10 | camelback-mountain-resort | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:10 | camelback-mountain-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:10 | camelback-mountain-resort | season_close_text | NULL | May 5, 2027 | https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:10 | camelback-mountain-resort | typical_season_end | NULL | Early May | https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:10 | blue-mountain-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-mountain-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-mountain-resort | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-mountain-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | shawnee-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/pennsylvania/shawnee-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | shawnee-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/shawnee-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | jack-frost-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:10 | jack-frost-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:10 | jack-frost-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:10 | jack-frost-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:10 | big-boulder | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:10 | big-boulder | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:10 | big-boulder | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:10 | big-boulder | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:10 | montage-mountain | season_open_text | NULL | December 9, 2026 | https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:10 | montage-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:10 | montage-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:10 | montage-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:10 | elk-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | elk-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | elk-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | elk-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | mohawk-mountain-ski-area | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:10 | mohawk-mountain-ski-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:10 | mohawk-mountain-ski-area | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:10 | mohawk-mountain-ski-area | typical_season_end | NULL | Late March | https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:10 | mount-southington | season_open_text | mid December | December 12, 2026 | https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-southington | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-southington | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-southington | typical_season_end | NULL | Late March | https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:10 | berkshire-east | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:10 | berkshire-east | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:10 | berkshire-east | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:10 | berkshire-east | typical_season_end | NULL | Early April | https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:10 | jiminy-peak | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/massachusetts/jiminy-peak/ski-resort |
| 2026-09-23T05:10 | jiminy-peak | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/massachusetts/jiminy-peak/ski-resort |
| 2026-09-23T05:10 | wachusett-mountain | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | wachusett-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | wachusett-mountain | season_close_text | NULL | April 9, 2027 | https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | wachusett-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | stratton-mountain | season_open_text | NULL | November 18, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:10 | stratton-mountain | season_close_text | NULL | April 12, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:10 | mount-snow | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:10 | mount-snow | typical_season_start | NULL | Late November | https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:10 | mount-snow | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:10 | mount-snow | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:10 | magic-mountain | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:10 | magic-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:10 | magic-mountain | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:10 | magic-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:10 | bromley-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:10 | bromley-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:10 | bromley-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:10 | bromley-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:10 | okemo-mountain-resort | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:10 | okemo-mountain-resort | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:10 | okemo-mountain-resort | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:10 | okemo-mountain-resort | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:10 | loon-mountain | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/new-hampshire/loon-mountain/ski-resort |
| 2026-09-23T05:10 | loon-mountain | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/new-hampshire/loon-mountain/ski-resort |
| 2026-09-23T05:10 | cannon-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:10 | cannon-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:10 | cannon-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:10 | cannon-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:10 | arapahoe-basin | season_open_text | NULL | October 9, 2026 | https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:10 | arapahoe-basin | typical_season_start | NULL | Early October | https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:10 | arapahoe-basin | season_close_text | May 17 | May 16, 2027 | https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:10 | arapahoe-basin | typical_season_end | NULL | Mid-May | https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:10 | aspen-mountain | season_open_text | NULL | November 26, 2026 | https://www.aspensnowmass.com/four-mountains/aspen-mountain (season Nov 26, 2026 - Apr 18, 2027) |
| 2026-09-23T05:10 | aspen-mountain | typical_season_start | NULL | Late November | https://www.aspensnowmass.com/four-mountains/aspen-mountain (season Nov 26, 2026 - Apr 18, 2027) |
| 2026-09-23T05:10 | aspen-mountain | season_close_text | NULL | April 18, 2027 | https://www.aspensnowmass.com/four-mountains/aspen-mountain (season Nov 26, 2026 - Apr 18, 2027) |
| 2026-09-23T05:10 | aspen-mountain | typical_season_end | NULL | Mid-April | https://www.aspensnowmass.com/four-mountains/aspen-mountain (season Nov 26, 2026 - Apr 18, 2027) |
| 2026-09-23T05:10 | aspen-highlands | season_open_text | NULL | December 12, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | aspen-highlands | typical_season_start | NULL | Mid-December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | aspen-highlands | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | buttermilk | season_open_text | NULL | December 12, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | buttermilk | typical_season_start | NULL | Mid-December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | buttermilk | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | snowmass | season_open_text | NULL | November 26, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/aspen-snowmass/ski-resort |
| 2026-09-23T05:10 | snowmass | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/aspen-snowmass/ski-resort |
| 2026-09-23T05:10 | snowmass | season_close_text | NULL | April 18, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/aspen-snowmass/ski-resort |
| 2026-09-23T05:10 | snowmass | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/aspen-snowmass/ski-resort |
| 2026-09-23T05:10 | beaver-creek | season_open_text | NULL | November 25, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/beaver-creek/ski-resort |
| 2026-09-23T05:10 | beaver-creek | typical_season_start | NULL | Late November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/beaver-creek/ski-resort |
| 2026-09-23T05:10 | beaver-creek | season_close_text | NULL | March 28, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/beaver-creek/ski-resort |
| 2026-09-23T05:10 | beaver-creek | typical_season_end | NULL | Late March | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/beaver-creek/ski-resort |
| 2026-09-23T05:10 | breckenridge | season_open_text | NULL | November 6, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/breckenridge/ski-resort |
| 2026-09-23T05:10 | breckenridge | typical_season_start | NULL | Early November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/breckenridge/ski-resort |
| 2026-09-23T05:10 | breckenridge | season_close_text | NULL | April 24, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/breckenridge/ski-resort |
| 2026-09-23T05:10 | breckenridge | typical_season_end | NULL | Late April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/breckenridge/ski-resort |
| 2026-09-23T05:10 | copper-mountain | season_open_text | NULL | November 6, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/copper-mountain-resort/ski-resort |
| 2026-09-23T05:10 | copper-mountain | typical_season_start | NULL | Early November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/copper-mountain-resort/ski-resort |
| 2026-09-23T05:10 | copper-mountain | season_close_text | NULL | May 2, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/copper-mountain-resort/ski-resort |
| 2026-09-23T05:10 | copper-mountain | typical_season_end | NULL | Early May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/copper-mountain-resort/ski-resort |
| 2026-09-23T05:10 | crested-butte | season_open_text | NULL | November 25, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/crested-butte-mountain-resort/ski-resort |
| 2026-09-23T05:10 | crested-butte | typical_season_start | NULL | Late November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/crested-butte-mountain-resort/ski-resort |
| 2026-09-23T05:10 | crested-butte | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/crested-butte-mountain-resort/ski-resort |
| 2026-09-23T05:10 | crested-butte | typical_season_end | NULL | Early April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/crested-butte-mountain-resort/ski-resort |
| 2026-09-23T05:10 | echo-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:10 | echo-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:10 | echo-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:10 | echo-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:10 | eldora | season_open_text | NULL | November 13, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/eldora-mountain-resort/ski-resort |
| 2026-09-23T05:10 | eldora | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/eldora-mountain-resort/ski-resort |
| 2026-09-23T05:10 | eldora | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/eldora-mountain-resort/ski-resort |
| 2026-09-23T05:10 | eldora | typical_season_end | NULL | Early April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/eldora-mountain-resort/ski-resort |
| 2026-09-23T05:10 | granby-ranch | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:10 | granby-ranch | typical_season_start | NULL | Late November | https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:10 | granby-ranch | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:10 | granby-ranch | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:10 | howelsen-hill | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:10 | howelsen-hill | typical_season_start | NULL | Early December | https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:10 | howelsen-hill | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:10 | howelsen-hill | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:10 | keystone | season_open_text | NULL | October 31, 2026 | https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:10 | keystone | typical_season_start | NULL | Late October | https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:10 | keystone | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:10 | keystone | typical_season_end | NULL | Early April | https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:10 | loveland | season_open_text | NULL | November 6, 2026 | https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:10 | loveland | typical_season_start | NULL | Early November | https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:10 | loveland | season_close_text | NULL | May 9, 2027 | https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:10 | loveland | typical_season_end | NULL | Early May | https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:10 | monarch-mountain | season_open_text | Late November | December 4, 2026 | https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:10 | monarch-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:10 | powderhorn | season_open_text | late November | December 4, 2026 | https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:10 | powderhorn | typical_season_start | NULL | Early December | https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:10 | powderhorn | season_close_text | early April | March 21, 2027 | https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:10 | powderhorn | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:10 | purgatory | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:10 | purgatory | typical_season_start | NULL | Late November | https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:10 | purgatory | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:10 | purgatory | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:10 | silverton-mountain | season_open_text | December | December 31, 2026 | https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:10 | silverton-mountain | typical_season_start | NULL | Late December | https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:10 | silverton-mountain | season_close_text | April | April 11, 2027 | https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:10 | silverton-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:10 | ski-cooper | season_open_text | NULL | December 9, 2026 | https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:10 | ski-cooper | typical_season_start | NULL | Early December | https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:10 | ski-cooper | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:10 | ski-cooper | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:10 | steamboat | season_open_text | NULL | November 21, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:10 | steamboat | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:10 | steamboat | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:10 | steamboat | typical_season_end | NULL | Early April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:10 | sunlight-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sunlight-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sunlight-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sunlight-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:10 | telluride | season_open_text | NULL | November 26, 2026 | https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:10 | telluride | typical_season_start | NULL | Late November | https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:10 | telluride | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:10 | telluride | typical_season_end | NULL | Early April | https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:10 | vail | season_open_text | NULL | November 13, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/vail/ski-resort |
| 2026-09-23T05:10 | vail | typical_season_start | NULL | Mid-November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/vail/ski-resort |
| 2026-09-23T05:10 | vail | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/vail/ski-resort |
| 2026-09-23T05:10 | vail | typical_season_end | NULL | Mid-April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/vail/ski-resort |
| 2026-09-23T05:10 | winter-park | season_open_text | NULL | October 30, 2026 | https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:10 | winter-park | typical_season_start | NULL | Late October | https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:10 | winter-park | season_close_text | NULL | May 2, 2027 | https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:10 | winter-park | typical_season_end | NULL | Early May | https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:10 | wolf-creek | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | wolf-creek | typical_season_start | NULL | Late November | https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | wolf-creek | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | wolf-creek | typical_season_end | NULL | Early April | https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | alta | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/alta-ski-area/ski-resort |
| 2026-09-23T05:10 | alta | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/alta-ski-area/ski-resort |
| 2026-09-23T05:10 | alta | season_close_text | NULL | April 25, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/alta-ski-area/ski-resort |
| 2026-09-23T05:10 | alta | typical_season_end | NULL | Late April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/alta-ski-area/ski-resort |
| 2026-09-23T05:10 | beaver-mountain | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:10 | beaver-mountain | typical_season_start | NULL | Late December | https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:10 | beaver-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:10 | beaver-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:10 | brian-head | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:10 | brian-head | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:10 | brian-head | season_close_text | NULL | May 2, 2027 | https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:10 | brian-head | typical_season_end | NULL | Early May | https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:10 | brighton | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:10 | brighton | typical_season_start | NULL | Early December | https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:10 | brighton | season_close_text | NULL | May 9, 2027 | https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:10 | brighton | typical_season_end | NULL | Early May | https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:10 | deer-valley | season_open_text | NULL | December 5, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/deer-valley-resort/ski-resort |
| 2026-09-23T05:10 | deer-valley | typical_season_start | NULL | Early December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/deer-valley-resort/ski-resort |
| 2026-09-23T05:10 | deer-valley | season_close_text | NULL | March 28, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/deer-valley-resort/ski-resort |
| 2026-09-23T05:10 | deer-valley | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/deer-valley-resort/ski-resort |
| 2026-09-23T05:10 | eagle-point | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:10 | eagle-point | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:10 | eagle-point | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:10 | eagle-point | typical_season_end | NULL | Late March | https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:10 | park-city | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/utah/park-city-mountain-resort/ski-resort |
| 2026-09-23T05:10 | park-city | typical_season_start | NULL | Mid-November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/utah/park-city-mountain-resort/ski-resort |
| 2026-09-23T05:10 | park-city | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/utah/park-city-mountain-resort/ski-resort |
| 2026-09-23T05:10 | park-city | typical_season_end | NULL | Early April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/utah/park-city-mountain-resort/ski-resort |
| 2026-09-23T05:10 | powder-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:10 | powder-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:10 | powder-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:10 | powder-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:10 | snowbasin | season_open_text | NULL | November 27, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbasin/ski-resort |
| 2026-09-23T05:10 | snowbasin | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbasin/ski-resort |
| 2026-09-23T05:10 | snowbasin | season_close_text | NULL | March 28, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbasin/ski-resort |
| 2026-09-23T05:10 | snowbasin | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbasin/ski-resort |
| 2026-09-23T05:10 | snowbird | season_open_text | NULL | November 27, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbird/ski-resort |
| 2026-09-23T05:10 | snowbird | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbird/ski-resort |
| 2026-09-23T05:10 | snowbird | season_close_text | NULL | May 9, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbird/ski-resort |
| 2026-09-23T05:10 | snowbird | typical_season_end | NULL | Early May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbird/ski-resort |
| 2026-09-23T05:10 | solitude | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/solitude-mountain-resort/ski-resort |
| 2026-09-23T05:10 | solitude | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/solitude-mountain-resort/ski-resort |
| 2026-09-23T05:10 | solitude | season_close_text | NULL | May 23, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/solitude-mountain-resort/ski-resort |
| 2026-09-23T05:10 | solitude | typical_season_end | NULL | Late May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/solitude-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sundance | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:10 | sundance | typical_season_start | NULL | Early December | https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:10 | sundance | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:10 | sundance | typical_season_end | NULL | Late March | https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:10 | nordic-valley | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:10 | nordic-valley | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:10 | nordic-valley | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:10 | nordic-valley | typical_season_end | NULL | Late March | https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:10 | jackson-hole | season_open_text | NULL | November 27, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:10 | jackson-hole | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:10 | jackson-hole | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:10 | jackson-hole | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:10 | grand-targhee | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/wyoming/grand-targhee-resort/ski-resort |
| 2026-09-23T05:10 | grand-targhee | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/wyoming/grand-targhee-resort/ski-resort |
| 2026-09-23T05:10 | snow-king | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:10 | snow-king | typical_season_start | NULL | Early December | https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:10 | snow-king | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:10 | snow-king | typical_season_end | NULL | Late March | https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:10 | hogadon | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/wyoming/hogadon/ski-resort |
| 2026-09-23T05:10 | hogadon | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/wyoming/hogadon/ski-resort |
| 2026-09-23T05:10 | snowy-range | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:10 | snowy-range | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:10 | snowy-range | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:10 | snowy-range | typical_season_end | NULL | Late March | https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:10 | white-pine | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:10 | white-pine | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:10 | white-pine | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:10 | white-pine | typical_season_end | NULL | Late March | https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:10 | sleeping-giant | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/wyoming/sleeping-giant-ski-resort/ski-resort |
| 2026-09-23T05:10 | sleeping-giant | typical_season_start | NULL | Late November | https://www.onthesnow.com/wyoming/sleeping-giant-ski-resort/ski-resort |
| 2026-09-23T05:10 | sleeping-giant | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/wyoming/sleeping-giant-ski-resort/ski-resort |
| 2026-09-23T05:10 | sleeping-giant | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/wyoming/sleeping-giant-ski-resort/ski-resort |
| 2026-09-23T05:10 | meadowlark | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:10 | meadowlark | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:10 | meadowlark | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:10 | meadowlark | typical_season_end | NULL | Early April | https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:10 | big-sky | season_open_text | NULL | November 25, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/montana/big-sky-resort/ski-resort |
| 2026-09-23T05:10 | big-sky | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/montana/big-sky-resort/ski-resort |
| 2026-09-23T05:10 | big-sky | season_close_text | NULL | April 25, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/montana/big-sky-resort/ski-resort |
| 2026-09-23T05:10 | big-sky | typical_season_end | NULL | Late April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/montana/big-sky-resort/ski-resort |
| 2026-09-23T05:10 | whitefish | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whitefish | typical_season_start | NULL | Early December | https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whitefish | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whitefish | typical_season_end | NULL | Early April | https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:10 | bridger-bowl | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:10 | bridger-bowl | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:10 | bridger-bowl | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:10 | bridger-bowl | typical_season_end | NULL | Late March | https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:10 | red-lodge | season_open_text | late November | December 4, 2026 | https://www.onthesnow.com/montana/red-lodge-mountain/ski-resort |
| 2026-09-23T05:10 | red-lodge | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/montana/red-lodge-mountain/ski-resort |
| 2026-09-23T05:10 | discovery | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:10 | discovery | typical_season_start | NULL | Early December | https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:10 | discovery | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:10 | discovery | typical_season_end | NULL | Early April | https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:10 | blacktail | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blacktail | typical_season_start | NULL | Late December | https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blacktail | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | blacktail | typical_season_end | NULL | Late March | https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | great-divide | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:10 | great-divide | typical_season_start | NULL | Late November | https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:10 | great-divide | season_close_text | NULL | April 2, 2027 | https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:10 | great-divide | typical_season_end | NULL | Early April | https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:10 | lost-trail | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:10 | lost-trail | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:10 | lost-trail | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:10 | lost-trail | typical_season_end | NULL | Late March | https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:10 | maverick-mountain | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:10 | maverick-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:10 | maverick-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:10 | maverick-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:10 | montana-snowbowl | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:10 | montana-snowbowl | typical_season_start | NULL | Early December | https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:10 | montana-snowbowl | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:10 | montana-snowbowl | typical_season_end | NULL | Early April | https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:10 | showdown | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:10 | showdown | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:10 | showdown | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:10 | showdown | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:10 | teton-pass | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:10 | teton-pass | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:10 | teton-pass | season_close_text | NULL | April 10, 2027 | https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:10 | teton-pass | typical_season_end | NULL | Early April | https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:10 | sun-valley | season_open_text | NULL | November 26, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/sun-valley/ski-resort |
| 2026-09-23T05:10 | sun-valley | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/sun-valley/ski-resort |
| 2026-09-23T05:10 | sun-valley | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/sun-valley/ski-resort |
| 2026-09-23T05:10 | sun-valley | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/sun-valley/ski-resort |
| 2026-09-23T05:10 | schweitzer | season_open_text | NULL | November 27, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/schweitzer/ski-resort |
| 2026-09-23T05:10 | schweitzer | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/schweitzer/ski-resort |
| 2026-09-23T05:10 | brundage-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/idaho/brundage-mountain-resort/ski-resort |
| 2026-09-23T05:10 | brundage-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/idaho/brundage-mountain-resort/ski-resort |
| 2026-09-23T05:10 | tamarack | season_open_text | NULL | October 27, 2026 | https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:10 | tamarack | typical_season_start | NULL | Late October | https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:10 | tamarack | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:10 | tamarack | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:10 | bogus-basin | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:10 | bogus-basin | typical_season_start | NULL | Late November | https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:10 | bogus-basin | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:10 | bogus-basin | typical_season_end | NULL | Late March | https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:10 | silver-mountain | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:10 | silver-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:10 | silver-mountain | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:10 | silver-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:10 | soldier-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | soldier-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | soldier-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | soldier-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | pebble-creek | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/idaho/pebble-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | pebble-creek | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/idaho/pebble-creek-ski-area/ski-resort |
| 2026-09-23T05:10 | kelly-canyon | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:10 | kelly-canyon | typical_season_start | NULL | Early December | https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:10 | kelly-canyon | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:10 | kelly-canyon | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:10 | pomerelle | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:10 | pomerelle | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:10 | pomerelle | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:10 | pomerelle | typical_season_end | NULL | Late March | https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:10 | magic-mountain-id | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/idaho/magic-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | magic-mountain-id | typical_season_end | NULL | Late March | https://www.onthesnow.com/idaho/magic-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | alyeska-resort | season_open_text | NULL | November 28, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/alaska/alyeska-resort/ski-resort |
| 2026-09-23T05:10 | alyeska-resort | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/alaska/alyeska-resort/ski-resort |
| 2026-09-23T05:10 | alyeska-resort | season_close_text | NULL | April 25, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/alaska/alyeska-resort/ski-resort |
| 2026-09-23T05:10 | alyeska-resort | typical_season_end | NULL | Late April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/alaska/alyeska-resort/ski-resort |
| 2026-09-23T05:10 | eaglecrest-ski-area | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:10 | eaglecrest-ski-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:10 | eaglecrest-ski-area | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:10 | eaglecrest-ski-area | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:10 | hilltop-ski-area | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:10 | hilltop-ski-area | typical_season_start | NULL | Late November | https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:10 | hilltop-ski-area | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:10 | hilltop-ski-area | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:10 | palisades-tahoe | season_open_text | NULL | November 25, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:10 | palisades-tahoe | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:10 | palisades-tahoe | season_close_text | NULL | May 23, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:10 | palisades-tahoe | typical_season_end | NULL | Late May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:10 | heavenly-mountain-resort | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:10 | heavenly-mountain-resort | typical_season_start | NULL | Mid-November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:10 | heavenly-mountain-resort | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:10 | heavenly-mountain-resort | typical_season_end | NULL | Early April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:10 | northstar-california | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/northstar-california/ski-resort |
| 2026-09-23T05:10 | northstar-california | typical_season_start | NULL | Mid-November | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/northstar-california/ski-resort |
| 2026-09-23T05:10 | northstar-california | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/northstar-california/ski-resort |
| 2026-09-23T05:10 | northstar-california | typical_season_end | NULL | Early April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/northstar-california/ski-resort |
| 2026-09-23T05:10 | kirkwood-mountain-resort | season_open_text | NULL | December 4, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/kirkwood/ski-resort |
| 2026-09-23T05:10 | kirkwood-mountain-resort | typical_season_start | NULL | Early December | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/kirkwood/ski-resort |
| 2026-09-23T05:10 | kirkwood-mountain-resort | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/kirkwood/ski-resort |
| 2026-09-23T05:10 | kirkwood-mountain-resort | typical_season_end | NULL | Mid-April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/kirkwood/ski-resort |
| 2026-09-23T05:10 | sierra-at-tahoe | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:10 | sierra-at-tahoe | typical_season_start | NULL | Late December | https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:10 | sierra-at-tahoe | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:10 | sierra-at-tahoe | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:10 | homewood-mountain-resort | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:10 | homewood-mountain-resort | typical_season_start | NULL | Late December | https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:10 | homewood-mountain-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:10 | homewood-mountain-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:10 | boreal-mountain-resort | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:10 | boreal-mountain-resort | typical_season_start | NULL | Late November | https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:10 | boreal-mountain-resort | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:10 | boreal-mountain-resort | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:10 | soda-springs | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:10 | soda-springs | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:10 | soda-springs | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:10 | soda-springs | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:10 | donner-ski-ranch | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:10 | donner-ski-ranch | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:10 | donner-ski-ranch | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:10 | donner-ski-ranch | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:10 | sugar-bowl-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:10 | sugar-bowl-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:10 | sugar-bowl-resort | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:10 | sugar-bowl-resort | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:10 | tahoe-donner-downhill | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:10 | tahoe-donner-downhill | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:10 | tahoe-donner-downhill | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:10 | tahoe-donner-downhill | typical_season_end | NULL | Early April | https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:10 | diamond-peak | season_open_text | NULL | December 3, 2026 | https://www.onthesnow.com/nevada/diamond-peak/ski-resort |
| 2026-09-23T05:10 | diamond-peak | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/nevada/diamond-peak/ski-resort |
| 2026-09-23T05:10 | mt-rose-ski-tahoe | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:10 | mt-rose-ski-tahoe | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:10 | mt-rose-ski-tahoe | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:10 | mt-rose-ski-tahoe | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:10 | lee-canyon | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:10 | lee-canyon | typical_season_start | NULL | Late November | https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:10 | lee-canyon | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:10 | lee-canyon | typical_season_end | NULL | Late March | https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:10 | elko-snobowl | season_open_text | NULL | December 30, 2026 | https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:10 | elko-snobowl | typical_season_start | NULL | Late December | https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:10 | elko-snobowl | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:10 | elko-snobowl | typical_season_end | NULL | Early March | https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:10 | mammoth-mountain | season_open_text | NULL | November 13, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/mammoth-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | mammoth-mountain | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/mammoth-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | mammoth-mountain | season_close_text | NULL | June 6, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/mammoth-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | mammoth-mountain | typical_season_end | NULL | Early June | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/mammoth-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | june-mountain | season_open_text | NULL | December 19, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/june-mountain/ski-resort |
| 2026-09-23T05:10 | june-mountain | typical_season_start | NULL | Mid-December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/june-mountain/ski-resort |
| 2026-09-23T05:10 | june-mountain | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/june-mountain/ski-resort |
| 2026-09-23T05:10 | june-mountain | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/june-mountain/ski-resort |
| 2026-09-23T05:10 | bear-valley-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:10 | bear-valley-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:10 | bear-valley-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:10 | bear-valley-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:10 | dodge-ridge | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:10 | dodge-ridge | typical_season_start | NULL | Late December | https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:10 | dodge-ridge | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:10 | dodge-ridge | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:10 | china-peak | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:10 | china-peak | typical_season_start | NULL | Late November | https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:10 | china-peak | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:10 | china-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:10 | badger-pass | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:10 | badger-pass | typical_season_start | NULL | Late December | https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:10 | badger-pass | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:10 | badger-pass | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:10 | mountain-high | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:10 | mountain-high | typical_season_start | NULL | Late November | https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:10 | mountain-high | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:10 | mountain-high | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:10 | snow-valley | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:10 | snow-valley | typical_season_start | NULL | Early December | https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:10 | snow-valley | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:10 | snow-valley | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:10 | snow-summit | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:10 | snow-summit | typical_season_start | NULL | Early December | https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:10 | snow-summit | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:10 | snow-summit | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:10 | bear-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:10 | bear-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:10 | bear-mountain | season_close_text | NULL | March 27, 2027 | https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:10 | bear-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:10 | mt-baldy | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:10 | mt-baldy | typical_season_start | NULL | Late November | https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:10 | mt-baldy | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:10 | mt-baldy | typical_season_end | NULL | Early April | https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:10 | mt-shasta-ski-park | season_open_text | mid December | December 26, 2026 | https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:10 | mt-shasta-ski-park | typical_season_start | NULL | Late December | https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:10 | mt-shasta-ski-park | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:10 | mt-shasta-ski-park | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:10 | mt-bachelor | season_open_text | NULL | December 4, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/oregon/mt-bachelor/ski-resort |
| 2026-09-23T05:10 | mt-bachelor | typical_season_start | NULL | Early December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/oregon/mt-bachelor/ski-resort |
| 2026-09-23T05:10 | mt-bachelor | season_close_text | NULL | May 31, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/oregon/mt-bachelor/ski-resort |
| 2026-09-23T05:10 | mt-bachelor | typical_season_end | NULL | Late May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/oregon/mt-bachelor/ski-resort |
| 2026-09-23T05:10 | timberline-lodge | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:10 | timberline-lodge | typical_season_start | NULL | Late December | https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:10 | timberline-lodge | season_close_text | NULL | July 19, 2026 | https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:10 | timberline-lodge | typical_season_end | NULL | Mid-July | https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:10 | mt-hood-meadows | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:10 | mt-hood-meadows | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:10 | mt-hood-meadows | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:10 | mt-hood-meadows | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:10 | mt-hood-skibowl | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:10 | mt-hood-skibowl | typical_season_start | NULL | Late November | https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:10 | mt-hood-skibowl | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:10 | mt-hood-skibowl | typical_season_end | NULL | Late March | https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:10 | willamette-pass | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:10 | willamette-pass | typical_season_start | NULL | Late December | https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:10 | willamette-pass | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:10 | willamette-pass | typical_season_end | NULL | Late March | https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:10 | anthony-lakes | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:10 | anthony-lakes | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:10 | anthony-lakes | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:10 | anthony-lakes | typical_season_end | NULL | Early April | https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:10 | spout-springs | season_close_text | NULL | March 31, 2027 | https://www.onthesnow.com/oregon/spout-springs/ski-resort |
| 2026-09-23T05:10 | spout-springs | typical_season_end | NULL | Late March | https://www.onthesnow.com/oregon/spout-springs/ski-resort |
| 2026-09-23T05:10 | crystal-mountain | season_open_text | NULL | November 27, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/washington/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/washington/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/washington/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain | typical_season_end | NULL | Early April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/washington/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | stevens-pass | season_open_text | NULL | December 4, 2026 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/washington/stevens-pass-resort/ski-resort |
| 2026-09-23T05:10 | stevens-pass | typical_season_start | NULL | Early December | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/washington/stevens-pass-resort/ski-resort |
| 2026-09-23T05:10 | stevens-pass | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/washington/stevens-pass-resort/ski-resort |
| 2026-09-23T05:10 | stevens-pass | typical_season_end | NULL | Mid-April | https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/washington/stevens-pass-resort/ski-resort |
| 2026-09-23T05:10 | the-summit-at-snoqualmie | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:10 | the-summit-at-snoqualmie | typical_season_start | NULL | Late December | https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:10 | the-summit-at-snoqualmie | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:10 | the-summit-at-snoqualmie | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:10 | mt-baker-ski-area | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:10 | mt-baker-ski-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:10 | mt-baker-ski-area | season_close_text | late April | April 18, 2027 | https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:10 | mt-baker-ski-area | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:10 | mission-ridge | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:10 | mission-ridge | typical_season_start | NULL | Early December | https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:10 | mission-ridge | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:10 | mission-ridge | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:10 | white-pass | season_open_text | NULL | December 20, 2026 | https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:10 | white-pass | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:10 | white-pass | season_close_text | NULL | April 25, 2027 | https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:10 | white-pass | typical_season_end | NULL | Late April | https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:10 | 49-degrees-north | season_open_text | NULL | December 30, 2026 | https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:10 | 49-degrees-north | typical_season_start | NULL | Late December | https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:10 | 49-degrees-north | season_close_text | NULL | April 25, 2027 | https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:10 | 49-degrees-north | typical_season_end | NULL | Late April | https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:10 | mt-spokane | season_open_text | early December | December 26, 2026 | https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:10 | mt-spokane | typical_season_start | NULL | Late December | https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:10 | mt-spokane | season_close_text | early April | March 14, 2027 | https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:10 | mt-spokane | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:10 | bluewood | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:10 | bluewood | typical_season_start | NULL | Late December | https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:10 | bluewood | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:10 | bluewood | typical_season_end | NULL | Late March | https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:10 | taos-ski-valley | season_open_text | NULL | November 26, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/new-mexico/taos-ski-valley/ski-resort |
| 2026-09-23T05:10 | taos-ski-valley | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/new-mexico/taos-ski-valley/ski-resort |
| 2026-09-23T05:10 | taos-ski-valley | season_close_text | NULL | March 28, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/new-mexico/taos-ski-valley/ski-resort |
| 2026-09-23T05:10 | taos-ski-valley | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/new-mexico/taos-ski-valley/ski-resort |
| 2026-09-23T05:10 | ski-santa-fe | season_open_text | NULL | November 26, 2026 | https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:10 | ski-santa-fe | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:10 | ski-santa-fe | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:10 | ski-santa-fe | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:10 | angel-fire-resort | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:10 | angel-fire-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:10 | angel-fire-resort | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:10 | angel-fire-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:10 | red-river-ski-area | season_open_text | NULL | November 26, 2026 | https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:10 | red-river-ski-area | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:10 | red-river-ski-area | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:10 | red-river-ski-area | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:10 | pajarito-mountain | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/new-mexico/pajarito-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | pajarito-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/new-mexico/pajarito-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | sipapu | season_open_text | November | November 20, 2026 | https://www.onthesnow.com/new-mexico/sipapu-ski-and-summer-resort/ski-resort |
| 2026-09-23T05:10 | sipapu | season_close_text | April | March 28, 2027 | https://www.onthesnow.com/new-mexico/sipapu-ski-and-summer-resort/ski-resort |
| 2026-09-23T05:10 | sandia-peak | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:10 | sandia-peak | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:10 | sandia-peak | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:10 | sandia-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:10 | ski-apache | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:10 | ski-apache | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:10 | ski-apache | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:10 | ski-apache | typical_season_end | NULL | Early March | https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:10 | arizona-snowbowl | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:10 | arizona-snowbowl | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:10 | sunrise-park-resort | season_open_text | Thanksgiving | December 11, 2026 | https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:10 | sunrise-park-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:10 | sunrise-park-resort | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:10 | sunrise-park-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:10 | sunday-river | season_open_text | NULL | November 15, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:10 | sunday-river | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:10 | sunday-river | season_close_text | NULL | April 18, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:10 | sunday-river | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:10 | sugarloaf | season_open_text | NULL | November 20, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sugarloaf/ski-resort |
| 2026-09-23T05:10 | sugarloaf | typical_season_start | NULL | Mid-November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sugarloaf/ski-resort |
| 2026-09-23T05:10 | sugarloaf | season_close_text | NULL | April 25, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sugarloaf/ski-resort |
| 2026-09-23T05:10 | sugarloaf | typical_season_end | NULL | Late April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sugarloaf/ski-resort |
| 2026-09-23T05:10 | saddleback | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:10 | saddleback | typical_season_start | NULL | Early December | https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:10 | saddleback | season_close_text | NULL | April 18, 2027 | https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:10 | saddleback | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:10 | black-mountain-of-maine | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:10 | black-mountain-of-maine | typical_season_start | NULL | Late December | https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:10 | black-mountain-of-maine | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:10 | black-mountain-of-maine | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:10 | mt-abram | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:10 | mt-abram | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:10 | mt-abram | season_close_text | late March | March 28, 2027 | https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:10 | mt-abram | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:10 | shawnee-peak | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:10 | shawnee-peak | typical_season_start | NULL | Early December | https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:10 | shawnee-peak | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:10 | shawnee-peak | typical_season_end | NULL | Early April | https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:10 | lost-valley | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:10 | lost-valley | typical_season_start | NULL | Early December | https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:10 | lost-valley | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:10 | lost-valley | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:10 | camden-snow-bowl | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:10 | camden-snow-bowl | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:10 | camden-snow-bowl | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:10 | camden-snow-bowl | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:10 | mount-jefferson-ski-area | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:10 | mount-jefferson-ski-area | typical_season_start | NULL | Late December | https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:10 | mount-jefferson-ski-area | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:10 | mount-jefferson-ski-area | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:10 | big-squaw-mountain | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | big-squaw-mountain | typical_season_start | NULL | Late December | https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | big-squaw-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | big-squaw-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:10 | hermon-mountain | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:10 | hermon-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:10 | hermon-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:10 | hermon-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:10 | attitash | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:10 | attitash | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:10 | attitash | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:10 | attitash | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:10 | wildcat-mountain | season_open_text | NULL | December 2, 2026 | https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:10 | wildcat-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:10 | wildcat-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:10 | wildcat-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:10 | crotched-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:10 | crotched-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:10 | crotched-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:10 | crotched-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:10 | mount-sunapee | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:10 | mount-sunapee | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:10 | mount-sunapee | season_close_text | mid April | April 4, 2027 | https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:10 | mount-sunapee | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:10 | bretton-woods | season_open_text | NULL | November 14, 2026 | https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:10 | bretton-woods | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:10 | bretton-woods | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:10 | bretton-woods | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:10 | waterville-valley | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:10 | waterville-valley | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:10 | waterville-valley | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:10 | waterville-valley | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:10 | pats-peak | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:10 | pats-peak | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:10 | pats-peak | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:10 | pats-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:10 | gunstock-mountain-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:10 | gunstock-mountain-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:10 | gunstock-mountain-resort | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:10 | gunstock-mountain-resort | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:10 | ragged-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:10 | ragged-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:10 | ragged-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:10 | ragged-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:10 | black-mountain-nh | season_open_text | NULL | November 15, 2026 | https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:10 | black-mountain-nh | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:10 | black-mountain-nh | season_close_text | NULL | May 2, 2027 | https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:10 | black-mountain-nh | typical_season_end | NULL | Early May | https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:10 | dartmouth-skiway | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:10 | dartmouth-skiway | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:10 | dartmouth-skiway | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:10 | dartmouth-skiway | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:10 | king-pine | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:10 | king-pine | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:10 | king-pine | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:10 | king-pine | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:10 | tenney-mountain | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:10 | tenney-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:10 | tenney-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:10 | tenney-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:10 | whaleback-mountain | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:10 | whaleback-mountain | typical_season_start | NULL | Late December | https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:10 | whaleback-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:10 | whaleback-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:10 | killington | season_open_text | NULL | November 11, 2026 | https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:10 | killington | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:10 | killington | season_close_text | NULL | May 24, 2027 | https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:10 | killington | typical_season_end | NULL | Late May | https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:10 | pico-mountain | season_open_text | NULL | December 11, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:10 | pico-mountain | typical_season_start | NULL | Mid-December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:10 | pico-mountain | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:10 | pico-mountain | typical_season_end | NULL | Early April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:10 | sugarbush | season_open_text | NULL | November 21, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:10 | sugarbush | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:10 | sugarbush | season_close_text | NULL | May 2, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:10 | sugarbush | typical_season_end | NULL | Early May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:10 | stowe-mountain-resort | season_open_text | NULL | November 20, 2026 | https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | stowe-mountain-resort | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | stowe-mountain-resort | season_close_text | NULL | April 25, 2027 | https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | stowe-mountain-resort | typical_season_end | NULL | Late April | https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | jay-peak | season_open_text | NULL | November 22, 2026 | https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:10 | jay-peak | typical_season_start | NULL | Late November | https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:10 | jay-peak | season_close_text | NULL | May 16, 2027 | https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:10 | jay-peak | typical_season_end | NULL | Mid-May | https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:10 | smugglers-notch | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:10 | smugglers-notch | typical_season_start | NULL | Late November | https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:10 | smugglers-notch | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:10 | smugglers-notch | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:10 | bolton-valley | season_open_text | NULL | November 21, 2026 | https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:10 | bolton-valley | typical_season_start | NULL | Late November | https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:10 | bolton-valley | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:10 | bolton-valley | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:10 | mad-river-glen | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:10 | mad-river-glen | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:10 | mad-river-glen | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:10 | mad-river-glen | typical_season_end | NULL | Early April | https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:10 | burke-mountain | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:10 | burke-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:10 | burke-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:10 | burke-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:10 | holiday-mountain | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:10 | holiday-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:10 | holiday-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:10 | holiday-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:10 | west-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:10 | west-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:10 | west-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:10 | west-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:10 | greek-peak | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:10 | greek-peak | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:10 | greek-peak | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:10 | greek-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:10 | holimont | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:10 | holimont | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:10 | holimont | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:10 | holimont | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:10 | snow-ridge | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:10 | snow-ridge | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:10 | snow-ridge | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:10 | snow-ridge | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:10 | holiday-valley | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:10 | holiday-valley | typical_season_start | NULL | Late November | https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:10 | holiday-valley | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:10 | holiday-valley | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:10 | bristol-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:10 | bristol-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:10 | bristol-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:10 | bristol-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:10 | swain-resort | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:10 | swain-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:10 | swain-resort | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:10 | swain-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:10 | kissing-bridge | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:10 | kissing-bridge | typical_season_start | NULL | Late December | https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:10 | kissing-bridge | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:10 | kissing-bridge | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:10 | peek-n-peak | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:10 | peek-n-peak | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:10 | peek-n-peak | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:10 | peek-n-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:10 | song-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:10 | song-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:10 | song-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:10 | song-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:10 | labrador-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:10 | labrador-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:10 | labrador-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:10 | labrador-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:10 | woods-valley | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | woods-valley | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | woods-valley | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | woods-valley | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | mccauley-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:10 | mccauley-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:10 | mccauley-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:10 | mccauley-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:10 | oak-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:10 | oak-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:10 | oak-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:10 | oak-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:10 | titus-mountain | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:10 | titus-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:10 | titus-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:10 | titus-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:10 | willard-mountain | season_open_text | NULL | December 16, 2026 | https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:10 | willard-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:10 | willard-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:10 | willard-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:10 | royal-mountain | season_open_text | NULL | December 6, 2026 | https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | royal-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | royal-mountain | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | royal-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | buffalo-ski-club | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:10 | buffalo-ski-club | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:10 | buffalo-ski-club | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:10 | buffalo-ski-club | typical_season_end | NULL | Late March | https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:10 | maple-ski-ridge | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:10 | maple-ski-ridge | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:10 | maple-ski-ridge | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:10 | maple-ski-ridge | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:10 | liberty-mountain | season_open_text | December | December 19, 2026 | https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:10 | liberty-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:10 | liberty-mountain | season_close_text | mid-March | March 14, 2027 | https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:10 | liberty-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:10 | roundtop-mountain-resort | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:10 | roundtop-mountain-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:10 | roundtop-mountain-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:10 | roundtop-mountain-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:10 | whitetail-resort | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:10 | whitetail-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:10 | whitetail-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:10 | whitetail-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:10 | seven-springs | season_open_text | late November | December 5, 2026 | https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:10 | seven-springs | typical_season_start | NULL | Early December | https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:10 | seven-springs | season_close_text | mid-April | March 14, 2027 | https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:10 | seven-springs | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:10 | hidden-valley | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:10 | hidden-valley | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:10 | hidden-valley | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:10 | hidden-valley | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:10 | tussey-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:10 | tussey-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:10 | tussey-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:10 | tussey-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:10 | bear-creek-mountain-resort | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:10 | bear-creek-mountain-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:10 | bear-creek-mountain-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:10 | bear-creek-mountain-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:10 | spring-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | spring-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | spring-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | spring-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-sawmill | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:10 | ski-sawmill | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:10 | ski-sawmill | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:10 | ski-sawmill | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:10 | boyne-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:10 | boyne-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:10 | boyne-mountain | season_close_text | NULL | May 24, 2027 | https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:10 | boyne-mountain | typical_season_end | NULL | Late May | https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:10 | the-highlands | season_open_text | NULL | December 11, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | the-highlands | typical_season_start | NULL | Mid-December | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | the-highlands | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) |
| 2026-09-23T05:10 | mt-brighton | season_open_text | early December | December 9, 2026 | https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:10 | mt-brighton | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:10 | mt-brighton | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:10 | mt-brighton | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:10 | mount-bohemia | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:10 | mount-bohemia | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:10 | mount-bohemia | season_close_text | NULL | April 30, 2027 | https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:10 | mount-bohemia | typical_season_end | NULL | Late April | https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:10 | indianhead-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:10 | indianhead-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:10 | indianhead-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:10 | indianhead-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:10 | blackjack-mountain | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:10 | blackjack-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:10 | blackjack-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:10 | blackjack-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:10 | big-powderhorn-mountain | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:10 | big-powderhorn-mountain | typical_season_start | NULL | Late December | https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:10 | big-powderhorn-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:10 | big-powderhorn-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:10 | porcupine-mountains | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:10 | porcupine-mountains | typical_season_start | NULL | Late December | https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:10 | porcupine-mountains | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:10 | porcupine-mountains | typical_season_end | NULL | Late March | https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:10 | ski-brule | season_open_text | NULL | November 22, 2026 | https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:10 | ski-brule | typical_season_start | NULL | Late November | https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:10 | ski-brule | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:10 | ski-brule | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:10 | marquette-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:10 | marquette-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:10 | marquette-mountain | season_close_text | NULL | April 11, 2027 | https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:10 | marquette-mountain | typical_season_end | NULL | Mid-April | https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:10 | mont-ripley | season_open_text | late November | December 12, 2026 | https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:10 | mont-ripley | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:10 | pine-mountain | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:10 | pine-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:10 | pine-mountain | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:10 | pine-mountain | typical_season_end | NULL | Early April | https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:10 | norway-mountain | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:10 | norway-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:10 | norway-mountain | season_close_text | NULL | April 30, 2027 | https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:10 | norway-mountain | typical_season_end | NULL | Late April | https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain-mi | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain-mi | typical_season_start | NULL | Late November | https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain-mi | season_close_text | early April | April 4, 2027 | https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | crystal-mountain-mi | typical_season_end | NULL | Early April | https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:10 | shanty-creek | season_open_text | NULL | December 6, 2026 | https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:10 | shanty-creek | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:10 | shanty-creek | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:10 | shanty-creek | typical_season_end | NULL | Late March | https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:10 | nubs-nob | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:10 | nubs-nob | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:10 | nubs-nob | season_close_text | NULL | April 4, 2027 | https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:10 | nubs-nob | typical_season_end | NULL | Early April | https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:10 | treetops-resort | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:10 | treetops-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:10 | treetops-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:10 | treetops-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:10 | caberfae-peaks | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:10 | caberfae-peaks | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:10 | caberfae-peaks | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:10 | caberfae-peaks | typical_season_end | NULL | Late March | https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:10 | homestead-resort | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:10 | homestead-resort | typical_season_start | NULL | Late December | https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:10 | homestead-resort | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:10 | homestead-resort | typical_season_end | NULL | Early March | https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:10 | mount-holly | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:10 | mount-holly | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:10 | mount-holly | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:10 | mount-holly | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:10 | pine-knob | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:10 | pine-knob | typical_season_start | NULL | Late November | https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:10 | pine-knob | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:10 | pine-knob | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:10 | snow-snake | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | snow-snake | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | snow-snake | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | snow-snake | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:10 | apple-mountain | season_open_text | NULL | December 13, 2026 | https://www.onthesnow.com/michigan/apple-mountain/ski-resort |
| 2026-09-23T05:10 | apple-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/apple-mountain/ski-resort |
| 2026-09-23T05:10 | apple-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/apple-mountain/ski-resort |
| 2026-09-23T05:10 | apple-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/apple-mountain/ski-resort |
| 2026-09-23T05:10 | bittersweet-ski-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:10 | bittersweet-ski-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:10 | bittersweet-ski-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:10 | bittersweet-ski-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:10 | cannonsburg | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:10 | cannonsburg | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:10 | cannonsburg | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:10 | cannonsburg | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:10 | timber-ridge | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:10 | timber-ridge | typical_season_start | NULL | Late December | https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:10 | timber-ridge | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:10 | timber-ridge | typical_season_end | NULL | Early March | https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:10 | swiss-valley | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:10 | swiss-valley | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:10 | swiss-valley | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:10 | swiss-valley | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:10 | granite-peak | season_open_text | NULL | November 21, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wisconsin/granite-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | granite-peak | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wisconsin/granite-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | granite-peak | season_close_text | NULL | April 4, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wisconsin/granite-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | granite-peak | typical_season_end | NULL | Early April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wisconsin/granite-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | wilmot-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:10 | wilmot-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:10 | wilmot-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:10 | wilmot-mountain | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:10 | trollhaugen | season_open_text | NULL | November 13, 2026 | https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:10 | trollhaugen | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:10 | trollhaugen | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:10 | trollhaugen | typical_season_end | NULL | Late March | https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:10 | whitecap-mountains | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:10 | whitecap-mountains | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:10 | whitecap-mountains | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:10 | whitecap-mountains | typical_season_end | NULL | Late March | https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:10 | cascade-mountain | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:10 | cascade-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:10 | cascade-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:10 | cascade-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:10 | devils-head | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:10 | devils-head | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:10 | devils-head | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:10 | devils-head | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:10 | tyrol-basin | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:10 | tyrol-basin | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:10 | tyrol-basin | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:10 | tyrol-basin | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:10 | alpine-valley-wi | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:10 | alpine-valley-wi | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:10 | alpine-valley-wi | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:10 | alpine-valley-wi | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:10 | little-switzerland | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:10 | little-switzerland | typical_season_start | NULL | Late November | https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:10 | little-switzerland | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:10 | little-switzerland | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:10 | sunburst | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:10 | sunburst | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:10 | sunburst | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:10 | sunburst | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:10 | nordic-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:10 | nordic-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:10 | nordic-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:10 | nordic-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:10 | christmas-mountain | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:10 | christmas-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:10 | christmas-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:10 | christmas-mountain | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:10 | lutsen-mountains | season_open_text | NULL | November 21, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/minnesota/lutsen-mountains/ski-resort |
| 2026-09-23T05:10 | lutsen-mountains | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/minnesota/lutsen-mountains/ski-resort |
| 2026-09-23T05:10 | lutsen-mountains | season_close_text | NULL | May 2, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/minnesota/lutsen-mountains/ski-resort |
| 2026-09-23T05:10 | lutsen-mountains | typical_season_end | NULL | Early May | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/minnesota/lutsen-mountains/ski-resort |
| 2026-09-23T05:10 | spirit-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:10 | spirit-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:10 | spirit-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:10 | spirit-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:10 | afton-alps | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:10 | afton-alps | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:10 | afton-alps | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:10 | afton-alps | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:10 | welch-village | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:10 | welch-village | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:10 | welch-village | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:10 | welch-village | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:10 | buck-hill | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:10 | buck-hill | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:10 | buck-hill | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:10 | buck-hill | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:10 | hyland-hills | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | hyland-hills | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | hyland-hills | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | hyland-hills | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | mount-kato | season_open_text | early December | December 5, 2026 | https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-kato | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-kato | season_close_text | late March | March 21, 2027 | https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:10 | mount-kato | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:10 | powder-ridge | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | powder-ridge | typical_season_start | NULL | Late November | https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | powder-ridge | season_close_text | late March | March 21, 2027 | https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | powder-ridge | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | andes-tower-hills | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | andes-tower-hills | typical_season_start | NULL | Late November | https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | andes-tower-hills | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | andes-tower-hills | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | giants-ridge | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:10 | giants-ridge | typical_season_start | NULL | Late November | https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:10 | giants-ridge | season_close_text | NULL | April 3, 2027 | https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:10 | giants-ridge | typical_season_end | NULL | Early April | https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:10 | wild-mountain | season_open_text | NULL | November 13, 2026 | https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | wild-mountain | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | wild-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | wild-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:10 | buena-vista | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:10 | buena-vista | typical_season_start | NULL | Early December | https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:10 | buena-vista | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:10 | buena-vista | typical_season_end | NULL | Late March | https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:10 | sundown-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:10 | sundown-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:10 | sundown-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:10 | sundown-mountain | typical_season_end | NULL | Early March | https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:10 | seven-oaks | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:10 | seven-oaks | typical_season_start | NULL | Early December | https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:10 | seven-oaks | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:10 | seven-oaks | typical_season_end | NULL | Early March | https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:10 | mt-crescent | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-crescent | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-crescent | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-crescent | typical_season_end | NULL | Early March | https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:10 | chestnut-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:10 | chestnut-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:10 | chestnut-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:10 | chestnut-mountain | typical_season_end | NULL | Early March | https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:10 | four-lakes | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:10 | four-lakes | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:10 | four-lakes | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:10 | four-lakes | typical_season_end | NULL | Early March | https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:10 | villa-olivia | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:10 | villa-olivia | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:10 | villa-olivia | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:10 | villa-olivia | typical_season_end | NULL | Early March | https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:10 | snowstar | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:10 | snowstar | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:10 | snowstar | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:10 | snowstar | typical_season_end | NULL | Early March | https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:10 | perfect-north | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:10 | perfect-north | typical_season_start | NULL | Early December | https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:10 | perfect-north | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:10 | perfect-north | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:10 | paoli-peaks | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:10 | paoli-peaks | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:10 | paoli-peaks | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:10 | paoli-peaks | typical_season_end | NULL | Early March | https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:10 | boston-mills | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:10 | boston-mills | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:10 | boston-mills | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:10 | boston-mills | typical_season_end | NULL | Early March | https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:10 | brandywine | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:10 | brandywine | typical_season_start | NULL | Late December | https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:10 | brandywine | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:10 | brandywine | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:10 | alpine-valley-oh | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:10 | alpine-valley-oh | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:10 | alpine-valley-oh | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:10 | alpine-valley-oh | typical_season_end | NULL | Early March | https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:10 | mad-river-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:10 | mad-river-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:10 | mad-river-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:10 | mad-river-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:10 | snow-trails | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/ohio/snow-trails/ski-resort |
| 2026-09-23T05:10 | snow-trails | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/ohio/snow-trails/ski-resort |
| 2026-09-23T05:10 | hidden-valley-mo | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | hidden-valley-mo | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | hidden-valley-mo | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | hidden-valley-mo | typical_season_end | NULL | Early March | https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:10 | snow-creek | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:10 | snow-creek | typical_season_start | NULL | Late December | https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:10 | snow-creek | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:10 | snow-creek | typical_season_end | NULL | Early March | https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:10 | terry-peak | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | terry-peak | typical_season_start | NULL | Early December | https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | terry-peak | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | terry-peak | typical_season_end | NULL | Late March | https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:10 | wisp-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:10 | wisp-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:10 | wisp-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:10 | wisp-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:10 | bryce-resort | season_open_text | NULL | December 9, 2026 | https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:10 | bryce-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:10 | bryce-resort | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:10 | bryce-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:10 | massanutten-resort | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:10 | massanutten-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:10 | massanutten-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:10 | massanutten-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:10 | the-omni-homestead-resort | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:10 | the-omni-homestead-resort | typical_season_start | NULL | Late December | https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:10 | the-omni-homestead-resort | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:10 | the-omni-homestead-resort | typical_season_end | NULL | Early March | https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:10 | wintergreen-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:10 | wintergreen-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:10 | wintergreen-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:10 | wintergreen-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:10 | canaan-valley-resort | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:10 | canaan-valley-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:10 | canaan-valley-resort | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:10 | canaan-valley-resort | typical_season_end | NULL | Early March | https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:10 | snowshoe-mountain | season_open_text | NULL | November 25, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowshoe-mountain | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowshoe-mountain | season_close_text | NULL | March 21, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowshoe-mountain | typical_season_end | NULL | Late March | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:10 | timberline-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:10 | timberline-mountain | typical_season_start | NULL | Early December | https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:10 | timberline-mountain | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:10 | timberline-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:10 | winterplace-ski-resort | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/west-virginia/winterplace-ski-resort/ski-resort |
| 2026-09-23T05:10 | winterplace-ski-resort | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/west-virginia/winterplace-ski-resort/ski-resort |
| 2026-09-23T05:10 | ober-mountain | season_open_text | NULL | November 26, 2026 | https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:10 | ober-mountain | typical_season_start | NULL | Late November | https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:10 | ober-mountain | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:10 | ober-mountain | typical_season_end | NULL | Early March | https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:10 | appalachian-ski-mountain | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/north-carolina/appalachian-ski-mtn/ski-resort |
| 2026-09-23T05:10 | appalachian-ski-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/north-carolina/appalachian-ski-mtn/ski-resort |
| 2026-09-23T05:10 | cataloochee-ski-area | season_open_text | NULL | November 28, 2026 | https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:10 | cataloochee-ski-area | typical_season_start | NULL | Late November | https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:10 | cataloochee-ski-area | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:10 | cataloochee-ski-area | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:10 | sapphire-valley-resort | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:10 | sapphire-valley-resort | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:10 | sapphire-valley-resort | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:10 | sapphire-valley-resort | typical_season_end | NULL | Early March | https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:10 | beech-mountain-resort | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:10 | beech-mountain-resort | typical_season_start | NULL | Early December | https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:10 | beech-mountain-resort | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:10 | beech-mountain-resort | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sugar-mountain-resort | season_open_text | NULL | November 11, 2026 | https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sugar-mountain-resort | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sugar-mountain-resort | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:10 | sugar-mountain-resort | typical_season_end | NULL | Late March | https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:10 | hatley-pointe | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:10 | hatley-pointe | typical_season_start | NULL | Late December | https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:10 | hatley-pointe | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:10 | hatley-pointe | typical_season_end | NULL | Early March | https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:10 | powder-ridge-mountain-park | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:10 | powder-ridge-mountain-park | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:10 | powder-ridge-mountain-park | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:10 | powder-ridge-mountain-park | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:10 | ski-sundown | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/connecticut/ski-sundown/ski-resort |
| 2026-09-23T05:10 | ski-sundown | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/connecticut/ski-sundown/ski-resort |
| 2026-09-23T05:10 | blue-hills-ski-area | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-hills-ski-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-hills-ski-area | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | blue-hills-ski-area | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:10 | bousquet-mountain | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:10 | bousquet-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:10 | bousquet-mountain | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:10 | bousquet-mountain | typical_season_end | NULL | Late March | https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-butternut | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:10 | ski-butternut | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:10 | ski-butternut | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:10 | ski-butternut | typical_season_end | NULL | Late March | https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:10 | nashoba-valley-ski-area | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:10 | nashoba-valley-ski-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:10 | nashoba-valley-ski-area | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:10 | nashoba-valley-ski-area | typical_season_end | NULL | Late March | https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:10 | otis-ridge | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | otis-ridge | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | otis-ridge | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | otis-ridge | typical_season_end | NULL | Late March | https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-bradford | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-bradford | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-bradford | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-bradford | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:10 | ski-ward | season_open_text | NULL | November 14, 2026 | https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:10 | ski-ward | typical_season_start | NULL | Mid-November | https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:10 | ski-ward | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:10 | ski-ward | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:10 | campgaw-mountain | season_open_text | NULL | December 18, 2026 | https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:10 | campgaw-mountain | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:10 | campgaw-mountain | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:10 | campgaw-mountain | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:10 | mt-holiday | season_open_text | mid December | December 19, 2026 | https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-holiday | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-holiday | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:10 | mt-holiday | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:10 | snowriver | season_open_text | NULL | November 21, 2026 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/michigan/snowriver-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowriver | typical_season_start | NULL | Late November | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/michigan/snowriver-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowriver | season_close_text | NULL | April 11, 2027 | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/michigan/snowriver-mountain-resort/ski-resort |
| 2026-09-23T05:10 | snowriver | typical_season_end | NULL | Mid-April | https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/michigan/snowriver-mountain-resort/ski-resort |
| 2026-09-23T05:10 | dry-hill-area | season_open_text | NULL | December 2, 2026 | https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:10 | dry-hill-area | typical_season_start | NULL | Early December | https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:10 | dry-hill-area | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:10 | dry-hill-area | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:10 | hunt-hollow-club | season_open_text | NULL | December 12, 2026 | https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:10 | hunt-hollow-club | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:10 | hunt-hollow-club | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:10 | hunt-hollow-club | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:10 | cooper-spur-area | season_open_text | NULL | December 26, 2026 | https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:10 | cooper-spur-area | typical_season_start | NULL | Late December | https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:10 | cooper-spur-area | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:10 | cooper-spur-area | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:10 | hoodoo | season_open_text | NULL | November 27, 2026 | https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:10 | hoodoo | typical_season_start | NULL | Late November | https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:10 | hoodoo | season_close_text | NULL | March 28, 2027 | https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:10 | hoodoo | typical_season_end | NULL | Late March | https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:10 | big-bear-pa | season_open_text | NULL | December 11, 2026 | https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:10 | big-bear-pa | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:10 | big-bear-pa | season_close_text | NULL | March 14, 2027 | https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:10 | big-bear-pa | typical_season_end | NULL | Mid-March | https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:10 | saskadena-six-area | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:10 | saskadena-six-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:10 | saskadena-six-area | season_close_text | NULL | March 29, 2027 | https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:10 | saskadena-six-area | typical_season_end | NULL | Late March | https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:10 | bruce-mound-winter-sports-area | season_open_text | NULL | December 19, 2026 | https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:10 | bruce-mound-winter-sports-area | typical_season_start | NULL | Mid-December | https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:10 | bruce-mound-winter-sports-area | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:10 | bruce-mound-winter-sports-area | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:10 | christie | season_open_text | NULL | December 5, 2026 | https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:10 | christie | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:10 | christie | season_close_text | NULL | March 21, 2027 | https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:10 | christie | typical_season_end | NULL | Late March | https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:10 | mt-la-crosse | season_open_text | NULL | December 4, 2026 | https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
| 2026-09-23T05:10 | mt-la-crosse | typical_season_start | NULL | Early December | https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
| 2026-09-23T05:10 | mt-la-crosse | season_close_text | NULL | March 7, 2027 | https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
| 2026-09-23T05:10 | mt-la-crosse | typical_season_end | NULL | Early March | https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
| 2026-09-23T05:11 | sleeping-giant | season_open_text | November 27, 2026 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | sleeping-giant | season_close_text | March 14, 2027 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | sleeping-giant | typical_season_start | Late November | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | sleeping-giant | typical_season_end | Mid-March | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | homewood-mountain-resort | season_open_text | December 26, 2026 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | homewood-mountain-resort | season_close_text | March 14, 2027 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | homewood-mountain-resort | typical_season_start | Late December | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | homewood-mountain-resort | typical_season_end | Mid-March | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | apple-mountain | season_open_text | December 13, 2026 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | apple-mountain | season_close_text | March 14, 2027 | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | apple-mountain | typical_season_start | Mid-December | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:11 | apple-mountain | typical_season_end | Mid-March | NULL | closed resort — restored pre-step values |
| 2026-09-23T05:37 | hunter-mountain | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/new-york/hunter-mountain/ski-resort |
| 2026-09-23T05:37 | hunter-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/hunter-mountain/ski-resort |
| 2026-09-23T05:37 | windham-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:37 | windham-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/windham-mountain/ski-resort |
| 2026-09-23T05:37 | belleayre-mountain | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:37 | belleayre-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-york/belleayre/ski-resort |
| 2026-09-23T05:37 | plattekill-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:37 | plattekill-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/plattekill-mountain/ski-resort |
| 2026-09-23T05:37 | gore-mountain | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:37 | gore-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-york/gore-mountain/ski-resort |
| 2026-09-23T05:37 | whiteface-mountain | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:37 | whiteface-mountain | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/new-york/whiteface-mountain-resort/ski-resort |
| 2026-09-23T05:37 | thunder-ridge-ski-area | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:37 | thunder-ridge-ski-area | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/thunder-ridge/ski-resort |
| 2026-09-23T05:37 | mount-peter | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:37 | mount-peter | season_close_text | March 21, 2027 | mid March | projected: https://www.onthesnow.com/new-york/mount-peter/ski-resort |
| 2026-09-23T05:37 | mountain-creek | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:37 | mountain-creek | season_close_text | March 21, 2027 | mid March | projected: https://www.onthesnow.com/new-jersey/mountain-creek-resort/ski-resort |
| 2026-09-23T05:37 | camelback-mountain-resort | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:37 | camelback-mountain-resort | season_close_text | May 5, 2027 | May 5, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/camelback-mountain-resort/ski-resort |
| 2026-09-23T05:37 | blue-mountain-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | blue-mountain-resort | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/blue-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | shawnee-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/shawnee-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | shawnee-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/shawnee-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | jack-frost-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:37 | jack-frost-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/jack-frost/ski-resort |
| 2026-09-23T05:37 | big-boulder | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:37 | big-boulder | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/big-boulder/ski-resort |
| 2026-09-23T05:37 | montage-mountain | season_open_text | December 9, 2026 | December 9, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:37 | montage-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/montage-mountain/ski-resort |
| 2026-09-23T05:37 | elk-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:37 | elk-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/elk-mountain-ski-resort/ski-resort |
| 2026-09-23T05:37 | mohawk-mountain-ski-area | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:37 | mohawk-mountain-ski-area | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/connecticut/mohawk-mountain/ski-resort |
| 2026-09-23T05:37 | mount-southington | season_open_text | December 12, 2026 | mid December | curated text kept: https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:37 | mount-southington | season_close_text | March 21, 2027 | March 21, 2027 (projected) | curated text kept: https://www.onthesnow.com/connecticut/mount-southington-ski-area/ski-resort |
| 2026-09-23T05:37 | berkshire-east | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:37 | berkshire-east | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:37 | jiminy-peak | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/jiminy-peak/ski-resort |
| 2026-09-23T05:37 | jiminy-peak | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/jiminy-peak/ski-resort |
| 2026-09-23T05:37 | wachusett-mountain | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | wachusett-mountain | season_close_text | April 9, 2027 | April 9, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/wachusett-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | stratton-mountain | season_close_text | April 12, 2027 | April 12, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:37 | mount-snow | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:37 | mount-snow | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/vermont/mount-snow/ski-resort |
| 2026-09-23T05:37 | magic-mountain | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:37 | magic-mountain | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/vermont/magic-mountain/ski-resort |
| 2026-09-23T05:37 | bromley-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:37 | bromley-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/vermont/bromley-mountain/ski-resort |
| 2026-09-23T05:37 | okemo-mountain-resort | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:37 | okemo-mountain-resort | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:37 | loon-mountain | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/loon-mountain/ski-resort |
| 2026-09-23T05:37 | loon-mountain | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/loon-mountain/ski-resort |
| 2026-09-23T05:37 | cannon-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:37 | cannon-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:37 | arapahoe-basin | season_open_text | October 9, 2026 | October 9, 2026 (projected) | projected: https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:37 | arapahoe-basin | season_close_text | May 16, 2027 | May 17 | projected: https://www.onthesnow.com/colorado/arapahoe-basin-ski-area/ski-resort |
| 2026-09-23T05:37 | snowmass | season_close_text | April 18, 2027 | April 18, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/aspen-snowmass/ski-resort |
| 2026-09-23T05:37 | beaver-creek | season_close_text | March 28, 2027 | March 28, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/beaver-creek/ski-resort |
| 2026-09-23T05:37 | breckenridge | season_close_text | April 24, 2027 | April 24, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/breckenridge/ski-resort |
| 2026-09-23T05:37 | copper-mountain | season_close_text | May 2, 2027 | May 2, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/copper-mountain-resort/ski-resort |
| 2026-09-23T05:37 | crested-butte | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/crested-butte-mountain-resort/ski-resort |
| 2026-09-23T05:37 | echo-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:37 | echo-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/colorado/echo-mountain/ski-resort |
| 2026-09-23T05:37 | eldora | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/eldora-mountain-resort/ski-resort |
| 2026-09-23T05:37 | granby-ranch | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:37 | granby-ranch | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/colorado/ski-granby-ranch/ski-resort |
| 2026-09-23T05:37 | howelsen-hill | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:37 | howelsen-hill | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/colorado/howelsen-hill/ski-resort |
| 2026-09-23T05:37 | keystone | season_open_text | October 31, 2026 | October 31, 2026 (projected) | projected: https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:37 | keystone | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/colorado/keystone/ski-resort |
| 2026-09-23T05:37 | loveland | season_open_text | November 6, 2026 | November 6, 2026 (projected) | projected: https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:37 | loveland | season_close_text | May 9, 2027 | May 9, 2027 (projected) | projected: https://www.onthesnow.com/colorado/loveland/ski-resort |
| 2026-09-23T05:37 | monarch-mountain | season_open_text | December 4, 2026 | Late November | curated text kept: https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:37 | monarch-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | curated text kept: https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:37 | powderhorn | season_open_text | December 4, 2026 | late November | curated text kept: https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:37 | powderhorn | season_close_text | March 21, 2027 | early April | curated text kept: https://www.onthesnow.com/colorado/powderhorn/ski-resort |
| 2026-09-23T05:37 | purgatory | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:37 | purgatory | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/colorado/durango-mountain-resort/ski-resort |
| 2026-09-23T05:37 | silverton-mountain | season_open_text | December 31, 2026 | December | curated text kept: https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:37 | silverton-mountain | season_close_text | April 11, 2027 | April | curated text kept: https://www.onthesnow.com/colorado/silverton-mountain/ski-resort |
| 2026-09-23T05:37 | ski-cooper | season_open_text | December 9, 2026 | December 9, 2026 (projected) | projected: https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:37 | ski-cooper | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/colorado/ski-cooper/ski-resort |
| 2026-09-23T05:37 | steamboat | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:37 | sunlight-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:37 | sunlight-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/colorado/sunlight-mountain-resort/ski-resort |
| 2026-09-23T05:37 | telluride | season_open_text | November 26, 2026 | November 26, 2026 (projected) | projected: https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:37 | telluride | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/colorado/telluride/ski-resort |
| 2026-09-23T05:37 | vail | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/colorado/vail/ski-resort |
| 2026-09-23T05:37 | winter-park | season_open_text | October 30, 2026 | October 30, 2026 (projected) | projected: https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:37 | winter-park | season_close_text | May 2, 2027 | May 2, 2027 (projected) | projected: https://www.onthesnow.com/colorado/winter-park-resort/ski-resort |
| 2026-09-23T05:37 | wolf-creek | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:37 | wolf-creek | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/colorado/wolf-creek-ski-area/ski-resort |
| 2026-09-23T05:37 | alta | season_close_text | April 25, 2027 | April 25, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/alta-ski-area/ski-resort |
| 2026-09-23T05:37 | beaver-mountain | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:37 | beaver-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/utah/beaver-mountain/ski-resort |
| 2026-09-23T05:37 | brian-head | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:37 | brian-head | season_close_text | May 2, 2027 | May 2, 2027 (projected) | projected: https://www.onthesnow.com/utah/brian-head-resort/ski-resort |
| 2026-09-23T05:37 | brighton | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:37 | brighton | season_close_text | May 9, 2027 | May 9, 2027 (projected) | projected: https://www.onthesnow.com/utah/brighton-resort/ski-resort |
| 2026-09-23T05:37 | deer-valley | season_close_text | March 28, 2027 | March 28, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/deer-valley-resort/ski-resort |
| 2026-09-23T05:37 | eagle-point | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:37 | eagle-point | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/utah/eagle-point/ski-resort |
| 2026-09-23T05:37 | park-city | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/utah/park-city-mountain-resort/ski-resort |
| 2026-09-23T05:37 | powder-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:37 | powder-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:37 | snowbasin | season_close_text | March 28, 2027 | March 28, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbasin/ski-resort |
| 2026-09-23T05:37 | snowbird | season_close_text | May 9, 2027 | May 9, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/snowbird/ski-resort |
| 2026-09-23T05:37 | solitude | season_close_text | May 23, 2027 | May 23, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/utah/solitude-mountain-resort/ski-resort |
| 2026-09-23T05:37 | sundance | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:37 | sundance | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/utah/sundance/ski-resort |
| 2026-09-23T05:37 | nordic-valley | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:37 | nordic-valley | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:37 | jackson-hole | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:37 | grand-targhee | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/grand-targhee-resort/ski-resort |
| 2026-09-23T05:37 | grand-targhee | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/grand-targhee-resort/ski-resort |
| 2026-09-23T05:37 | snow-king | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:37 | snow-king | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/snow-king-resort/ski-resort |
| 2026-09-23T05:37 | hogadon | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/hogadon/ski-resort |
| 2026-09-23T05:37 | hogadon | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/hogadon/ski-resort |
| 2026-09-23T05:37 | snowy-range | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:37 | snowy-range | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/snowy-range-ski-recreation-area/ski-resort |
| 2026-09-23T05:37 | white-pine | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:37 | white-pine | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/white-pine-ski-area/ski-resort |
| 2026-09-23T05:37 | meadowlark | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:37 | meadowlark | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/wyoming/meadowlark-ski-lodge/ski-resort |
| 2026-09-23T05:37 | big-sky | season_close_text | April 25, 2027 | April 25, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/montana/big-sky-resort/ski-resort |
| 2026-09-23T05:37 | whitefish | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:37 | whitefish | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/montana/whitefish-mountain-resort/ski-resort |
| 2026-09-23T05:37 | bridger-bowl | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:37 | bridger-bowl | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/montana/bridger-bowl/ski-resort |
| 2026-09-23T05:37 | red-lodge | season_open_text | December 4, 2026 | late November | curated text kept: https://www.onthesnow.com/montana/red-lodge-mountain/ski-resort |
| 2026-09-23T05:37 | red-lodge | season_close_text | April 11, 2027 | April 11, 2027 (projected) | curated text kept: https://www.onthesnow.com/montana/red-lodge-mountain/ski-resort |
| 2026-09-23T05:37 | discovery | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:37 | discovery | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/montana/discovery-ski-area/ski-resort |
| 2026-09-23T05:37 | blacktail | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | blacktail | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/montana/blacktail-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | great-divide | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:37 | great-divide | season_close_text | April 2, 2027 | April 2, 2027 (projected) | projected: https://www.onthesnow.com/montana/great-divide/ski-resort |
| 2026-09-23T05:37 | lost-trail | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:37 | lost-trail | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/montana/lost-trail-powder-mtn/ski-resort |
| 2026-09-23T05:37 | maverick-mountain | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:37 | maverick-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/montana/maverick-mountain/ski-resort |
| 2026-09-23T05:37 | montana-snowbowl | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:37 | montana-snowbowl | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/montana/montana-snowbowl/ski-resort |
| 2026-09-23T05:37 | showdown | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:37 | showdown | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/montana/showdown-ski-area/ski-resort |
| 2026-09-23T05:37 | teton-pass | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:37 | teton-pass | season_close_text | April 10, 2027 | April 10, 2027 (projected) | projected: https://www.onthesnow.com/montana/teton-pass-ski-area/ski-resort |
| 2026-09-23T05:37 | sun-valley | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/sun-valley/ski-resort |
| 2026-09-23T05:37 | schweitzer | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/idaho/schweitzer/ski-resort |
| 2026-09-23T05:37 | brundage-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/idaho/brundage-mountain-resort/ski-resort |
| 2026-09-23T05:37 | brundage-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/idaho/brundage-mountain-resort/ski-resort |
| 2026-09-23T05:37 | tamarack | season_open_text | October 27, 2026 | October 27, 2026 (projected) | projected: https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:37 | tamarack | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/idaho/tamarack-resort/ski-resort |
| 2026-09-23T05:37 | bogus-basin | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:37 | bogus-basin | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/idaho/bogus-basin/ski-resort |
| 2026-09-23T05:37 | silver-mountain | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:37 | silver-mountain | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/idaho/silver-mountain/ski-resort |
| 2026-09-23T05:37 | soldier-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | soldier-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/idaho/soldier-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | pebble-creek | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/idaho/pebble-creek-ski-area/ski-resort |
| 2026-09-23T05:37 | pebble-creek | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/idaho/pebble-creek-ski-area/ski-resort |
| 2026-09-23T05:37 | kelly-canyon | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:37 | kelly-canyon | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/idaho/kelly-canyon-ski-area/ski-resort |
| 2026-09-23T05:37 | pomerelle | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:37 | pomerelle | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/idaho/pomerelle-mountain-resort/ski-resort |
| 2026-09-23T05:37 | magic-mountain-id | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/idaho/magic-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | alyeska-resort | season_close_text | April 25, 2027 | April 25, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/alaska/alyeska-resort/ski-resort |
| 2026-09-23T05:37 | eaglecrest-ski-area | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:37 | eaglecrest-ski-area | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/alaska/eaglecrest-ski-area/ski-resort |
| 2026-09-23T05:37 | hilltop-ski-area | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:37 | hilltop-ski-area | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/alaska/hilltop-ski-area/ski-resort |
| 2026-09-23T05:37 | palisades-tahoe | season_close_text | May 23, 2027 | May 23, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:37 | heavenly-mountain-resort | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:37 | northstar-california | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/northstar-california/ski-resort |
| 2026-09-23T05:37 | kirkwood-mountain-resort | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/california/kirkwood/ski-resort |
| 2026-09-23T05:37 | sierra-at-tahoe | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:37 | sierra-at-tahoe | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/california/sierra-at-tahoe/ski-resort |
| 2026-09-23T05:37 | homewood-mountain-resort | season_open_text | NULL | December 26, 2026 (projected) | projected: https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:37 | homewood-mountain-resort | season_close_text | NULL | March 14, 2027 (projected) | projected: https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:37 | homewood-mountain-resort | typical_season_start | NULL | Late December | projected: https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:37 | homewood-mountain-resort | typical_season_end | NULL | Mid-March | projected: https://www.onthesnow.com/california/homewood-mountain-resort/ski-resort |
| 2026-09-23T05:37 | boreal-mountain-resort | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:37 | boreal-mountain-resort | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/california/boreal/ski-resort |
| 2026-09-23T05:37 | soda-springs | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:37 | soda-springs | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/california/soda-springs/ski-resort |
| 2026-09-23T05:37 | donner-ski-ranch | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:37 | donner-ski-ranch | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:37 | sugar-bowl-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:37 | sugar-bowl-resort | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/california/sugar-bowl-resort/ski-resort |
| 2026-09-23T05:37 | tahoe-donner-downhill | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:37 | tahoe-donner-downhill | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/california/tahoe-donner/ski-resort |
| 2026-09-23T05:37 | diamond-peak | season_open_text | December 3, 2026 | December 3, 2026 (projected) | projected: https://www.onthesnow.com/nevada/diamond-peak/ski-resort |
| 2026-09-23T05:37 | diamond-peak | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/nevada/diamond-peak/ski-resort |
| 2026-09-23T05:37 | mt-rose-ski-tahoe | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:37 | mt-rose-ski-tahoe | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/nevada/mt-rose-ski-tahoe/ski-resort |
| 2026-09-23T05:37 | lee-canyon | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:37 | lee-canyon | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:37 | elko-snobowl | season_open_text | December 30, 2026 | December 30, 2026 (projected) | projected: https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:37 | elko-snobowl | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/nevada/elko-snobowl/ski-resort |
| 2026-09-23T05:37 | mammoth-mountain | season_close_text | June 6, 2027 | June 6, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/mammoth-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | june-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/california/june-mountain/ski-resort |
| 2026-09-23T05:37 | bear-valley-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:37 | bear-valley-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/california/bear-valley/ski-resort |
| 2026-09-23T05:37 | dodge-ridge | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:37 | dodge-ridge | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/california/dodge-ridge/ski-resort |
| 2026-09-23T05:37 | china-peak | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:37 | china-peak | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/california/ski-china-peak/ski-resort |
| 2026-09-23T05:37 | badger-pass | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:37 | badger-pass | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:37 | mountain-high | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:37 | mountain-high | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/california/mountain-high/ski-resort |
| 2026-09-23T05:37 | snow-valley | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:37 | snow-valley | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/california/snow-valley/ski-resort |
| 2026-09-23T05:37 | snow-summit | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:37 | snow-summit | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/california/snow-summit/ski-resort |
| 2026-09-23T05:37 | bear-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:37 | bear-mountain | season_close_text | March 27, 2027 | March 27, 2027 (projected) | projected: https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:37 | mt-baldy | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:37 | mt-baldy | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/california/mt-baldy/ski-resort |
| 2026-09-23T05:37 | mt-shasta-ski-park | season_open_text | December 26, 2026 | mid December | curated text kept: https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:37 | mt-shasta-ski-park | season_close_text | March 14, 2027 | March 14, 2027 (projected) | curated text kept: https://www.onthesnow.com/california/mount-shasta-board-ski-park/ski-resort |
| 2026-09-23T05:37 | mt-bachelor | season_close_text | May 31, 2027 | May 31, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/oregon/mt-bachelor/ski-resort |
| 2026-09-23T05:37 | timberline-lodge | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:37 | timberline-lodge | season_close_text | July 19, 2026 | July 19, 2026 (projected) | projected: https://www.onthesnow.com/oregon/timberline-lodge/ski-resort |
| 2026-09-23T05:37 | mt-hood-meadows | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:37 | mt-hood-meadows | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/oregon/mt-hood-meadows/ski-resort |
| 2026-09-23T05:37 | mt-hood-skibowl | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:37 | mt-hood-skibowl | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/oregon/mt-hood-ski-bowl/ski-resort |
| 2026-09-23T05:37 | willamette-pass | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:37 | willamette-pass | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/oregon/willamette-pass/ski-resort |
| 2026-09-23T05:37 | anthony-lakes | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:37 | anthony-lakes | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/oregon/anthony-lakes-mountain-resort/ski-resort |
| 2026-09-23T05:37 | spout-springs | season_close_text | March 31, 2027 | March 31, 2027 (projected) | projected: https://www.onthesnow.com/oregon/spout-springs/ski-resort |
| 2026-09-23T05:37 | crystal-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/washington/crystal-mountain/ski-resort |
| 2026-09-23T05:37 | stevens-pass | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18) + https://www.onthesnow.com/washington/stevens-pass-resort/ski-resort |
| 2026-09-23T05:37 | the-summit-at-snoqualmie | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:37 | the-summit-at-snoqualmie | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/washington/the-summit-at-snoqualmie/ski-resort |
| 2026-09-23T05:37 | mt-baker-ski-area | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:37 | mt-baker-ski-area | season_close_text | April 18, 2027 | late April | projected: https://www.onthesnow.com/washington/mt-baker/ski-resort |
| 2026-09-23T05:37 | mission-ridge | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:37 | mission-ridge | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/washington/mission-ridge/ski-resort |
| 2026-09-23T05:37 | white-pass | season_open_text | December 20, 2026 | December 20, 2026 (projected) | projected: https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:37 | white-pass | season_close_text | April 25, 2027 | April 25, 2027 (projected) | projected: https://www.onthesnow.com/washington/white-pass/ski-resort |
| 2026-09-23T05:37 | 49-degrees-north | season_open_text | December 30, 2026 | December 30, 2026 (projected) | projected: https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:37 | 49-degrees-north | season_close_text | April 25, 2027 | April 25, 2027 (projected) | projected: https://www.onthesnow.com/washington/49-degrees-north/ski-resort |
| 2026-09-23T05:37 | mt-spokane | season_open_text | December 26, 2026 | early December | curated text kept: https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:37 | mt-spokane | season_close_text | March 14, 2027 | early April | curated text kept: https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:37 | bluewood | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:37 | bluewood | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/washington/bluewood/ski-resort |
| 2026-09-23T05:37 | taos-ski-valley | season_close_text | March 28, 2027 | March 28, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/new-mexico/taos-ski-valley/ski-resort |
| 2026-09-23T05:37 | ski-santa-fe | season_open_text | November 26, 2026 | November 26, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:37 | ski-santa-fe | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/ski-santa-fe/ski-resort |
| 2026-09-23T05:37 | angel-fire-resort | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:37 | angel-fire-resort | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/angel-fire-resort/ski-resort |
| 2026-09-23T05:37 | red-river-ski-area | season_open_text | November 26, 2026 | November 26, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:37 | red-river-ski-area | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:37 | pajarito-mountain | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/pajarito-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | pajarito-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/pajarito-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | sipapu | season_open_text | November 20, 2026 | November | curated text kept: https://www.onthesnow.com/new-mexico/sipapu-ski-and-summer-resort/ski-resort |
| 2026-09-23T05:37 | sipapu | season_close_text | March 28, 2027 | April | curated text kept: https://www.onthesnow.com/new-mexico/sipapu-ski-and-summer-resort/ski-resort |
| 2026-09-23T05:37 | sandia-peak | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:37 | sandia-peak | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/sandia-peak/ski-resort |
| 2026-09-23T05:37 | ski-apache | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:37 | ski-apache | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/new-mexico/ski-apache/ski-resort |
| 2026-09-23T05:37 | arizona-snowbowl | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:37 | arizona-snowbowl | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:37 | sunrise-park-resort | season_open_text | December 11, 2026 | Thanksgiving | curated text kept: https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:37 | sunrise-park-resort | season_close_text | March 21, 2027 | NULL | curated text kept: https://www.onthesnow.com/arizona/sunrise-park-resort/ski-resort |
| 2026-09-23T05:37 | sunday-river | season_close_text | April 18, 2027 | April 18, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:37 | sugarloaf | season_close_text | April 25, 2027 | April 25, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/maine/sugarloaf/ski-resort |
| 2026-09-23T05:37 | saddleback | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:37 | saddleback | season_close_text | April 18, 2027 | April 18, 2027 (projected) | projected: https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:37 | black-mountain-of-maine | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:37 | black-mountain-of-maine | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/maine/black-mountain-of-maine/ski-resort |
| 2026-09-23T05:37 | mt-abram | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:37 | mt-abram | season_close_text | March 28, 2027 | late March | projected: https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:37 | shawnee-peak | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:37 | shawnee-peak | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:37 | lost-valley | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:37 | lost-valley | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/maine/lost-valley/ski-resort |
| 2026-09-23T05:37 | camden-snow-bowl | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:37 | camden-snow-bowl | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:37 | mount-jefferson-ski-area | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:37 | mount-jefferson-ski-area | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:37 | big-squaw-mountain | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:37 | big-squaw-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:37 | hermon-mountain | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:37 | hermon-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:37 | attitash | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:37 | attitash | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:37 | wildcat-mountain | season_open_text | December 2, 2026 | December 2, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:37 | wildcat-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/wildcat-mountain/ski-resort |
| 2026-09-23T05:37 | crotched-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:37 | crotched-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:37 | mount-sunapee | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:37 | mount-sunapee | season_close_text | April 4, 2027 | mid April | projected: https://www.onthesnow.com/new-hampshire/mount-sunapee/ski-resort |
| 2026-09-23T05:37 | bretton-woods | season_open_text | November 14, 2026 | November 14, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:37 | bretton-woods | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:37 | waterville-valley | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:37 | waterville-valley | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/waterville-valley/ski-resort |
| 2026-09-23T05:37 | pats-peak | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:37 | pats-peak | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/pats-peak/ski-resort |
| 2026-09-23T05:37 | gunstock-mountain-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:37 | gunstock-mountain-resort | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/gunstock/ski-resort |
| 2026-09-23T05:37 | ragged-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:37 | ragged-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/ragged-mountain-resort/ski-resort |
| 2026-09-23T05:37 | black-mountain-nh | season_open_text | November 15, 2026 | November 15, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:37 | black-mountain-nh | season_close_text | May 2, 2027 | May 2, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/black-mountain/ski-resort |
| 2026-09-23T05:37 | dartmouth-skiway | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:37 | dartmouth-skiway | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/dartmouth-skiway/ski-resort |
| 2026-09-23T05:37 | king-pine | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:37 | king-pine | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/king-pine/ski-resort |
| 2026-09-23T05:37 | tenney-mountain | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:37 | tenney-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/tenney-mountain/ski-resort |
| 2026-09-23T05:37 | whaleback-mountain | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:37 | whaleback-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-hampshire/whaleback-mountain/ski-resort |
| 2026-09-23T05:37 | killington | season_open_text | November 11, 2026 | November 11, 2026 (projected) | projected: https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:37 | killington | season_close_text | May 24, 2027 | May 24, 2027 (projected) | projected: https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:37 | pico-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:37 | sugarbush | season_close_text | May 2, 2027 | May 2, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:37 | stowe-mountain-resort | season_open_text | November 20, 2026 | November 20, 2026 (projected) | projected: https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:37 | stowe-mountain-resort | season_close_text | April 25, 2027 | April 25, 2027 (projected) | projected: https://www.onthesnow.com/vermont/stowe-mountain-resort/ski-resort |
| 2026-09-23T05:37 | jay-peak | season_open_text | November 22, 2026 | November 22, 2026 (projected) | projected: https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:37 | jay-peak | season_close_text | May 16, 2027 | May 16, 2027 (projected) | projected: https://www.onthesnow.com/vermont/jay-peak/ski-resort |
| 2026-09-23T05:37 | smugglers-notch | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:37 | smugglers-notch | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:37 | bolton-valley | season_open_text | November 21, 2026 | November 21, 2026 (projected) | projected: https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:37 | bolton-valley | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:37 | mad-river-glen | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:37 | mad-river-glen | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/vermont/mad-river-glen/ski-resort |
| 2026-09-23T05:37 | burke-mountain | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:37 | burke-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/vermont/burke-mountain/ski-resort |
| 2026-09-23T05:37 | holiday-mountain | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:37 | holiday-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:37 | west-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:37 | west-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/new-york/west-mountain/ski-resort |
| 2026-09-23T05:37 | greek-peak | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:37 | greek-peak | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/greek-peak/ski-resort |
| 2026-09-23T05:37 | holimont | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:37 | holimont | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:37 | snow-ridge | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:37 | snow-ridge | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/snow-ridge/ski-resort |
| 2026-09-23T05:37 | holiday-valley | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:37 | holiday-valley | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/holiday-valley/ski-resort |
| 2026-09-23T05:37 | bristol-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:37 | bristol-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/bristol-mountain/ski-resort |
| 2026-09-23T05:37 | swain-resort | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:37 | swain-resort | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/swain/ski-resort |
| 2026-09-23T05:37 | kissing-bridge | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:37 | kissing-bridge | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/kissing-bridge/ski-resort |
| 2026-09-23T05:37 | peek-n-peak | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:37 | peek-n-peak | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/peekn-peak/ski-resort |
| 2026-09-23T05:37 | song-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:37 | song-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/song-mountain/ski-resort |
| 2026-09-23T05:37 | labrador-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:37 | labrador-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-york/labrador-mt/ski-resort |
| 2026-09-23T05:37 | woods-valley | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:37 | woods-valley | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:37 | mccauley-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:37 | mccauley-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/new-york/mccauley-mountain-ski-center/ski-resort |
| 2026-09-23T05:37 | oak-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:37 | oak-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/oak-mountain/ski-resort |
| 2026-09-23T05:37 | titus-mountain | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:37 | titus-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/new-york/titus-mountain/ski-resort |
| 2026-09-23T05:37 | willard-mountain | season_open_text | December 16, 2026 | December 16, 2026 (projected) | projected: https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:37 | willard-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/willard-mountain/ski-resort |
| 2026-09-23T05:37 | royal-mountain | season_open_text | December 6, 2026 | December 6, 2026 (projected) | projected: https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | royal-mountain | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | buffalo-ski-club | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:37 | buffalo-ski-club | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/new-york/buffalo-ski-club-ski-area/ski-resort |
| 2026-09-23T05:37 | maple-ski-ridge | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:37 | maple-ski-ridge | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-york/maple-ski-ridge/ski-resort |
| 2026-09-23T05:37 | liberty-mountain | season_open_text | December 19, 2026 | December | curated text kept: https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:37 | liberty-mountain | season_close_text | March 14, 2027 | mid-March | curated text kept: https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:37 | roundtop-mountain-resort | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:37 | roundtop-mountain-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/roundtop-mountain-resort/ski-resort |
| 2026-09-23T05:37 | whitetail-resort | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:37 | whitetail-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/whitetail-resort/ski-resort |
| 2026-09-23T05:37 | seven-springs | season_open_text | December 5, 2026 | late November | curated text kept: https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:37 | seven-springs | season_close_text | March 14, 2027 | mid-April | curated text kept: https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:37 | hidden-valley | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:37 | hidden-valley | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/hidden-valley-resort/ski-resort |
| 2026-09-23T05:37 | tussey-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:37 | tussey-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/tussey-mountain/ski-resort |
| 2026-09-23T05:37 | bear-creek-mountain-resort | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:37 | bear-creek-mountain-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/bear-creek-mountain-resort/ski-resort |
| 2026-09-23T05:37 | spring-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | spring-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/spring-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | ski-sawmill | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:37 | ski-sawmill | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/ski-sawmill/ski-resort |
| 2026-09-23T05:37 | boyne-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:37 | boyne-mountain | season_close_text | May 24, 2027 | May 24, 2027 (projected) | projected: https://www.onthesnow.com/michigan/boyne-mountain-resort/ski-resort |
| 2026-09-23T05:37 | mt-brighton | season_open_text | December 9, 2026 | early December | curated text kept: https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:37 | mt-brighton | season_close_text | March 14, 2027 | March 14, 2027 (projected) | curated text kept: https://www.onthesnow.com/michigan/mount-brighton/ski-resort |
| 2026-09-23T05:37 | mount-bohemia | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:37 | mount-bohemia | season_close_text | April 30, 2027 | April 30, 2027 (projected) | projected: https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:37 | indianhead-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:37 | indianhead-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/michigan/indianhead-mountain/ski-resort |
| 2026-09-23T05:37 | blackjack-mountain | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:37 | blackjack-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/michigan/blackjack-ski-resort/ski-resort |
| 2026-09-23T05:37 | big-powderhorn-mountain | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:37 | big-powderhorn-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/michigan/big-powderhorn-mountain/ski-resort |
| 2026-09-23T05:37 | porcupine-mountains | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:37 | porcupine-mountains | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:37 | ski-brule | season_open_text | November 22, 2026 | November 22, 2026 (projected) | projected: https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:37 | ski-brule | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:37 | marquette-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:37 | marquette-mountain | season_close_text | April 11, 2027 | April 11, 2027 (projected) | projected: https://www.onthesnow.com/michigan/marquette-mountain/ski-resort |
| 2026-09-23T05:37 | mont-ripley | season_open_text | December 12, 2026 | late November | curated text kept: https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:37 | mont-ripley | season_close_text | March 28, 2027 | March 28, 2027 (projected) | curated text kept: https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:37 | pine-mountain | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:37 | pine-mountain | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/michigan/pine-mountain/ski-resort |
| 2026-09-23T05:37 | norway-mountain | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:37 | norway-mountain | season_close_text | April 30, 2027 | April 30, 2027 (projected) | projected: https://www.onthesnow.com/michigan/norway-mountain/ski-resort |
| 2026-09-23T05:37 | crystal-mountain-mi | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:37 | crystal-mountain-mi | season_close_text | April 4, 2027 | early April | projected: https://www.onthesnow.com/michigan/crystal-mountain/ski-resort |
| 2026-09-23T05:37 | shanty-creek | season_open_text | December 6, 2026 | December 6, 2026 (projected) | projected: https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:37 | shanty-creek | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:37 | nubs-nob | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:37 | nubs-nob | season_close_text | April 4, 2027 | April 4, 2027 (projected) | projected: https://www.onthesnow.com/michigan/nubs-nob-ski-area/ski-resort |
| 2026-09-23T05:37 | treetops-resort | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:37 | treetops-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/treetops-resort/ski-resort |
| 2026-09-23T05:37 | caberfae-peaks | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:37 | caberfae-peaks | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:37 | homestead-resort | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:37 | homestead-resort | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:37 | mount-holly | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:37 | mount-holly | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:37 | pine-knob | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:37 | pine-knob | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:37 | snow-snake | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | snow-snake | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:37 | bittersweet-ski-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:37 | bittersweet-ski-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/bittersweet-ski-area/ski-resort |
| 2026-09-23T05:37 | cannonsburg | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:37 | cannonsburg | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:37 | timber-ridge | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:37 | timber-ridge | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/michigan/timber-ridge/ski-resort |
| 2026-09-23T05:37 | swiss-valley | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:37 | swiss-valley | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/michigan/swiss-valley/ski-resort |
| 2026-09-23T05:37 | granite-peak | season_close_text | April 4, 2027 | April 4, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/wisconsin/granite-peak-ski-area/ski-resort |
| 2026-09-23T05:37 | wilmot-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:37 | wilmot-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/wilmot-mountain/ski-resort |
| 2026-09-23T05:37 | trollhaugen | season_open_text | November 13, 2026 | November 13, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:37 | trollhaugen | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/trollhaugen/ski-resort |
| 2026-09-23T05:37 | whitecap-mountains | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:37 | whitecap-mountains | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/whitecap-mountain/ski-resort |
| 2026-09-23T05:37 | cascade-mountain | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:37 | cascade-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/cascade-mountain/ski-resort |
| 2026-09-23T05:37 | devils-head | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:37 | devils-head | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/devils-head/ski-resort |
| 2026-09-23T05:37 | tyrol-basin | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:37 | tyrol-basin | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/tyrol-basin/ski-resort |
| 2026-09-23T05:37 | alpine-valley-wi | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:37 | alpine-valley-wi | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:37 | little-switzerland | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:37 | little-switzerland | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/little-switzerland/ski-resort |
| 2026-09-23T05:37 | sunburst | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:37 | sunburst | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/sunburst/ski-resort |
| 2026-09-23T05:37 | nordic-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:37 | nordic-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/nordic-mountain/ski-resort |
| 2026-09-23T05:37 | christmas-mountain | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:37 | christmas-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:37 | lutsen-mountains | season_close_text | May 2, 2027 | May 2, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/minnesota/lutsen-mountains/ski-resort |
| 2026-09-23T05:37 | spirit-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:37 | spirit-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/spirit-mountain/ski-resort |
| 2026-09-23T05:37 | afton-alps | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:37 | afton-alps | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:37 | welch-village | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:37 | welch-village | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/welch-village/ski-resort |
| 2026-09-23T05:37 | buck-hill | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:37 | buck-hill | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/buck-hill/ski-resort |
| 2026-09-23T05:37 | hyland-hills | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:37 | hyland-hills | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:37 | mount-kato | season_open_text | December 5, 2026 | early December | curated text kept: https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:37 | mount-kato | season_close_text | March 21, 2027 | late March | curated text kept: https://www.onthesnow.com/minnesota/mount-kato-ski-area/ski-resort |
| 2026-09-23T05:37 | powder-ridge | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:37 | powder-ridge | season_close_text | March 21, 2027 | late March | projected: https://www.onthesnow.com/minnesota/powder-ridge-ski-area/ski-resort |
| 2026-09-23T05:37 | andes-tower-hills | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:37 | andes-tower-hills | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/andes-tower-hills-ski-area/ski-resort |
| 2026-09-23T05:37 | giants-ridge | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:37 | giants-ridge | season_close_text | April 3, 2027 | April 3, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/giants-ridge-resort/ski-resort |
| 2026-09-23T05:37 | wild-mountain | season_open_text | November 13, 2026 | November 13, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:37 | wild-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:37 | buena-vista | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:37 | buena-vista | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/minnesota/buena-vista-ski-area/ski-resort |
| 2026-09-23T05:37 | sundown-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:37 | sundown-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/iowa/sundown-mountain/ski-resort |
| 2026-09-23T05:37 | seven-oaks | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:37 | seven-oaks | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:37 | mt-crescent | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:37 | mt-crescent | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/iowa/mt-crescent-ski-area/ski-resort |
| 2026-09-23T05:37 | chestnut-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:37 | chestnut-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/illinois/chestnut-mountain-resort/ski-resort |
| 2026-09-23T05:37 | four-lakes | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:37 | four-lakes | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:37 | villa-olivia | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:37 | villa-olivia | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:37 | snowstar | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:37 | snowstar | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/illinois/ski-snowstar-winter-sports-park/ski-resort |
| 2026-09-23T05:37 | perfect-north | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:37 | perfect-north | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/indiana/perfect-north-slopes/ski-resort |
| 2026-09-23T05:37 | paoli-peaks | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:37 | paoli-peaks | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/indiana/paoli-peaks/ski-resort |
| 2026-09-23T05:37 | boston-mills | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:37 | boston-mills | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/ohio/boston-mills/ski-resort |
| 2026-09-23T05:37 | brandywine | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:37 | brandywine | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/ohio/brandywine/ski-resort |
| 2026-09-23T05:37 | alpine-valley-oh | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:37 | alpine-valley-oh | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/ohio/alpine-valley/ski-resort |
| 2026-09-23T05:37 | mad-river-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:37 | mad-river-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/ohio/mad-river-mountain/ski-resort |
| 2026-09-23T05:37 | snow-trails | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/ohio/snow-trails/ski-resort |
| 2026-09-23T05:37 | snow-trails | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/ohio/snow-trails/ski-resort |
| 2026-09-23T05:37 | hidden-valley-mo | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:37 | hidden-valley-mo | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:37 | snow-creek | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:37 | snow-creek | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/missouri/snow-creek/ski-resort |
| 2026-09-23T05:37 | terry-peak | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:37 | terry-peak | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/south-dakota/terry-peak-ski-area/ski-resort |
| 2026-09-23T05:37 | wisp-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:37 | wisp-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/maryland/wisp/ski-resort |
| 2026-09-23T05:37 | bryce-resort | season_open_text | December 9, 2026 | December 9, 2026 (projected) | projected: https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:37 | bryce-resort | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/virginia/bryce-resort/ski-resort |
| 2026-09-23T05:37 | massanutten-resort | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:37 | massanutten-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/virginia/massanutten/ski-resort |
| 2026-09-23T05:37 | the-omni-homestead-resort | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:37 | the-omni-homestead-resort | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:37 | wintergreen-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:37 | wintergreen-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/virginia/wintergreen-resort/ski-resort |
| 2026-09-23T05:37 | canaan-valley-resort | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:37 | canaan-valley-resort | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/west-virginia/canaan-valley-resort/ski-resort |
| 2026-09-23T05:37 | snowshoe-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:37 | timberline-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:37 | timberline-mountain | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:37 | winterplace-ski-resort | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/west-virginia/winterplace-ski-resort/ski-resort |
| 2026-09-23T05:37 | winterplace-ski-resort | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/west-virginia/winterplace-ski-resort/ski-resort |
| 2026-09-23T05:37 | ober-mountain | season_open_text | November 26, 2026 | November 26, 2026 (projected) | projected: https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:37 | ober-mountain | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/tennessee/ober-gatlinburg-ski-resort/ski-resort |
| 2026-09-23T05:37 | appalachian-ski-mountain | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/appalachian-ski-mtn/ski-resort |
| 2026-09-23T05:37 | appalachian-ski-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/appalachian-ski-mtn/ski-resort |
| 2026-09-23T05:37 | cataloochee-ski-area | season_open_text | November 28, 2026 | November 28, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:37 | cataloochee-ski-area | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/cataloochee-ski-area/ski-resort |
| 2026-09-23T05:37 | sapphire-valley-resort | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:37 | sapphire-valley-resort | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:37 | beech-mountain-resort | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:37 | beech-mountain-resort | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/ski-beech-mountain-resort/ski-resort |
| 2026-09-23T05:37 | sugar-mountain-resort | season_open_text | November 11, 2026 | November 11, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:37 | sugar-mountain-resort | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/sugar-mountain-resort/ski-resort |
| 2026-09-23T05:37 | hatley-pointe | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:37 | hatley-pointe | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/north-carolina/wolf-ridge-ski-resort/ski-resort |
| 2026-09-23T05:37 | powder-ridge-mountain-park | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:37 | powder-ridge-mountain-park | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:37 | ski-sundown | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/connecticut/ski-sundown/ski-resort |
| 2026-09-23T05:37 | ski-sundown | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/connecticut/ski-sundown/ski-resort |
| 2026-09-23T05:37 | blue-hills-ski-area | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:37 | blue-hills-ski-area | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/blue-hills-ski-area/ski-resort |
| 2026-09-23T05:37 | bousquet-mountain | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:37 | bousquet-mountain | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/bousquet-ski-area/ski-resort |
| 2026-09-23T05:37 | ski-butternut | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:37 | ski-butternut | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/ski-butternut/ski-resort |
| 2026-09-23T05:37 | nashoba-valley-ski-area | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:37 | nashoba-valley-ski-area | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/nashoba-valley/ski-resort |
| 2026-09-23T05:37 | otis-ridge | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:37 | otis-ridge | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:37 | ski-bradford | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:37 | ski-bradford | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:37 | ski-ward | season_open_text | November 14, 2026 | November 14, 2026 (projected) | projected: https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:37 | ski-ward | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:37 | campgaw-mountain | season_open_text | December 18, 2026 | December 18, 2026 (projected) | projected: https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:37 | campgaw-mountain | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-jersey/campgaw-mountain/ski-resort |
| 2026-09-23T05:37 | mt-holiday | season_open_text | December 19, 2026 | mid December | curated text kept: https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:37 | mt-holiday | season_close_text | March 14, 2027 | March 14, 2027 (projected) | curated text kept: https://www.onthesnow.com/michigan/mount-holiday-ski-area/ski-resort |
| 2026-09-23T05:37 | snowriver | season_close_text | April 11, 2027 | April 11, 2027 (projected) | announced: https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09) + https://www.onthesnow.com/michigan/snowriver-mountain-resort/ski-resort |
| 2026-09-23T05:37 | dry-hill-area | season_open_text | December 2, 2026 | December 2, 2026 (projected) | projected: https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:37 | dry-hill-area | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-york/dry-hill-ski-area/ski-resort |
| 2026-09-23T05:37 | hunt-hollow-club | season_open_text | December 12, 2026 | December 12, 2026 (projected) | projected: https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:37 | hunt-hollow-club | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:37 | cooper-spur-area | season_open_text | December 26, 2026 | December 26, 2026 (projected) | projected: https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:37 | cooper-spur-area | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/oregon/cooper-spur/ski-resort |
| 2026-09-23T05:37 | hoodoo | season_open_text | November 27, 2026 | November 27, 2026 (projected) | projected: https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:37 | hoodoo | season_close_text | March 28, 2027 | March 28, 2027 (projected) | projected: https://www.onthesnow.com/oregon/hoodoo-ski-area/ski-resort |
| 2026-09-23T05:37 | big-bear-pa | season_open_text | December 11, 2026 | December 11, 2026 (projected) | projected: https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:37 | big-bear-pa | season_close_text | March 14, 2027 | March 14, 2027 (projected) | projected: https://www.onthesnow.com/pennsylvania/big-bear/ski-resort |
| 2026-09-23T05:37 | saskadena-six-area | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:37 | saskadena-six-area | season_close_text | March 29, 2027 | March 29, 2027 (projected) | projected: https://www.onthesnow.com/vermont/suicide-six/ski-resort |
| 2026-09-23T05:37 | bruce-mound-winter-sports-area | season_open_text | December 19, 2026 | December 19, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:37 | bruce-mound-winter-sports-area | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/bruce-mound/ski-resort |
| 2026-09-23T05:37 | christie | season_open_text | December 5, 2026 | December 5, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:37 | christie | season_close_text | March 21, 2027 | March 21, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:37 | mt-la-crosse | season_open_text | December 4, 2026 | December 4, 2026 (projected) | projected: https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
| 2026-09-23T05:37 | mt-la-crosse | season_close_text | March 7, 2027 | March 7, 2027 (projected) | projected: https://www.onthesnow.com/wisconsin/mount-la-crosse/ski-resort |
