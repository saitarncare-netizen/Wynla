-- Pro tier waitlist: collect willingness-to-pay signal before any paywall
-- exists. Anyone can submit (email + optional source tag), nobody can read
-- via the public client (admin-only via service role / Supabase Studio).

BEGIN;

CREATE TABLE IF NOT EXISTS pro_waitlist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT,                                    -- "header" / "/pro" / etc
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email)
);

ALTER TABLE pro_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (signed-in or anon) can add themselves to the waitlist.
DROP POLICY IF EXISTS "waitlist_insert_open" ON pro_waitlist;
CREATE POLICY "waitlist_insert_open" ON pro_waitlist
  FOR INSERT WITH CHECK (true);

-- Read is intentionally NOT exposed to the public client. Use the SQL
-- editor / service role key to inspect signups; never expose the list to
-- web users.

SELECT 'ok' AS status, COUNT(*) AS row_count FROM pro_waitlist;

COMMIT;
