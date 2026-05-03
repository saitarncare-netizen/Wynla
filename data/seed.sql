-- RideWise database — initial schema + Hunter Mountain sample
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run)

-- 1. Create the resorts table
CREATE TABLE resorts (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,

  -- Location
  state TEXT NOT NULL,
  region TEXT,
  city TEXT,
  address TEXT,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  elevation_base INTEGER,
  elevation_summit INTEGER,

  -- Pass affiliation
  pass TEXT NOT NULL DEFAULT 'independent',
  pass_access_type TEXT,

  -- Operating info
  typical_season_start TEXT,
  typical_season_end TEXT,
  weekday_hours TEXT,
  weekend_hours TEXT,
  has_night_skiing BOOLEAN DEFAULT false,
  night_skiing_hours TEXT,

  -- Mountain stats
  vertical_drop INTEGER,
  total_acres INTEGER,
  total_trails INTEGER,
  trails_beginner INTEGER,
  trails_intermediate INTEGER,
  trails_advanced INTEGER,
  trails_expert INTEGER,
  total_lifts INTEGER,
  longest_run_miles DECIMAL(4, 2),

  -- Trail characteristics
  trail_width_profile TEXT,
  has_terrain_park BOOLEAN DEFAULT false,
  terrain_park_count INTEGER DEFAULT 0,
  has_halfpipe BOOLEAN DEFAULT false,
  has_glades BOOLEAN DEFAULT false,
  glades_acreage INTEGER,

  -- Suitability indicators
  beginner_area_size TEXT,
  has_dedicated_lessons BOOLEAN DEFAULT true,

  -- Web links
  website_url TEXT,
  trail_map_url TEXT,
  webcam_url TEXT,
  ticket_booking_url TEXT,
  ticket_affiliate_url TEXT,
  hotel_affiliate_url TEXT,

  -- Hero image
  hero_image_url TEXT,
  hero_image_credit TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for common queries
CREATE INDEX idx_resorts_state ON resorts(state);
CREATE INDEX idx_resorts_pass ON resorts(pass);
CREATE INDEX idx_resorts_active ON resorts(active);
CREATE INDEX idx_resorts_location ON resorts(latitude, longitude);

-- 3. Row Level Security — anon key can READ active resorts, nothing else
ALTER TABLE resorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read resorts"
  ON resorts FOR SELECT
  USING (active = true);

-- 4. Insert Hunter Mountain as the first sample row
INSERT INTO resorts (
  slug, name, state, region, city, address,
  latitude, longitude, elevation_base, elevation_summit,
  pass, pass_access_type,
  typical_season_start, typical_season_end,
  weekday_hours, weekend_hours,
  vertical_drop, total_acres, total_trails,
  trails_beginner, trails_intermediate, trails_advanced, trails_expert,
  total_lifts, trail_width_profile,
  has_terrain_park, terrain_park_count, has_halfpipe, has_glades,
  beginner_area_size, has_night_skiing,
  website_url, trail_map_url, ticket_booking_url,
  active
) VALUES (
  'hunter-mountain',
  'Hunter Mountain',
  'NY',
  'Catskills',
  'Hunter',
  '64 Klein Ave, Hunter, NY 12442',
  42.1798, -74.2257,
  1600, 3200,
  'epic', 'unlimited',
  'Mid-November', 'Mid-April',
  '9am-4pm', '8am-4pm',
  1600, 320, 67,
  20, 27, 15, 5,
  13, 'mixed',
  true, 4, false, true,
  'medium', false,
  'https://www.huntermtn.com',
  'https://www.huntermtn.com/the-mountain/trail-map.aspx',
  'https://www.huntermtn.com/tickets',
  true
);

-- 5. Verify — should return 1 row
SELECT id, slug, name, state, pass FROM resorts;
