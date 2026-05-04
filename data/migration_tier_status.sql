-- Stage 2 schema migration
-- 1. Add tier (featured/listed) so we can show 30 deeply-detailed resorts
--    differently from the ~470 bulk-imported ones.
-- 2. Add operating_status (active/closed/seasonal).
-- 3. Mark all existing 30 resorts as 'featured'.
-- 4. Drop the legacy single-pass column (verified safe in Stage 1).

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'listed'
    CHECK (tier IN ('featured', 'listed'));

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS operating_status TEXT NOT NULL DEFAULT 'active'
    CHECK (operating_status IN ('active', 'closed', 'seasonal'));

-- Promote the existing 30 Northeast resorts to featured tier
-- (they all have the deep stat fields populated; new bulk imports won't)
UPDATE resorts SET tier = 'featured' WHERE tier = 'listed';

-- Drop legacy single-pass column. Stage 1 verified that the new
-- `passes` array works on production. No more rollback needed.
ALTER TABLE resorts DROP COLUMN IF EXISTS pass;

-- Useful index for filtering featured-only / listed-only on the map
CREATE INDEX IF NOT EXISTS idx_resorts_tier ON resorts(tier);
CREATE INDEX IF NOT EXISTS idx_resorts_operating_status ON resorts(operating_status);

-- Verify
SELECT tier, COUNT(*) FROM resorts GROUP BY tier ORDER BY tier;
SELECT operating_status, COUNT(*) FROM resorts GROUP BY operating_status;
SELECT name, tier, passes, operating_status FROM resorts ORDER BY name LIMIT 5;
