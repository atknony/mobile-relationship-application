import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { endReplacedSession, isSessionRevoked, sessionIdOf } from '@/lib/activeDevice';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { useToast } from '@/components/ui/Toast';

/**
 * Notices when this account has signed in on another phone, and signs this one
 * out. Call once from the root layout: it has to run in every signed-in group,
 * not just (home) — someone halfway through onboarding is just as replaced.
 *
 * Two ways to find out, because neither covers everything:
 *
 * - **Realtime on `active_devices`**, for a phone that is open when it happens.
 *   The row is deliberately readable without a live session, since the phone
 *   that needs this event is exactly the one whose session was just deleted.
 * - **Asking Auth on launch and on every return to the foreground**, for a phone
 *   that was closed or backgrounded and missed the event.
 *
 * Refresh failing would also sign the phone out eventually, but silently and up
 * to an hour later.
 */
export function useActiveDevice() {
  const userId = useAuthStore((s) => s.user?.id);
  const sessionReplaced = useAppStore((s) => s.sessionReplaced);
  const { showToast } = useToast();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const currentSessionId = () => sessionIdOf(useAuthStore.getState().session?.access_token);

    const check = async () => {
      const before = currentSessionId();
      if (!before) return;
      const revoked = await isSessionRevoked();
      // Only if nothing changed underneath: a sign-out or a fresh sign-in while
      // the request was out makes the answer about a session that is gone.
      if (cancelled || !revoked || currentSessionId() !== before) return;
      await endReplacedSession();
    };

    void check();

    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void check();
    });

    const channel = supabase
      .channel(`active-device:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_devices',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const claimed = (payload.new as { session_id?: string } | null)?.session_id;
          const mine = currentSessionId();
          // Our own claim arrives here too, and must not sign us out.
          if (!claimed || !mine || claimed === mine) return;
          void endReplacedSession();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      appStateSub.remove();
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Said here rather than where the sign-out happens, so every path to it —
  // Realtime, the foreground check, the profile query — explains itself the
  // same way. The provider sits above the route groups, so the toast survives
  // the jump to the phone screen.
  useEffect(() => {
    if (!sessionReplaced) return;
    showToast(i18n.t('auth.sessionReplaced'), 'info');
    useAppStore.getState().setSessionReplaced(false);
  }, [sessionReplaced, showToast]);
}
