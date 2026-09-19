import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Notifications } from '@/lib/notifications';
import { i18n } from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { usePingStore } from '@/stores/pingStore';
import { useProfileStore } from '@/stores/profileStore';
import { VIBRATE_KEY } from '@/hooks/usePreferences';
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

    // Fire a local notification if the app is backgrounded. The ping lands in
    // the thread either way. A device with a push token already gets the
    // remote push from send-ping, so this is only the fallback for one that
    // has none (Expo Go, permission denied) — otherwise it arrives twice.
    const hasPush = !!useProfileStore.getState().pushToken;
    if (AppState.currentState !== 'active' && !hasPush) {
      void Notifications?.scheduleNotificationAsync({
        content: {
          title: i18n.t('pings.notificationTitle', { name: incomingPing.fromDisplayName }),
          body: incomingPing.momentPath ? i18n.t('pings.sentMoment') : undefined,
          sound: true,
        },
        trigger: null, // fire immediately
      });
    }

    // A ping arriving while you are looking at the app should still be felt.
    if (AppState.currentState === 'active') {
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
