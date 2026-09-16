-- The thread screen is the first time the client ever reads `moments` — until
-- now the table was written by Edge Functions and observed only through
-- Realtime. If no SELECT policy grants pair members access, RLS filters every
-- row silently and the thread just looks empty, with no error to debug.
--
-- Policies are permissive and OR together, so this is additive: if an
-- equivalent policy already exists, both simply pass.

drop policy if exists "pair members read their moments" on public.moments;
create policy "pair members read their moments"
on public.moments for select to authenticated
using (
  exists (
    select 1
      from public.pairs p
     where p.id = moments.pair_id
       and p.status = 'active'
       and (select auth.uid()) in (p.requester_id, p.receiver_id)
  )
);

-- The thread queries by pair, newest first.
create index if not exists moments_pair_created_idx
  on public.moments (pair_id, created_at desc);
