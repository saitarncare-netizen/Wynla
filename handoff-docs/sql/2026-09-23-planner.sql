-- Trip planner package (2026-09-23) — trip dates + day-count constraint.
-- Run once in the Supabase SQL editor. Every statement is idempotent.
--
-- The app feature-detects everything here, so it works before AND after
-- this runs:
--   * trips.start_date — the planner review sheet and the trip page show
--     an optional "Trip start date" field. If the column is missing the
--     insert/update fails with 42703 / PGRST204, the app retries without
--     the field and hides it. Calendar export then anchors day 1 to today
--     and says so.
--   * total_days check — the planner clamps trips to 14 days to match the
--     live constraint. Section 2 (optional) raises it to 30.
--
-- No RLS changes needed: the existing owner-only policies on public.trips
-- cover the new column automatically.

-- 1. Optional planned start date (a calendar day, no time zone). Null means
--    "not decided yet"; the trip page keeps working exactly as before.
alter table public.trips
  add column if not exists start_date date;

comment on column public.trips.start_date is
  'Planned first ski day (local calendar date). Null = undated trip.';

-- 2. OPTIONAL — allow trips up to 30 days. The planner ships clamped to 14
--    because that is what the live constraint allows. If you run this
--    block, also raise MAX_TRIP_DAYS in components/Map/TripPlannerPanel.tsx
--    to 30 so the stepper lets users go past 14.
--
-- alter table public.trips drop constraint if exists trips_total_days_check;
-- alter table public.trips
--   add constraint trips_total_days_check
--   check (total_days between 1 and 30);
