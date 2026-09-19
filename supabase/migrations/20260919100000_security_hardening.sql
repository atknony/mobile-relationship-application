-- Security hardening from SECURITY_AND_PLAY_STORE_AUDIT.md (2026-09-19).

-- ---------------------------------------------------------------------------
-- 1. Ping photos: readable through the pair they were sent in, not the folder.
--
-- The old policy let you read any object in your *current* partner's folder.
-- Photos live at <sender_id>/<local_id>.jpg, so after B unpaired from A and
-- paired with C, C could list and download every photo B ever sent — including
-- all of them sent to A. A photo is now readable by its uploader, or by a
-- member of the active pair whose moment row references it.
-- ---------------------------------------------------------------------------
drop policy if exists "read own or partner ping photos" on storage.objects;

create policy "read own or active pair ping photos" on storage.objects
for select to authenticated using (
  bucket_id = 'moments' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.moments m
      join public.pairs p on p.id = m.pair_id
      where m.photo_path = storage.objects.name
        and p.status = 'active'
        and (select auth.uid()) in (p.requester_id, p.receiver_id)
    )
  )
);

create index if not exists moments_photo_path_idx
  on public.moments (photo_path) where photo_path is not null;

-- ---------------------------------------------------------------------------
-- 2. push_token is write-only for clients.
--
-- "profiles: partner read" returns the partner's whole row, and with their
-- Expo push token anyone can put arbitrary text on their lock screen through
-- Expo's API. Clients write their own token (usePushRegistration) and clear it
-- on sign-out; only send-ping, as service_role, reads it. The app selects
-- src/lib/profileColumns.ts instead of `*`.
-- ---------------------------------------------------------------------------
--
-- A column REVOKE is not enough on its own: `authenticated` also held a
-- table-wide SELECT, which covers every column. So the table grant goes and
-- the readable columns are granted one by one — a new client-readable column
-- needs its own grant, like the write side already does.
revoke select on public.profiles from authenticated;
revoke select (push_token) on public.profiles from authenticated;
grant select (id, username, avatar_url, partner_id, locale, quiet_hours_start, quiet_hours_end, created_at)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3. profiles policies: authenticated only, WITH CHECK on writes, auth.uid()
--    evaluated once per statement, one SELECT policy instead of three.
--
-- "profiles: own write" was FOR ALL, to {public}, with no WITH CHECK. The
-- column grants made it harmless, but one table-wide grant later it would
-- have let a user write a row that is not theirs. No DELETE policy: account
-- deletion goes through the delete-account Edge Function.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: own read" on public.profiles;
drop policy if exists "profiles: own write" on public.profiles;
drop policy if exists "profiles: partner read" on public.profiles;

-- Never select from profiles inside a profiles policy (42P17, recursion).
create policy "profiles: own or partner read" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or partner_id = (select auth.uid()));

create policy "profiles: own insert" on public.profiles
for insert to authenticated
with check (id = (select auth.uid()));

create policy "profiles: own update" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. pairs / moments: drop the dashboard-era duplicates, scope to authenticated.
-- ---------------------------------------------------------------------------
drop policy if exists "pairs: member read" on public.pairs;
create policy "pairs: member read" on public.pairs
for select to authenticated
using ((select auth.uid()) in (requester_id, receiver_id));

-- Same rule as "pair members read their moments", which stays.
drop policy if exists "moments: pair read" on public.moments;

-- ---------------------------------------------------------------------------
-- 5. Functions, indexes, bucket limits.
-- ---------------------------------------------------------------------------
-- An event-trigger function; nothing should call it over the API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists pairs_receiver_id_idx on public.pairs (receiver_id);
create index if not exists profiles_partner_id_idx on public.profiles (partner_id);

-- Uploads are always JPEG (src/lib/uploadImage.ts) and downscaled to 1600px;
-- 5 MB is generous headroom, and anything else is abuse of our storage bill.
update storage.buckets
   set file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg']
 where id in ('moments', 'avatars');
