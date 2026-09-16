-- profiles.avatar_url is read all over the app and has never once been written:
-- there was nowhere to put an avatar. This adds the bucket, following the same
-- posture as ping photos — private, per-user folders, readable by the pair.
--
-- Like moments, the column stores a storage PATH and URLs are signed at read
-- time. The column keeps its name to avoid churning every read site.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do update set public = false;

drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Replacing your own avatar overwrites the existing object.
drop policy if exists "update own avatar" on storage.objects;
create policy "update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "read own or partner avatar" on storage.objects;
create policy "read own or partner avatar"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (storage.foldername(name))[1] = (
      select partner_id::text from public.profiles where id = (select auth.uid())
    )
  )
);
