import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface ProfileState {
  ownProfile: Profile | null;
  partnerProfile: Profile | null;
  pairedWith: string | null; // partner's user_id
  pairId: string | null;     // UUID from the pairs table (needed for realtime subscriptions)

  setOwnProfile: (profile: Profile | null) => void;
  setPartnerProfile: (profile: Profile | null) => void;
  setPairedWith: (partnerId: string | null) => void;
  setPairId: (pairId: string | null) => void;
  clearProfiles: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  ownProfile: null,
  partnerProfile: null,
  pairedWith: null,
  pairId: null,

  setOwnProfile: (profile) =>
    set({
      ownProfile: profile,
      pairedWith: profile?.partner_id ?? null,
    }),

  setPartnerProfile: (profile) => set({ partnerProfile: profile }),

  setPairedWith: (partnerId) => set({ pairedWith: partnerId }),

  setPairId: (pairId) => set({ pairId }),

  clearProfiles: () =>
    set({ ownProfile: null, partnerProfile: null, pairedWith: null, pairId: null }),
}));
