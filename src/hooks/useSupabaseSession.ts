import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { useUnpairStore } from '@/stores/unpairStore';

// Listens to Supabase auth state for the entire app lifetime.
// Call once from the root _layout.tsx.
export function useSupabaseSession() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearProfiles = useProfileStore((s) => s.clearProfiles);
  const clearOfflineQueue = usePingStore((s) => s.clearOfflineQueue);
  const resetUnpair = useUnpairStore((s) => s.resetUnpair);

  useEffect(() => {
    // Hydrate existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setSession(session);
        } else {
          clearSession();
          clearProfiles();
          clearOfflineQueue();
          resetUnpair();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}
