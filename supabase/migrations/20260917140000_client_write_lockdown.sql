-- Clients read; Edge Functions write. The one exception is a user's own
-- profile, and only the columns the app actually edits.
--
-- 1. Dashboard-era policies (Turkish names) are removed. They duplicated the
--    English read policies, opened INSERT/UPDATE on pairs and moments, and
--    opened read/write/delete on the unused `moment-photos` bucket to any
--    signed-in user. The pairs/moments write policies were inert only because
--    `authenticated` happens to lack INSERT/UPDATE there — one careless grant
--    away from letting a modified client create pairs or forge pings. A policy
--    that must never be used should not exist.
--
-- 2. profiles writes are narrowed to columns. `profiles: own write` lets you
--    write your own row, and `authenticated` had INSERT/UPDATE on every column
--    of it — including partner_id. The storage read policies decide whose
--    avatars and ping photos you may see from *your own* partner_id, so any
--    client could set partner_id to another user's id and read their photos.
--    Reproduced against the live project before this migration.
--
--    What the app writes itself:
--      id, username, avatar_url   onboarding upsert (profile-setup.tsx)
--      avatar_url                 lib/avatar.ts
--      push_token                 usePushRegistration
--    UPDATE(id) is needed because PostgREST's upsert sets every column it was
--    sent; the row policy's check (id = auth.uid()) keeps it from changing.
--    partner_id is written by redeem-invite-code / dissolve-pair (service_role),
--    push_token is also cleared by claim_active_device() (security definer).

-- 1 ─────────────────────────────────────────────────────────────────────────
drop policy if exists "Kayıt sırasında profil oluşturulabilir" on public.profiles;
drop policy if exists "Kullanıcı kendi profilini güncelleyebilir" on public.profiles;
drop policy if exists "Kullanıcı kendi profilini okuyabilir" on public.profiles;

drop policy if exists "Kullanıcı pair isteği gönderebilir" on public.pairs;
drop policy if exists "Kullanıcı kendi pairini güncelleyebilir" on public.pairs;
drop policy if exists "Kullanıcı kendi pairlerini görebilir" on public.pairs;

drop policy if exists "Çift üyesi moment gönderebilir" on public.moments;
drop policy if exists "Alıcı viewed_at güncelleyebilir" on public.moments;
drop policy if exists "Çift üyeleri momentleri görebilir" on public.moments;

drop policy if exists "Çift üyesi fotoğraf okuyabilir" on storage.objects;
drop policy if exists "Çift üyesi fotoğraf yükleyebilir" on storage.objects;
drop policy if exists "Çift üyesi fotoğraf silebilir" on storage.objects;

-- 2 ─────────────────────────────────────────────────────────────────────────
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, avatar_url) on public.profiles to authenticated;
grant update (id, username, avatar_url, push_token) on public.profiles to authenticated;

-- Nothing a client does needs these, and TRUNCATE ignores RLS entirely.
revoke truncate, trigger, references on public.profiles, public.pairs, public.moments
  from anon, authenticated;
