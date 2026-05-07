-- Stage 5 schema: profiles + favorites tables, both with RLS so a user can
-- only read/write their own rows. Public reads are intentionally NOT allowed
-- on profiles/favorites — those are private user data.
--
-- Apply via Supabase SQL Editor. Idempotent (CREATE IF NOT EXISTS, etc.)

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- profiles: user metadata that doesn't fit auth.users.user_metadata cleanly
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  preferred_origin TEXT CHECK (preferred_origin IN ('nyc','boston','philadelphia','hartford') OR preferred_origin IS NULL),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create a profile row on signup so the app never has to handle a
-- null-profile state. Trigger fires after auth.users insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ───────────────────────────────────────────────────────────────────────
-- favorites: the v1 retention loop. One row per (user, resort) pair.
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resort_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_resort ON favorites(resort_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Sanity: confirm tables + RLS exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.table_name) AS rls_policy_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name IN ('profiles', 'favorites');

COMMIT;
