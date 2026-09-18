import { AuthSessionMissingError, isAuthApiError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { queryClient } from '@/lib/queryClient';
import { useAppStore } from '@/stores/appStore';

/**
 * One account, one phone.
 *
 * Signing in calls `claimActiveDevice()`, which deletes every other session for
 * the account server-side (`claim_active_device` in
 * `20260917120000_single_active_device.sql`). From that moment the old phone's
 * refresh token is gone, Auth and the Edge Functions answer it with
 * `session_not_found`, and a restrictive RLS policy stops PostgREST, Storage and
 * Realtime serving its access token — which they otherwise would until it
 * expired, up to an hour later.
 *
 * The old phone still has to notice. `useActiveDevice` watches for that and
 * calls `endReplacedSession()`; the SIGNED_OUT it fires does the rest through
 * the normal sign-out path.
 */

/** The `session_id` claim of an access token, or null if it cannot be read. */
export function sessionIdOf(accessToken: string | undefined | null): string | null {
  const payload = accessToken?.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as { session_id?: unknown };
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

/**
 * Makes this session the account's only one. Call straight after a successful
 * sign-in — and only then: a session restored from storage must never claim,
 * or a phone that was signed out elsewhere could take the account back. (The
 * server refuses that anyway, but it should not be asked.)
 *
 * Returns an error message, or null. On failure this session is dropped: the
 * rule would otherwise silently not hold, with two phones on one account.
 */
export async function claimActiveDevice(): Promise<string | null> {
  const { error } = await supabase.rpc('claim_active_device');
  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
    return i18n.t('auth.claimFailed');
  }
  // The claim clears profiles.push_token so the old phone stops receiving
  // pushes. If this phone's registration already ran against the cached
  // profile it would not notice its token was wiped, so re-read the row.
  void queryClient.invalidateQueries({ queryKey: ['profile'] });
  return null;
}

/**
 * Asks Auth whether this session still exists.
 *
 * True only for a definite "revoked" — a network failure or an outage says
 * nothing about the session, and signing someone out because they went through
 * a tunnel would be far worse than noticing a replaced session a little late.
 */
export async function isSessionRevoked(): Promise<boolean> {
  const { error } = await supabase.auth.getUser();
  if (!error) return false;
  // supabase-js maps 403 session_not_found to AuthSessionMissingError, and
  // removes the stored session itself when it does.
  if (error instanceof AuthSessionMissingError) return true;
  return isAuthApiError(error) && error.code === 'session_not_found';
}

/** Signs this phone out because the account is now in use on another one. */
export async function endReplacedSession(): Promise<void> {
  // Before signing out: the flag is how the next screen knows to say why.
  useAppStore.getState().setSessionReplaced(true);
  await supabase.auth.signOut({ scope: 'local' });
}
