import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';

import { queryClient } from '@/lib/queryClient';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { ToastProvider } from '@/components/ui/Toast';
import { Notifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

// Entry route of each auth state's group. The root layout must render a
// navigator on its first render (expo-router throws "Attempted to navigate
// before mounting the Root Layout component" otherwise, and nothing paints),
// so the guard moves the user between groups from an effect instead of
// returning <Redirect> in place of the navigator.
const AUTH = '(auth)';
const ONBOARDING = '(onboarding)';
const PAIR = '(pair)';
const HOME = '(home)';

const ENTRY = {
  [AUTH]: '/(auth)/phone',
  [ONBOARDING]: '/(onboarding)/profile-setup',
  [PAIR]: '/(pair)/create-invite',
  [HOME]: '/(home)/',
} as const;

function RootNavigator() {
  useSupabaseSession();

  // Own profile decides between onboarding / pair / home, so it is fetched
  // here rather than in (home) — which the guard can only reach once the
  // profile is already known.
  const profileQuery = useProfile();

  const sessionLoaded = useAuthStore((s) => s.sessionLoaded);
  const session = useAuthStore((s) => s.session);
  const ownProfile = useProfileStore((s) => s.ownProfile);
  const pairedWith = useProfileStore((s) => s.pairedWith);

  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  const router = useRouter();
  const segments = useSegments();

  // isLoading (not isPending) is false while the query is disabled, i.e. when
  // there is no session to load a profile for.
  const profilePending = Boolean(session) && profileQuery.isLoading;
  const ready = sessionLoaded && (fontsLoaded || Boolean(fontError)) && !profilePending;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    // Read through getState(): useProfile's own effect writes the store just
    // before this effect runs, so the values closed over above can be stale
    // for one tick and would bounce the user through the wrong group.
    const auth = useAuthStore.getState();
    const profile = useProfileStore.getState();

    const target = !auth.session
      ? AUTH
      : !profile.ownProfile
        ? ONBOARDING
        : !profile.pairedWith
          ? PAIR
          : HOME;

    if (segments[0] !== target) {
      router.replace(ENTRY[target]);
    }
  }, [ready, session, ownProfile, pairedWith, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
