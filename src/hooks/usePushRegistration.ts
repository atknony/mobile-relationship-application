import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Notifications } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';

// Expo Go dropped remote-push support in SDK 53, so there is no token to get
// there — the app must still run, just without push. Local notifications
// (useIncomingPing) keep working either way.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

async function registerForPush(currentToken: string | null | undefined): Promise<string | null> {
  if (!Notifications || isExpoGo) return null;

  // Android 13+ only surfaces the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pings',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#74B9FF',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const granted =
    existing.granted ||
    (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token === currentToken ? null : token;
}

/**
 * Must run while the session is still valid — after signOut() the write would
 * be rejected by RLS, leaving this device receiving the next user's pings.
 */
export async function clearPushToken(userId: string) {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}

export function usePushRegistration() {
  const userId = useAuthStore((s) => s.user?.id);
  const currentToken = useProfileStore((s) => s.pushToken);
  const setIncomingPing = usePingStore((s) => s.setIncomingPing);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      try {
        const token = await registerForPush(currentToken);
        if (!token || cancelled) return;

        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);
        if (error || cancelled) return;

        // Remembered locally so a remount compares equal and skips the write —
        // the column cannot be read back.
        useProfileStore.getState().setPushToken(token);
      } catch (err) {
        if (__DEV__) console.warn('[push] registration skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, currentToken]);

  // Tapping a push should surface the ping, not just open the app.
  useEffect(() => {
    if (!Notifications || isExpoGo) return;

    const showFromResponse = (data: Record<string, unknown> | undefined) => {
      if (!data || data.type !== 'ping') return;
      const partner = useProfileStore.getState().partnerProfile;
      setIncomingPing({
        id: String(data.momentId ?? Date.now()),
        fromUserId: String(data.senderId ?? partner?.id ?? ''),
        fromDisplayName: partner?.username ?? i18n.t('common.yourPartner'),
        receivedAt: Date.now(),
      });
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      showFromResponse(response.notification.request.content.data);
    });

    // Cold start: the tap that launched the app is not delivered to the listener.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) showFromResponse(response.notification.request.content.data);
    });

    return () => subscription.remove();
  }, [setIncomingPing]);
}
