# scripts/archive

One-off scripts from the May to June 2026 data build. They are kept for
the record (each one explains a number that is now in the database) and
they are **not maintained**: most hand-parse `.env.local`, several point at
Supabase columns or `data/` files that have since changed, and none are
wired to `package.json`. Do not run them against production without
reading them first. The live scripts stay in `scripts/` (see the root
README).

| Script | What it did (when) |
|---|---|
| `audit-featured-candidates.mjs` | Listed the 30 Featured resorts and scored top Listed candidates for promotion (May 2026, Featured tier went 30 → 50). |
| `build-audit-sql.mjs` | Stage 3.5 quality-audit aggregator: merged agent outputs into an audit SQL file. |
| `build-fastwork-csv.mjs` / `sync-fastwork-csv.mjs` | Built the worksheet for a Fastwork freelancer (Stage 18) and read the filled CSV back into SQL UPDATEs. The freelancer route was dropped. |
| `build-listed-resorts-sql.mjs` | Stage 2: aggregated five agent outputs into the Listed-tier resort inserts. |
| `build-promotion-sql.mjs` | Merged DB state with Wikipedia scrapes for the 20 flagship promotions. |
| `check-drive-cache.mjs` | Read-only audit of `drive_time_cache` coverage before `compute-drive-times.mjs` runs. |
| `check-flagship-resorts.mjs` | Existence check for the 20 flagship slugs before promotion. |
| `check-pro-waitlist.mjs` | Verified the `pro_waitlist` table existed (Founder list, May 2026). |
| `check-website-urls.mjs` | Probed every `website_url` for dead links. |
| `combine-and-apply-verify.mjs` / `fetch-resorts-for-verify.mjs` / `filter-verify-downgrades.mjs` | Stage 7 verification round: split resorts into agent batches, combined the ten result files into SQL, and refused downgrades without a source. |
| `compare-pass-truth.mjs` / `diff-vs-db.mjs` / `emit-apply-sql.mjs` | Stage 3.6: diffed the pass-website scrape (`scrape-pass-data.mjs`) against `resorts.passes` and emitted the correction SQL. |
| `fetch-resort-weather.mjs` | Local weather refresh from before the cron existed. Superseded by `/api/cron/refresh-weather` and `scripts/pipeline-trigger.mjs`. |
| `find-dupe-resorts.mjs` / `find-duplicate-resorts.mjs` | Two attempts at the same job: duplicate and zone-split resort rows (Stage 20 and Stage 31). The 2026-09-23 backfill (`scripts/backfill-2026-09-23/03-duplicates.mjs`) is the current version. |
| `hero-source.mjs` / `hero-build.mjs` / `hero-import.mjs` / `hero-rehost.mjs` / `hero-fix-cache.mjs` | The hero-photo pipeline (Stage 25 and the June re-host): sourced licence-clear candidates, picked winners from vision vetting, wrote `hero_image_url`, re-hosted the 112 photos on Supabase Storage and fixed their Cache-Control. |
| `process-pct-csvs.mjs` / `process-trail-csvs.mjs` | Combined the parallel-agent CSV batches for difficulty percentages and trail counts. |
| `round-9-fetch-nearby.mjs` / `round-9-fetch-ski-shops.mjs` / `round-9-import-nearby.mjs` / `round-9-enrich-google.mjs` | Round 9 (June 2026): the OSM sweep for nearby restaurants, activities and ski shops, the importer, and the Google Places "Recommended" flag. Needs a Google key with a raised quota to re-run. |
| `scrape-flagship-wikipedia.mjs` | Wikipedia infobox + lead image for the 20 flagship resorts. Wikipedia is not used for pass affiliations. |
| `stage-22-*.mjs` | Stage 22 trail-data build: pulled resorts, wrote agent batch inputs, sanitised fabricated values, cross-validated three agent outputs, and re-verified the low-confidence slugs. |
| `stage-23-build-all.mjs` | Stage 23: consensus across five agent strategies for 18 new amenity fields. |
| `stage-25-build-all.mjs` | Stage 25: picked the best winter hero per resort across three strategies. |
| `wikimedia-hero-round2.mjs` | Second Wikimedia Commons pass for resorts still without a hero photo. |

The `data/` folder holds the inputs and outputs these scripts read and
wrote; it is not referenced by the app.
