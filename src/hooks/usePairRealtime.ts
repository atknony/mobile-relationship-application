import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import type { Pair } from '@/types/database';

/**
 * Watches the pair row for the other person ending it.
 *
 * `dissolve-pair` does everything server-side: it flips `pairs.status` to
 * 'dissolved' and nulls `partner_id` on both profiles. The initiator's app
 * clears its own stores on the way out, so only that device ever reacted — the
 * other one kept the ping screen, an avatar and a pairId for a pair that no
 * longer existed, and every ping it sent came back "No active pair found".
 * Its profile query could not rescue it either: that only polls while unpaired.
 *
 * Membership, not status, is what the `pairs` SELECT policies key on, so the
 * dissolved row stays readable and Realtime delivers the change to both members.
 *
 * Call from (home)/_layout.tsx, alongside the moments subscription. They are
 * deliberately separate channels: this one's whole job is to tear down the
 * conditions the other one depends on.
 */
export function usePairRealtime() {
  const pairId = useProfileStore((s) => s.pairId);
  const queryClient = useQueryClient();
  // Stable, and the provider sits above the navigator, so raising a toast from
  // the same tick that unmounts this route group is safe.
  const { showToast } = useToast();

  useEffect(() => {
    if (!pairId) return;

    const channel = supabase
      .channel(`pair-status:${pairId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pairs',
          filter: `id=eq.${pairId}`,
        },
        (payload) => {
          const row = payload.new as Pair;
          if (row.status === 'active') return;

          // Write the stores directly rather than waiting on a refetch. The
          // root guard reads `pairedWith`, derived from `ownProfile.partner_id`
          // — leaving that set holds this device on the ping screen for however
          // long the network takes.
          const profiles = useProfileStore.getState();

          // The device that ended it has already cleared itself in
          // useUnpairFlow, and does not need to be told that it did. Both
          // members get this event, and the initiator's own channel is only
          // torn down a tick later, so without this it would toast at itself.
          // It also makes a repeated delivery a no-op.
          if (!profiles.pairedWith) return;

          const own = profiles.ownProfile;
          const partnerName = profiles.partnerProfile?.username;

          if (own) profiles.setOwnProfile({ ...own, partner_id: null });
          profiles.setPartnerProfile(null);
          profiles.setPairId(null);

          // An overlay from the pair that just ended must not outlive it.
          usePingStore.getState().dismissIncomingPing();

          // The thread belongs to a pair this user can no longer read.
          queryClient.removeQueries({ queryKey: ['moments'] });
          void queryClient.invalidateQueries({ queryKey: ['profile'] });

          showToast(
            partnerName ? `${partnerName} disconnected.` : 'You are no longer connected.',
            'info'
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pairId, queryClient, showToast]);
}
