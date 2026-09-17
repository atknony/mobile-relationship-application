-- Changing your avatar uploads to a fresh path and then removes the old object.
-- A fresh path rather than an overwrite, because everything that displays an
-- avatar is keyed on the path: the signed-URL cache, the image cache and the
-- partner's copy of your profile row. Overwriting in place changed none of those
-- keys, so the old photo kept showing until each cache happened to expire.
--
-- The upload/update/read policies are in 20260916140000; this adds the missing
-- delete, confined to your own folder like the rest.

drop policy if exists "delete own avatar" on storage.objects;
create policy "delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
