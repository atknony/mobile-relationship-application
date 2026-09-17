import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { fetchImage } from '@/lib/imageCache';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { INCOMING_PHOTO_WAIT_MS } from '@/constants/timing';
import type { Moment } from '@/types/database';

/**
 * Gets a photo downloaded *and* decoded into expo-image's memory cache, giving
 * up after `timeoutMs`. Decoding matters as much as downloading: a file on disk
 * still takes a moment to decode, and the overlay would open on an empty card
 * for that moment. Never rejects — a photo that is not ready is not an error.
 */
async function readyToDisplay(path: string, timeoutMs: number): Promise<void> {
  const prepare = fetchImage('moments', path)
    .then((uri) => Image.prefetch(uri, { cachePolicy: 'memory' }))
    .catch(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([prepare, timeout]);
}

// Call from (home)/_layout.tsx so the subscription is active for all paired screens.
export function usePingRealtime() {
  const ownUserId = useAuthStore((s) => s.user?.id);
  const pairId = useProfileStore((s) => s.pairId); // UUID from pairs table
  const setIncomingPing = usePingStore((s) => s.setIncomingPing);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pairId || !ownUserId) return;
    let active = true;

    // Arrivals are delivered strictly in order. A photo ping is held while its
    // photo loads, and a plain ping landing in the meantime must not jump ahead
    // of it and then be replaced by it.
    let deliveries = Promise.resolve();

    const channel = supabase
      .channel(`pair-events:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moments',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as Moment;
          if (row.sender_id === ownUserId) return; // own echo, ignore

          // Refresh the thread straight away so the ping is in it when opened.
          void queryClient.invalidateQueries({ queryKey: ['moments', pairId] });

          deliveries = deliveries.then(async () => {
            // The name, the photo, the haptic and the local notification all
            // hang off setIncomingPing, so holding it back until the photo is
            // ready makes everything arrive as one moment rather than as a
            // text card that a photo drops into a second later.
            if (row.photo_path) await readyToDisplay(row.photo_path, INCOMING_PHOTO_WAIT_MS);
            if (!active) return;
            setIncomingPing({
              id: row.id,
              fromUserId: row.sender_id,
              fromDisplayName:
                useProfileStore.getState().partnerProfile?.username ?? 'Your partner',
              momentPath: row.photo_path ?? undefined,
              receivedAt: Date.now(),
            });
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [pairId, ownUserId, setIncomingPing, queryClient]);
}
