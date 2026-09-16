import { supabase } from '@/lib/supabase';
import { clearPushToken } from '@/hooks/usePushRegistration';
import { useProfileStore } from '@/stores/profileStore';

/**
 * The single sign-out path, so every entry point tears the session down the
 * same way.
 *
 * Nothing here navigates. `supabase.auth.signOut()` fires SIGNED_OUT,
 * `useSupabaseSession` clears the stores and the ping queue, and the root
 * guard moves the user to (auth) because the session is gone. Calling
 * `router.replace` as well would race that, and pushing to a route the guard is
 * about to replace is how this kind of screen ends up in a loop.
 *
 * @returns an error message if the user is still signed in, otherwise null.
 */
export async function signOut(): Promise<string | null> {
  const userId = useProfileStore.getState().ownProfile?.id;

  // Must happen while the session is still valid: afterwards RLS rejects the
  // write, and this device keeps receiving pings meant for whoever signs in
  // next. Never block leaving over it, though.
  if (userId) {
    try {
      await clearPushToken(userId);
    } catch {
      // Best effort.
    }
  }

  const { error } = await supabase.auth.signOut();
  if (!error) return null;

  // The default global sign-out needs the network. Without this fallback a
  // failed request leaves the session intact and the person stranded on a
  // screen whose only way out is the button that just failed. A local sign-out
  // still drops the session and still fires SIGNED_OUT; it only leaves the
  // refresh token alive server-side.
  const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
  return localError ? 'Could not sign out. Try again.' : null;
}
