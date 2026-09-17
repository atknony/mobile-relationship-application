import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToPingQueue } from '@/lib/pingQueue';
import { usePingStore } from '@/stores/pingStore';
import { useToast } from '@/components/ui/Toast';
import { useHaptics } from '@/hooks/useHaptics';
import { PING_FAILED_RESET_MS, PING_STATUS_RESET_MS } from '@/constants/timing';

/**
 * Bridges the queue (which lives outside React) to toasts and haptics, and
 * returns transient ping statuses to idle.
 *
 * Only sendPing writes pingStatus; drains report through events instead, so a
 * background drain can never overwrite the status of a send in progress.
 */
export function usePingFeedback() {
  const pingStatus = usePingStore((s) => s.pingStatus);
  const { showToast } = useToast();
  const { errorHaptic } = useHaptics();
  const queryClient = useQueryClient();

  useEffect(
    () =>
      subscribeToPingQueue((event) => {
        switch (event.type) {
          case 'sent':
            // Marks the thread stale so it refetches — immediately if it is on
            // screen, otherwise the next time it is opened. Without this the
            // 30s staleTime meant a ping sent just before opening the thread
            // was simply missing from it.
            void queryClient.invalidateQueries({ queryKey: ['moments'] });
            break;
          case 'sendFailed':
            // The send screen is wordless: a failed ping is felt, then shown as
            // a queued row in the thread rather than as a banner over the vessel.
            errorHaptic();
            break;
          case 'dropped':
            // A ping the queue gave up on leaves the thread entirely, so this is
            // the only notice it gets. Previously it was discarded in silence,
            // after the UI had already claimed it was sent.
            errorHaptic();
            showToast(
              event.count === 1
                ? "A ping couldn't be delivered."
                : `${event.count} pings couldn't be delivered.`,
              'error'
            );
            break;
          case 'drained':
            // Nothing to announce, but the rows moved from queued to delivered.
            void queryClient.invalidateQueries({ queryKey: ['moments'] });
            break;
        }
      }),
    [showToast, errorHaptic, queryClient]
  );

  useEffect(() => {
    if (pingStatus !== 'sent' && pingStatus !== 'failed') return;

    const timer = setTimeout(
      () => {
        // Re-read: a newer send may have started while this was pending.
        if (usePingStore.getState().pingStatus === pingStatus) {
          usePingStore.getState().setPingStatus('idle');
        }
      },
      pingStatus === 'failed' ? PING_FAILED_RESET_MS : PING_STATUS_RESET_MS
    );

    return () => clearTimeout(timer);
  }, [pingStatus]);
}
