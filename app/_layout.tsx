import '../global.css';
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
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
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';

import { queryClient } from '@/lib/queryClient';
import { initPingQueue } from '@/lib/pingQueue';
import { pruneImageCache } from '@/lib/imageCache';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useActiveDevice } from '@/hooks/useActiveDevice';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { ToastProvider } from '@/components/ui/Toast';
import { Notifications } from '@/lib/notifications';
import { colors } from '@/constants/colors';
import { STARTUP_SETTLE_TIMEOUT_MS } from '@/constants/timing';
import { stateChange } from '@/constants/transitions';
import type { Profile } from '@/types/database';

SplashScreen.preventAutoHideAsync();

// Only consulted while the app is in the foreground. A ping push that arrives
// then is already on screen — Realtime opened the overlay and played the
// haptic — so a system banner on top of it would announce it twice.
Notifications?.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = notification.request.content.data?.type !== 'ping';
    return {
      shouldShowBanner: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
      shouldShowList: show,
    };
  },
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

type Group = keyof typeof ENTRY;

/**
 * Shared by the render and the guard effect so the two can never disagree about
 * where this session belongs.
 */
function resolveGroup(
  session: Session | null,
  ownProfile: Profile | null,
  pairedWith: string | null
): Group {
  if (!session) return AUTH;
  if (!ownProfile) return ONBOARDING;
  if (!pairedWith) return PAIR;
  return HOME;
}

function RootNavigator() {
  useSupabaseSession();
  // Every signed-in group, not just (home): one account, one phone.
  useActiveDevice();

  // Owns the offline queue's NetInfo/AppState listeners for the app's lifetime.
  // In an effect rather than module scope so nothing touches NetInfo during
  // bundle evaluation.
  useEffect(() => initPingQueue(), []);

  // Bounds the on-disk photo cache. Once per launch, and after first paint's
  // worth of work rather than during it.
  useEffect(() => {
    const handle = setTimeout(() => pruneImageCache(), 5000);
    return () => clearTimeout(handle);
  }, []);

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
    Newsreader_400Regular_Italic,
  });

  const router = useRouter();
  const segments = useSegments();

  // isLoading (not isPending) is false while the query is disabled, i.e. when
  // there is no session to load a profile for.
  const profilePending = Boolean(session) && profileQuery.isLoading;
  const ready = sessionLoaded && (fontsLoaded || Boolean(fontError)) && !profilePending;

  // `ready` only means the answer is known — the navigator can still be showing
  // the route it booted into. expo-router resolves "/" to (home)/index before
  // anything has been decided, so that is what the very first frames paint.
  const settled = ready && segments[0] === resolveGroup(session, ownProfile, pairedWith);

  // Insurance, and never the normal path. Holding the splash until the guard
  // agrees with the router is only safe if that agreement is guaranteed, and a
  // splash that never lifts is a worse bug than the flash this replaces. If
  // settling somehow does not happen, give up and show the app: a flash is
  // recoverable, an app that paints nothing is not.
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);

  useEffect(() => {
    if (settled || !ready) return;
    const timer = setTimeout(() => setGaveUpWaiting(true), STARTUP_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, settled]);

  const revealed = settled || gaveUpWaiting;

  useEffect(() => {
    // Gated on `revealed`, not `ready`. Effects run in order, so hiding on
    // `ready` uncovered the navigator one whole render before the guard below
    // called replace() — and replace() needs another render to land. That gap
    // is the flash: the splash lifts on whatever route the app booted into.
    if (revealed) void SplashScreen.hideAsync();
  }, [revealed]);

  // Published so screens can hold off taking focus. The cover stops the route
  // underneath being seen, but the keyboard is a system window and draws over
  // it, so an autofocusing input on a screen the guard is about to replace
  // still shows at launch.
  useEffect(() => {
    useAppStore.getState().setRevealed(revealed);
  }, [revealed]);

  useEffect(() => {
    if (revealed) return;
    // Belt and braces for a keyboard this app did not ask for: Android can
    // restore the IME from the previous launch before any JS runs, and this is
    // the earliest point at which it can be told otherwise.
    Keyboard.dismiss();
  }, [revealed]);

  // Group changes cross-fade (signing in or out, pairing, unpairing) — but not
  // the one that happens under the startup cover. That replace lands in the
  // same render that flips `revealed`, so animating it would play a fade from
  // the boot route to the real one just as the cover lifts: the startup flash
  // again, only softer. Turned on a frame after the reveal instead, by which
  // time that screen is already mounted without an animation. Never turned off.
  const [animateGroupChanges, setAnimateGroupChanges] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const frame = requestAnimationFrame(() => setAnimateGroupChanges(true));
    return () => cancelAnimationFrame(frame);
  }, [revealed]);

  useEffect(() => {
    if (!ready) return;

    // Read through getState(): useProfile's own effect writes the store just
    // before this effect runs, so the values closed over above can be stale
    // for one tick and would bounce the user through the wrong group.
    const auth = useAuthStore.getState();
    const profile = useProfileStore.getState();
    const target = resolveGroup(auth.session, profile.ownProfile, profile.pairedWith);

    if (segments[0] !== target) {
      router.replace(ENTRY[target]);
    }
  }, [ready, session, ownProfile, pairedWith, segments, router]);

  return (
    <>
      {/* The navigator has to be mounted from the first render or expo-router
          throws "Attempted to navigate before mounting the Root Layout
          component" — so it is covered rather than withheld. colors.bg is the
          splash's own backgroundColor (see the expo-splash-screen plugin entry
          in app.json), so the handover is invisible however the native splash
          happens to be timed, and the cover takes the touches that nobody
          should be able to land on a screen that is still being decided.
          A Stack rather than a bare <Slot /> only so the guard's replace()
          between groups can animate; a Slot swaps them in a hard cut. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          ...(animateGroupChanges ? stateChange : { animation: 'none' }),
        }}
      />
      {!revealed && <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />}
    </>
  );
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
