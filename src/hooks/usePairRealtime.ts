import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/lib/i18n';
import { Notifications } from '@/lib/notifications';
import { useToast } from '@/components/ui/Toast';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import type { Pair } from '@/types/database';

/**
 * Watches the pair row for the other person ending it — and, while the pair is
 * active, for the partner changing their profile (see the handler).
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
 * Realtime only reaches an app that is open. A phone that was in the
 * background when the pair ended kept showing Home: its socket was suspended,
 * the event is never replayed, and nothing looked again. So the pair row is
 * also re-read whenever the app comes to the foreground, whenever the channel
 * (re)subscribes — mount, and every reconnect after a network drop — and when
 * the "partner disconnected" push arrives while the app is open. A pair that
 * is no longer active, or whose row the retention sweep has already deleted,
 * ends here exactly as if the event had been received.
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

  const pairEnded = useCallback(() => {
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
      partnerName
        ? i18n.t('unpair.partnerLeft', { name: partnerName })
        : i18n.t('unpair.noLongerConnected'),
      'info'
    );
  }, [queryClient, showToast]);

  // Asks the server whether this pair still exists. A network error proves
  // nothing — offline must never look like "unpaired" — so only a real answer
  // (row gone, or not active) ends it.
  const verifyPair = useCallback(async () => {
    const current = useProfileStore.getState().pairId;
    if (!current) return;
    const { data, error } = await supabase
      .from('pairs')
      .select('status')
      .eq('id', current)
      .maybeSingle();
    if (error || useProfileStore.getState().pairId !== current) return;
    if (!data || data.status !== 'active') pairEnded();
  }, [pairEnded]);

  useEffect(() => {
    if (!pairId) return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void verifyPair();
    });
    const received = Notifications?.addNotificationReceivedListener((notification) => {
      if (notification.request.content.data?.type === 'unpaired') void verifyPair();
    });
    return () => {
      sub.remove();
      received?.remove();
    };
  }, [pairId, verifyPair]);

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

          if (row.status === 'active') {
            // The partner changed their photo or name. `profiles` is not in
            // Realtime (its events would carry push_token), so a trigger stamps
            // this row instead and we refetch the one profile ourselves. Our
            // own edits stamp it too; those need nothing.
            const partnerId = useProfileStore.getState().partnerProfile?.id;
            if (row.profile_changed_by && row.profile_changed_by === partnerId) {
              void queryClient.invalidateQueries({ queryKey: ['partner-profile', partnerId] });
            }
            return;
          }

          pairEnded();
        }
      )
      .subscribe((status) => {
        // Also fires on every rejoin after a dropped connection — the window
        // in which an UPDATE could have been missed.
        if (status === 'SUBSCRIBED') void verifyPair();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pairId, queryClient, verifyPair, pairEnded]);
}
