import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Pair } from '@/types/database';

/**
 * redeem-invite-code updates the pair before it sets partner_id on the two
 * profiles, so the event can land a moment before this user's profile shows
 * the partner. One re-read shortly after covers that gap; the 3s poll in
 * useProfile remains the fallback beyond it.
 */
const PROFILE_LAG_RETRY_MS = 800;

/**
 * Lets the person who generated an invite know the instant it is redeemed.
 *
 * Their only signal used to be useProfile's 3-second poll, so the person who
 * entered the code landed on Home — and on the pairing celebration — up to
 * three seconds before the person who shared it. They are the requester on
 * their pending `pairs` row, which is already in the Realtime publication and
 * readable to them, so the activation can be pushed rather than polled.
 *
 * Call from (pair)/_layout.tsx. Its job ends when the guard leaves the group.
 */
export function usePairActivation() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`pair-activation:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pairs',
          filter: `requester_id=eq.${userId}`,
        },
        (payload) => {
          if ((payload.new as Pair).status !== 'active') return;
          const refetch = () => void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
          refetch();
          clearTimeout(retry);
          retry = setTimeout(refetch, PROFILE_LAG_RETRY_MS);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(retry);
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
