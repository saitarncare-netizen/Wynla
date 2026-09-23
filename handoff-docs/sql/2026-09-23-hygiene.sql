-- 2026-09-23 — hygiene package (audit finding security-3: trip share links)
--
-- Run in the Supabase SQL editor as the postgres role. Idempotent: safe to
-- run more than once. Two transactions: part 1 (RLS policies) commits on
-- its own so the FK/index work in part 2 can never roll it back.
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

commit;

-- ---------------------------------------------------------------------
-- Part 2: FK cascade + token index. Deliberately a SEPARATE transaction
-- so that if anything here fails (e.g. a constraint name we did not
-- anticipate) the RLS fix above has already committed and the public
-- SELECT policy is gone regardless.
-- ---------------------------------------------------------------------
begin;

-- Orphans: share rows whose trip was deleted while no cascade existed.
-- ADD CONSTRAINT validates existing rows, so these must go first or the
-- constraint fails. They are dead links anyway (share page 404s on them).
delete from public.trip_shares s
where not exists (select 1 from public.trips t where t.id = s.trip_id);

-- Drop the existing FK on trip_id by looking it up rather than assuming
-- the name: a dashboard-created constraint may be called anything, and
-- dropping only "trip_shares_trip_id_fkey" would leave two FKs behind.
do $$
declare
  c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.trip_shares'::regclass
      and con.contype = 'f'
      and con.conkey = array[(
        select att.attnum from pg_attribute att
        where att.attrelid = 'public.trip_shares'::regclass
          and att.attname = 'trip_id'
      )]
  loop
    execute format('alter table public.trip_shares drop constraint %I', c);
  end loop;
end $$;

alter table public.trip_shares
  add constraint trip_shares_trip_id_fkey
  foreign key (trip_id) references public.trips (id) on delete cascade;

-- Token lookups from the share page hit share_token directly; make sure
-- it is unique + indexed (no-op if the dashboard already created it).
create unique index if not exists trip_shares_share_token_key
  on public.trip_shares (share_token);

commit;

-- Verify:
--   1. Expect exactly three rows, none with roles {public} or {anon}:
--      select policyname, roles, cmd from pg_policies
--      where tablename = 'trip_shares' order by policyname;
--   2. Expect exactly one FK, with confdeltype = 'c' (cascade):
--      select conname, confdeltype from pg_constraint
--      where conrelid = 'public.trip_shares'::regclass and contype = 'f';
