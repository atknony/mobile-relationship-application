import { Stack } from 'expo-router';
import { usePingRealtime } from '@/hooks/usePingRealtime';
import { useProfile } from '@/hooks/useProfile';
import { usePartnerProfile } from '@/hooks/usePartnerProfile';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { IncomingPingOverlay } from '@/components/ping/IncomingPingOverlay';

function HomeProviders() {
  useProfile();
  usePartnerProfile();
  usePingRealtime();

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
