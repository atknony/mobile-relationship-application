-- The `moments` bucket never existed.
--
-- 20260916120000 assumed it had been created from the dashboard and only did
-- `update storage.buckets set public = false where id = 'moments'` — a silent
-- no-op against an empty storage.buckets. Every photo moment therefore failed
-- at upload, which the send path swallows (the ping still goes; only the photo
-- is lost), so nothing ever surfaced the missing bucket.
--
-- Private, like avatars: the database stores the path and the URL is signed at
-- read time. The policies from 20260916120000 already key off the first path
-- segment being the sender's user id.

insert into storage.buckets (id, name, public)
values ('moments', 'moments', false)
on conflict (id) do update set public = false;
