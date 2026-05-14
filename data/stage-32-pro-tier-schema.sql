-- Stage 32 — Pro tier scaffolding.
-- One subscription row per user. Status mirrors Stripe's subscription
-- lifecycle so the app can gate features off `status = 'active'` (or
-- 'trialing'). Writes happen only via the Stripe webhook using the
-- service role; clients can read their own row but never write it.

BEGIN;

CREATE TABLE IF NOT EXISTS pro_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL,          -- 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'
  price_id TEXT,
  cancel_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pro_subs_user_idx ON pro_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS pro_subs_stripe_idx ON pro_subscriptions(stripe_customer_id);

ALTER TABLE pro_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription row.
DROP POLICY IF EXISTS "pro_subs_select_own" ON pro_subscriptions;
CREATE POLICY "pro_subs_select_own" ON pro_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- No client write policy. The Stripe webhook handler uses the service
-- role key, which bypasses RLS for inserts/updates.

COMMIT;
