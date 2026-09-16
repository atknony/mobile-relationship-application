import { Stack } from 'expo-router';
import { usePingRealtime } from '@/hooks/usePingRealtime';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { usePingFeedback } from '@/hooks/usePingFeedback';
import { IncomingPingOverlay } from '@/components/ping/IncomingPingOverlay';
import { colors } from '@/constants/colors';

function HomeProviders() {
  // useProfile() lives in the root layout — the auth guard needs it before
  // this group is reachable. The ping queue and its network listener live in
  // src/lib/pingQueue.ts, started once from the root layout.
  usePartnerProfile();
  usePingRealtime();
  usePushRegistration();
  usePingFeedback();

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
      />
      <IncomingPingOverlay />
    </>
  );
}
