-- Ping photos were world-readable: the bucket was public and the app stored
-- the result of getPublicUrl() in the database, so anyone holding (or
-- guessing) a URL could fetch a couple's private photo without authenticating.
--
-- Make the bucket private and serve it through short-lived signed URLs.
-- NOTE: previously issued public URLs stop resolving, and objects uploaded
-- under the old `pings/` prefix are not readable by the policies below — they
-- predate the per-user folder layout and should be treated as discarded.

update storage.buckets set public = false where id = 'moments';

-- Uploads are done by the client, so these policies are load-bearing.
-- Object paths are `<sender_user_id>/<local_id>.jpg`, which lets the policies
-- key off the first path segment.

drop policy if exists "upload own ping photos" on storage.objects;
create policy "upload own ping photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'moments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- The receiving partner must be able to sign a URL for a photo they did not
-- upload, so reads are allowed for your own folder or your partner's.
drop policy if exists "read own or partner ping photos" on storage.objects;
create policy "read own or partner ping photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'moments'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (storage.foldername(name))[1] = (
      select partner_id::text from public.profiles where id = (select auth.uid())
    )
  )
);

-- The column holds a storage path now, not a URL. Signed URLs are minted at
-- read time and must never be persisted: they expire, and they embed a token.
alter table public.moments rename column photo_url to photo_path;
