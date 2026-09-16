import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile, Pair } from '@/types/database';

/**
 * How often an unpaired profile is re-read while waiting for the other side.
 *
 * Nothing pushes pair activation to the person who generated the code: their
 * own row is changed server-side by `redeem-invite-code`, and `profiles` has no
 * Realtime subscription. The invite screen used to poll from
 * `WaitingForPartner`, which only mounts after Copy or Share is tapped — read
 * the code out loud and that device waited forever. The poll belongs to the
 * state ("signed in, has a profile, not yet paired"), not to one component's
 * render branch, so it lives on the query the root layout already owns.
 */
const UNPAIRED_POLL_MS = 3000;

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);
  const setPairId = useProfileStore((s) => s.setPairId);

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      // maybeSingle: a user who has not completed onboarding has no row yet,
      // and single() would reject that with PGRST116 instead of returning null.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    // Stops the moment partner_id lands; never runs during onboarding (no row
    // yet) or once paired.
    refetchInterval: (query) =>
      query.state.data && !query.state.data.partner_id ? UNPAIRED_POLL_MS : false,
  });

  // When profile loads, sync to store. If paired, also fetch the pair UUID
  // (needed for Realtime channel subscriptions on the moments table).
  useEffect(() => {
    if (query.data === undefined) return;
    setOwnProfile(query.data);

    if (query.data?.partner_id && userId) {
      supabase
        .from('pairs')
        .select('id, created_at')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'active')
        .maybeSingle()
        .then(({ data }: { data: Pick<Pair, 'id' | 'created_at'> | null }) => {
          setPairId(data?.id ?? null, data?.created_at ?? null);
        });
    } else {
      setPairId(null);
    }
  }, [query.data, userId]);

  return query;
}
