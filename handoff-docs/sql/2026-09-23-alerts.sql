-- Snow alerts + digest package (2026-09-23). Idempotent; run once in the
-- Supabase SQL editor. The app works before AND after this runs:
--   * /api/push/subscribe already writes with the service role after
--     verifying ownership, so the missing UPDATE policy no longer blocks
--     re-enabling alerts on a device. The policy below makes the RLS path
--     (used when SUPABASE_SERVICE_ROLE_KEY is absent) work too and is the
--     correct long-term shape.
--   * Nothing else in this package needs new tables or columns: the
--     one-click unsubscribe token is an HMAC over digest_subscriptions.id,
--     and per-day alert dedupe uses the existing snow_alerts.last_alerted_at.

-- push_subscriptions had SELECT / INSERT / DELETE policies only. A
-- supabase-js upsert is INSERT ... ON CONFLICT DO UPDATE, and Postgres
-- evaluates UPDATE policies on the conflict path, so the second enable on
-- the same browser (endpoint already stored) was rejected under RLS.
-- Owner rows and not-yet-claimed (NULL user) rows may be updated by the
-- signed-in caller; the WITH CHECK keeps a row from being handed to a
-- different user through the anon client.
DROP POLICY IF EXISTS "push_subs_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_update_own" ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- The push cron fans out by user; the digest cron looks up rows by id for
-- one-click unsubscribe. Both are tiny tables today, but the indexes cost
-- nothing and keep the crons flat as subscribers grow.
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS snow_alerts_enabled_resort_idx
  ON public.snow_alerts (resort_id)
  WHERE enabled;
