-- Stage 31 — deduplicate near-coordinate resort rows.
--
-- The Stage 4 scraper occasionally pulled the same physical mountain as
-- multiple DB rows: usually a separate nordic / tubing / adventure-park
-- entry sitting <5 km from the main alpine resort, sometimes with
-- different pass affiliations because the side operation is run by a
-- different company. Users see them as confusing "duplicate" pins on
-- the map.
--
-- Approach: keep the canonical alpine row and deactivate (active=false)
-- the lesser one, copying any non-null fields over first so we don't
-- lose data. Inactive rows stay in the DB so we can re-activate later
-- if we decide to surface nordic-only operations behind a filter.
--
-- Source: `data/stage-31-duplicate-resorts-report.md` from the
-- automated sweep at scripts/find-duplicate-resorts.mjs.
--
-- Skipped (legitimately separate operations):
--   - Aspen Mountain (id=61) vs Aspen Highlands (id=62) — two of the
--     four Aspen Skiing Company mountains, both Ikon, both real.

BEGIN;

-- 1) Leavenworth Winter Sports Club (id=472) vs Leavenworth Ski Hill (id=206).
--    0.48 km apart. Pass arrays differ only because of a typo ("indy" vs
--    "independent"). Keep 472, drop 206. No fields to merge — 472 has
--    larger trails + vertical already.
UPDATE resorts SET active = false WHERE id = 206;

-- 2) Park City (id=99) absorbs White Pine Touring Nordic Center (id=466).
--    Nordic center 1.30 km from the alpine resort — Wynla is alpine-only.
UPDATE resorts SET active = false WHERE id = 466;

-- 3) Little Ski Hill (id=147) absorbs Bear Basin Nordic Center (id=432).
UPDATE resorts SET active = false WHERE id = 432;

-- 4) Rikert Outdoor Center (id=270) absorbs Rikert Nordic Center (id=468).
--    Same Middlebury College facility, listed twice.
UPDATE resorts SET active = false WHERE id = 468;

-- 5) Steamboat Ski Resort (id=86) absorbs Steamboat Touring Center (id=430).
--    Touring = XC; the alpine resort already has the main acreage.
UPDATE resorts SET active = false WHERE id = 430;

-- 6) Steamboat Ski Resort (id=86) also absorbs Haymaker Nordic Center (id=429).
UPDATE resorts SET active = false WHERE id = 429;

-- 7) Great Bear Ski Valley (id=465) absorbs Great Bear Recreation Park
--    (id=385). 1.08 km apart, same name root. Keep 465 (has vertical_drop).
UPDATE resorts SET active = false WHERE id = 385;

-- 8) Bear Valley Mountain Resort (id=173) absorbs Bear Valley Adventure
--    Company (id=423). The "Adventure Company" is summer/tours, not alpine.
UPDATE resorts SET active = false WHERE id = 423;

-- 9) Black Mountain NH — id=247 (`black-mountain-nh`) is the canonical
--    slug; id=452 has a bad slug (`black-area`) but holds the
--    vertical_drop. Merge then deactivate.
UPDATE resorts
   SET vertical_drop = COALESCE(vertical_drop, 1100)
 WHERE id = 247 AND vertical_drop IS NULL;
UPDATE resorts SET active = false WHERE id = 452;

-- 10) The Highlands (MI) — `the-highlands` (id=306) keeps the cleaner
--     full name (matches official "Boyne Highlands" branding). Drop the
--     bare `highlands` row (id=443).
UPDATE resorts SET active = false WHERE id = 443;

-- 11) Detroit Mountain (MN) — keep the cleaner slug `detroit-mountain`
--     (id=355); merge vertical_drop from id=444 first.
UPDATE resorts
   SET vertical_drop = COALESCE(vertical_drop, 210)
 WHERE id = 355 AND vertical_drop IS NULL;
UPDATE resorts SET active = false WHERE id = 444;

-- 12) Mt. Shasta — `mt-shasta-ski-park` (id=183) is the proper resort
--     name; `mt-shasta` (id=426) is the mountain itself. Merge the
--     vertical_drop into the ski park row, then deactivate id=426.
UPDATE resorts
   SET vertical_drop = COALESCE(vertical_drop, 2036)
 WHERE id = 183 AND vertical_drop IS NULL;
UPDATE resorts SET active = false WHERE id = 426;

COMMIT;
