-- One account, one phone.
--
-- A sign-in calls claim_active_device(), which records the new session as the
-- account's only one and deletes every other session for that user. Deleting
-- from auth.sessions (refresh tokens cascade) is what GoTrue itself does on
-- signOut({ scope: 'others' }), and it is enough for Auth: the old phone's
-- refresh fails, /auth/v1/user answers 403 session_not_found, and all four Edge
-- Functions reject it because they authenticate with getUser().
--
-- It is NOT enough for PostgREST, Storage or Realtime. Those only check the
-- access token's signature and expiry, so a revoked phone kept full read/write
-- access for up to an hour — measured, not assumed. The restrictive policies at
-- the bottom close that: a request is only allowed if the session named in its
-- JWT still exists. Restrictive policies AND with the existing permissive ones,
-- so no existing policy had to change.
--
-- active_devices is how the old phone finds out. It is in the Realtime
-- publication, and it deliberately has NO session check, because the phone that
-- has to receive the change is precisely the one whose session was just deleted.

create table if not exists public.active_devices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id uuid not null,
  claimed_at timestamptz not null default now()
);

alter table public.active_devices enable row level security;
alter table public.active_devices replica identity full;

drop policy if exists "read own active device" on public.active_devices;
create policy "read own active device"
on public.active_devices for select to authenticated
using (user_id = (select auth.uid()));

-- Read-only to clients; the only write path is claim_active_device().
revoke all on public.active_devices from anon, authenticated;
grant select on public.active_devices to authenticated;
grant all on public.active_devices to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'active_devices'
  ) then
    alter publication supabase_realtime add table public.active_devices;
  end if;
end $$;

-- True when the session in the caller's JWT has not been revoked.
-- SECURITY DEFINER because `authenticated` cannot read auth.sessions.
create or replace function public.session_is_live()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions
    where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and user_id = auth.uid()
  );
$$;

revoke all on function public.session_is_live() from public, anon;
grant execute on function public.session_is_live() to authenticated;

-- Makes the caller's session the account's only one.
create or replace function public.claim_active_device()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if uid is null or sid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  -- A session that has already been replaced must never take the account back:
  -- otherwise the old phone could kick the new one off.
  if not exists (select 1 from auth.sessions where id = sid and user_id = uid) then
    raise exception 'session revoked' using errcode = '28000';
  end if;

  insert into public.active_devices (user_id, session_id, claimed_at)
  values (uid, sid, now())
  on conflict (user_id) do update
    set session_id = excluded.session_id, claimed_at = excluded.claimed_at;

  delete from auth.sessions where user_id = uid and id <> sid;

  -- Pushes follow the phone. The old device's token would otherwise keep
  -- receiving this account's pings; the new device registers its own.
  update public.profiles set push_token = null where id = uid;
end;
$$;

revoke all on function public.claim_active_device() from public, anon;
grant execute on function public.claim_active_device() to authenticated;

-- Enforcement for the data APIs. `(select ...)` so it is evaluated once per
-- statement, not once per row.
drop policy if exists "live session only" on public.profiles;
create policy "live session only" on public.profiles as restrictive
for all to authenticated
using ((select public.session_is_live()))
with check ((select public.session_is_live()));

drop policy if exists "live session only" on public.pairs;
create policy "live session only" on public.pairs as restrictive
for all to authenticated
using ((select public.session_is_live()))
with check ((select public.session_is_live()));

drop policy if exists "live session only" on public.moments;
create policy "live session only" on public.moments as restrictive
for all to authenticated
using ((select public.session_is_live()))
with check ((select public.session_is_live()));

drop policy if exists "live session only" on storage.objects;
create policy "live session only" on storage.objects as restrictive
for all to authenticated
using ((select public.session_is_live()))
with check ((select public.session_is_live()));
