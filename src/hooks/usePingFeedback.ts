import { useEffect } from 'react';
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

  useEffect(
    () =>
      subscribeToPingQueue((event) => {
        switch (event.type) {
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
            // Success is visible in the thread; nothing to announce.
            break;
        }
      }),
    [showToast, errorHaptic]
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
