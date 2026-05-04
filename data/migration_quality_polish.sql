-- Stage 3.5 quality polish migration
-- Adds attribution + verification metadata so we can show trust signals.

ALTER TABLE resorts ADD COLUMN IF NOT EXISTS hero_image_source TEXT;
   -- e.g. "Wikipedia: https://en.wikipedia.org/wiki/Foo" or "Resort site"
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS hero_image_alt TEXT;
   -- accessibility text for the hero image
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
   -- bumped each time we re-audit pass info / stats / coords

-- Verify
SELECT
  COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS with_hero,
  COUNT(*) FILTER (WHERE last_verified_at IS NOT NULL) AS verified
FROM resorts;
