-- Trip itinerary v2 — per-day plans (note + attached nearby places).
-- Run once in the Supabase SQL editor. The UI feature-detects this column
-- (trip page selects *), so the app works before AND after this runs;
-- the day-notes UI simply stays hidden until the column exists.
--
-- No RLS changes needed: the existing owner-only select/update policies on
-- public.trips cover the new column automatically.

alter table public.trips
  add column if not exists day_plans jsonb not null default '{}'::jsonb;

-- Server-side growth cap. The client caps notes (2k chars) and places
-- (12/day), but RLS lets an owner PATCH arbitrary jsonb via the REST API —
-- without this, one hostile/buggy client could bloat its row to megabytes.
-- 64 KB comfortably fits ~30 days of maxed-out plans.
alter table public.trips drop constraint if exists trips_day_plans_size;
alter table public.trips
  add constraint trips_day_plans_size
  check (pg_column_size(day_plans) <= 65536);
