-- Stage 9: persistent trip planner.
-- Each row is one user's saved multi-day ski itinerary. RLS makes it
-- so users can only ever see and modify their own trips. Anonymous
-- traffic uses URL-state only — they don't write here.

CREATE TABLE IF NOT EXISTS trips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  origin_lat    DOUBLE PRECISION NOT NULL,
  origin_lng    DOUBLE PRECISION NOT NULL,
  origin_label  TEXT,
  -- Ordered list of resort.slug values, one per day. Length === total_days.
  -- Roadtrip mode: each entry is a different slug. Basecamp mode: all entries
  -- repeat the same slug.
  resort_slugs  TEXT[] NOT NULL,
  lodging_mode  TEXT NOT NULL DEFAULT 'roadtrip',
  total_days    INTEGER NOT NULL CHECK (total_days BETWEEN 1 AND 14),
  -- Once the user clicks "Start trip", started_at is filled and current_day
  -- begins at 1. Each "Mark today complete" advances current_day and pushes
  -- the previous day into completed_days.
  started_at        TIMESTAMPTZ,
  current_day       INTEGER,
  completed_days    INTEGER[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trips_lodging_mode_chk CHECK (lodging_mode IN ('basecamp', 'roadtrip'))
);

CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id, created_at DESC);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trips_select_own ON trips;
CREATE POLICY trips_select_own ON trips FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trips_insert_own ON trips;
CREATE POLICY trips_insert_own ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS trips_update_own ON trips;
CREATE POLICY trips_update_own ON trips FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trips_delete_own ON trips;
CREATE POLICY trips_delete_own ON trips FOR DELETE USING (auth.uid() = user_id);

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION trips_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trips_updated_at_trg ON trips;
CREATE TRIGGER trips_updated_at_trg
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION trips_set_updated_at();
