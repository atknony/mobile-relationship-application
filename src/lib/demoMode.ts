import type { Session, User } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

/**
 * Dev-only bypass: typing this into the phone screen signs you in with sample
 * data instead of sending an OTP, so the app can be walked through without a
 * configured SMS provider. Every entry point is gated on `__DEV__`, so it is
 * stripped from release builds.
 */
export const DEMO_PHONE = '28';

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000028';
const DEMO_PARTNER_ID = '00000000-0000-4000-8000-000000000029';
const DEMO_PAIR_ID = '00000000-0000-4000-8000-0000000000aa';

const demoOwnProfile: Profile = {
  id: DEMO_USER_ID,
  username: 'You',
  avatar_url: null,
  partner_id: DEMO_PARTNER_ID,
  push_token: null,
  created_at: new Date().toISOString(),
};

const demoPartnerProfile: Profile = {
  id: DEMO_PARTNER_ID,
  username: 'Demo Partner',
  avatar_url: null,
  partner_id: DEMO_USER_ID,
  push_token: null,
  created_at: new Date().toISOString(),
};

function buildDemoSession(): Session {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    phone: DEMO_PHONE,
    app_metadata: { provider: 'demo' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  } as unknown as User;

  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: now + 60 * 60 * 24,
    user,
  } as unknown as Session;
}

/**
 * Fills the stores the auth guard reads (session → profile → pairedWith), so
 * the root layout routes straight to (home). Supabase-backed queries are
 * disabled while demo mode is on — otherwise they would resolve against a user
 * that does not exist and wipe this profile back out.
 */
export function enterDemoMode() {
  useAuthStore.getState().setDemoSession(buildDemoSession());
  const profiles = useProfileStore.getState();
  profiles.setOwnProfile(demoOwnProfile);
  profiles.setPartnerProfile(demoPartnerProfile);
  profiles.setPairId(DEMO_PAIR_ID);
}
