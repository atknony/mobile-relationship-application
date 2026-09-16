-- Three faults that between them made the whole app fail against the real
-- database. All of them only showed up once there were real accounts to drive
-- the flow end to end.
--
-- 0. `service_role` had no DML either, so the Edge Functions — which use the
--    service_role key precisely to bypass RLS — could not write. Generating an
--    invite came back "Could not generate code" from the `pairs` insert.
--    BYPASSRLS skips policies; it does not skip GRANTs.
--
-- 1. `authenticated` held no SELECT/INSERT/UPDATE on any public table — only
--    the default REFERENCES/TRIGGER/TRUNCATE. RLS policies were being written
--    and debugged on top of a role that could not reach the tables at all, so
--    the thread came back "permission denied for table moments" and every
--    other query failed before its policy was ever consulted. Grants and RLS
--    are independent: a policy cannot widen a privilege the role lacks.
--
-- 2. `profiles: partner read` selected from `profiles` inside a policy *on*
--    `profiles`, so every read of the table recursed — 42P17, "infinite
--    recursion detected in policy for relation profiles". It was also the
--    wrong test even without the recursion: it compared `auth.uid()` against
--    the caller's own `partner_id` and never looked at the candidate row, so
--    it could only ever be true for someone paired with themselves.
--
--    Your partner's row is exactly the row that names you as its partner, so
--    the check needs no subquery at all.

grant select, insert, update, delete on public.profiles, public.pairs, public.moments
  to service_role;

-- Writes to `pairs` and `moments` stay with the Edge Functions (service_role,
-- RLS bypassed); the client only ever reads them.
grant select, insert, update on public.profiles to authenticated;
grant select on public.pairs to authenticated;
grant select on public.moments to authenticated;

-- `dissolve-pair` sets status='dissolved', which the original CHECK never
-- allowed — unpairing failed with a constraint violation. 'rejected' is kept
-- so any existing row stays valid.
alter table public.pairs drop constraint if exists pairs_status_check;
alter table public.pairs add constraint pairs_status_check
  check (status in ('pending', 'active', 'rejected', 'dissolved'));

drop policy if exists "profiles: partner read" on public.profiles;
create policy "profiles: partner read"
on public.profiles for select to authenticated
using (partner_id = (select auth.uid()));
