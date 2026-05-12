-- Stage 23 — schema migration: add lifts/elevation/snowfall/amenity columns
-- Idempotent — uses IF NOT EXISTS so re-running is safe.

BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS total_lifts SMALLINT
    CHECK (total_lifts IS NULL OR (total_lifts >= 0 AND total_lifts <= 200)),
  ADD COLUMN IF NOT EXISTS high_speed_lifts SMALLINT
    CHECK (high_speed_lifts IS NULL OR (high_speed_lifts >= 0 AND high_speed_lifts <= 100)),
  ADD COLUMN IF NOT EXISTS base_elevation_ft INTEGER
    CHECK (base_elevation_ft IS NULL OR (base_elevation_ft >= -100 AND base_elevation_ft <= 14000)),
  ADD COLUMN IF NOT EXISTS summit_elevation_ft INTEGER
    CHECK (summit_elevation_ft IS NULL OR (summit_elevation_ft >= 0 AND summit_elevation_ft <= 14500)),
  ADD COLUMN IF NOT EXISTS annual_snowfall_in INTEGER
    CHECK (annual_snowfall_in IS NULL OR (annual_snowfall_in >= 0 AND annual_snowfall_in <= 1000)),
  ADD COLUMN IF NOT EXISTS season_open_text TEXT,
  ADD COLUMN IF NOT EXISTS season_close_text TEXT,
  ADD COLUMN IF NOT EXISTS snowmaking_pct SMALLINT
    CHECK (snowmaking_pct IS NULL OR (snowmaking_pct >= 0 AND snowmaking_pct <= 100)),
  ADD COLUMN IF NOT EXISTS has_tubing BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_lessons BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_rentals BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_lodging_on_mountain BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_xc_skiing BOOLEAN,
  ADD COLUMN IF NOT EXISTS has_backcountry_access BOOLEAN,
  ADD COLUMN IF NOT EXISTS trail_map_url TEXT,
  ADD COLUMN IF NOT EXISTS webcam_url TEXT,
  ADD COLUMN IF NOT EXISTS closest_airport_iata TEXT
    CHECK (closest_airport_iata IS NULL OR LENGTH(closest_airport_iata) = 3),
  ADD COLUMN IF NOT EXISTS closest_airport_distance_mi SMALLINT
    CHECK (closest_airport_distance_mi IS NULL OR (closest_airport_distance_mi >= 0 AND closest_airport_distance_mi <= 2000));

COMMENT ON COLUMN resorts.total_lifts IS 'Total number of lifts (all types).';
COMMENT ON COLUMN resorts.high_speed_lifts IS 'Number of high-speed/detachable/express lifts.';
COMMENT ON COLUMN resorts.base_elevation_ft IS 'Base elevation in feet.';
COMMENT ON COLUMN resorts.summit_elevation_ft IS 'Summit elevation in feet.';
COMMENT ON COLUMN resorts.annual_snowfall_in IS 'Average annual snowfall in inches.';
COMMENT ON COLUMN resorts.season_open_text IS 'Descriptive season open date (e.g. "Mid-November").';
COMMENT ON COLUMN resorts.season_close_text IS 'Descriptive season close date (e.g. "Mid-April").';
COMMENT ON COLUMN resorts.snowmaking_pct IS 'Percent of skiable area covered by snowmaking (0-100).';
COMMENT ON COLUMN resorts.closest_airport_iata IS '3-letter IATA code of closest commercial airport.';
COMMENT ON COLUMN resorts.closest_airport_distance_mi IS 'Driving distance to closest_airport_iata in miles.';

COMMIT;
