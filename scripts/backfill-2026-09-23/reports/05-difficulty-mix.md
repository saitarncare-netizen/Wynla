# Step 5 — difficulty mix

Report generated 2026-09-23T05:37:39.859Z (dry run). Applied runs: 05-difficulty-mix-2026-09-23_05-09-18.json (30 rows), 05-difficulty-mix-2026-09-23_05-13-05.json (32 rows), 05-difficulty-mix-2026-09-23_05-37-22.json (62 rows)

Policy: a resort's own published split is normalised (scaled to 100, or a lone missing bucket filled), never replaced. That is arithmetic, not research, so it applies to independents too. OnTheSnow's mix is used only for pass resorts whose own split had fewer than three buckets or a sum outside 70-150. The first two applied runs had replaced 33 pass resorts with OnTheSnow's mix; the third run puts the normalised original values back (rows marked "replaces the OnTheSnow mix" below).

| metric | count |
|---|---|
| active rows with any difficulty_pct | 343 |
| partial or not summing to 98-102 at this run (before this run's writes) | 1 |
| rows corrected by this step (all runs, counted once) | 92 |
| fixed: percentages that had been typed into trails_* counts | 5 |
| fixed: own four buckets scaled to 100 | 54 |
| fixed: lone missing bucket set to 0 (other three sum to ~100) | 25 |
| fixed: lone missing bucket set to the remainder to 100 | 6 |
| of which independents (own numbers normalised, no outside source) | 32 |
| filled from OnTheSnow (pass resorts without a usable own split) | 1 |
| rows whose OnTheSnow mix from the first run is replaced by their own normalised split | 32 |
| rows updated (all applied runs) | 124 |
| still proposed by this run | 0 |
| left as is (fewer than three own buckets and no clean source) | 1 |

## Left as is
- alpine-valley-mi (MI, independent) [37, -, 33, -] sum=70

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
| 2026-09-23T05:37 | mount-peter | difficulty_pct_beginner | 39 | 42 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | mount-peter | difficulty_pct_intermediate | 33 | 35 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | mount-peter | difficulty_pct_advanced | 22 | 23 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | berkshire-east | difficulty_pct_beginner | 28 | 30 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | berkshire-east | difficulty_pct_intermediate | 42 | 36 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | berkshire-east | difficulty_pct_advanced | 28 | 29 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | berkshire-east | difficulty_pct_expert | 2 | 4 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | stratton-mountain | difficulty_pct_beginner | 41 | 39 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | stratton-mountain | difficulty_pct_intermediate | 31 | 34 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | stratton-mountain | difficulty_pct_advanced | 17 | 16 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | stratton-mountain | difficulty_pct_expert | 11 | 10 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | cannon-mountain | difficulty_pct_beginner | 14 | 16 | missing bucket is the remainder to 100 (16) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | cannon-mountain | difficulty_pct_intermediate | 52 | 50 | missing bucket is the remainder to 100 (16) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | monarch-mountain | difficulty_pct_beginner | 19 | 20 | own four buckets scaled from 93 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | monarch-mountain | difficulty_pct_intermediate | 35 | 30 | own four buckets scaled from 93 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | monarch-mountain | difficulty_pct_advanced | 36 | 40 | own four buckets scaled from 93 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | steamboat | difficulty_pct_beginner | 12 | 13 | own four buckets scaled from 108 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | steamboat | difficulty_pct_intermediate | 38 | 39 | own four buckets scaled from 108 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | steamboat | difficulty_pct_advanced | 41 | 39 | own four buckets scaled from 108 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | steamboat | difficulty_pct_expert | 9 | 8 | own four buckets scaled from 108 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sundance | difficulty_pct_beginner | 21 | 20 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | sundance | difficulty_pct_intermediate | 32 | 31 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | sundance | difficulty_pct_advanced | 42 | 40 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | sundance | difficulty_pct_expert | 9 | 8 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | jackson-hole | difficulty_pct_beginner | 4 | 9 | own four buckets scaled from 106 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | jackson-hole | difficulty_pct_intermediate | 40 | 37 | own four buckets scaled from 106 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | jackson-hole | difficulty_pct_advanced | 38 | 36 | own four buckets scaled from 106 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | jackson-hole | difficulty_pct_expert | 18 | 17 | own four buckets scaled from 106 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | blacktail | difficulty_pct_intermediate | 65 | 67 | own four buckets scaled from 97 to 100 |
| 2026-09-23T05:37 | blacktail | difficulty_pct_advanced | 17 | 18 | own four buckets scaled from 97 to 100 |
| 2026-09-23T05:37 | lookout-pass | difficulty_pct_beginner | 14 | 13 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | lookout-pass | difficulty_pct_intermediate | 42 | 40 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | lookout-pass | difficulty_pct_advanced | 40 | 38 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | lost-trail | difficulty_pct_beginner | 20 | 22 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | lost-trail | difficulty_pct_intermediate | 50 | 56 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | lost-trail | difficulty_pct_advanced | 20 | 22 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | maverick-mountain | difficulty_pct_beginner | 29 | 28 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | maverick-mountain | difficulty_pct_intermediate | 39 | 37 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | maverick-mountain | difficulty_pct_advanced | 18 | 17 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | maverick-mountain | difficulty_pct_expert | 18 | 17 | own four buckets scaled from 104 to 100 |
| 2026-09-23T05:37 | yellowstone-club | difficulty_pct_expert | NULL | 19 | missing bucket is the remainder to 100 (19) |
| 2026-09-23T05:37 | pomerelle | difficulty_pct_beginner | 20 | 21 | own four buckets scaled from 96 to 100 |
| 2026-09-23T05:37 | pomerelle | difficulty_pct_intermediate | 48 | 50 | own four buckets scaled from 96 to 100 |
| 2026-09-23T05:37 | pomerelle | difficulty_pct_advanced | 28 | 29 | own four buckets scaled from 96 to 100 |
| 2026-09-23T05:37 | hilltop-ski-area | difficulty_pct_beginner | 80 | 89 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | hilltop-ski-area | difficulty_pct_intermediate | 10 | 11 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | skiland | difficulty_pct_beginner | 13 | 14 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | skiland | difficulty_pct_intermediate | 50 | 53 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | skiland | difficulty_pct_advanced | 30 | 32 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | palisades-tahoe | difficulty_pct_beginner | 6 | 25 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | palisades-tahoe | difficulty_pct_intermediate | 39 | 41 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | palisades-tahoe | difficulty_pct_advanced | 33 | 32 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | palisades-tahoe | difficulty_pct_expert | 23 | 0 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | heavenly-mountain-resort | difficulty_pct_beginner | 14 | 19 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | heavenly-mountain-resort | difficulty_pct_intermediate | 53 | 43 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | heavenly-mountain-resort | difficulty_pct_advanced | 27 | 33 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | heavenly-mountain-resort | difficulty_pct_expert | 5 | 4 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | homewood-mountain-resort | difficulty_pct_beginner | 15 | 14 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | homewood-mountain-resort | difficulty_pct_intermediate | 40 | 39 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | homewood-mountain-resort | difficulty_pct_advanced | 33 | 32 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | homewood-mountain-resort | difficulty_pct_expert | 15 | 14 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | donner-ski-ranch | difficulty_pct_beginner | 31 | 34 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | donner-ski-ranch | difficulty_pct_intermediate | 38 | 41 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | donner-ski-ranch | difficulty_pct_advanced | 21 | 25 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | donner-ski-ranch | difficulty_pct_expert | 10 | 0 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | diamond-peak | difficulty_pct_beginner | 8 | 9 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | diamond-peak | difficulty_pct_intermediate | 46 | 51 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | diamond-peak | difficulty_pct_advanced | 36 | 40 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | dodge-ridge | difficulty_pct_beginner | 20 | 21 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | dodge-ridge | difficulty_pct_intermediate | 40 | 43 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | dodge-ridge | difficulty_pct_advanced | 34 | 36 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | bear-mountain | difficulty_pct_beginner | 27 | 25 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bear-mountain | difficulty_pct_intermediate | 42 | 39 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bear-mountain | difficulty_pct_advanced | 23 | 28 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | white-pass | difficulty_pct_beginner | 32 | 35 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | white-pass | difficulty_pct_intermediate | 40 | 43 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | white-pass | difficulty_pct_advanced | 20 | 21 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | loup-loup | difficulty_pct_beginner | 27 | 24 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | loup-loup | difficulty_pct_intermediate | 46 | 40 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | loup-loup | difficulty_pct_advanced | 27 | 23 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | loup-loup | difficulty_pct_expert | 15 | 13 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | echo-valley | difficulty_pct_beginner | 33 | 29 | own four buckets scaled from 114 to 100 |
| 2026-09-23T05:37 | echo-valley | difficulty_pct_intermediate | 40 | 35 | own four buckets scaled from 114 to 100 |
| 2026-09-23T05:37 | echo-valley | difficulty_pct_advanced | 27 | 23 | own four buckets scaled from 114 to 100 |
| 2026-09-23T05:37 | echo-valley | difficulty_pct_expert | 14 | 12 | own four buckets scaled from 114 to 100 |
| 2026-09-23T05:37 | ski-santa-fe | difficulty_pct_beginner | 17 | 18 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | ski-santa-fe | difficulty_pct_intermediate | 31 | 33 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | ski-santa-fe | difficulty_pct_advanced | 46 | 48 | own four buckets scaled from 94 to 100 |
| 2026-09-23T05:37 | arizona-snowbowl | difficulty_pct_beginner | 27 | 30 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | arizona-snowbowl | difficulty_pct_intermediate | 39 | 40 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | arizona-snowbowl | difficulty_pct_advanced | 21 | 19 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | arizona-snowbowl | difficulty_pct_expert | 11 | 10 | own four buckets scaled from 107 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sunday-river | difficulty_pct_beginner | 31 | 30 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sunday-river | difficulty_pct_intermediate | 32 | 33 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sunday-river | difficulty_pct_advanced | 16 | 17 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sunday-river | difficulty_pct_expert | 21 | 20 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | saddleback | difficulty_pct_beginner | 32 | 39 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | saddleback | difficulty_pct_advanced | 25 | 28 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | saddleback | difficulty_pct_expert | 10 | 0 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mt-abram | difficulty_pct_beginner | 19 | 21 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mt-abram | difficulty_pct_intermediate | 41 | 50 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mt-abram | difficulty_pct_advanced | 26 | 29 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mt-abram | difficulty_pct_expert | 15 | 0 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | camden-snow-bowl | difficulty_pct_beginner | 20 | 22 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | camden-snow-bowl | difficulty_pct_intermediate | 70 | 67 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | camden-snow-bowl | difficulty_pct_advanced | 10 | 11 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | attitash | difficulty_pct_intermediate | 49 | 47 | missing bucket is the remainder to 100 (3) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | attitash | difficulty_pct_advanced | 29 | 28 | missing bucket is the remainder to 100 (3) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | attitash | difficulty_pct_expert | 0 | 3 | missing bucket is the remainder to 100 (3) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bretton-woods | difficulty_pct_intermediate | 40 | 29 | missing bucket is the remainder to 100 (19) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bretton-woods | difficulty_pct_advanced | 25 | 27 | missing bucket is the remainder to 100 (19) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bretton-woods | difficulty_pct_expert | 10 | 19 | missing bucket is the remainder to 100 (19) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | granite-gorge | difficulty_pct_beginner | 50 | 43 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | granite-gorge | difficulty_pct_intermediate | 33 | 28 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | granite-gorge | difficulty_pct_advanced | 17 | 15 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | granite-gorge | difficulty_pct_expert | 15 | 13 | own four buckets scaled from 115 to 100 |
| 2026-09-23T05:37 | mcintyre-ski-area | difficulty_pct_beginner | 83 | 89 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | mcintyre-ski-area | difficulty_pct_intermediate | 10 | 11 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | killington | difficulty_pct_beginner | 17 | 15 | own four buckets scaled from 109 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | killington | difficulty_pct_intermediate | 39 | 36 | own four buckets scaled from 109 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | killington | difficulty_pct_advanced | 30 | 35 | own four buckets scaled from 109 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | killington | difficulty_pct_expert | 14 | 13 | own four buckets scaled from 109 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | pico-mountain | difficulty_pct_beginner | 16 | 18 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | pico-mountain | difficulty_pct_intermediate | 44 | 46 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | pico-mountain | difficulty_pct_advanced | 37 | 36 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | pico-mountain | difficulty_pct_expert | 4 | 0 | other three buckets sum to ~100; missing bucket is 0 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sugarbush | difficulty_pct_beginner | 23 | 22 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sugarbush | difficulty_pct_intermediate | 42 | 49 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sugarbush | difficulty_pct_advanced | 27 | 28 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | sugarbush | difficulty_pct_expert | 7 | 0 | own four buckets scaled from 91 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | smugglers-notch | difficulty_pct_beginner | 17 | 20 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | smugglers-notch | difficulty_pct_intermediate | 51 | 53 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | smugglers-notch | difficulty_pct_expert | 5 | 0 | own four buckets scaled from 96 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bolton-valley | difficulty_pct_beginner | 34 | 35 | own four buckets scaled from 95 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bolton-valley | difficulty_pct_intermediate | 38 | 40 | own four buckets scaled from 95 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | bolton-valley | difficulty_pct_advanced | 23 | 18 | own four buckets scaled from 95 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mad-river-glen | difficulty_pct_expert | NULL | 11 | missing bucket is the remainder to 100 (11) |
| 2026-09-23T05:37 | middlebury-snow-bowl | difficulty_pct_beginner | 34 | 33 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | middlebury-snow-bowl | difficulty_pct_intermediate | 26 | 25 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | middlebury-snow-bowl | difficulty_pct_advanced | 33 | 32 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | holimont | difficulty_pct_beginner | 29 | 22 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | holimont | difficulty_pct_intermediate | 29 | 32 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | holimont | difficulty_pct_advanced | 42 | 45 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | song-mountain | difficulty_pct_beginner | 36 | 38 | own four buckets scaled from 95 to 100 |
| 2026-09-23T05:37 | song-mountain | difficulty_pct_intermediate | 46 | 48 | own four buckets scaled from 95 to 100 |
| 2026-09-23T05:37 | oak-mountain | difficulty_pct_beginner | 48 | 52 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | oak-mountain | difficulty_pct_intermediate | 27 | 29 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | oak-mountain | difficulty_pct_advanced | 17 | 19 | own four buckets scaled from 92 to 100 |
| 2026-09-23T05:37 | willard-mountain | difficulty_pct_beginner | 21 | 23 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | willard-mountain | difficulty_pct_intermediate | 40 | 45 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | willard-mountain | difficulty_pct_advanced | 29 | 32 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | liberty-mountain | difficulty_pct_beginner | 33 | 32 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | liberty-mountain | difficulty_pct_intermediate | 38 | 39 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | liberty-mountain | difficulty_pct_advanced | 14 | 13 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | liberty-mountain | difficulty_pct_expert | 14 | 15 | own four buckets scaled from 103 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mont-ripley | difficulty_pct_beginner | 21 | 19 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mont-ripley | difficulty_pct_intermediate | 29 | 30 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mont-ripley | difficulty_pct_advanced | 42 | 43 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mont-ripley | difficulty_pct_expert | 8 | 7 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | shanty-creek | difficulty_pct_beginner | 29 | 32 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | shanty-creek | difficulty_pct_intermediate | 26 | 30 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | shanty-creek | difficulty_pct_advanced | 45 | 38 | own four buckets scaled from 92 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | caberfae-peaks | difficulty_pct_beginner | 26 | 34 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | caberfae-peaks | difficulty_pct_intermediate | 37 | 33 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | caberfae-peaks | difficulty_pct_advanced | 37 | 33 | own four buckets scaled from 105 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | mount-holly | difficulty_pct_beginner | 22 | 23 | own four buckets scaled from 97 to 100 |
| 2026-09-23T05:37 | mount-holly | difficulty_pct_intermediate | 38 | 39 | own four buckets scaled from 97 to 100 |
| 2026-09-23T05:37 | mount-holly | difficulty_pct_advanced | 37 | 38 | own four buckets scaled from 97 to 100 |
| 2026-09-23T05:37 | cannonsburg | difficulty_pct_beginner | 25 | 28 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | cannonsburg | difficulty_pct_intermediate | 50 | 55 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | cannonsburg | difficulty_pct_advanced | 15 | 16 | own four buckets scaled from 90 to 100 |
| 2026-09-23T05:37 | hyland-hills | difficulty_pct_advanced | 36 | 37 | own four buckets scaled from 94 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | snow-trails | difficulty_pct_beginner | 20 | 21 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | snow-trails | difficulty_pct_intermediate | 53 | 57 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | snow-trails | difficulty_pct_advanced | 20 | 21 | own four buckets scaled from 93 to 100 |
| 2026-09-23T05:37 | hidden-valley-mo | difficulty_pct_beginner | 31 | 30 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | hidden-valley-mo | difficulty_pct_intermediate | 46 | 51 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | hidden-valley-mo | difficulty_pct_advanced | 23 | 16 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | hidden-valley-mo | difficulty_pct_expert | 0 | 3 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | snowshoe-mountain | difficulty_pct_beginner | 40 | 33 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | snowshoe-mountain | difficulty_pct_intermediate | 33 | 36 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | snowshoe-mountain | difficulty_pct_advanced | 25 | 28 | own four buckets scaled from 90 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | winterplace-ski-resort | difficulty_pct_beginner | 39 | 37 | own four buckets scaled from 106 to 100 |
| 2026-09-23T05:37 | winterplace-ski-resort | difficulty_pct_intermediate | 43 | 40 | own four buckets scaled from 106 to 100 |
| 2026-09-23T05:37 | winterplace-ski-resort | difficulty_pct_advanced | 24 | 22 | own four buckets scaled from 106 to 100 |
| 2026-09-23T05:37 | appalachian-ski-mountain | difficulty_pct_beginner | 25 | 23 | own four buckets scaled from 108 to 100 |
| 2026-09-23T05:37 | appalachian-ski-mountain | difficulty_pct_intermediate | 50 | 46 | own four buckets scaled from 108 to 100 |
| 2026-09-23T05:37 | appalachian-ski-mountain | difficulty_pct_advanced | 33 | 31 | own four buckets scaled from 108 to 100 |
| 2026-09-23T05:37 | powder-ridge-mountain-park | difficulty_pct_beginner | 45 | 43 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | powder-ridge-mountain-park | difficulty_pct_intermediate | 37 | 36 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | powder-ridge-mountain-park | difficulty_pct_advanced | 21 | 20 | own four buckets scaled from 103 to 100 |
| 2026-09-23T05:37 | hunt-hollow-club | difficulty_pct_advanced | 37 | 40 | missing bucket is the remainder to 100 (7) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | hunt-hollow-club | difficulty_pct_expert | 11 | 7 | missing bucket is the remainder to 100 (7) — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | christie | difficulty_pct_intermediate | 21 | 26 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | christie | difficulty_pct_advanced | 31 | 23 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
| 2026-09-23T05:37 | christie | difficulty_pct_expert | 7 | 9 | own four buckets scaled from 97 to 100 — replaces the OnTheSnow mix written by the first run |
