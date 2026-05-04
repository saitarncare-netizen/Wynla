-- Stage 1 schema migration: pass (TEXT) -> passes (TEXT[])
-- A resort can now belong to multiple passes (e.g. Whiteface = independent + Mountain Collective)
-- Safe re-run: uses IF NOT EXISTS / idempotent UPDATEs.

-- 1. Add passes array column (default empty)
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS passes TEXT[] DEFAULT '{}';

-- 2. Populate passes from existing pass column for any resort still empty
UPDATE resorts
SET passes = ARRAY[pass]::TEXT[]
WHERE (passes IS NULL OR cardinality(passes) = 0)
  AND pass IS NOT NULL;

-- 3. Tag Whiteface as Mountain Collective member (in addition to independent)
--    Whiteface joined MC for the 2025-26 season — first NY resort on MC.
--    Source: https://orda.org/2025/07/22/whiteface-mountain-joins-mountain-collective-pass-roster-for-2025-2026-season/
UPDATE resorts
SET passes = ARRAY['independent', 'mountain_collective']
WHERE slug = 'whiteface-mountain';

-- 4. (Note) The old `pass` column is intentionally kept for now as a
--    rollback safety net. It will be dropped in Stage 2 once the new
--    code is verified on production.

-- 5. Verify: counts per pass (a resort with multiple passes is counted in each)
SELECT
  unnest(passes) AS pass,
  COUNT(*) AS resort_count
FROM resorts
GROUP BY unnest(passes)
ORDER BY pass;

-- 6. Verify: list of resorts with multiple passes (should currently show only Whiteface)
SELECT name, state, passes
FROM resorts
WHERE cardinality(passes) > 1;
