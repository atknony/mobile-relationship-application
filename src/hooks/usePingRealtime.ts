import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import type { Moment } from '@/types/database';

// Call from (home)/_layout.tsx so the subscription is active for all paired screens.
export function usePingRealtime() {
  const ownUserId = useAuthStore((s) => s.user?.id);
  const isDemo = useAuthStore((s) => s.isDemo);
  const pairId = useProfileStore((s) => s.pairId); // UUID from pairs table
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const setIncomingPing = usePingStore((s) => s.setIncomingPing);

  useEffect(() => {
    if (!pairId || !ownUserId || isDemo) return;

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
          setIncomingPing({
            id: row.id,
            fromUserId: row.sender_id,
            fromDisplayName: partnerProfile?.username ?? 'Your partner',
            momentPath: row.photo_path ?? undefined,
            receivedAt: Date.now(),
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pairId, ownUserId, partnerProfile?.username, isDemo]);
}
