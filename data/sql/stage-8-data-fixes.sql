-- Stage 8 data audit fixes (applied 2026-05-08).
--
-- Two passes:
--   1. has_night_skiing audit — 55 resorts cross-verified by 5 audit
--      agents + 1 cross-verify agent. 53 confirmed; 2 flipped to NULL.
--   2. vertical_drop / total_trails / total_lifts spot-check on a
--      deterministic 30-resort sample. 4 high-confidence corrections;
--      remaining discrepancies were Wiki-only with lift-counting
--      ambiguity (e.g. whether to include surface tows / carpets) and
--      were left alone.
--
-- Sources for each correction:
--   pomerelle           — official conditions page shows 32/32 OPEN TRAILS
--                         (DB had 22 — likely captured a winter-only count).
--   chestnut-mountain   — official /winter page lists 6 chairlifts +
--                         1 surface conveyor = 7 (DB had 9, source unclear).
--   bristol-mountain    — official site mentions only "2 HS quads" which
--                         the prior extractor captured as total_lifts;
--                         actual fleet is 5 chairs + 1 carpet (Wikipedia)
--                         so 6 is the right total.
--   montana-snowbowl    — Wikipedia: 39 runs. DB had 68 (74% high, almost
--                         certainly a Stage-7 mis-extract). Vail-blocked
--                         official site so we trust the Wiki value here.
--   sierra-at-tahoe,
--   jack-frost-mountain — has_night_skiing → NULL (see audit notes).

-- 1. Night skiing flips
UPDATE resorts SET has_night_skiing = NULL
WHERE slug IN ('sierra-at-tahoe', 'jack-frost-mountain');

-- 2. Stat corrections
UPDATE resorts SET total_trails = 32 WHERE slug = 'pomerelle';
UPDATE resorts SET total_lifts  = 7  WHERE slug = 'chestnut-mountain';
UPDATE resorts SET total_lifts  = 6  WHERE slug = 'bristol-mountain';
UPDATE resorts SET total_trails = 39 WHERE slug = 'montana-snowbowl';

-- Verify
SELECT slug, name, vertical_drop, total_trails, total_lifts, has_night_skiing
FROM resorts
WHERE slug IN (
  'sierra-at-tahoe', 'jack-frost-mountain',
  'pomerelle', 'chestnut-mountain', 'bristol-mountain', 'montana-snowbowl'
)
ORDER BY slug;
