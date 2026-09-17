-- Tells the partner's open app that a profile changed, without putting
-- `profiles` in Realtime.
--
-- `profiles` stays out of the supabase_realtime publication: a change event
-- carries the whole row, push_token included, to every subscriber RLS lets
-- read it — i.e. the partner. So the signal rides on the row both members
-- already subscribe to (usePairRealtime watches `pairs` for unpairing).
--
-- When someone's avatar or username changes, a trigger stamps their active
-- pair with who changed and when. That UPDATE reaches both members over the
-- existing subscription; the partner's app sees `profile_changed_by` is not
-- itself and refetches that one profile through the normal RLS-checked read.
-- Nothing about the profile is broadcast, only that it changed.
--
-- Cost: one row update per profile edit (rare), no new channel, no polling.
-- push_token writes deliberately do not fire it — they happen on every launch
-- and the partner has no use for them.

alter table public.pairs
  add column if not exists profile_changed_at timestamptz,
  add column if not exists profile_changed_by uuid;

create or replace function public.signal_partner_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pairs
     set profile_changed_at = now(),
         profile_changed_by = new.id
   where status = 'active'
     and (requester_id = new.id or receiver_id = new.id);
  return null;
end;
$$;

revoke all on function public.signal_partner_profile_change() from public, anon, authenticated;

drop trigger if exists profiles_signal_partner on public.profiles;
create trigger profiles_signal_partner
after update of avatar_url, username on public.profiles
for each row
when (old.avatar_url is distinct from new.avatar_url
      or old.username is distinct from new.username)
execute function public.signal_partner_profile_change();
