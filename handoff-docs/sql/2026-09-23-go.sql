-- Go package (2026-09-23): "where should I ride this Saturday" — /go page +
-- the Thursday picks email. NOT RUN YET. Idempotent; paste into the
-- Supabase SQL editor once. The app feature-detects both objects
-- (PostgREST 42703 / PGRST205 → graceful fallback, logged once), so the
-- deploy is safe before and after this runs:
--   * before: /go works for everyone (no login), "Email me this every
--     Thursday" tells signed-in users it is coming, the cron exits with
--     reason "profiles.pass_product missing".
--   * after: the opt-in saves city + pass product, the cron sends.
--
-- Depends on: public.profiles (live), public.digest_subscriptions (live).
-- cron_runs (handoff-docs/sql/2026-09-23-ALL-season-1.sql) is optional —
-- it only adds run history and the same-day dedupe.

-- ---------------------------------------------------------------------------
-- 1. profiles.pass_product — which pass product the Thursday email ranks for,
--    and the consent for that list: NOT NULL = on the Thursday list,
--    NULL = not opted in. It is independent of digest_subscriptions.enabled
--    (the weekly favorites digest); the digest row only supplies the
--    address and the id the signed unsubscribe link is minted from, and
--    /api/go/subscribe creates one with enabled = false when the user has
--    none. The Thursday email's unsubscribe link (list=thursday) clears
--    this column and nothing else.
--    Values are "<family>" or "<family>:<productKey>" from lib/passAccess.ts,
--    e.g. "ikon", "ikon:ikon-base-pass", "epic:northeast-value-pass".
--    "any" means no pass (lift tickets). The API validates against the
--    verified dataset before writing, so no CHECK constraint here: product
--    keys change every season and a constraint would need a migration each
--    time.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists pass_product text;

comment on column public.profiles.pass_product is
  'Thursday picks email: pass family[:productKey] to rank for (lib/passAccess.ts keys, or "any"). NOT NULL = on the list, NULL = not opted in. Set by /api/go/subscribe, cleared by DELETE or the list=thursday unsubscribe link. Independent of digest_subscriptions.enabled.';

-- The existing owner-only RLS policies on profiles cover the new column.
-- The service role (cron, unsubscribe route) bypasses RLS as usual.

-- ---------------------------------------------------------------------------
-- 2. saturday_predictions — what we told whom, so the picks can be scored
--    against what actually happened (strategy 2026-09-18: collect
--    prediction data silently from day one). One row per (origin, pass
--    product, target date) per cron run; the page does not write here.
--    Service-role only: RLS on, no policies.
-- ---------------------------------------------------------------------------
create table if not exists public.saturday_predictions (
  id            bigint generated always as identity primary key,
  made_at       timestamptz not null default now(),
  source        text not null default 'thursday-picks',   -- cron job / page
  origin_code   text not null,                            -- lib/origins.ts code
  pass_product  text not null,                            -- same vocabulary as profiles.pass_product
  target_date   date not null,
  horizon_days  smallint not null,
  mode          text not null,                            -- picks | no-picks | off-season | none
  -- Top picks + runners-up as the ranking produced them: slug, score,
  -- breakdown, expected snow, surface code + confidence, drive seconds,
  -- confidence tag. Enough to grade later without re-running old inputs.
  picks         jsonb not null,
  recipients    integer not null default 0
);

create index if not exists saturday_predictions_target_idx
  on public.saturday_predictions (target_date, origin_code, pass_product);

alter table public.saturday_predictions enable row level security;

comment on table public.saturday_predictions is
  'Saturday picks as sent (Thursday email) for later verification against measured snow and reported surface. Service role writes; nothing reads yet.';

-- ---------------------------------------------------------------------------
-- 3. Optional: drive_time_cache rows for the new launch cities. The /go
--    page (and the map) estimate drive times ("≈") for Washington DC,
--    Chicago, Minneapolis and Detroit until the cache job
--    (scripts/compute-drive-times.mjs) is run with origin_name set to
--    the exact `name` strings in lib/origins.ts ORIGINS ("Washington",
--    "Chicago", "Minneapolis", "Detroit" — note DC's name is plain
--    "Washington" since the round-2 integration). Once rows exist, flip
--    `cached` to true on those entries (the last argument of city())
--    so both surfaces read them. Philadelphia is listed as cached in
--    lib/origins.ts but had no rows on 2026-09-23; the loader falls
--    back to the estimate when the query returns nothing.
-- ---------------------------------------------------------------------------
