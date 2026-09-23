-- Wynla prediction ledger — 2026-09-23
-- Idempotent. Run in the Supabase SQL editor (service role / owner).
-- The application feature-detects this table (lib/predictionLog.ts) and
-- degrades gracefully when it is missing: refresh-weather logs one
-- warning per process and skips the ledger step, /api/health reports
-- ledger.available = false. It can be applied before or after the code
-- deploys.
--
-- What it stores: every surface-forecast call and forecast number the
-- pipeline makes for a resort-day, frozen at the moment it is made, and
-- later the observed value for that same day plus a hit/miss verdict.
-- One row per (resort, target day, horizon): the same Saturday is
-- predicted several times as it approaches, and each of those is its
-- own row so accuracy can be reported per horizon.
--
-- No public UI reads this in season 1. See
-- handoff-docs/PREDICTION_LEDGER_2026-09-23.md for what may be claimed
-- publicly and when.

create table if not exists public.prediction_log (
  id                  bigserial primary key,
  resort_id           bigint      not null references public.resorts (id) on delete cascade,
  for_date            date        not null,   -- resort-local calendar day the prediction is about
  made_at             timestamptz not null,   -- when the prediction was frozen
  horizon_days        smallint    not null,   -- 0 = same day, 1 = tomorrow, n = n days ahead
  -- the prediction
  surface_class       text,                   -- SANY code from lib/snowSurface, null when dormant
  surface_confidence  text,                   -- 'low' | 'medium' | 'high'
  forecast_snow_in    numeric,                -- base-elevation snowfall for the day
  forecast_high_f     integer,
  forecast_low_f      integer,
  forecast_gust_mph   integer,
  source              jsonb,                  -- provenance: forecast source, updated_at, coverage
  -- what happened (filled by the scorer)
  actual_snow_in      numeric,
  actual_high_f       integer,
  actual_low_f        integer,
  actual_gust_mph     integer,
  actual_surface_class text,                  -- classifier re-run on OBSERVED inputs only
  actual_source       jsonb,
  scored_at           timestamptz,
  surface_hit         boolean,                -- null when either class is missing
  snow_abs_err_in     numeric,
  constraint prediction_log_unique unique (resort_id, for_date, horizon_days),
  constraint prediction_log_horizon_chk check (horizon_days between 0 and 16),
  constraint prediction_log_confidence_chk
    check (surface_confidence is null or surface_confidence in ('low', 'medium', 'high'))
);

-- Scorer: "rows for this day that are not scored yet".
create index if not exists prediction_log_for_date_unscored_idx
  on public.prediction_log (for_date)
  where scored_at is null;

-- /api/health counts: logged in the last 24 h, scored in the last 7 d.
create index if not exists prediction_log_made_at_idx
  on public.prediction_log (made_at desc);
create index if not exists prediction_log_scored_at_idx
  on public.prediction_log (scored_at desc)
  where scored_at is not null;

-- Service role only. No policies on purpose: the ledger is written and
-- read by the crons with the service key; nothing user-facing reads it
-- until the founder has reviewed the numbers (see the handoff doc).
alter table public.prediction_log enable row level security;

-- Retention: keep two seasons. Run by hand each summer, or with pg_cron:
--   select cron.schedule('prune-prediction-log', '0 3 1 7 *',
--     $$delete from public.prediction_log where for_date < now() - interval '24 months'$$);
delete from public.prediction_log where for_date < now() - interval '24 months';
