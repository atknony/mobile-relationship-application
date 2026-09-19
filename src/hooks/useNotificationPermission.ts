import { useEffect } from 'react';
import { AppState } from 'react-native';
import { readNotificationPermission } from '@/lib/notificationPermission';

/**
 * Keeps appStore.notificationPermission current: on mount, and every time the
 * app comes back to the foreground — which is how a change made in the device
 * settings (from the Settings screen's Notifications row) is noticed. Call once, from (home).
 */
export function useNotificationPermission() {
  useEffect(() => {
    void readNotificationPermission();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void readNotificationPermission();
    });
    return () => sub.remove();
  }, []);
}
