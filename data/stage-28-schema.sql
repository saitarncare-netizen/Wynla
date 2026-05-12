-- Stage 28 — user reviews + group trip sharing.
-- 2 new tables + RLS policies.

BEGIN;

-- Reviews: signed-in users post a 1-5 rating + optional text per resort.
CREATE TABLE IF NOT EXISTS resort_reviews (
  id BIGSERIAL PRIMARY KEY,
  resort_id BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One review per user per resort. New reviews update the old one.
  UNIQUE (resort_id, user_id)
);

CREATE INDEX IF NOT EXISTS resort_reviews_resort_idx ON resort_reviews(resort_id);
CREATE INDEX IF NOT EXISTS resort_reviews_user_idx ON resort_reviews(user_id);

ALTER TABLE resort_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all" ON resort_reviews;
CREATE POLICY "reviews_select_all" ON resort_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert_own" ON resort_reviews;
CREATE POLICY "reviews_insert_own" ON resort_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_update_own" ON resort_reviews;
CREATE POLICY "reviews_update_own" ON resort_reviews FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON resort_reviews;
CREATE POLICY "reviews_delete_own" ON resort_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Trip shares: trip owner generates a public-read token. Anyone with
-- the token can view the trip read-only via /trip/share/[token].
CREATE TABLE IF NOT EXISTS trip_shares (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS trip_shares_token_idx ON trip_shares(share_token);
CREATE INDEX IF NOT EXISTS trip_shares_trip_idx ON trip_shares(trip_id);

ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;

-- Anyone can read by token (the token IS the access control).
DROP POLICY IF EXISTS "trip_shares_select_all" ON trip_shares;
CREATE POLICY "trip_shares_select_all" ON trip_shares FOR SELECT USING (true);

-- Only trip owner can create/delete shares.
DROP POLICY IF EXISTS "trip_shares_insert_owner" ON trip_shares;
CREATE POLICY "trip_shares_insert_owner" ON trip_shares FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "trip_shares_delete_owner" ON trip_shares;
CREATE POLICY "trip_shares_delete_owner" ON trip_shares FOR DELETE
  USING (auth.uid() = created_by);

COMMIT;
