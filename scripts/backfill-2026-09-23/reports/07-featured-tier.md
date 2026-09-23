# Step 7 — featured tier for Aspen

Report generated 2026-09-23T05:37:40.344Z (dry run). Applied runs: 07-featured-tier-2026-09-23_05-37-38.json (2 rows)

| metric | count |
|---|---|
| rows promoted to tier=featured | 2 |
| still proposed by this run | 0 |

The aggregate `aspen-snowmass` row carried tier=featured; when step 3 retired it, Aspen left the featured pin layer, the featured pin score, the sitemap 0.9 priority and the ?featured=1 filter. Snowmass and Aspen Mountain now carry the tier. In the same change set lib/lists.ts ("Ikon Pass Must-Ski") and lib/guides.tsx point at `snowmass`, and next.config.ts 301s /resort/aspen-snowmass (and the three other retired slugs) to the kept rows.

## Changes
| run | slug | column | before | after | source |
|---|---|---|---|---|---|
| 2026-09-23T05:37 | aspen-mountain | tier | listed | featured | aggregate aspen-snowmass row (tier=featured) retired in step 3 |
| 2026-09-23T05:37 | snowmass | tier | listed | featured | aggregate aspen-snowmass row (tier=featured) retired in step 3 |
