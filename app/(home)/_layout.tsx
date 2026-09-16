import { Stack } from 'expo-router';
import { usePingRealtime } from '@/hooks/usePingRealtime';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { IncomingPingOverlay } from '@/components/ping/IncomingPingOverlay';

function HomeProviders() {
  // useProfile() lives in the root layout — the auth guard needs it before
  // this group is reachable.
  usePartnerProfile();
  usePingRealtime();
  usePushRegistration();

  const { drainQueue } = useOfflineQueue();
  useNetworkStatus(drainQueue);

  return null;
}

export default function HomeLayout() {
  return (
    <>
      <HomeProviders />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F0EDFF' },
        }}
      />
      <IncomingPingOverlay />
    </>
  );
}
