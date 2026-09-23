-- 2026-09-23 — install package (one-tap install + installed-app polish).
--
-- push_subscriptions has SELECT / INSERT / DELETE policies only
-- (data/stage-29-schema.sql). /api/push/subscribe upserts by endpoint, so
-- re-POSTing an existing subscription — which PwaRegistrar now does once
-- per session for signed-in users to keep last_seen_at fresh and to bind
-- a row the service worker re-created while signed out — hits the
-- ON CONFLICT ... DO UPDATE path and is denied without an UPDATE policy.
--
-- Idempotent: safe to run more than once. Run in the Supabase SQL editor
-- as the postgres role.

BEGIN;

DROP POLICY IF EXISTS "push_subs_update_own" ON push_subscriptions;
CREATE POLICY "push_subs_update_own" ON push_subscriptions FOR UPDATE
  -- A signed-in user may update their own rows and claim anonymous ones;
  -- the new row must still be theirs (or stay anonymous). Nobody can
  -- reassign a row to a different user or strip another user's ownership.
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

COMMIT;
