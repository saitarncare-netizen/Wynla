-- Stage 18 schema migration — difficulty as percentages.
-- Apply via Supabase SQL editor:
-- https://supabase.com/dashboard/project/yhmzkeeaiknsotydaucs/sql/new
--
-- Why pct, not counts: trail counts are inherently fuzzy (some trails
-- branch, some merge, sources disagree by 10-20%) and counting trails
-- is hard even for active skiers. Percentages are what resorts already
-- publish in marketing materials ("18% beginner / 56% intermediate ...")
-- and are far easier to verify against a single source of truth.
--
-- The four trails_* count columns stay for backwards compat; the UI
-- prefers difficulty_pct_* when set and derives from counts otherwise.

BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS difficulty_pct_beginner smallint,
  ADD COLUMN IF NOT EXISTS difficulty_pct_intermediate smallint,
  ADD COLUMN IF NOT EXISTS difficulty_pct_advanced smallint,
  ADD COLUMN IF NOT EXISTS difficulty_pct_expert smallint;

-- CHECK constraints — values are valid percentages.
ALTER TABLE resorts
  ADD CONSTRAINT resorts_pct_beginner_range
    CHECK (difficulty_pct_beginner IS NULL OR (difficulty_pct_beginner >= 0 AND difficulty_pct_beginner <= 100)),
  ADD CONSTRAINT resorts_pct_intermediate_range
    CHECK (difficulty_pct_intermediate IS NULL OR (difficulty_pct_intermediate >= 0 AND difficulty_pct_intermediate <= 100)),
  ADD CONSTRAINT resorts_pct_advanced_range
    CHECK (difficulty_pct_advanced IS NULL OR (difficulty_pct_advanced >= 0 AND difficulty_pct_advanced <= 100)),
  ADD CONSTRAINT resorts_pct_expert_range
    CHECK (difficulty_pct_expert IS NULL OR (difficulty_pct_expert >= 0 AND difficulty_pct_expert <= 100));

-- Backfill: for resorts that already have integer counts, compute the
-- percentage breakdown and store it. Uses GREATEST to avoid /0 when
-- every count is null (NULL+NULL+NULL+NULL coalesces to 0; we skip
-- those rows in the WHERE clause). All counts NULL → no backfill,
-- pct stays NULL too (correct behavior — no data either way).
UPDATE resorts
SET
  difficulty_pct_beginner = ROUND(
    COALESCE(trails_beginner, 0)::numeric * 100 /
    GREATEST(
      COALESCE(trails_beginner, 0) +
      COALESCE(trails_intermediate, 0) +
      COALESCE(trails_advanced, 0) +
      COALESCE(trails_expert, 0),
      1
    )
  ),
  difficulty_pct_intermediate = ROUND(
    COALESCE(trails_intermediate, 0)::numeric * 100 /
    GREATEST(
      COALESCE(trails_beginner, 0) +
      COALESCE(trails_intermediate, 0) +
      COALESCE(trails_advanced, 0) +
      COALESCE(trails_expert, 0),
      1
    )
  ),
  difficulty_pct_advanced = ROUND(
    COALESCE(trails_advanced, 0)::numeric * 100 /
    GREATEST(
      COALESCE(trails_beginner, 0) +
      COALESCE(trails_intermediate, 0) +
      COALESCE(trails_advanced, 0) +
      COALESCE(trails_expert, 0),
      1
    )
  ),
  difficulty_pct_expert = ROUND(
    COALESCE(trails_expert, 0)::numeric * 100 /
    GREATEST(
      COALESCE(trails_beginner, 0) +
      COALESCE(trails_intermediate, 0) +
      COALESCE(trails_advanced, 0) +
      COALESCE(trails_expert, 0),
      1
    )
  )
WHERE
  trails_beginner IS NOT NULL OR
  trails_intermediate IS NOT NULL OR
  trails_advanced IS NOT NULL OR
  trails_expert IS NOT NULL;

-- Sanity check: how many resorts now have a backfilled pct?
SELECT COUNT(*) AS resorts_with_pct
FROM resorts
WHERE difficulty_pct_beginner IS NOT NULL
   OR difficulty_pct_intermediate IS NOT NULL
   OR difficulty_pct_advanced IS NOT NULL
   OR difficulty_pct_expert IS NOT NULL;

COMMIT;
