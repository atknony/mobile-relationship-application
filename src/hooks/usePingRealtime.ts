import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import { useUnpairStore } from '@/stores/unpairStore';
import type { Ping, UnpairRequest } from '@/types/database';

// Call from (home)/_layout.tsx so the subscription is active for all paired screens.
export function usePingRealtime() {
  const ownUserId = useAuthStore((s) => s.user?.id);
  const pairId = useProfileStore((s) => s.ownProfile?.pair_id);
  const partnerProfile = useProfileStore((s) => s.partnerProfile);
  const setIncomingPing = usePingStore((s) => s.setIncomingPing);
  const setUnpairRequest = useUnpairStore((s) => s.setUnpairRequest);

  useEffect(() => {
    if (!pairId || !ownUserId) return;

    const channel = supabase
      .channel(`pair-events:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pings',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as Ping;
          if (row.sender_id === ownUserId) return; // own echo, ignore
          setIncomingPing({
            id: row.id,
            fromUserId: row.sender_id,
            fromDisplayName: partnerProfile?.display_name ?? 'Your partner',
            momentUrl: row.moment_url ?? undefined,
            receivedAt: Date.now(),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unpair_requests',
          filter: `pair_id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as UnpairRequest;
          setUnpairRequest(
            {
              id: row.id,
              initiatedBy: row.initiated_by,
              createdAt: row.created_at,
              expiresAt: row.expires_at,
              status: row.status,
            },
            ownUserId
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pairId, ownUserId, partnerProfile?.display_name]);
}
