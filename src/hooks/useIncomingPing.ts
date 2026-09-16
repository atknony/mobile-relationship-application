import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Notifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { usePingStore } from '@/stores/pingStore';
import { useProfileStore } from '@/stores/profileStore';
import { isQuietNow, VIBRATE_KEY } from '@/hooks/usePreferences';
import { INCOMING_PING_AUTODISMISS_MS } from '@/constants/timing';

export function useIncomingPing() {
  const incomingPing = usePingStore((s) => s.incomingPing);
  const dismissIncomingPing = usePingStore((s) => s.dismissIncomingPing);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissIncomingPing();
  }, [dismissIncomingPing]);

  useEffect(() => {
    if (!incomingPing) return;

    // Auto-dismiss after 8 seconds
    dismissTimer.current = setTimeout(dismiss, INCOMING_PING_AUTODISMISS_MS);

    // Fire local notification if app is backgrounded — unless the user has
    // asked for quiet. The ping still lands in the thread either way.
    const quiet = isQuietNow(
      useProfileStore.getState().ownProfile?.quiet_hours_start ?? null,
      useProfileStore.getState().ownProfile?.quiet_hours_end ?? null
    );
    if (AppState.currentState !== 'active' && !quiet) {
      void Notifications?.scheduleNotificationAsync({
        content: {
          title: `${incomingPing.fromDisplayName} is thinking of you`,
          body: incomingPing.momentPath ? 'Sent you a moment' : undefined,
          sound: true,
        },
        trigger: null, // fire immediately
      });
    }

    // A ping arriving while you are looking at the app should still be felt.
    if (!quiet && AppState.currentState === 'active') {
      void AsyncStorage.getItem(VIBRATE_KEY).then((raw) => {
        if (raw !== 'false') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [incomingPing?.id]);

  return { incomingPing, dismiss };
}
