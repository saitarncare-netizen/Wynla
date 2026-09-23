# Step 2 — vertical_drop backfill

Report generated 2026-09-23T05:10:30.467Z (dry run). Applied runs: 02-vertical-drop-2026-09-23_05-09-12.json (129 rows)

| metric | count |
|---|---|
| active rows with NULL vertical_drop at this run | 37 |
| filled from summit - base on the row | 90 |
| filled from OnTheSnow published vertical | 39 |
| rows updated (all applied runs) | 129 |
| still proposed by this run | 0 |
| still NULL after this step | 37 |

## Still NULL (no elevations on the row and no OnTheSnow page)
- chapman-hill (CO, independent, lifts=2)
- cranor-ski-hill (CO, independent, lifts=1)
- hoedown-hill (CO, indy, lifts=4)
- lake-city-ski-hill (CO, independent, lifts=1)
- lees-ski-hill (CO, independent, lifts=1)
- soldier-hollow (UT, independent, lifts=1)
- beartooth-basin (WY, independent, lifts=2)
- turner-mountain (MT, independent, lifts=1)
- bear-paw (MT, independent, lifts=2)
- rotarun (ID, independent, lifts=2)
- alpine-meadows (CA, ikon, lifts=13)
- summit-ski-area (OR, independent, lifts=3)
- echo-valley (WA, independent, lifts=4)
- mt-lemmon-ski-valley (AZ, independent, lifts=3)
- eaton-mountain (ME, independent, lifts=2)
- spruce-mountain-ski-area (ME, independent, lifts=3)
- powderhouse-hill (ME, independent, lifts=1)
- granite-gorge (NH, indy, lifts=4)
- campton-mountain (NH, independent, lifts=2)
- ascutney-outdoors (VT, independent, lifts=2)
- cochrans-ski-area (VT, independent, lifts=3)
- lyndon-outing-club (VT, independent, lifts=2)
- quechee-club (VT, independent, lifts=3)
- victor-constant-ski-area (NY, independent, lifts=2)
- eagle-rock-resort (PA, independent, lifts=3)
- mystic-mountain (PA, independent, lifts=3)
- indianhead-mountain (MI, indy, lifts=7)
- blackjack-mountain (MI, indy, lifts=6)
- alpine-valley-mi (MI, independent, lifts=9)
- otsego-resort (MI, independent, lifts=5)
- the-rock-snowpark (WI, independent, lifts=5)
- mount-ashwabay (WI, independent, lifts=?)
- ski-gull (MN, independent, lifts=4)
- mount-itasca (MN, independent, lifts=2)
- sleepy-hollow (IA, independent, lifts=1)
- oglebay-resort (WV, independent, lifts=1)
- quarry-road-trails (ME, indy, lifts=0)

## Changes (with source)
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T05:09 | mount-peter | vertical_drop | NULL | 473 | summit 1250 - base 777 |
| 2026-09-23T05:09 | arapahoe-basin | vertical_drop | NULL | 2399 | summit 13050 - base 10651 |
| 2026-09-23T05:09 | copper-mountain | vertical_drop | NULL | 2729 | summit 12441 - base 9712 |
| 2026-09-23T05:09 | eldora | vertical_drop | NULL | 1320 | summit 10600 - base 9280 |
| 2026-09-23T05:09 | hesperus-ski-area | vertical_drop | NULL | 680 | summit 8880 - base 8200 |
| 2026-09-23T05:09 | purgatory | vertical_drop | NULL | 2029 | summit 10822 - base 8793 |
| 2026-09-23T05:09 | ski-cooper | vertical_drop | NULL | 1200 | summit 11700 - base 10500 |
| 2026-09-23T05:09 | wolf-creek | vertical_drop | NULL | 1604 | summit 11904 - base 10300 |
| 2026-09-23T05:09 | brian-head | vertical_drop | NULL | 1707 | summit 11307 - base 9600 |
| 2026-09-23T05:09 | deer-valley | vertical_drop | NULL | 3040 | summit 9570 - base 6530 |
| 2026-09-23T05:09 | powder-mountain | vertical_drop | NULL | 2522 | OnTheSnow https://www.onthesnow.com/utah/powder-mountain/ski-resort |
| 2026-09-23T05:09 | solitude | vertical_drop | NULL | 2494 | summit 10488 - base 7994 |
| 2026-09-23T05:09 | sundance | vertical_drop | NULL | 2150 | summit 8250 - base 6100 |
| 2026-09-23T05:09 | nordic-valley | vertical_drop | NULL | 960 | OnTheSnow https://www.onthesnow.com/utah/wolf-creek/ski-resort |
| 2026-09-23T05:09 | hogadon | vertical_drop | NULL | 615 | summit 8000 - base 7385 |
| 2026-09-23T05:09 | snowy-range | vertical_drop | NULL | 865 | summit 9663 - base 8798 |
| 2026-09-23T05:09 | sleeping-giant | vertical_drop | NULL | 798 | summit 7430 - base 6632 |
| 2026-09-23T05:09 | discovery | vertical_drop | NULL | 2381 | summit 8150 - base 5769 |
| 2026-09-23T05:09 | great-divide | vertical_drop | NULL | 1542 | summit 7291 - base 5749 |
| 2026-09-23T05:09 | maverick-mountain | vertical_drop | NULL | 2019 | summit 8519 - base 6500 |
| 2026-09-23T05:09 | showdown | vertical_drop | NULL | 1400 | summit 8200 - base 6800 |
| 2026-09-23T05:09 | teton-pass | vertical_drop | NULL | 1010 | summit 7200 - base 6190 |
| 2026-09-23T05:09 | yellowstone-club | vertical_drop | NULL | 2699 | summit 9859 - base 7160 |
| 2026-09-23T05:09 | bogus-basin | vertical_drop | NULL | 1432 | summit 7582 - base 6150 |
| 2026-09-23T05:09 | magic-mountain-id | vertical_drop | NULL | 740 | summit 7240 - base 6500 |
| 2026-09-23T05:09 | snowhaven | vertical_drop | NULL | 400 | summit 5600 - base 5200 |
| 2026-09-23T05:09 | palisades-tahoe | vertical_drop | NULL | 2850 | summit 9050 - base 6200 |
| 2026-09-23T05:09 | sierra-at-tahoe | vertical_drop | NULL | 2212 | summit 8852 - base 6640 |
| 2026-09-23T05:09 | homewood-mountain-resort | vertical_drop | NULL | 1651 | summit 7881 - base 6230 |
| 2026-09-23T05:09 | boreal-mountain-resort | vertical_drop | NULL | 500 | summit 7700 - base 7200 |
| 2026-09-23T05:09 | soda-springs | vertical_drop | NULL | 652 | summit 7352 - base 6700 |
| 2026-09-23T05:09 | donner-ski-ranch | vertical_drop | NULL | 751 | summit 7781 - base 7030 |
| 2026-09-23T05:09 | sugar-bowl-resort | vertical_drop | NULL | 1500 | summit 8383 - base 6883 |
| 2026-09-23T05:09 | tahoe-donner-downhill | vertical_drop | NULL | 600 | summit 7350 - base 6750 |
| 2026-09-23T05:09 | lee-canyon | vertical_drop | NULL | 860 | OnTheSnow https://www.onthesnow.com/nevada/lee-canyon/ski-resort |
| 2026-09-23T05:09 | elko-snobowl | vertical_drop | NULL | 700 | summit 7000 - base 6300 |
| 2026-09-23T05:09 | june-mountain | vertical_drop | NULL | 2545 | summit 10090 - base 7545 |
| 2026-09-23T05:09 | badger-pass | vertical_drop | NULL | 600 | OnTheSnow https://www.onthesnow.com/california/badger-pass/ski-resort |
| 2026-09-23T05:09 | snow-valley | vertical_drop | NULL | 1041 | summit 7841 - base 6800 |
| 2026-09-23T05:09 | snow-summit | vertical_drop | NULL | 1212 | summit 8200 - base 6988 |
| 2026-09-23T05:09 | bear-mountain | vertical_drop | NULL | 1665 | OnTheSnow https://www.onthesnow.com/california/bear-mountain/ski-resort |
| 2026-09-23T05:09 | mt-baldy | vertical_drop | NULL | 2100 | summit 8600 - base 6500 |
| 2026-09-23T05:09 | mt-waterman | vertical_drop | NULL | 1040 | summit 8018 - base 6978 |
| 2026-09-23T05:09 | mt-bachelor | vertical_drop | NULL | 3365 | summit 9065 - base 5700 |
| 2026-09-23T05:09 | mt-hood-skibowl | vertical_drop | NULL | 1390 | summit 5027 - base 3637 |
| 2026-09-23T05:09 | anthony-lakes | vertical_drop | NULL | 900 | summit 8000 - base 7100 |
| 2026-09-23T05:09 | spout-springs | vertical_drop | NULL | 559 | summit 5479 - base 4920 |
| 2026-09-23T05:09 | warner-canyon | vertical_drop | NULL | 781 | summit 6480 - base 5699 |
| 2026-09-23T05:09 | crystal-mountain | vertical_drop | NULL | 2612 | summit 7012 - base 4400 |
| 2026-09-23T05:09 | mt-spokane | vertical_drop | NULL | 2000 | OnTheSnow https://www.onthesnow.com/washington/mt-spokane-ski-and-snowboard-park/ski-resort |
| 2026-09-23T05:09 | badger-mountain-wa | vertical_drop | NULL | 405 | summit 3477 - base 3072 |
| 2026-09-23T05:09 | ski-santa-fe | vertical_drop | NULL | 1725 | summit 12075 - base 10350 |
| 2026-09-23T05:09 | angel-fire-resort | vertical_drop | NULL | 2077 | summit 10677 - base 8600 |
| 2026-09-23T05:09 | red-river-ski-area | vertical_drop | NULL | 1600 | OnTheSnow https://www.onthesnow.com/new-mexico/red-river/ski-resort |
| 2026-09-23T05:09 | sandia-peak | vertical_drop | NULL | 1700 | summit 10378 - base 8678 |
| 2026-09-23T05:09 | ski-apache | vertical_drop | NULL | 1851 | summit 11451 - base 9600 |
| 2026-09-23T05:09 | sunrise-park-resort | vertical_drop | NULL | 1900 | summit 11100 - base 9200 |
| 2026-09-23T05:09 | mt-abram | vertical_drop | NULL | 1050 | summit 1996 - base 946 |
| 2026-09-23T05:09 | shawnee-peak | vertical_drop | NULL | 1350 | OnTheSnow https://www.onthesnow.com/maine/pleasant-mountain/ski-resort |
| 2026-09-23T05:09 | mount-jefferson-ski-area | vertical_drop | NULL | 432 | OnTheSnow https://www.onthesnow.com/maine/mt-jefferson/ski-resort |
| 2026-09-23T05:09 | big-squaw-mountain | vertical_drop | NULL | 660 | OnTheSnow https://www.onthesnow.com/maine/big-squaw-mountain-ski-resort/ski-resort |
| 2026-09-23T05:09 | hermon-mountain | vertical_drop | NULL | 350 | OnTheSnow https://www.onthesnow.com/maine/new-hermon-mountain/ski-resort |
| 2026-09-23T05:09 | titcomb-mountain | vertical_drop | NULL | 313 | summit 720 - base 407 |
| 2026-09-23T05:09 | crotched-mountain | vertical_drop | NULL | 1016 | OnTheSnow https://www.onthesnow.com/new-hampshire/crotched-mountain/ski-resort |
| 2026-09-23T05:09 | gunstock-mountain-resort | vertical_drop | NULL | 1400 | summit 2267 - base 867 |
| 2026-09-23T05:09 | pico-mountain | vertical_drop | NULL | 1966 | summit 3967 - base 2001 |
| 2026-09-23T05:09 | sugarbush | vertical_drop | NULL | 2600 | summit 4083 - base 1483 |
| 2026-09-23T05:09 | smugglers-notch | vertical_drop | NULL | 2610 | summit 3640 - base 1030 |
| 2026-09-23T05:09 | mad-river-glen | vertical_drop | NULL | 2037 | summit 3637 - base 1600 |
| 2026-09-23T05:09 | holiday-mountain | vertical_drop | NULL | 400 | OnTheSnow https://www.onthesnow.com/new-york/holiday-mountain/ski-resort |
| 2026-09-23T05:09 | holimont | vertical_drop | NULL | 702 | summit 2261 - base 1559 |
| 2026-09-23T05:09 | holiday-valley | vertical_drop | NULL | 750 | summit 2250 - base 1500 |
| 2026-09-23T05:09 | kissing-bridge | vertical_drop | NULL | 508 | summit 1703 - base 1195 |
| 2026-09-23T05:09 | song-mountain | vertical_drop | NULL | 654 | summit 1930 - base 1276 |
| 2026-09-23T05:09 | labrador-mountain | vertical_drop | NULL | 695 | summit 1848 - base 1153 |
| 2026-09-23T05:09 | woods-valley | vertical_drop | NULL | 500 | OnTheSnow https://www.onthesnow.com/new-york/woods-valley-ski-area/ski-resort |
| 2026-09-23T05:09 | oak-mountain | vertical_drop | NULL | 651 | summit 2401 - base 1750 |
| 2026-09-23T05:09 | royal-mountain | vertical_drop | NULL | 550 | OnTheSnow https://www.onthesnow.com/new-york/royal-mountain-ski-area/ski-resort |
| 2026-09-23T05:09 | liberty-mountain | vertical_drop | NULL | 597 | summit 1178 - base 581 |
| 2026-09-23T05:09 | roundtop-mountain-resort | vertical_drop | NULL | 600 | summit 1370 - base 770 |
| 2026-09-23T05:09 | seven-springs | vertical_drop | NULL | 750 | OnTheSnow https://www.onthesnow.com/pennsylvania/seven-springs/ski-resort |
| 2026-09-23T05:09 | spring-mountain | vertical_drop | NULL | 389 | summit 510 - base 121 |
| 2026-09-23T05:09 | boyne-mountain | vertical_drop | NULL | 433 | summit 1152 - base 719 |
| 2026-09-23T05:09 | the-highlands | vertical_drop | NULL | 513 | summit 1300 - base 787 |
| 2026-09-23T05:09 | mount-bohemia | vertical_drop | NULL | 900 | OnTheSnow https://www.onthesnow.com/michigan/mount-bohemia/ski-resort |
| 2026-09-23T05:09 | porcupine-mountains | vertical_drop | NULL | 630 | OnTheSnow https://www.onthesnow.com/michigan/porkies/ski-resort |
| 2026-09-23T05:09 | ski-brule | vertical_drop | NULL | 500 | OnTheSnow https://www.onthesnow.com/michigan/ski-brule/ski-resort |
| 2026-09-23T05:09 | homestead-resort | vertical_drop | NULL | 320 | OnTheSnow https://www.onthesnow.com/michigan/the-homestead/ski-resort |
| 2026-09-23T05:09 | mount-holly | vertical_drop | NULL | 350 | OnTheSnow https://www.onthesnow.com/michigan/mount-holly/ski-resort |
| 2026-09-23T05:09 | pine-knob | vertical_drop | NULL | 300 | OnTheSnow https://www.onthesnow.com/michigan/pine-knob-ski-resort/ski-resort |
| 2026-09-23T05:09 | snow-snake | vertical_drop | NULL | 210 | OnTheSnow https://www.onthesnow.com/michigan/snow-snake-mountain-ski-area/ski-resort |
| 2026-09-23T05:09 | apple-mountain | vertical_drop | NULL | 220 | OnTheSnow https://www.onthesnow.com/michigan/apple-mountain/ski-resort |
| 2026-09-23T05:09 | cannonsburg | vertical_drop | NULL | 250 | OnTheSnow https://www.onthesnow.com/michigan/cannonsburg/ski-resort |
| 2026-09-23T05:09 | timber-ridge | vertical_drop | NULL | 240 | summit 850 - base 610 |
| 2026-09-23T05:09 | swiss-valley | vertical_drop | NULL | 224 | summit 1197 - base 973 |
| 2026-09-23T05:09 | wilmot-mountain | vertical_drop | NULL | 190 | summit 960 - base 770 |
| 2026-09-23T05:09 | cascade-mountain | vertical_drop | NULL | 450 | summit 1270 - base 820 |
| 2026-09-23T05:09 | devils-head | vertical_drop | NULL | 501 | summit 995 - base 494 |
| 2026-09-23T05:09 | alpine-valley-wi | vertical_drop | NULL | 388 | OnTheSnow https://www.onthesnow.com/wisconsin/alpine-valley-resort/ski-resort |
| 2026-09-23T05:09 | christmas-mountain | vertical_drop | NULL | 250 | OnTheSnow https://www.onthesnow.com/wisconsin/christmas-mountain/ski-resort |
| 2026-09-23T05:09 | afton-alps | vertical_drop | NULL | 350 | OnTheSnow https://www.onthesnow.com/minnesota/afton-alps/ski-resort |
| 2026-09-23T05:09 | welch-village | vertical_drop | NULL | 360 | summit 1060 - base 700 |
| 2026-09-23T05:09 | buck-hill | vertical_drop | NULL | 262 | summit 1211 - base 949 |
| 2026-09-23T05:09 | giants-ridge | vertical_drop | NULL | 500 | summit 1972 - base 1472 |
| 2026-09-23T05:09 | wild-mountain | vertical_drop | NULL | 300 | OnTheSnow https://www.onthesnow.com/minnesota/wild-mountain-ski-snowboard-area/ski-resort |
| 2026-09-23T05:09 | buena-vista | vertical_drop | NULL | 230 | summit 1526 - base 1296 |
| 2026-09-23T05:09 | seven-oaks | vertical_drop | NULL | 275 | OnTheSnow https://www.onthesnow.com/iowa/seven-oaks/ski-resort |
| 2026-09-23T05:09 | mt-crescent | vertical_drop | NULL | 299 | summit 1500 - base 1201 |
| 2026-09-23T05:09 | four-lakes | vertical_drop | NULL | 100 | OnTheSnow https://www.onthesnow.com/illinois/four-lakes/ski-resort |
| 2026-09-23T05:09 | villa-olivia | vertical_drop | NULL | 180 | OnTheSnow https://www.onthesnow.com/illinois/villa-olivia/ski-resort |
| 2026-09-23T05:09 | perfect-north | vertical_drop | NULL | 400 | summit 800 - base 400 |
| 2026-09-23T05:09 | paoli-peaks | vertical_drop | NULL | 289 | summit 862 - base 573 |
| 2026-09-23T05:09 | mad-river-mountain | vertical_drop | NULL | 301 | summit 1460 - base 1159 |
| 2026-09-23T05:09 | snow-trails | vertical_drop | NULL | 266 | summit 1460 - base 1194 |
| 2026-09-23T05:09 | frost-fire-park | vertical_drop | NULL | 323 | summit 1400 - base 1077 |
| 2026-09-23T05:09 | wisp-resort | vertical_drop | NULL | 700 | summit 3115 - base 2415 |
| 2026-09-23T05:09 | the-omni-homestead-resort | vertical_drop | NULL | 700 | OnTheSnow https://www.onthesnow.com/virginia/the-homestead-ski-area/ski-resort |
| 2026-09-23T05:09 | snowshoe-mountain | vertical_drop | NULL | 1500 | summit 4848 - base 3348 |
| 2026-09-23T05:09 | timberline-mountain | vertical_drop | NULL | 1000 | OnTheSnow https://www.onthesnow.com/west-virginia/timberline-four-seasons/ski-resort |
| 2026-09-23T05:09 | sapphire-valley-resort | vertical_drop | NULL | 250 | OnTheSnow https://www.onthesnow.com/north-carolina/sapphire-valley/ski-resort |
| 2026-09-23T05:09 | sugar-mountain-resort | vertical_drop | NULL | 1200 | summit 5300 - base 4100 |
| 2026-09-23T05:09 | cloudmont-ski-resort | vertical_drop | NULL | 149 | summit 1799 - base 1650 |
| 2026-09-23T05:09 | powder-ridge-mountain-park | vertical_drop | NULL | 550 | OnTheSnow https://www.onthesnow.com/connecticut/powder-ridge-park/ski-resort |
| 2026-09-23T05:09 | blue-hills-ski-area | vertical_drop | NULL | 319 | summit 613 - base 294 |
| 2026-09-23T05:09 | nashoba-valley-ski-area | vertical_drop | NULL | 228 | summit 422 - base 194 |
| 2026-09-23T05:09 | otis-ridge | vertical_drop | NULL | 400 | OnTheSnow https://www.onthesnow.com/massachusetts/otis-ridge-ski-area/ski-resort |
| 2026-09-23T05:09 | ski-bradford | vertical_drop | NULL | 248 | OnTheSnow https://www.onthesnow.com/massachusetts/bradford-ski-area/ski-resort |
| 2026-09-23T05:09 | ski-ward | vertical_drop | NULL | 210 | OnTheSnow https://www.onthesnow.com/massachusetts/ski-ward/ski-resort |
| 2026-09-23T05:09 | campgaw-mountain | vertical_drop | NULL | 266 | summit 726 - base 460 |
