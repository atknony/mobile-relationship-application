import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';

/**
 * Deletes this account on the server (the delete-account Edge Function:
 * dissolves the pair, removes every photo, deletes the auth user), then drops
 * the session here. Returns an error message, or null.
 *
 * Like signOut() it never navigates: the local sign-out fires SIGNED_OUT, the
 * session teardown clears the stores, queue and photo cache, and the guard
 * moves to (auth).
 */
export async function deleteAccount(): Promise<string | null> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) return i18n.t('settings.deleteFailed');

  // Local only: the server already deleted every session of this user, so a
  // global sign-out would only fail on the network round trip.
  await supabase.auth.signOut({ scope: 'local' });
  return null;
}
