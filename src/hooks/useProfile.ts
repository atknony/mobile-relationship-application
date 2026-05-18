import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

export function useProfile() {
  const userId = useAuthStore((s) => s.user?.id);
  const setOwnProfile = useProfileStore((s) => s.setOwnProfile);

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

  useEffect(() => {
    if (query.data !== undefined) {
      setOwnProfile(query.data);
    }
  }, [query.data]);

  return query;
}
