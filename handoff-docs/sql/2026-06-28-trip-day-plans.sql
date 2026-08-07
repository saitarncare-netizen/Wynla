-- Trip itinerary v2 — per-day plans (note + attached nearby places).
-- Run once in the Supabase SQL editor. The UI feature-detects this column
-- (trip page selects *), so the app works before AND after this runs;
-- the day-notes UI simply stays hidden until the column exists.
--
-- No RLS changes needed: the existing owner-only select/update policies on
-- public.trips cover the new column automatically.

alter table public.trips
  add column if not exists day_plans jsonb not null default '{}'::jsonb;
