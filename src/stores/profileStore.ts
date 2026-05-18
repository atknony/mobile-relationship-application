import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface ProfileState {
  ownProfile: Profile | null;
  partnerProfile: Profile | null;
  pairedWith: string | null; // partner's user_id

  setOwnProfile: (profile: Profile | null) => void;
  setPartnerProfile: (profile: Profile | null) => void;
  setPairedWith: (partnerId: string | null) => void;
  clearProfiles: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  ownProfile: null,
  partnerProfile: null,
  pairedWith: null,

  setOwnProfile: (profile) =>
    set({
      ownProfile: profile,
      pairedWith: profile?.pair_id ? profile.pair_id : null,
    }),

  setPartnerProfile: (profile) => set({ partnerProfile: profile }),

  setPairedWith: (partnerId) => set({ pairedWith: partnerId }),

  clearProfiles: () =>
    set({ ownProfile: null, partnerProfile: null, pairedWith: null }),
}));
