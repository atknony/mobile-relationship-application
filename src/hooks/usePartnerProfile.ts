import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { preloadImage } from '@/lib/preloadImage';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { STARTUP_AVATAR_WAIT_MS } from '@/constants/timing';
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

      // The photo is made ready before the profile reaches the store, in two cases:
      // - A change on a screen already showing the old photo, so every Avatar
      //   swaps straight from one photo to the other.
      // - The launch. The root layout holds the splash until this profile is in
      //   the store (see `homeReady` in app/_layout.tsx), so Home appears with
      //   its header complete instead of a name and then a face popping in.
      // Not a first load after launch (a new pair): the celebration covers Home
      // and waits for the avatars itself.
      const previous = useProfileStore.getState().partnerProfile;
      if (profile.avatar_url) {
        if (previous?.id === profile.id && profile.avatar_url !== previous.avatar_url) {
          await preloadImage('avatars', profile.avatar_url, NEW_AVATAR_WAIT_MS);
        } else if (previous?.id !== profile.id && !useAppStore.getState().isRevealed) {
          await preloadImage('avatars', profile.avatar_url, STARTUP_AVATAR_WAIT_MS);
        }
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
