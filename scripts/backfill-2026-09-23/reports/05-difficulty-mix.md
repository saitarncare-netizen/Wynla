# Step 5 — difficulty mix

Report generated 2026-09-23T05:13:16.089Z (dry run). Applied runs: 05-difficulty-mix-2026-09-23_05-09-18.json (30 rows), 05-difficulty-mix-2026-09-23_05-13-05.json (32 rows)

| metric | count |
|---|---|
| active rows with any difficulty_pct | 345 |
| partial or not summing to 98-102 at this run | 31 |
| fixed: percentages that had been typed into trails_* counts | 5 |
| fixed: lone missing bucket set to 0 (other three sum to ~100) | 24 |
| fixed: pass resorts from OnTheSnow's published mix | 33 |
| rows updated (all applied runs) | 62 |
| still proposed by this run | 0 |
| left as is (non-pass, or no clean source) | 31 |

## Left as is
- mount-peter (NY, independent) [39, 33, 22, 0] sum=94 — OnTheSnow has [39, 33, 28, -]
- sundance (UT, indy) [21, 32, 42, 9] sum=104 — OnTheSnow has [21, 32, 43, 9]
- blacktail (MT, indy) [15, 65, 17, 0] sum=97 — OnTheSnow has [-, -, -, -]
- lookout-pass (MT, indy) [14, 42, 40, 8] sum=104
- lost-trail (MT, indy) [20, 50, 20, 0] sum=90 — OnTheSnow has [-, -, -, -]
- maverick-mountain (MT, independent) [29, 39, 18, 18] sum=104 — OnTheSnow has [-, -, -, -]
- yellowstone-club (MT, independent) [14, 40, 27, -] sum=81
- pomerelle (ID, indy) [20, 48, 28, 0] sum=96 — OnTheSnow has [-, -, -, -]
- hilltop-ski-area (AK, indy) [80, 10, 0, 0] sum=90 — OnTheSnow has [-, -, -, -]
- skiland (AK, indy) [13, 50, 30, 0] sum=93
- homewood-mountain-resort (CA, independent) [15, 40, 33, 15] sum=103 — OnTheSnow has [13, 46, 36, -]
- diamond-peak (NV, independent) [8, 46, 36, 0] sum=90 — OnTheSnow has [8, 28, 33, 33]
- dodge-ridge (CA, indy) [20, 40, 34, 0] sum=94 — OnTheSnow has [-, -, -, -]
- white-pass (WA, indy) [32, 40, 20, 0] sum=92 — OnTheSnow has [-, -, -, -]
- loup-loup (WA, indy) [27, 46, 27, 15] sum=115
- echo-valley (WA, independent) [33, 40, 27, 14] sum=114
- ski-santa-fe (NM, independent) [17, 31, 46, 0] sum=94 — OnTheSnow has [17, 31, 46, 6]
- granite-gorge (NH, indy) [50, 33, 17, 15] sum=115
- mcintyre-ski-area (NH, indy) [83, 10, 0, 0] sum=93
- mad-river-glen (VT, indy) [20, 36, 33, -] sum=89 — OnTheSnow has [-, -, -, -]
- middlebury-snow-bowl (VT, indy) [34, 26, 33, 10] sum=103
- song-mountain (NY, independent) [36, 46, 13, 0] sum=95 — OnTheSnow has [-, -, -, -]
- oak-mountain (NY, independent) [48, 27, 17, 0] sum=92 — OnTheSnow has [45, 27, 18, 9]
- willard-mountain (NY, independent) [21, 40, 29, 0] sum=90 — OnTheSnow has [-, -, -, -]
- mount-holly (MI, independent) [22, 38, 37, 0] sum=97 — OnTheSnow has [-, -, -, -]
- alpine-valley-mi (MI, independent) [37, -, 33, -] sum=70
- cannonsburg (MI, independent) [25, 50, 15, 0] sum=90 — OnTheSnow has [35, 50, 15, -]
- snow-trails (OH, independent) [20, 53, 20, 0] sum=93 — OnTheSnow has [-, -, -, -]
- winterplace-ski-resort (WV, indy) [39, 43, 24, 0] sum=106 — OnTheSnow has [-, -, -, -]
- appalachian-ski-mountain (NC, independent) [25, 50, 33, 0] sum=108 — OnTheSnow has [33, 33, 33, -]
- powder-ridge-mountain-park (CT, independent) [45, 37, 21, 0] sum=103 — OnTheSnow has [45, 40, 15, -]

## Changes (with source)
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T05:09 | berkshire-east | difficulty_pct_beginner | 29 | 28 | OnTheSnow https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:09 | berkshire-east | difficulty_pct_intermediate | 35 | 42 | OnTheSnow https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:09 | berkshire-east | difficulty_pct_advanced | 29 | 28 | OnTheSnow https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:09 | berkshire-east | difficulty_pct_expert | 4 | 2 | OnTheSnow https://www.onthesnow.com/massachusetts/berkshire-east/ski-resort |
| 2026-09-23T05:09 | stratton-mountain | difficulty_pct_beginner | 40 | 41 | OnTheSnow https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:09 | stratton-mountain | difficulty_pct_intermediate | 35 | 31 | OnTheSnow https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:09 | stratton-mountain | difficulty_pct_advanced | 17 | 17 | OnTheSnow https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:09 | stratton-mountain | difficulty_pct_expert | 11 | 11 | OnTheSnow https://www.onthesnow.com/vermont/stratton-mountain/ski-resort |
| 2026-09-23T05:09 | okemo-mountain-resort | difficulty_pct_beginner | 32 | 33 | OnTheSnow https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:09 | okemo-mountain-resort | difficulty_pct_intermediate | 38 | 38 | OnTheSnow https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:09 | okemo-mountain-resort | difficulty_pct_advanced | NULL | 21 | OnTheSnow https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:09 | okemo-mountain-resort | difficulty_pct_expert | NULL | 9 | OnTheSnow https://www.onthesnow.com/vermont/okemo-mountain-resort/ski-resort |
| 2026-09-23T05:09 | aspen-mountain | difficulty_pct_beginner | 0 | 0 | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | difficulty_pct_intermediate | 48 | 48 | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | difficulty_pct_advanced | 26 | 26 | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | difficulty_pct_expert | 26 | 26 | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | trails_beginner | 0 | NULL | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | trails_intermediate | 48 | NULL | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | trails_advanced | 26 | NULL | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-mountain | trails_expert | 26 | NULL | trails_* held percentages (sum 100, total_trails 76) |
| 2026-09-23T05:09 | aspen-highlands | difficulty_pct_beginner | 0 | 0 | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | difficulty_pct_intermediate | 21 | 23 | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | difficulty_pct_advanced | 12 | 12 | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | difficulty_pct_expert | 55 | 65 | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | trails_beginner | 0 | NULL | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | trails_intermediate | 23 | NULL | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | trails_advanced | 12 | NULL | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | aspen-highlands | trails_expert | 65 | NULL | trails_* held percentages (sum 100, total_trails 118) |
| 2026-09-23T05:09 | snowmass | difficulty_pct_beginner | 6 | 6 | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | difficulty_pct_intermediate | 50 | 47 | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | difficulty_pct_advanced | 18 | 17 | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | difficulty_pct_expert | 32 | 30 | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | trails_beginner | 6 | NULL | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | trails_intermediate | 47 | NULL | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | trails_advanced | 17 | NULL | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | snowmass | trails_expert | 30 | NULL | trails_* held percentages (sum 100, total_trails 94) |
| 2026-09-23T05:09 | monarch-mountain | difficulty_pct_beginner | 19 | 19 | OnTheSnow https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:09 | monarch-mountain | difficulty_pct_intermediate | 28 | 35 | OnTheSnow https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:09 | monarch-mountain | difficulty_pct_advanced | 37 | 36 | OnTheSnow https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:09 | monarch-mountain | difficulty_pct_expert | 9 | 9 | OnTheSnow https://www.onthesnow.com/colorado/monarch-mountain/ski-resort |
| 2026-09-23T05:09 | steamboat | difficulty_pct_beginner | 14 | 12 | OnTheSnow https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:09 | steamboat | difficulty_pct_intermediate | 42 | 38 | OnTheSnow https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:09 | steamboat | difficulty_pct_advanced | 43 | 41 | OnTheSnow https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:09 | steamboat | difficulty_pct_expert | 9 | 9 | OnTheSnow https://www.onthesnow.com/colorado/steamboat/ski-resort |
| 2026-09-23T05:09 | jackson-hole | difficulty_pct_beginner | 10 | 4 | OnTheSnow https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:09 | jackson-hole | difficulty_pct_intermediate | 40 | 40 | OnTheSnow https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:09 | jackson-hole | difficulty_pct_advanced | 38 | 38 | OnTheSnow https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:09 | jackson-hole | difficulty_pct_expert | 18 | 18 | OnTheSnow https://www.onthesnow.com/wyoming/jackson-hole/ski-resort |
| 2026-09-23T05:09 | palisades-tahoe | difficulty_pct_beginner | 25 | 6 | OnTheSnow https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:09 | palisades-tahoe | difficulty_pct_intermediate | 41 | 39 | OnTheSnow https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:09 | palisades-tahoe | difficulty_pct_advanced | 32 | 33 | OnTheSnow https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:09 | palisades-tahoe | difficulty_pct_expert | NULL | 23 | OnTheSnow https://www.onthesnow.com/california/palisades-tahoe/ski-resort |
| 2026-09-23T05:09 | heavenly-mountain-resort | difficulty_pct_beginner | 20 | 14 | OnTheSnow https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:09 | heavenly-mountain-resort | difficulty_pct_intermediate | 45 | 53 | OnTheSnow https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:09 | heavenly-mountain-resort | difficulty_pct_advanced | 35 | 27 | OnTheSnow https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:09 | heavenly-mountain-resort | difficulty_pct_expert | 5 | 5 | OnTheSnow https://www.onthesnow.com/california/heavenly-mountain-resort/ski-resort |
| 2026-09-23T05:09 | donner-ski-ranch | difficulty_pct_beginner | 31 | 31 | OnTheSnow https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:09 | donner-ski-ranch | difficulty_pct_intermediate | 38 | 38 | OnTheSnow https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:09 | donner-ski-ranch | difficulty_pct_advanced | 23 | 21 | OnTheSnow https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:09 | donner-ski-ranch | difficulty_pct_expert | 0 | 10 | OnTheSnow https://www.onthesnow.com/california/donner-ski-ranch/ski-resort |
| 2026-09-23T05:09 | bear-mountain | difficulty_pct_beginner | 27 | 27 | OnTheSnow https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:09 | bear-mountain | difficulty_pct_intermediate | 42 | 42 | OnTheSnow https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:09 | bear-mountain | difficulty_pct_advanced | 30 | 23 | OnTheSnow https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:09 | bear-mountain | difficulty_pct_expert | 8 | 8 | OnTheSnow https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:09 | mt-bachelor | difficulty_pct_beginner | 15 | 15 | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | difficulty_pct_intermediate | 35 | 35 | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | difficulty_pct_advanced | 30 | 30 | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | difficulty_pct_expert | 20 | 20 | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | trails_beginner | 15 | NULL | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | trails_intermediate | 35 | NULL | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | trails_advanced | 30 | NULL | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | mt-bachelor | trails_expert | 20 | NULL | trails_* held percentages (sum 100, total_trails 122) |
| 2026-09-23T05:09 | arizona-snowbowl | difficulty_pct_beginner | 32 | 27 | OnTheSnow https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:09 | arizona-snowbowl | difficulty_pct_intermediate | 43 | 39 | OnTheSnow https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:09 | arizona-snowbowl | difficulty_pct_advanced | 21 | 21 | OnTheSnow https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:09 | arizona-snowbowl | difficulty_pct_expert | 11 | 11 | OnTheSnow https://www.onthesnow.com/arizona/arizona-snowbowl/ski-resort |
| 2026-09-23T05:09 | sunday-river | difficulty_pct_beginner | 31 | 31 | OnTheSnow https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:09 | sunday-river | difficulty_pct_intermediate | 34 | 32 | OnTheSnow https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:09 | sunday-river | difficulty_pct_advanced | 17 | 16 | OnTheSnow https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:09 | sunday-river | difficulty_pct_expert | 21 | 21 | OnTheSnow https://www.onthesnow.com/maine/sunday-river/ski-resort |
| 2026-09-23T05:09 | saddleback | difficulty_pct_beginner | 36 | 32 | OnTheSnow https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:09 | saddleback | difficulty_pct_intermediate | 29 | 32 | OnTheSnow https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:09 | saddleback | difficulty_pct_advanced | 26 | 25 | OnTheSnow https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:09 | saddleback | difficulty_pct_expert | 0 | 10 | OnTheSnow https://www.onthesnow.com/maine/saddleback-inc/ski-resort |
| 2026-09-23T05:09 | mt-abram | difficulty_pct_beginner | 20 | 19 | OnTheSnow https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:09 | mt-abram | difficulty_pct_intermediate | 48 | 41 | OnTheSnow https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:09 | mt-abram | difficulty_pct_advanced | 28 | 26 | OnTheSnow https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:09 | mt-abram | difficulty_pct_expert | 0 | 15 | OnTheSnow https://www.onthesnow.com/maine/mt-abram-ski-resort/ski-resort |
| 2026-09-23T05:09 | bretton-woods | difficulty_pct_beginner | 25 | 25 | OnTheSnow https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:09 | bretton-woods | difficulty_pct_intermediate | 29 | 40 | OnTheSnow https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:09 | bretton-woods | difficulty_pct_advanced | 27 | 25 | OnTheSnow https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:09 | bretton-woods | difficulty_pct_expert | NULL | 10 | OnTheSnow https://www.onthesnow.com/new-hampshire/bretton-woods/ski-resort |
| 2026-09-23T05:09 | killington | difficulty_pct_beginner | 17 | 17 | OnTheSnow https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:09 | killington | difficulty_pct_intermediate | 39 | 39 | OnTheSnow https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:09 | killington | difficulty_pct_advanced | 39 | 30 | OnTheSnow https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:09 | killington | difficulty_pct_expert | 14 | 14 | OnTheSnow https://www.onthesnow.com/vermont/killington-resort/ski-resort |
| 2026-09-23T05:09 | pico-mountain | difficulty_pct_beginner | 18 | 16 | OnTheSnow https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:09 | pico-mountain | difficulty_pct_intermediate | 46 | 44 | OnTheSnow https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:09 | pico-mountain | difficulty_pct_advanced | 36 | 37 | OnTheSnow https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:09 | pico-mountain | difficulty_pct_expert | NULL | 4 | OnTheSnow https://www.onthesnow.com/vermont/pico-mountain-at-killington/ski-resort |
| 2026-09-23T05:09 | sugarbush | difficulty_pct_beginner | 20 | 23 | OnTheSnow https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:09 | sugarbush | difficulty_pct_intermediate | 45 | 42 | OnTheSnow https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:09 | sugarbush | difficulty_pct_advanced | 26 | 27 | OnTheSnow https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:09 | sugarbush | difficulty_pct_expert | 0 | 7 | OnTheSnow https://www.onthesnow.com/vermont/sugarbush/ski-resort |
| 2026-09-23T05:09 | smugglers-notch | difficulty_pct_beginner | 19 | 17 | OnTheSnow https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:09 | smugglers-notch | difficulty_pct_intermediate | 51 | 51 | OnTheSnow https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:09 | smugglers-notch | difficulty_pct_advanced | 26 | 27 | OnTheSnow https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:09 | smugglers-notch | difficulty_pct_expert | 0 | 5 | OnTheSnow https://www.onthesnow.com/vermont/smugglers-notch-resort/ski-resort |
| 2026-09-23T05:09 | bolton-valley | difficulty_pct_beginner | 34 | 34 | OnTheSnow https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:09 | bolton-valley | difficulty_pct_intermediate | 38 | 38 | OnTheSnow https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:09 | bolton-valley | difficulty_pct_advanced | 17 | 23 | OnTheSnow https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:09 | bolton-valley | difficulty_pct_expert | 6 | 6 | OnTheSnow https://www.onthesnow.com/vermont/bolton-valley/ski-resort |
| 2026-09-23T05:09 | liberty-mountain | difficulty_pct_beginner | 33 | 33 | OnTheSnow https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:09 | liberty-mountain | difficulty_pct_intermediate | 40 | 38 | OnTheSnow https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:09 | liberty-mountain | difficulty_pct_advanced | 14 | 14 | OnTheSnow https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:09 | liberty-mountain | difficulty_pct_expert | 16 | 14 | OnTheSnow https://www.onthesnow.com/pennsylvania/liberty/ski-resort |
| 2026-09-23T05:09 | mont-ripley | difficulty_pct_beginner | 19 | 21 | OnTheSnow https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:09 | mont-ripley | difficulty_pct_intermediate | 29 | 29 | OnTheSnow https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:09 | mont-ripley | difficulty_pct_advanced | 42 | 42 | OnTheSnow https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:09 | mont-ripley | difficulty_pct_expert | 7 | 8 | OnTheSnow https://www.onthesnow.com/michigan/mont-ripley/ski-resort |
| 2026-09-23T05:09 | lutsen-mountains | difficulty_pct_beginner | 19 | 18 | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | difficulty_pct_intermediate | 48 | 47 | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | difficulty_pct_advanced | 26 | 25 | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | difficulty_pct_expert | 10 | 10 | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | trails_beginner | 18 | NULL | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | trails_intermediate | 47 | NULL | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | trails_advanced | 25 | NULL | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | lutsen-mountains | trails_expert | 10 | NULL | trails_* held percentages (sum 100, total_trails 95) |
| 2026-09-23T05:09 | snowshoe-mountain | difficulty_pct_beginner | 30 | 40 | OnTheSnow https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:09 | snowshoe-mountain | difficulty_pct_intermediate | 33 | 33 | OnTheSnow https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:09 | snowshoe-mountain | difficulty_pct_advanced | 25 | 25 | OnTheSnow https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:09 | snowshoe-mountain | difficulty_pct_expert | 2 | 2 | OnTheSnow https://www.onthesnow.com/west-virginia/snowshoe-mountain-resort/ski-resort |
| 2026-09-23T05:09 | hunt-hollow-club | difficulty_pct_beginner | 32 | 32 | OnTheSnow https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:09 | hunt-hollow-club | difficulty_pct_intermediate | 21 | 21 | OnTheSnow https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:09 | hunt-hollow-club | difficulty_pct_advanced | 40 | 37 | OnTheSnow https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:09 | hunt-hollow-club | difficulty_pct_expert | NULL | 11 | OnTheSnow https://www.onthesnow.com/new-york/hunt-hollow-ski-club/ski-resort |
| 2026-09-23T05:09 | christie | difficulty_pct_beginner | 40 | 41 | OnTheSnow https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:09 | christie | difficulty_pct_intermediate | 25 | 21 | OnTheSnow https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:09 | christie | difficulty_pct_advanced | 23 | 31 | OnTheSnow https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:09 | christie | difficulty_pct_expert | 9 | 7 | OnTheSnow https://www.onthesnow.com/wisconsin/christie-mountain/ski-resort |
| 2026-09-23T05:13 | big-boulder | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | cannon-mountain | difficulty_pct_beginner | NULL | 14 | OnTheSnow https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:13 | cannon-mountain | difficulty_pct_intermediate | 50 | 52 | OnTheSnow https://www.onthesnow.com/new-hampshire/cannon-mountain/ski-resort |
| 2026-09-23T05:13 | alta | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | beaver-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | soldier-hollow | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | solitude | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | antelope-butte | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | beartooth-basin | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | bear-paw | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | alpine-meadows | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | lee-canyon | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | stevens-pass | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | camden-snow-bowl | difficulty_pct_intermediate | 60 | 70 | OnTheSnow https://www.onthesnow.com/maine/camden-snow-bowl/ski-resort |
| 2026-09-23T05:13 | big-rock | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | big-squaw-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | attitash | difficulty_pct_intermediate | 47 | 49 | OnTheSnow https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:13 | attitash | difficulty_pct_advanced | 28 | 29 | OnTheSnow https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:13 | attitash | difficulty_pct_expert | NULL | 0 | OnTheSnow https://www.onthesnow.com/new-hampshire/attitash/ski-resort |
| 2026-09-23T05:13 | gunstock-mountain-resort | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | campton-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | holimont | difficulty_pct_beginner | 20 | 29 | OnTheSnow https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:13 | holimont | difficulty_pct_intermediate | 30 | 29 | OnTheSnow https://www.onthesnow.com/new-york/holimont-ski-area/ski-resort |
| 2026-09-23T05:13 | maple-ski-ridge | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | bear-creek-mountain-resort | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | big-powderhorn-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | shanty-creek | difficulty_pct_intermediate | 28 | 26 | OnTheSnow https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:13 | shanty-creek | difficulty_pct_advanced | 35 | 45 | OnTheSnow https://www.onthesnow.com/michigan/shanty-creek/ski-resort |
| 2026-09-23T05:13 | caberfae-peaks | difficulty_pct_beginner | 35 | 26 | OnTheSnow https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:13 | caberfae-peaks | difficulty_pct_intermediate | 35 | 37 | OnTheSnow https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:13 | caberfae-peaks | difficulty_pct_advanced | 35 | 37 | OnTheSnow https://www.onthesnow.com/michigan/caberfae-peaks-ski-golf-resort/ski-resort |
| 2026-09-23T05:13 | pine-knob | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | apple-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | alpine-valley-wi | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | welch-village | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | hyland-hills | difficulty_pct_beginner | 25 | 27 | OnTheSnow https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:13 | hyland-hills | difficulty_pct_intermediate | 34 | 36 | OnTheSnow https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:13 | hyland-hills | difficulty_pct_advanced | 35 | 36 | OnTheSnow https://www.onthesnow.com/minnesota/hyland-ski-snowboard-area/ski-resort |
| 2026-09-23T05:13 | mad-river-mountain | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
| 2026-09-23T05:13 | hidden-valley-mo | difficulty_pct_beginner | 27 | 31 | OnTheSnow https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:13 | hidden-valley-mo | difficulty_pct_advanced | 14 | 23 | OnTheSnow https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:13 | hidden-valley-mo | difficulty_pct_expert | 3 | 0 | OnTheSnow https://www.onthesnow.com/missouri/hidden-valley-ski-area/ski-resort |
| 2026-09-23T05:13 | huff-hills | difficulty_pct_expert | NULL | 0 | other three buckets sum to ~100; missing bucket is 0 |
