import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { isExpoGo, Notifications } from '@/lib/notifications';
import { publishPermission } from '@/lib/notificationPermission';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { useAppStore } from '@/stores/appStore';

// Expo Go has no remote push (see isExpoGo) — the app must still run, just
// without it. Local notifications (useIncomingPing) keep working either way.

const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

async function registerForPush(): Promise<string | null> {
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
  // Asked once, here, the first time Home opens. After a refusal the
  // Notifications row in Settings is the way back — never a re-prompt on
  // every launch.
  const answer =
    existing.granted || existing.status !== 'undetermined'
      ? existing
      : await Notifications.requestPermissionsAsync();
  publishPermission(answer);
  if (!answer.granted) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (err) {
    // Permission granted and still no token: this is a build problem, not a
    // user one, and without a token no push can ever arrive. On Android it
    // almost always means the build has no google-services.json (see
    // app.config.js) — which is exactly how the 19 Sep dev build lost push
    // with nothing on screen saying so. Loud in development.
    if (__DEV__) {
      console.error(
        '[push] Could not get a push token, so this phone will receive no pushes. ' +
          'On Android this usually means the build has no google-services.json ' +
          '(eas env:list must show GOOGLE_SERVICES_JSON).',
        err
      );
    }
    return null;
  }
}

/**
 * Must run while the session is still valid — after signOut() the write would
 * be rejected by RLS, leaving this device receiving the next user's pings.
 */
export async function clearPushToken(userId: string) {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}

/**
 * Writes this phone's Expo push token to its profile, and keeps it there.
 *
 * The server copy can be cleared behind this phone's back — the sign-in claim
 * wipes it, sign-out wipes it, send-ping drops a token Expo reports dead — and
 * since clients cannot read the column (20260919100000) the app cannot notice.
 * So instead of writing once and trusting it, it writes again on every
 * occasion that could matter: Home opening, permission turning on (back from
 * the device settings via the Settings row — only that transition, since re-running
 * on "denied" would re-prompt), every return to the foreground, and whenever
 * something asks (appStore.requestPushRegistration, after the claim). One
 * small UPDATE each time; nothing to keep in sync.
 */
export function usePushRegistration() {
  const userId = useAuthStore((s) => s.user?.id);
  const granted = useAppStore((s) => s.notificationPermission?.granted ?? false);
  const requested = useAppStore((s) => s.pushRegistrationNonce);
  const [foregrounds, setForegrounds] = useState(0);
  const setIncomingPing = usePingStore((s) => s.setIncomingPing);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') setForegrounds((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void (async () => {
      try {
        const token = await registerForPush();
        if (!token || cancelled) return;

        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);
        if (error) {
          if (__DEV__) console.warn('[push] could not save the token:', error.message);
          return;
        }
        // Local only: tells useIncomingPing this phone gets real pushes.
        if (!cancelled) useProfileStore.getState().setPushToken(token);
      } catch (err) {
        if (__DEV__) console.warn('[push] registration skipped:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, granted, requested, foregrounds]);

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
