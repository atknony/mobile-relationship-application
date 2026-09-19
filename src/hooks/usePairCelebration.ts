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
  PAIR_CELEBRATION_DECIDE_MS,
} from '@/constants/timing';

export interface Celebration {
  pairId: string;
  partnerName: string;
  partnerAvatar: string | null;
  ownName: string;
  ownAvatar: string | null;
}

/** What was decided for one pair: celebrate it (with this content), or not. */
interface Decision {
  pairId: string;
  celebration: Celebration | null;
}

/**
 * Decides when the pairing celebration appears. Call once, from
 * (home)/_layout.tsx, which also uses `decided` to keep Home covered.
 *
 * Both phones reach Home by their own route — the redeemer straight from the
 * Edge Function's response, the code's creator from usePairActivation — and
 * both arrive at the same rule here, so it appears for both within about a
 * second of the pair becoming active.
 *
 * Deciding takes a moment (the pair row, the partner's profile, this device's
 * record of what it has celebrated, and both avatars decoded so it opens
 * complete). Home used to sit on screen for that moment and then have the
 * celebration fade in over it. Now `decided` is false until the answer is
 * known, and the layout covers Home until then — so a new pair sees the
 * celebration first and Home only as it fades away.
 *
 * Showing additionally waits for the startup cover to lift: a Modal is a
 * native window and would draw over it.
 */
export function usePairCelebration() {
  const pairId = useProfileStore((s) => s.pairId);
  const activatedAt = useProfileStore((s) => s.pairActivatedAt);
  const partnerId = useProfileStore((s) => s.partnerProfile?.id);
  const isRevealed = useAppStore((s) => s.isRevealed);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  // pairId and activatedAt arrive together (useProfile's pairs read), so a
  // known pair with no activation time, or an old one, needs no more work.
  const eligible = Boolean(pairId && activatedAt && isWithinCelebrationWindow(activatedAt));

  useEffect(() => {
    if (!eligible || !pairId || !partnerId) return;
    let cancelled = false;

    void (async () => {
      if (await wasCelebrated(pairId)) {
        if (!cancelled) setDecision({ pairId, celebration: null });
        return;
      }
      if (cancelled) return;

      const { ownProfile, partnerProfile } = useProfileStore.getState();
      await Promise.all(
        [partnerProfile?.avatar_url, ownProfile?.avatar_url]
          .filter((p): p is string => Boolean(p))
          .map((p) => preloadImage('avatars', p, PAIR_CELEBRATION_AVATAR_WAIT_MS))
      );
      // Pair ended (or the user signed out) while the photos loaded.
      if (cancelled || useProfileStore.getState().pairId !== pairId) return;
      const claimed = await claimCelebration(pairId);
      if (cancelled) return;

      setDecision({
        pairId,
        celebration: claimed
          ? {
              pairId,
              partnerName: partnerProfile?.username ?? 'your partner',
              partnerAvatar: partnerProfile?.avatar_url ?? null,
              ownName: ownProfile?.username ?? '',
              ownAvatar: ownProfile?.avatar_url ?? null,
            }
          : null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [eligible, pairId, partnerId]);

  // Insurance: if the pair or the partner never loads, stop covering Home. A
  // celebration that becomes ready later still shows, over Home as it used to.
  useEffect(() => {
    const timer = setTimeout(() => setGaveUp(true), PAIR_CELEBRATION_DECIDE_MS);
    return () => clearTimeout(timer);
  }, []);

  const current = decision && decision.pairId === pairId ? decision : null;
  const decided = gaveUp || (Boolean(pairId) && !eligible) || current !== null;
  // The pair this was for is gone (unpaired from the other side mid-celebration)
  // → `current` is null and nothing shows.
  const celebration = current?.celebration ?? null;
  const visible = isRevealed ? celebration : null;

  const dismiss = useCallback(
    () => setDecision((d) => (d ? { ...d, celebration: null } : d)),
    []
  );

  const visibleId = visible?.pairId;
  useEffect(() => {
    if (!visibleId) return;
    void AsyncStorage.getItem(VIBRATE_KEY)
      .catch(() => null)
      .then((vibrate) => {
        if (vibrate !== 'false') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      });
    const timer = setTimeout(dismiss, PAIR_CELEBRATION_AUTODISMISS_MS);
    return () => clearTimeout(timer);
  }, [visibleId, dismiss]);

  return { celebration: visible, pending: celebration !== null, decided, dismiss };
}
