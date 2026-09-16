-- Two real accounts for walking the pairing flow without an SMS provider.
--
-- Phone OTP needs Twilio (or similar) wired up in the dashboard, which is not
-- done yet, so these two sign in with email + password instead. The app maps
-- the shorthands "01" and "02" typed on the phone screen onto them — see
-- src/lib/devUsers.ts.
--
-- They are ordinary auth.users rows: RLS, the Edge Functions and Realtime all
-- behave exactly as they do for a real account, which the old in-memory demo
-- bypass could not do. No profile rows are seeded on purpose, so each login
-- walks the whole onboarding -> pairing flow.
--
-- Re-running this file resets both passwords. To start the flow over from
-- scratch, drop the profile rows — pairs and moments cascade from them, and
-- the auth users survive, so both accounts land back on profile-setup:
--
--   delete from public.profiles
--    where id in ('00000000-0000-4000-8000-000000000001',
--                 '00000000-0000-4000-8000-000000000002');

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  phone,
  phone_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  -- GoTrue scans these into non-nullable Go strings. Left NULL, every sign-in
  -- fails with a 500 "Database error querying schema", so they must be ''.
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  u.id,
  'authenticated',
  'authenticated',
  u.email,
  extensions.crypt(u.password, extensions.gen_salt('bf')),
  now(),
  u.phone,
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
  '{}'::jsonb,
  now(),
  now(),
  '', '', '', '', '', '', '', ''
from (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'dev01@imm.test', '+10000000001', 'imm-dev-01'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'dev02@imm.test', '+10000000002', 'imm-dev-02')
) as u (id, email, phone, password)
on conflict (id) do update set
  email              = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  phone              = excluded.phone,
  phone_confirmed_at = excluded.phone_confirmed_at,
  updated_at         = now(),
  confirmation_token         = '',
  recovery_token             = '',
  email_change               = '',
  email_change_token_new     = '',
  email_change_token_current = '',
  phone_change               = '',
  phone_change_token         = '',
  reauthentication_token     = '';

-- GoTrue refuses a password grant for a user with no matching identity row.
insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', true
  ),
  'email',
  now(),
  now(),
  now()
from auth.users u
where u.id in (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002'
)
on conflict (provider_id, provider) do update set
  identity_data = excluded.identity_data,
  updated_at    = now();
