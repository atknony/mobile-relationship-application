-- The other person ending the pair was invisible to the device that did not
-- initiate it.
--
-- `dissolve-pair` flips `pairs.status` to 'dissolved' and nulls `partner_id` on
-- both profiles, all server-side. The initiator's app clears its own stores, but
-- nothing reached the other device: its profile query is five minutes stale and,
-- once paired, no longer polls. It sat on the ping screen sending into a pair
-- that no longer existed.
--
-- Putting `pairs` in the publication lets both devices watch the row. The
-- SELECT policies on `pairs` key on membership, not status, so a dissolved row
-- is still readable and Realtime still delivers the change to both members.
--
-- `replica identity full` puts the whole previous row on the payload, which is
-- what lets a subscriber see a status *transition* rather than just the new
-- value.

alter publication supabase_realtime add table public.pairs;
alter table public.pairs replica identity full;
