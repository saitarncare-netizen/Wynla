-- Stage 26 — live snow + lift/trail open conditions.
-- These columns hold a snapshot from the most recent scrape. A future
-- daily cron job refreshes them; for now we backfill once.

BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS snow_base_depth_in SMALLINT
    CHECK (snow_base_depth_in IS NULL OR (snow_base_depth_in >= 0 AND snow_base_depth_in <= 400)),
  ADD COLUMN IF NOT EXISTS snow_new_24h_in SMALLINT
    CHECK (snow_new_24h_in IS NULL OR (snow_new_24h_in >= 0 AND snow_new_24h_in <= 100)),
  ADD COLUMN IF NOT EXISTS snow_new_48h_in SMALLINT
    CHECK (snow_new_48h_in IS NULL OR (snow_new_48h_in >= 0 AND snow_new_48h_in <= 200)),
  ADD COLUMN IF NOT EXISTS snow_new_7d_in SMALLINT
    CHECK (snow_new_7d_in IS NULL OR (snow_new_7d_in >= 0 AND snow_new_7d_in <= 300)),
  ADD COLUMN IF NOT EXISTS trails_open_today SMALLINT
    CHECK (trails_open_today IS NULL OR trails_open_today >= 0),
  ADD COLUMN IF NOT EXISTS lifts_open_today SMALLINT
    CHECK (lifts_open_today IS NULL OR lifts_open_today >= 0),
  ADD COLUMN IF NOT EXISTS snow_report_status TEXT
    CHECK (snow_report_status IS NULL OR snow_report_status IN ('open', 'closed', 'limited', 'off-season')),
  ADD COLUMN IF NOT EXISTS snow_report_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN resorts.snow_base_depth_in IS 'Reported base depth in inches.';
COMMENT ON COLUMN resorts.snow_new_24h_in IS 'New snowfall in the last 24h, inches.';
COMMENT ON COLUMN resorts.snow_report_status IS 'Operational state at last refresh: open / closed / limited / off-season.';
COMMENT ON COLUMN resorts.snow_report_updated_at IS 'Timestamp of last snow report scrape.';

COMMIT;
