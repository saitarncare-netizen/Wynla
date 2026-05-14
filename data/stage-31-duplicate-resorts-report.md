# Duplicate Resorts Report — sweep date 2026-05-14

Scanned 442 active resorts (skipped 0 with bad coords).
Flagged 14 suspicious pairs within 5 km of each other.

## HIGH severity (definite duplicates — merge or drop)

- **Resort A**: Leavenworth Winter Sports Club (WA) · `leavenworth-winter-sports-club` · id=472 · passes=[indy] · vertical_drop=300 · total_trails=3
- **Resort B**: Leavenworth Ski Hill (WA) · `leavenworth-ski-hill` · id=206 · passes=[independent] · vertical_drop=? · total_trails=2
- Distance: 0.48 km
- Recommendation: KEEP A, DROP B; MERGE passes = union of both arrays (A has larger vertical_drop/trails)
- Reasoning: 0.48 km apart; same name root; pass arrays differ.

- **Resort A**: White Pine Touring Nordic Center (UT) · `white-pine-touring-nordic-center` · id=466 · passes=[indy] · vertical_drop=? · total_trails=5
- **Resort B**: Park City Mountain Resort (UT) · `park-city` · id=99 · passes=[epic] · vertical_drop=3200 · total_trails=336
- Distance: 1.30 km
- Recommendation: KEEP B, DROP A; MERGE passes = union of both arrays (B is the main resort; A is the "nordic" add-on)
- Reasoning: 1.30 km apart; one name contains "nordic"; pass arrays differ.

- **Resort A**: Bear Basin Nordic Center (ID) · `bear-basin-nordic-center` · id=432 · passes=[indy] · vertical_drop=? · total_trails=?
- **Resort B**: Little Ski Hill (ID) · `little-ski-hill` · id=147 · passes=[indy] · vertical_drop=405 · total_trails=6
- Distance: 1.63 km
- Recommendation: KEEP B, DROP A (B is the main resort; A is the "nordic" add-on)
- Reasoning: 1.63 km apart; one name contains "nordic".


## MEDIUM severity (likely duplicates — needs human review)

- **Resort A**: Great Bear Ski Valley (SD) · `great-bear-valley` · id=465 · passes=[indy] · vertical_drop=182 · total_trails=14
- **Resort B**: Great Bear Recreation Park (SD) · `great-bear` · id=385 · passes=[indy] · vertical_drop=? · total_trails=14
- Distance: 1.08 km
- Recommendation: KEEP A, DROP B (A has larger vertical_drop/trails)
- Reasoning: 1.08 km apart; identical slug; same name root.

- **Resort A**: Steamboat Ski Resort (CO) · `steamboat` · id=86 · passes=[ikon] · vertical_drop=3668 · total_trails=182
- **Resort B**: Steamboat Ski Touring Center (CO) · `steamboat-touring-center` · id=430 · passes=[indy] · vertical_drop=? · total_trails=7
- Distance: 1.37 km
- Recommendation: KEEP A, DROP B; MERGE passes = union of both arrays (A has larger vertical_drop/trails)
- Reasoning: 1.37 km apart; one slug is a prefix of the other; same name root; pass arrays differ.

- **Resort A**: Rikert Outdoor Center (VT) · `rikert-outdoor-center` · id=270 · passes=[independent] · vertical_drop=? · total_trails=25
- **Resort B**: Rikert Nordic Center (VT) · `rikert-nordic-center` · id=468 · passes=[indy] · vertical_drop=? · total_trails=25
- Distance: 2.54 km
- Recommendation: KEEP A, DROP B; MERGE passes = union of both arrays (A is the main resort; B is the "nordic" add-on)
- Reasoning: 2.54 km apart; same name root; one name contains "nordic"; pass arrays differ.


## LOW severity (review)

- **Resort A**: Bear Valley Mountain Resort (CA) · `bear-valley-mountain` · id=173 · passes=[indy] · vertical_drop=1900 · total_trails=75
- **Resort B**: Bear Valley Adventure Company (CA) · `bear-valley-adventure-company` · id=423 · passes=[indy] · vertical_drop=? · total_trails=38
- Distance: 2.11 km
- Recommendation: KEEP A, DROP B (A is the main resort; B is the "adventure" add-on)
- Reasoning: 2.11 km apart; identical slug; same name root; one name contains "adventure".

- **Resort A**: Black Mountain (NH) (NH) · `black-mountain-nh` · id=247 · passes=[indy] · vertical_drop=? · total_trails=45
- **Resort B**: Black Mountain Ski Area (NH) · `black-area` · id=452 · passes=[indy] · vertical_drop=1100 · total_trails=45
- Distance: 2.21 km
- Recommendation: KEEP B, DROP A (B has larger vertical_drop/trails)
- Reasoning: 2.21 km apart; same name root.

- **Resort A**: The Highlands (MI) · `highlands` · id=443 · passes=[ikon] · vertical_drop=? · total_trails=55
- **Resort B**: The Highlands (Boyne Highlands) (MI) · `the-highlands` · id=306 · passes=[ikon] · vertical_drop=? · total_trails=55
- Distance: 2.27 km
- Recommendation: KEEP A, DROP B (tie on size metrics — pick whichever has cleaner data)
- Reasoning: 2.27 km apart; same name root.

- **Resort A**: Mt. Shasta (CA) · `mt-shasta` · id=426 · passes=[indy] · vertical_drop=2036 · total_trails=38
- **Resort B**: Mt. Shasta Ski Park (CA) · `mt-shasta-ski-park` · id=183 · passes=[indy] · vertical_drop=? · total_trails=38
- Distance: 2.79 km
- Recommendation: KEEP A, DROP B (A has larger vertical_drop/trails)
- Reasoning: 2.79 km apart; identical slug; same name root.

- **Resort A**: Aspen Mountain (CO) · `aspen-mountain` · id=61 · passes=[ikon, mountain_collective] · vertical_drop=? · total_trails=76
- **Resort B**: Aspen Highlands (CO) · `aspen-highlands` · id=62 · passes=[ikon, mountain_collective] · vertical_drop=? · total_trails=118
- Distance: 3.29 km
- Recommendation: KEEP B, DROP A (B has larger vertical_drop/trails)
- Reasoning: 3.29 km apart; same name root.

- **Resort A**: Detroit Mountain Recreation Area (MN) · `detroit-mountain` · id=355 · passes=[indy] · vertical_drop=? · total_trails=21
- **Resort B**: Detroit Mountain (MN) · `detroit` · id=444 · passes=[indy] · vertical_drop=210 · total_trails=21
- Distance: 3.55 km
- Recommendation: KEEP B, DROP A (B has larger vertical_drop/trails)
- Reasoning: 3.55 km apart; one slug is a prefix of the other; same name root.

- **Resort A**: Steamboat Ski Resort (CO) · `steamboat` · id=86 · passes=[ikon] · vertical_drop=3668 · total_trails=182
- **Resort B**: Haymaker Nordic Center (CO) · `haymaker-nordic-center` · id=429 · passes=[indy] · vertical_drop=? · total_trails=10
- Distance: 3.68 km
- Recommendation: KEEP A, DROP B; MERGE passes = union of both arrays (A is the main resort; B is the "nordic" add-on)
- Reasoning: 3.68 km apart; one name contains "nordic"; pass arrays differ.

- **Resort A**: White Pine Touring Nordic Center (UT) · `white-pine-touring-nordic-center` · id=466 · passes=[indy] · vertical_drop=? · total_trails=5
- **Resort B**: Deer Valley Resort (UT) · `deer-valley` · id=97 · passes=[ikon] · vertical_drop=? · total_trails=202
- Distance: 4.27 km
- Recommendation: KEEP B, DROP A; MERGE passes = union of both arrays (B is the main resort; A is the "nordic" add-on)
- Reasoning: 4.27 km apart; one name contains "nordic"; pass arrays differ.


## Exact duplicate slugs

_None found._

## Summary

- Total flagged pairs: **14**
- HIGH: **3**, MEDIUM: **3**, LOW: **8**
- Exact-duplicate slugs: **0**
- Estimated dedupe impact (HIGH only): 442 active resorts → ~439 after merge
