import { useNetworkStore } from '@/stores/networkStore';

interface NetworkStatus {
  isConnected: boolean | null; // null until the first NetInfo event
}

/**
 * Read-only view of connectivity. The single NetInfo listener lives in
 * src/lib/pingQueue.ts — this hook deliberately owns no subscription, because
 * it is called from several screens at once.
 */
export function useNetworkStatus(): NetworkStatus {
  const isConnected = useNetworkStore((s) => s.isConnected);
  return { isConnected };
}
