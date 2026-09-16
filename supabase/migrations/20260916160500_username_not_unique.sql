-- `profiles.username` was globally UNIQUE, which is the wrong shape for what it
-- is: a display name your partner sees, scoped to one couple. Two people in
-- unrelated pairs both called "Alex" is normal, and the second one hit a 23505
-- that profile-setup reports as the generic "Could not save profile. Try
-- again." with no way to understand it.
--
-- Nothing looks a profile up by username — every read is by id.

drop index if exists public.profiles_username_key;
alter table public.profiles drop constraint if exists profiles_username_key;
