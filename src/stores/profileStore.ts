import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface ProfileState {
  ownProfile: Profile | null;
  partnerProfile: Profile | null;
  pairedWith: string | null; // partner's user_id
  pairId: string | null;     // UUID from the pairs table (needed for realtime subscriptions)
  pairedSince: string | null; // pairs.created_at — "together since" in settings

  setOwnProfile: (profile: Profile | null) => void;
  setPartnerProfile: (profile: Profile | null) => void;
  setPairedWith: (partnerId: string | null) => void;
  setPairId: (pairId: string | null, pairedSince?: string | null) => void;
  clearProfiles: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  ownProfile: null,
  partnerProfile: null,
  pairedWith: null,
  pairId: null,
  pairedSince: null,

  setOwnProfile: (profile) =>
    set({
      ownProfile: profile,
      pairedWith: profile?.partner_id ?? null,
    }),

  setPartnerProfile: (profile) => set({ partnerProfile: profile }),

  setPairedWith: (partnerId) => set({ pairedWith: partnerId }),

  setPairId: (pairId, pairedSince = null) => set({ pairId, pairedSince }),

  clearProfiles: () =>
    set({ ownProfile: null, partnerProfile: null, pairedWith: null, pairId: null, pairedSince: null }),
}));
