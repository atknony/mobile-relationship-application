import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { resetPingQueue } from '@/lib/pingQueue';
import { clearImageCache } from '@/lib/imageCache';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useUnpairStore } from '@/stores/unpairStore';

// Listens to Supabase auth state for the entire app lifetime.
// Call once from the root _layout.tsx.
export function useSupabaseSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearProfiles = useProfileStore((s) => s.clearProfiles);
  const resetUnpair = useUnpairStore((s) => s.resetUnpair);

  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;

    const handleSignedOut = () => {
      clearSession();
      clearProfiles();
      // Purges AsyncStorage too — clearing only the store left the queue on
      // disk, so the next user to sign in sent the previous user's pings.
      void resetPingQueue();
      resetUnpair();
      // Photos on disk belong to the account that downloaded them.
      clearImageCache();
      // Last, once nothing is reading it. Every key is scoped by a user, pair
      // or storage path, so this is not about leaking one account's data into
      // another's — it is that gcTime is 10 minutes, and signing back into the
      // same account inside that window served the profile from cache,
      // `partner_id` and all, flashing a pair that may have been dissolved
      // since.
      queryClient.clear();
    };

    // Restore first, subscribe second.
    //
    // These two answer the same question: onAuthStateChange emits an
    // INITIAL_SESSION of its own, and whichever landed first was allowed to set
    // sessionLoaded. A listener reporting "no session" before the SecureStore
    // read had finished therefore declared the startup resolved, signed-out —
    // the guard sent an already-signed-in user to (auth) and the phone screen
    // appeared until getSession() caught up. It also ran the full sign-out
    // teardown (queue purge, cache clear) on a cold start, which is wrong even
    // when nothing is visible.
    //
    // Subscribing afterwards leaves exactly one source for the initial answer;
    // the listener only ever reports what changes after it.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        // setSession handles null: there is nothing to tear down on a cold
        // start, and handleSignedOut here would throw away a warm query cache.
        if (!cancelled) setSession(session);
      })
      .catch(() => {
        // A rejected read (SecureStore failing to unlock) must still flip
        // sessionLoaded, or the root layout holds the splash screen forever.
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (cancelled) return;
        subscription = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) setSession(session);
          else handleSignedOut();
        }).data.subscription;
      });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);
}
