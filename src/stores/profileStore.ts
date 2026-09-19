import { create } from 'zustand';
import type { Profile } from '@/types/database';

interface ProfileState {
  ownProfile: Profile | null;
  partnerProfile: Profile | null;
  pairedWith: string | null; // partner's user_id
  pairId: string | null;     // UUID from the pairs table (needed for realtime subscriptions)
  pairedSince: string | null; // pairs.created_at — "together since" in settings
  pairActivatedAt: string | null; // pairs.activated_at — when it became a pair (celebration)
  /**
   * The Expo push token this phone last wrote to its profile, this session.
   * Local only: clients cannot read `profiles.push_token` back.
   */
  pushToken: string | null;

  setOwnProfile: (profile: Profile | null) => void;
  setPartnerProfile: (profile: Profile | null) => void;
  setPairedWith: (partnerId: string | null) => void;
  setPairId: (
    pairId: string | null,
    pairedSince?: string | null,
    pairActivatedAt?: string | null
  ) => void;
  setPushToken: (token: string | null) => void;
  clearProfiles: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  ownProfile: null,
  partnerProfile: null,
  pairedWith: null,
  pairId: null,
  pairedSince: null,
  pairActivatedAt: null,
  pushToken: null,

  setOwnProfile: (profile) =>
    set({
      ownProfile: profile,
      pairedWith: profile?.partner_id ?? null,
    }),

  setPartnerProfile: (profile) => set({ partnerProfile: profile }),

  setPairedWith: (partnerId) => set({ pairedWith: partnerId }),

  setPairId: (pairId, pairedSince = null, pairActivatedAt = null) =>
    set({ pairId, pairedSince, pairActivatedAt }),

  setPushToken: (pushToken) => set({ pushToken }),

  clearProfiles: () =>
    set({
      ownProfile: null,
      partnerProfile: null,
      pairedWith: null,
      pairId: null,
      pairedSince: null,
      pairActivatedAt: null,
      pushToken: null,
    }),
}));
