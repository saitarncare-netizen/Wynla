# Wynla — Database Schema

---

## Overview

This document defines the database structure for Wynla. We use **Supabase (PostgreSQL)**.

The schema is designed to be:
- **Simple** — easy to query and maintain
- **Flexible** — can add fields without breaking
- **Performant** — indexed for common queries
- **Future-ready** — supports planned features

---

## 1. Core Tables

### `resorts` — Main resort information

```sql
CREATE TABLE resorts (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- URL-friendly: "hunter-mountain"
  name TEXT NOT NULL,                  -- "Hunter Mountain"
  
  -- Location
  state TEXT NOT NULL,                 -- "NY", "VT", "NH", etc.
  region TEXT,                         -- "Catskills", "Poconos", etc.
  city TEXT,                           -- "Hunter"
  address TEXT,                        -- Full address
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  elevation_base INTEGER,              -- in feet
  elevation_summit INTEGER,            -- in feet
  
  -- Pass affiliation
  pass TEXT NOT NULL DEFAULT 'independent',
                                       -- LEGACY single-pass field, kept as a Stage 1 rollback safety net.
                                       -- NEW CODE READS `passes` (array). `pass` will be dropped in Stage 2.
  passes TEXT[] DEFAULT '{}',          -- Stage 1 addition. A resort can be on multiple passes
                                       -- e.g. Whiteface = ['independent','mountain_collective'].
                                       -- Allowed values: 'epic','ikon','indy','mountain_collective','independent'.
                                       -- Convention: store in priority order; first element is the
                                       -- "primary" pass used for pin color in the map UI.
  pass_access_type TEXT,               -- 'unlimited', 'limited_5', 'limited_7', etc.
  
  -- Operating info
  typical_season_start TEXT,           -- "Mid-November"
  typical_season_end TEXT,             -- "Mid-April"
  weekday_hours TEXT,                  -- "9am-4pm"
  weekend_hours TEXT,                  -- "8am-4pm"
  has_night_skiing BOOLEAN DEFAULT false,
  night_skiing_hours TEXT,             -- "4pm-9pm" if applicable
  
  -- Mountain stats
  vertical_drop INTEGER,               -- in feet
  total_acres INTEGER,
  total_trails INTEGER,
  trails_beginner INTEGER,
  trails_intermediate INTEGER,
  trails_advanced INTEGER,
  trails_expert INTEGER,
  total_lifts INTEGER,
  longest_run_miles DECIMAL(4, 2),
  
  -- Trail characteristics (computed/manual)
  trail_width_profile TEXT,            -- 'mostly_wide', 'mostly_narrow', 'mixed'
  has_terrain_park BOOLEAN DEFAULT false,
  terrain_park_count INTEGER DEFAULT 0,
  has_halfpipe BOOLEAN DEFAULT false,
  has_glades BOOLEAN DEFAULT false,
  glades_acreage INTEGER,
  
  -- Suitability indicators (neutral, fact-based)
  beginner_area_size TEXT,             -- 'small', 'medium', 'large'
  has_dedicated_lessons BOOLEAN DEFAULT true,
  
  -- Web links
  website_url TEXT,
  trail_map_url TEXT,
  webcam_url TEXT,
  ticket_booking_url TEXT,
  
  -- Affiliate tracking
  ticket_affiliate_url TEXT,           -- Liftopia or direct affiliate link
  hotel_affiliate_url TEXT,            -- Booking.com partner link for nearby
  
  -- Hero image (use free stock or Unsplash)
  hero_image_url TEXT,
  hero_image_credit TEXT,
  
  -- Status (Stage 2 additions)
  tier TEXT NOT NULL DEFAULT 'listed'
    CHECK (tier IN ('featured', 'listed')),
                                       -- 'featured' = the 30 NE resorts with deep stats fields populated.
                                       -- 'listed' = bulk imported (~355), basic info only (lat/lng/passes/website).
                                       -- Map UI renders featured pins large with a star, listed pins smaller and faded.
  operating_status TEXT NOT NULL DEFAULT 'active'
    CHECK (operating_status IN ('active', 'closed', 'seasonal')),
                                       -- 'closed' = permanently shuttered, 'seasonal' = limited/intermittent ops.
  active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_resorts_state ON resorts(state);
CREATE INDEX idx_resorts_pass ON resorts(pass);
CREATE INDEX idx_resorts_active ON resorts(active);
CREATE INDEX idx_resorts_location ON resorts(latitude, longitude);
```

---

### `resort_features` — Many-to-many for features (flexible)

```sql
CREATE TABLE resort_features (
  id BIGSERIAL PRIMARY KEY,
  resort_id BIGINT REFERENCES resorts(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_value TEXT,
  
  UNIQUE(resort_id, feature_key)
);

-- Examples of feature_key:
-- 'snow_tubing', 'ice_skating', 'tubing_park', 'restaurant_count',
-- 'lodge_count', 'rental_shop', 'lessons_available', 'kids_program'

CREATE INDEX idx_resort_features_resort ON resort_features(resort_id);
CREATE INDEX idx_resort_features_key ON resort_features(feature_key);
```

---

### `weather_cache` — Cache weather data to reduce API calls

```sql
CREATE TABLE weather_cache (
  id BIGSERIAL PRIMARY KEY,
  resort_id BIGINT REFERENCES resorts(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  
  -- Daily forecast data
  temp_max INTEGER,                    -- Fahrenheit
  temp_min INTEGER,
  snowfall_inches DECIMAL(4, 1),
  rainfall_inches DECIMAL(4, 1),
  wind_speed_mph INTEGER,
  conditions_summary TEXT,             -- 'sunny', 'cloudy', 'snow', 'mixed'
  
  -- Metadata
  source TEXT DEFAULT 'open-meteo',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resort_id, forecast_date)
);

CREATE INDEX idx_weather_resort_date ON weather_cache(resort_id, forecast_date);
CREATE INDEX idx_weather_fetched ON weather_cache(fetched_at);
```

---

### `drive_time_cache` — Pre-computed drive times from major origins

```sql
CREATE TABLE drive_time_cache (
  id BIGSERIAL PRIMARY KEY,
  resort_id BIGINT REFERENCES resorts(id) ON DELETE CASCADE,
  origin_name TEXT NOT NULL,           -- 'NYC', 'Boston', 'Philadelphia', 'Hartford'
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lon DECIMAL(10, 7) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  distance_meters INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(resort_id, origin_name)
);

CREATE INDEX idx_drive_time_resort ON drive_time_cache(resort_id);
CREATE INDEX idx_drive_time_origin ON drive_time_cache(origin_name);
```

---

## 2. Future Tables (Phase 2)

These will be added when we add user accounts and advanced features:

### `users` — User accounts (Phase 2)

```sql
-- Will use Supabase Auth (auth.users)
-- Plus profile table:

CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  preferred_pass TEXT,
  skill_level TEXT,
  preferred_origin_lat DECIMAL(10, 7),
  preferred_origin_lon DECIMAL(10, 7),
  is_pro BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `favorites` — Saved resorts (Phase 2)

```sql
CREATE TABLE favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  resort_id BIGINT REFERENCES resorts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, resort_id)
);
```

### `analytics_events` — Track user behavior (Phase 2)

```sql
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT,                     -- Anonymous session
  event_type TEXT NOT NULL,            -- 'view_resort', 'click_external', etc.
  resort_id BIGINT REFERENCES resorts(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
```

---

## 3. Sample Data — Hunter Mountain

```sql
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
```

---

## 4. Common Query Patterns

### Get all resorts for map view

```sql
SELECT 
  id, slug, name, latitude, longitude, pass,
  hero_image_url
FROM resorts 
WHERE active = true;
```

### Get filtered resorts

```sql
SELECT * FROM resorts
WHERE active = true
  AND pass = 'ikon'                    -- Filter by pass
  AND has_terrain_park = true          -- Has terrain park
  AND id IN (                          -- Within 3 hours from NYC
    SELECT resort_id FROM drive_time_cache
    WHERE origin_name = 'NYC'
      AND duration_seconds <= 10800
  );
```

### Get resort detail with weather

```sql
SELECT 
  r.*,
  json_agg(w.* ORDER BY w.forecast_date) AS weather
FROM resorts r
LEFT JOIN weather_cache w ON w.resort_id = r.id
WHERE r.slug = 'hunter-mountain'
  AND w.forecast_date >= CURRENT_DATE
  AND w.forecast_date < CURRENT_DATE + INTERVAL '7 days'
GROUP BY r.id;
```

---

## 5. Initial Resort List (30 for MVP)

### Catskills, NY (4 resorts)
1. Hunter Mountain (Epic)
2. Windham Mountain (Ikon)
3. Belleayre Mountain (Independent)
4. Plattekill Mountain (Indy)

### Adirondacks, NY (3)
5. Gore Mountain (Independent)
6. Whiteface Mountain (Independent)
7. Mount Pisgah (Independent)

### Lower NY (2)
8. Thunder Ridge Ski Area (Independent)
9. Mount Peter (Independent)

### NJ (1)
10. Mountain Creek (Independent)

### Poconos, PA (7)
11. Camelback Mountain (Independent)
12. Blue Mountain Resort (Indy)
13. Shawnee Mountain (Independent)
14. Jack Frost Mountain (Independent)
15. Big Boulder (Independent)
16. Montage Mountain (Independent)
17. Elk Mountain (Independent)

### Connecticut (2)
18. Mohawk Mountain (Independent)
19. Mount Southington (Independent)

### Massachusetts (4)
20. Berkshire East (Indy)
21. Catamount (Independent)
22. Jiminy Peak (Independent)
23. Wachusett Mountain (Independent)

### Vermont Southern (5)
24. Stratton Mountain (Ikon)
25. Mount Snow (Ikon)
26. Magic Mountain (Indy)
27. Bromley Mountain (Independent)
28. Okemo Mountain (Epic)

### New Hampshire (2)
29. Loon Mountain (Ikon)
30. Cannon Mountain (Independent)

---

## 6. Data Collection Workflow

For each resort, collect:

**From resort website:**
- Trails count by difficulty
- Vertical drop
- Lift count
- Operating hours
- Features (terrain park, etc.)
- Trail map URL
- Ticket booking URL

**From Google Maps:**
- Latitude/Longitude
- Address

**From Wikipedia:**
- Founding year
- General history (optional)

**From pass websites:**
- Pass affiliation (Epic/Ikon/Indy)
- Access type (unlimited vs limited)

**From Unsplash/Pexels:**
- Hero image (free, attributable)

---

## 7. Setup Instructions for Cursor

When you (Cursor AI) help set up the database:

1. Create Supabase project
2. Open SQL Editor in Supabase
3. Run schema from this document
4. Insert sample data (Hunter Mountain example)
5. Test query: `SELECT * FROM resorts;`
6. Set up Row Level Security policies
7. Create environment variables in Next.js project

---

## 8. Security Policies (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE resort_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_time_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public read resorts"
  ON resorts FOR SELECT
  USING (active = true);

CREATE POLICY "Public read features"
  ON resort_features FOR SELECT
  USING (true);

CREATE POLICY "Public read weather"
  ON weather_cache FOR SELECT
  USING (true);

CREATE POLICY "Public read drive times"
  ON drive_time_cache FOR SELECT
  USING (true);

-- Only service role can write (for now)
-- We'll add auth-based policies in Phase 2
```

---

## 9. Backup Strategy

### Free tier:
- Supabase auto-backups daily (7 days retention)
- Manual export weekly to JSON

### When scaling:
- Upgrade to paid tier for longer retention
- Set up automated backups to S3

---

## 10. Migration Strategy

When schema changes:

1. Create new migration file
2. Test locally first
3. Apply to staging Supabase
4. Apply to production with rollback plan
5. Update this document

```bash
# Example migration file naming
migrations/
├── 001_initial_schema.sql
├── 002_add_glades_acreage.sql
├── 003_add_user_profiles.sql
```

---

*Update this document as the schema evolves.*
