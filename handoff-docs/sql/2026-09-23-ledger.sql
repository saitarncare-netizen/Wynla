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
-- own row so accuracy can be reported per horizon. A row is inserted
-- once and never overwritten (ON CONFLICT DO NOTHING in the writer):
-- made_at is the first forecast of that resort-local day.
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

-- Scorer, scheduled path: "oldest unscored target day" (partial index
-- above) and keyset pages by id inside one day.
create index if not exists prediction_log_for_date_id_unscored_idx
  on public.prediction_log (for_date, id)
  where scored_at is null;

-- Service role only. No policies on purpose: the ledger is written and
-- read by the crons with the service key; nothing user-facing reads it
-- until the founder has reviewed the numbers (see the handoff doc).
alter table public.prediction_log enable row level security;

-- Founder gate: compared / hit counts per region and horizon, all time,
-- rows with a verdict only (dormant, closed and unobserved rows have a
-- null surface_hit and never count). Read by /api/health when the
-- request carries the cron bearer token; feature-detected like the
-- table. security_invoker so the anon role, which has no policy on the
-- table, sees nothing through the view either.
create or replace view public.prediction_log_region_stats
  with (security_invoker = true) as
select r.region,
       p.horizon_days,
       count(*)::int                             as compared,
       count(*) filter (where p.surface_hit)::int as hits
from public.prediction_log p
join public.resorts r on r.id = p.resort_id
where p.surface_hit is not null
group by r.region, p.horizon_days;

-- Retention: keep two seasons. Run by hand each summer, or with pg_cron:
--   select cron.schedule('prune-prediction-log', '0 3 1 7 *',
--     $$delete from public.prediction_log where for_date < now() - interval '24 months'$$);
delete from public.prediction_log where for_date < now() - interval '24 months';
