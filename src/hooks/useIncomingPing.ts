import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Notifications } from '@/lib/notifications';
import { usePingStore } from '@/stores/pingStore';
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

    // Fire local notification if app is backgrounded
    if (AppState.currentState !== 'active') {
      void Notifications?.scheduleNotificationAsync({
        content: {
          title: `${incomingPing.fromDisplayName} is thinking of you 💙`,
          body: incomingPing.momentUrl ? 'Sent you a moment' : undefined,
          sound: true,
        },
        trigger: null, // fire immediately
      });
    }

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [incomingPing?.id]);

  return { incomingPing, dismiss };
}
