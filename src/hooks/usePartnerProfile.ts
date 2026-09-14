import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

export function usePartnerProfile() {
  // partner_id is the partner's user_id — query their profile directly
  const partnerId = useProfileStore((s) => s.ownProfile?.partner_id);
  const isDemo = useAuthStore((s) => s.isDemo);
  const setPartnerProfile = useProfileStore((s) => s.setPartnerProfile);

  const query = useQuery({
    queryKey: ['partner-profile', partnerId],
    queryFn: async (): Promise<Profile | null> => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: Boolean(partnerId) && !isDemo,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setPartnerProfile(query.data);
    }
  }, [query.data]);

  return query;
}
