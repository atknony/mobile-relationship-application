-- Quiet hours. Stored as minutes since local midnight so the window is trivial
-- to compare, and nullable so null means "off".
--
-- The client honours these for the in-app arrival notification immediately.
-- Server-side push suppression is a follow-up: send-ping will need to read the
-- recipient's window, and that needs a timezone on the profile to be correct
-- for a couple in different places.

alter table public.profiles
  add column if not exists quiet_hours_start smallint,
  add column if not exists quiet_hours_end smallint;

alter table public.profiles
  drop constraint if exists profiles_quiet_hours_range;
alter table public.profiles
  add constraint profiles_quiet_hours_range check (
    (quiet_hours_start is null and quiet_hours_end is null)
    or (
      quiet_hours_start between 0 and 1439
      and quiet_hours_end between 0 and 1439
    )
  );
