import { Stack } from 'expo-router';
import { usePingRealtime } from '@/hooks/usePingRealtime';
import { usePairRealtime } from '@/hooks/usePairRealtime';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { usePingFeedback } from '@/hooks/usePingFeedback';
import { usePrefetchImages } from '@/hooks/usePrefetchImages';
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
  usePingFeedback();
  usePrefetchImages();

  return null;
}

export default function HomeLayout() {
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
      {/* Before the ping overlay, so a ping arriving mid-celebration opens on top. */}
      <PairCelebrationOverlay />
      <IncomingPingOverlay />
    </>
  );
}
