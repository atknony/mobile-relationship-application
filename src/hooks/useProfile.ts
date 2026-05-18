import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile, Pair } from '@/types/database';

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);
  const setPairId = useProfileStore((s) => s.setPairId);

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  // When profile loads, sync to store. If paired, also fetch the pair UUID
  // (needed for Realtime channel subscriptions on the moments table).
  useEffect(() => {
    if (query.data === undefined) return;
    setOwnProfile(query.data);

    if (query.data?.partner_id && userId) {
      supabase
        .from('pairs')
        .select('id')
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'active')
        .single()
        .then(({ data }: { data: Pick<Pair, 'id'> | null }) => {
          setPairId(data?.id ?? null);
        });
    } else {
      setPairId(null);
    }
  }, [query.data, userId]);

  return query;
}
