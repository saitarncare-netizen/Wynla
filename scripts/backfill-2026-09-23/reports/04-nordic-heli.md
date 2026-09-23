# Step 4 — nordic-only centers and heli-ski operator retired

Report generated 2026-09-23T05:37:39.573Z (dry run). Applied runs: 04-nordic-heli-2026-09-23_04-57-17.json (24 rows), 04-nordic-heli-2026-09-23_05-37-22.json (3 rows)

| metric | count |
|---|---|
| active rows with 0 / NULL lifts at this run | 2 |
| deactivated as nordic-only | 23 |
| deactivated as heli-ski | 1 |
| deactivated as permanently closed | 2 |
| operating_status set back to 'active' | 1 |
| kept (alpine hill without lift data) | 2 |
| rows updated (all applied runs) | 27 |
| still proposed by this run | 0 |

Already inactive (deactivated by an earlier run): rikert-outdoor-center, bethel-village-trails, northern-maine-community-trails, rangeley-lakes-trail-center, maplelag, loppet, crosscut-sports-center, dog-creek-lodge-nordic-center, homestake-lodge, loge-glacier, franconia-village-xc-area, great-glen-trails-outdoor-center, jackson-xc, high-point-xc-center, enchanted-forest-xc, garnet-hill-xc, catamount-outdoor-family-center, trapp-family-lodge, woodstock-nordic-center, plain-valley-trails, minocqua-winter-park, white-grass-touring, turpin-meadow-ranch, north-cascade-heli

## Kept
- mount-ashwabay (WI) — lifts=NULL, kept as an alpine area
- quarry-road-trails (ME) — lifts=0, kept as an alpine area

## Deactivated, with evidence (checked 2026-09-23)
- rikert-outdoor-center — nordic: rikertoutdoor.com — cross-country programs and clinics only; Middlebury Snowbowl is the separate alpine area
- bethel-village-trails — nordic: woodsandtrails.org — 'cross country skiing, fat biking, and snowshoeing at the Bethel Village Trails'
- northern-maine-community-trails — nordic: nmctrails.org — 'Nordic Skiing' trail center, no lifts
- rangeley-lakes-trail-center — nordic: Rangeley Region Cross Country Ski Club, 55 km groomed nordic trails at the base of Saddleback (skimaine.com/rangeleylakestrailcenter)
- maplelag — nordic: maplelag.com — 'Destination Cross-Country Ski Center'
- loppet — nordic: loppet.org — Theodore Wirth Park nordic trails, no lift-served terrain
- crosscut-sports-center — nordic: crosscutmt.org — 'human-powered recreation', nordic skiing adjacent to Bridger Bowl
- dog-creek-lodge-nordic-center — nordic: dogcreeklodge.com — '27+ kilometers of groomed nordic trail systems'
- homestake-lodge — nordic: homestakelodge.com — cross-country ski lodge, 35 km groomed trails (Indy Pass XC listing)
- loge-glacier — nordic: logecamps.com — lodging property in Essex, MT with groomed nordic tracks; no lifts
- franconia-village-xc-area — nordic: franconiainn.com — 'Franconia Village XC Ski Center', 30 km nordic trails
- great-glen-trails-outdoor-center — nordic: greatglentrails.com — classic and skate cross-country only
- jackson-xc — nordic: jacksonxc.org — Jackson Ski Touring Foundation, 150 km cross-country trails
- high-point-xc-center — nordic: xcskihighpoint.com — 'High Point Cross Country Ski Center'
- enchanted-forest-xc — nordic: enchantedforestxc.com — XC skiing and snowshoeing only
- garnet-hill-xc — nordic: garnet-hill.com — snowcat-groomed private ski trails; alpine skiing is at nearby Gore
- catamount-outdoor-family-center — nordic: catamountoutdoor.org — nordic ski and mountain-bike trail network, no lifts
- trapp-family-lodge — nordic: vontrappresort.com — cross-country ski center only
- woodstock-nordic-center — nordic: woodstockinn.com — 45 km nordic trails (Indy Pass XC listing)
- plain-valley-trails — nordic: skiplain.com — '25 km of groomed trails' for XC skiing
- minocqua-winter-park — nordic: minocquawinterpark.org — 65 miles of groomed cross-country trails
- white-grass-touring — nordic: whitegrass.com — 'Cross-country skiing and snowshoeing' touring center
- turpin-meadow-ranch — nordic: turpinmeadowranch.com — guest ranch with a Nordic Center, no lifts
- north-cascade-heli — heli: heli-ski.com — helicopter skiing operator, '300,000 acres of pure backcountry heli-skiing terrain'

## Permanently closed alpine areas, retired (checked 2026-09-23)
- sleeping-giant — closed since 2025-26; sold to HMH Capital, which plans a summer park with no ski operations — https://cowboystatedaily.com/2026/02/10/sleeping-giant-ski-area-near-cody-has-a-buyer-but-not-one-who-wants-a-ski-resort/
- apple-mountain — defunct alpine hill (closure flag in its own lift_types JSON; audit finding data-quality-9); no 2026-27 operations announced

## Operating status corrected (checked 2026-09-23)
- homewood-mountain-resort — operating_status 'closed' -> 'active': skihomewood.com sells 2026-27 season passes to the public ("We can't wait to welcome everyone back to the West Shore for the 2026-2027 winter") and ran a public 2025-26 season that closed 2026-03-17 — https://www.skihomewood.com/tickets-passes/season-passes

## Changes
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T04:57 | rikert-outdoor-center | active | true | false |  |
| 2026-09-23T04:57 | bethel-village-trails | active | true | false |  |
| 2026-09-23T04:57 | northern-maine-community-trails | active | true | false |  |
| 2026-09-23T04:57 | rangeley-lakes-trail-center | active | true | false |  |
| 2026-09-23T04:57 | maplelag | active | true | false |  |
| 2026-09-23T04:57 | loppet | active | true | false |  |
| 2026-09-23T04:57 | crosscut-sports-center | active | true | false |  |
| 2026-09-23T04:57 | dog-creek-lodge-nordic-center | active | true | false |  |
| 2026-09-23T04:57 | homestake-lodge | active | true | false |  |
| 2026-09-23T04:57 | loge-glacier | active | true | false |  |
| 2026-09-23T04:57 | franconia-village-xc-area | active | true | false |  |
| 2026-09-23T04:57 | great-glen-trails-outdoor-center | active | true | false |  |
| 2026-09-23T04:57 | jackson-xc | active | true | false |  |
| 2026-09-23T04:57 | high-point-xc-center | active | true | false |  |
| 2026-09-23T04:57 | enchanted-forest-xc | active | true | false |  |
| 2026-09-23T04:57 | garnet-hill-xc | active | true | false |  |
| 2026-09-23T04:57 | catamount-outdoor-family-center | active | true | false |  |
| 2026-09-23T04:57 | trapp-family-lodge | active | true | false |  |
| 2026-09-23T04:57 | woodstock-nordic-center | active | true | false |  |
| 2026-09-23T04:57 | north-cascade-heli | active | true | false |  |
| 2026-09-23T04:57 | plain-valley-trails | active | true | false |  |
| 2026-09-23T04:57 | minocqua-winter-park | active | true | false |  |
| 2026-09-23T04:57 | white-grass-touring | active | true | false |  |
| 2026-09-23T04:57 | turpin-meadow-ranch | active | true | false |  |
| 2026-09-23T05:37 | sleeping-giant | active | true | false | permanently closed |
| 2026-09-23T05:37 | homewood-mountain-resort | operating_status | closed | active | operating, wrongly marked closed |
| 2026-09-23T05:37 | apple-mountain | active | true | false | permanently closed |
