-- The app's language, copied onto the profile so pushes can use it.
--
-- The language itself is a per-phone choice (AsyncStorage, see src/lib/i18n.ts).
-- But a push is composed by `send-ping` on the *sender's* request, so without a
-- copy here the server can only guess, and a Turkish-speaking partner gets
-- "Alex is thinking of you". The app writes it on launch and on every change
-- (useProfileLocale). Null (an app that predates this) means English.
--
-- No check constraint: send-ping falls back to English for anything it does not
-- know, so adding a language needs no migration.

alter table public.profiles
  add column if not exists locale text;

-- profiles writes are column-granted (20260917140000); a new client-editable
-- column needs its own grant. Not in the profile-changed trigger's column list,
-- so writing it does not ping the partner's app.
grant update (locale) on public.profiles to authenticated;
