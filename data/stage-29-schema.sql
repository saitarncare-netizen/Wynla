-- Stage 29 — PWA push notifications + per-resort snow alerts.
-- Web Push (VAPID) first. Native iOS comes later in Stage 30+ via Capacitor.

BEGIN;

-- Each browser/device that opts in for push stores its PushSubscription here.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subs_select_own" ON push_subscriptions;
CREATE POLICY "push_subs_select_own" ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "push_subs_insert_own" ON push_subscriptions;
CREATE POLICY "push_subs_insert_own" ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "push_subs_delete_own" ON push_subscriptions;
CREATE POLICY "push_subs_delete_own" ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Per-user-per-resort snow alert preferences.
-- e.g. user wants "ping me when Vail gets 6+ inches in 24h".
CREATE TABLE IF NOT EXISTS snow_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resort_id BIGINT NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  threshold_in SMALLINT NOT NULL DEFAULT 6
    CHECK (threshold_in >= 1 AND threshold_in <= 50),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_alerted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, resort_id)
);

CREATE INDEX IF NOT EXISTS snow_alerts_user_idx ON snow_alerts(user_id);
CREATE INDEX IF NOT EXISTS snow_alerts_resort_idx ON snow_alerts(resort_id);

ALTER TABLE snow_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snow_alerts_select_own" ON snow_alerts;
CREATE POLICY "snow_alerts_select_own" ON snow_alerts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "snow_alerts_insert_own" ON snow_alerts;
CREATE POLICY "snow_alerts_insert_own" ON snow_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "snow_alerts_update_own" ON snow_alerts;
CREATE POLICY "snow_alerts_update_own" ON snow_alerts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "snow_alerts_delete_own" ON snow_alerts;
CREATE POLICY "snow_alerts_delete_own" ON snow_alerts FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
