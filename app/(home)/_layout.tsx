import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { usePingRealtime } from '@/hooks/usePingRealtime';
import { usePairRealtime } from '@/hooks/usePairRealtime';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useProfileLocale } from '@/hooks/useProfileLocale';
import { usePingFeedback } from '@/hooks/usePingFeedback';
import { usePrefetchImages } from '@/hooks/usePrefetchImages';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { usePairCelebration } from '@/hooks/usePairCelebration';
import { useAppStore } from '@/stores/appStore';
import { IncomingPingOverlay } from '@/components/ping/IncomingPingOverlay';
import { PairCelebrationOverlay } from '@/components/pair/PairCelebrationOverlay';
import { colors } from '@/constants/colors';
import { panel } from '@/constants/transitions';

function HomeProviders() {
  // useProfile() lives in the root layout — the auth guard needs it before
  // this group is reachable. The ping queue and its network listener live in
  // src/lib/pingQueue.ts, started once from the root layout.
  usePartnerProfile();
  usePingRealtime();
  usePairRealtime();
  usePushRegistration();
  useNotificationPermission();
  useProfileLocale();
  usePingFeedback();
  usePrefetchImages();

  return null;
}

export default function HomeLayout() {
  const { celebration, pending, decided, dismiss } = usePairCelebration();

  // The root layout holds the splash on this at launch (see homeReady there),
  // so a launch that has nothing to celebrate never shows the cover below.
  useEffect(() => {
    useAppStore.getState().setCelebrationDecided(decided);
  }, [decided]);
  useEffect(() => () => useAppStore.getState().setCelebrationDecided(false), []);

  return (
    <>
      <HomeProviders />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Home stays put; Moments and Settings rise over it and sink away. */}
        <Stack.Screen name="thread" options={panel} />
        <Stack.Screen name="settings" options={panel} />
      </Stack>
      {/* Home stays hidden while a new pair's celebration is being decided and
          while it is up — the celebration's own ground colour, so it opens onto
          it rather than over Home. Dropped as the celebration fades out, which
          is when Home is revealed. It also takes the touches meant for Home. */}
      {!decided || pending ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
      ) : null}
      {/* Before the ping overlay, so a ping arriving mid-celebration opens on top. */}
      <PairCelebrationOverlay celebration={celebration} dismiss={dismiss} />
      <IncomingPingOverlay />
    </>
  );
}
