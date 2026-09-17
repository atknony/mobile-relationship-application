import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  claimCelebration,
  isWithinCelebrationWindow,
  wasCelebrated,
} from '@/lib/pairCelebration';
import { preloadImage } from '@/lib/preloadImage';
import { useProfileStore } from '@/stores/profileStore';
import { useAppStore } from '@/stores/appStore';
import { VIBRATE_KEY } from '@/hooks/usePreferences';
import {
  PAIR_CELEBRATION_AUTODISMISS_MS,
  PAIR_CELEBRATION_AVATAR_WAIT_MS,
} from '@/constants/timing';

export interface Celebration {
  pairId: string;
  partnerName: string;
  partnerAvatar: string | null;
  ownName: string;
  ownAvatar: string | null;
}

/**
 * Decides when the pairing celebration appears. Call from (home)/_layout.tsx.
 *
 * Both phones reach Home by their own route — the redeemer straight from the
 * Edge Function's response, the code's creator from usePairActivation — and
 * both arrive at the same rule here, so it appears for both within about a
 * second of the pair becoming active.
 *
 * It waits for everything it shows: the pair's activation time, the partner's
 * profile, the startup cover to lift (a Modal is a native window and would
 * draw over it), and both avatars decoded — so it opens complete rather than
 * with photos landing in it afterwards.
 */
export function usePairCelebration() {
  const pairId = useProfileStore((s) => s.pairId);
  const activatedAt = useProfileStore((s) => s.pairActivatedAt);
  const partnerId = useProfileStore((s) => s.partnerProfile?.id);
  const isRevealed = useAppStore((s) => s.isRevealed);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    if (!pairId || !activatedAt || !partnerId || !isRevealed) return;
    if (!isWithinCelebrationWindow(activatedAt)) return;
    let cancelled = false;

    void (async () => {
      if ((await wasCelebrated(pairId)) || cancelled) return;

      const { ownProfile, partnerProfile } = useProfileStore.getState();
      await Promise.all(
        [partnerProfile?.avatar_url, ownProfile?.avatar_url]
          .filter((p): p is string => Boolean(p))
          .map((p) => preloadImage('avatars', p, PAIR_CELEBRATION_AVATAR_WAIT_MS))
      );
      // Pair ended (or the user signed out) while the photos loaded.
      if (cancelled || useProfileStore.getState().pairId !== pairId) return;
      if (!(await claimCelebration(pairId)) || cancelled) return;

      setCelebration({
        pairId,
        partnerName: partnerProfile?.username ?? 'your partner',
        partnerAvatar: partnerProfile?.avatar_url ?? null,
        ownName: ownProfile?.username ?? '',
        ownAvatar: ownProfile?.avatar_url ?? null,
      });

      const vibrate = await AsyncStorage.getItem(VIBRATE_KEY).catch(() => null);
      if (vibrate !== 'false') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pairId, activatedAt, partnerId, isRevealed]);

  const dismiss = useCallback(() => setCelebration(null), []);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(dismiss, PAIR_CELEBRATION_AUTODISMISS_MS);
    return () => clearTimeout(timer);
  }, [celebration, dismiss]);

  // The pair this was for is gone (unpaired from the other side mid-celebration).
  const current = celebration && celebration.pairId === pairId ? celebration : null;

  return { celebration: current, dismiss };
}
