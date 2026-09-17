import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { preloadImage } from '@/lib/preloadImage';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/types/database';

/**
 * How long a changed partner photo may hold back the profile update so the old
 * photo can be swapped for a ready new one, rather than for initials while it
 * downloads. Past it, the update goes through and the photo fades in late.
 */
const NEW_AVATAR_WAIT_MS = 3000;

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
      const profile = data as Profile;

      // A photo change on a screen that is already showing the old one: have
      // the new one ready before the store changes, so every Avatar swaps
      // straight from one photo to the other. Not on first load — there is no
      // old photo to keep up, and Home should not wait on an avatar.
      const previous = useProfileStore.getState().partnerProfile;
      if (
        previous?.id === profile.id &&
        profile.avatar_url &&
        profile.avatar_url !== previous.avatar_url
      ) {
        await preloadImage('avatars', profile.avatar_url, NEW_AVATAR_WAIT_MS);
      }

      return profile;
    },
    enabled: Boolean(partnerId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setPartnerProfile(query.data);
    }
  }, [query.data]);

  // While the app is open, usePairRealtime invalidates this query the moment
  // the partner changes their profile. That event is missed while the app is
  // backgrounded, so coming back to the app refetches too. refetch() rather
  // than relying on staleness, which would skip it for five minutes after the
  // last read; when nothing changed, structural sharing keeps `data` identical
  // and the store is not written.
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
