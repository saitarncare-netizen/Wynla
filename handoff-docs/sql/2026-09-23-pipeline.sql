-- Wynla data pipeline — 2026-09-23
-- Idempotent. Run in the Supabase SQL editor (service role / owner).
-- The application feature-detects every object below and degrades
-- gracefully when it is missing, so this can be applied before or after
-- the code deploys.

-- 1. Run history for every cron (written by lib/cronRun.ts, read by
--    /api/health). Also holds the 'health-alert' rows used to send the
--    founder at most one alert email per 12 hours — founder alert emails
--    are only sent once this table exists (no table, no durable dedupe,
--    no mail; /api/health still answers 503 when the data is stale).
create table if not exists public.cron_runs (
  id           bigserial primary key,
  job          text        not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  duration_ms  integer,
  summary      jsonb,
  error        text
);

create index if not exists cron_runs_job_started_idx
  on public.cron_runs (job, started_at desc);

-- Service role only. No policies on purpose: anon/authenticated users
-- have no reason to read run logs, and the health endpoint aggregates
-- them server-side with the service key.
alter table public.cron_runs enable row level security;

-- 2. Freshness queries in /api/health and the stalest-first ordering in
--    refresh-weather sort by fetched_at; the table is small, but the
--    index keeps the health endpoint instant as history grows.
create index if not exists weather_cache_fetched_at_idx
  on public.weather_cache (fetched_at);

-- 3. Keep run history bounded: delete rows older than 90 days.
--    Run this by hand every few months, or schedule it with pg_cron:
--    select cron.schedule('prune-cron-runs', '0 3 * * 0',
--      $$delete from public.cron_runs where started_at < now() - interval '90 days'$$);
delete from public.cron_runs where started_at < now() - interval '90 days';
