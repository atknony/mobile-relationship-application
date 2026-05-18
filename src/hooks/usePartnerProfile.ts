import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

export function usePartnerProfile() {
  const ownUserId = useAuthStore((s) => s.user?.id);
  const pairId = useProfileStore((s) => s.ownProfile?.pair_id);
  const setPartnerProfile = useProfileStore((s) => s.setPartnerProfile);

  const query = useQuery({
    queryKey: ['partner-profile', pairId],
    queryFn: async (): Promise<Profile | null> => {
      if (!pairId || !ownUserId) return null;
      // Fetch the other user in the pair
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('pair_id', pairId)
        .neq('id', ownUserId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: Boolean(pairId && ownUserId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setPartnerProfile(query.data);
    }
  }, [query.data]);

  return query;
}
