-- When a pair actually became a pair.
--
-- `created_at` is when the invite code was generated, up to 15 minutes before
-- anyone redeemed it, so it cannot answer "did this just happen?" — which the
-- pairing celebration needs, on both phones, including one that was closed at
-- the moment it happened. A trigger rather than a change to redeem-invite-code
-- so every path to 'active' records it without redeploying a function.

alter table public.pairs add column if not exists activated_at timestamptz;

create or replace function public.stamp_pair_activation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'active' and old.status is distinct from 'active' then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_pair_activation() from public, anon, authenticated;

drop trigger if exists pairs_stamp_activation on public.pairs;
create trigger pairs_stamp_activation
before update of status on public.pairs
for each row
execute function public.stamp_pair_activation();

-- Existing active pairs: the best available answer, and old enough that none of
-- them will be celebrated.
update public.pairs set activated_at = created_at
where status = 'active' and activated_at is null;
