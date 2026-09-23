-- 2026-09-23 — hygiene package (audit finding security-3: trip share links)
--
-- Run in the Supabase SQL editor as the postgres role. Idempotent: safe to
-- run more than once.
--
-- WHY: trip_shares held a public SELECT policy so the share page could
-- resolve a token with the anon key. app/trip/share/[token]/page.tsx now
-- reads (and bumps view_count) through the SERVICE-ROLE client, which
-- bypasses RLS entirely, so anon/authenticated users no longer need to
-- read other people's rows. Leaving the public policy in place lets any
-- signed-out client enumerate every share token with one PostgREST call
-- (GET /rest/v1/trip_shares?select=share_token), which turns "anyone with
-- the link" into "anyone at all".
--
-- After this migration:
--   SELECT  owner only (created_by = auth.uid())   -> TripShareButton can
--                                                    still find its own row
--   INSERT  owner only (created_by = auth.uid())   -> unchanged behaviour
--   DELETE  owner only (created_by = auth.uid())   -> 'Stop sharing' UI
--                                                    (planner package)
--   service_role                                   -> bypasses RLS, share
--                                                    page keeps working
--
-- PREREQUISITE: SUPABASE_SERVICE_ROLE_KEY must be set in Vercel for every
-- environment that serves /trip/share/[token]. The page falls back to the
-- anon client when the key is missing, and with this policy that fallback
-- returns 404 for every share link.

begin;

alter table public.trip_shares enable row level security;

-- Drop every existing policy on the table, whatever it was named, so we
-- end up with exactly the three below regardless of dashboard history.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'trip_shares'
  loop
    execute format('drop policy if exists %I on public.trip_shares', p.policyname);
  end loop;
end $$;

create policy "trip_shares_select_owner"
  on public.trip_shares
  for select
  to authenticated
  using (created_by = auth.uid());

create policy "trip_shares_insert_owner"
  on public.trip_shares
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.trips t
      where t.id = trip_shares.trip_id and t.user_id = auth.uid()
    )
  );

create policy "trip_shares_delete_owner"
  on public.trip_shares
  for delete
  to authenticated
  using (created_by = auth.uid());

-- Make sure deleting a trip removes its share rows (the audit could not
-- confirm the FK cascade from the dashboard). Recreating the constraint
-- is idempotent because we drop it first by its canonical name.
alter table public.trip_shares
  drop constraint if exists trip_shares_trip_id_fkey;
alter table public.trip_shares
  add constraint trip_shares_trip_id_fkey
  foreign key (trip_id) references public.trips (id) on delete cascade;

-- Token lookups from the share page hit share_token directly; make sure
-- it is unique + indexed (no-op if the dashboard already created it).
create unique index if not exists trip_shares_share_token_key
  on public.trip_shares (share_token);

commit;

-- Verify (expect exactly three rows, none with roles {public} or {anon}):
--   select policyname, roles, cmd from pg_policies
--   where tablename = 'trip_shares' order by policyname;
