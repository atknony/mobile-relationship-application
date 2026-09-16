import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { resetPingQueue } from '@/lib/pingQueue';
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
    // Hydrate existing session on mount. A rejected read (e.g. SecureStore
    // failing to unlock) must still flip sessionLoaded, or the root layout
    // holds the splash screen forever.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .catch(() => {
        clearSession();
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setSession(session);
        } else {
          clearSession();
          clearProfiles();
          // Purges AsyncStorage too — clearing only the store left the queue on
          // disk, so the next user to sign in sent the previous user's pings.
          void resetPingQueue();
          resetUnpair();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}
