-- Realtime delivery of a ping has never worked: `moments` was not in the
-- `supabase_realtime` publication, so `usePingRealtime`'s postgres_changes
-- subscription connected, reported SUBSCRIBED and then received nothing.
--
-- That is the whole in-app path — without a development build there is no push
-- either (see the Expo Go gotcha), so a ping only ever landed in the thread on
-- the next refetch.
--
-- `replica identity full` is what puts the old row on UPDATE/DELETE payloads.
-- The app only listens for INSERT, but RLS on a realtime message is evaluated
-- against the row in the payload, so this is the safe default.

alter publication supabase_realtime add table public.moments;
alter table public.moments replica identity full;
