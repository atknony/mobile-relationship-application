-- Once two people unpaired they could never pair again.
--
-- `pairs` carried a plain UNIQUE (requester_id, receiver_id), so the dissolved
-- row from the first pairing blocked the redeem that would have created the
-- second one. `redeem-invite-code` writes receiver_id as part of its single
-- conditional UPDATE, so the violation surfaced as a flat "Could not complete
-- pairing" with a valid, unexpired code.
--
-- The constraint is still worth having — it is what stops two concurrent
-- redeems producing two live pairs for the same couple — so narrow it to the
-- rows it is actually about. Dissolved rows are history and `moments` still
-- points at them, so they stay.

alter table public.pairs drop constraint if exists pairs_requester_id_receiver_id_key;

create unique index if not exists pairs_live_members_key
  on public.pairs (requester_id, receiver_id)
  where status <> 'dissolved';
