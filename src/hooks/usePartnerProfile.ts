import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

export function usePartnerProfile() {
  // partner_id is the partner's user_id — query their profile directly
  const partnerId = useProfileStore((s) => s.ownProfile?.partner_id);
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
    enabled: Boolean(partnerId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setPartnerProfile(query.data);
    }
  }, [query.data]);

  // Your partner changing their name or photo happens on their phone, and
  // nothing tells this one: `profiles` is not in the Realtime publication
  // (adding it would broadcast push_token too), and this query is mounted once
  // for the whole of (home), so staleTime alone never re-reads it. Coming back
  // to the app is the natural moment to look. refetch() rather than relying on
  // staleness, which would skip it for five minutes after the last read; when
  // nothing changed, structural sharing keeps `data` identical and the store
  // is not written.
  const { refetch } = query;
  useEffect(() => {
    if (!partnerId) return;
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') void refetch();
    });
    return () => sub.remove();
  }, [partnerId, refetch]);

  return query;
}
