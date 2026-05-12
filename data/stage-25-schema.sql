-- Stage 25 — resort hero image columns (winter ski scenes only).
-- Idempotent. Most columns may already exist from earlier hero work;
-- IF NOT EXISTS keeps re-running safe.

BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_source TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_alt TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_attribution TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_verified_winter BOOLEAN;

COMMENT ON COLUMN resorts.hero_image_url IS 'URL to a hero image — must be a winter ski/snowboard scene of THIS resort.';
COMMENT ON COLUMN resorts.hero_image_source IS 'Origin: wikimedia | wikipedia | official | press | onthesnow | skiresort.info';
COMMENT ON COLUMN resorts.hero_image_alt IS 'Alt text describing the image (accessibility + crawl signal).';
COMMENT ON COLUMN resorts.hero_image_attribution IS 'Required credit line / license note (CC BY-SA, photo by X, etc).';
COMMENT ON COLUMN resorts.hero_image_verified_winter IS 'true = 2+ agents independently flagged this as a winter ski scene.';

COMMIT;
