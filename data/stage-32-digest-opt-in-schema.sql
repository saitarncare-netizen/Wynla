-- Stage 32 — digest email opt-in.
--
-- One row per user who has opted in to email digests. The daily-digest cron
-- reads this table, joins to favorites + resorts + weather_cache, and sends
-- a personalised email via Resend. `frequency` lets users pick a cadence:
--   * 'daily'   — every run, if last_sent_at > 22h ago (or null)
--   * 'weekly'  — Mondays only, if last_sent_at > 6d ago
--   * 'powder'  — handled by the snow-alert cron, NOT this one (skipped here)
-- `threshold_in` only matters for the snow-alert path (parity with snow_alerts).

BEGIN;

CREATE TABLE IF NOT EXISTS digest_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily',  -- 'daily' | 'weekly' | 'powder'
  threshold_in INTEGER DEFAULT 0,            -- min snow to trigger 'powder' frequency
  last_sent_at TIMESTAMPTZ,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digest_subs_user_idx ON digest_subscriptions(user_id);

ALTER TABLE digest_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "digest_subs_select_own" ON digest_subscriptions;
CREATE POLICY "digest_subs_select_own" ON digest_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "digest_subs_insert_own" ON digest_subscriptions;
CREATE POLICY "digest_subs_insert_own" ON digest_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "digest_subs_update_own" ON digest_subscriptions;
CREATE POLICY "digest_subs_update_own" ON digest_subscriptions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "digest_subs_delete_own" ON digest_subscriptions;
CREATE POLICY "digest_subs_delete_own" ON digest_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
