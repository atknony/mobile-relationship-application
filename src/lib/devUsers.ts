import { supabase } from '@/lib/supabase';
import { claimActiveDevice } from '@/lib/activeDevice';

/**
 * Dev-only shortcut for the two seeded test accounts.
 *
 * Phone OTP needs an SMS provider that is not configured yet, so typing `01` or
 * `02` on the phone screen signs in with the email + password of a real
 * auth.users row instead — seeded by
 * `supabase/migrations/20260916160000_dev_test_users.sql`.
 *
 * This is a genuine session: RLS, the Edge Functions, Realtime and the pairing
 * flow all behave exactly as they do for a real account. (The previous `28`
 * bypass faked the stores in memory, so nothing it touched was real.) Both the
 * lookup and its only caller are gated on `__DEV__`, so it is stripped from
 * release builds.
 */
const DEV_USERS: Record<string, { email: string; password: string }> = {
  '01': { email: 'dev01@imm.test', password: 'imm-dev-01' },
  '02': { email: 'dev02@imm.test', password: 'imm-dev-02' },
};

export function isDevShorthand(input: string): boolean {
  return __DEV__ && input in DEV_USERS;
}

/** Signs in one of the seeded accounts. Returns an error message, or null. */
export async function signInDevUser(input: string): Promise<string | null> {
  const user = DEV_USERS[input];
  if (!__DEV__ || !user) return 'Unknown test user.';

  const { error } = await supabase.auth.signInWithPassword(user);
  if (error) return error.message;
  // Same as a real sign-in: this phone becomes the account's only one.
  // useSupabaseSession picks the session up and the guard routes from there.
  return claimActiveDevice();
}
