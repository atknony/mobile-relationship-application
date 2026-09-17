import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prefetchImages } from '@/lib/imageCache';
import { useProfileStore } from '@/stores/profileStore';
import { momentsQueryOptions } from '@/hooks/useMomentsThread';

/** The thread shows 50 rows; only the photos near the top need to be instant. */
const THREAD_PHOTOS_TO_PREFETCH = 24;

/**
 * Warms the image cache for the screens reachable from Home, so none of them
 * opens onto photos that are still downloading. Call once from (home)/_layout.
 *
 * - Both avatars (Home's header, Settings, the arrival overlay).
 * - The thread: its query is kept loaded from here rather than only while the
 *   thread is open, which also means the rows themselves are ready on open, and
 *   every newly delivered ping's photo is fetched as soon as the list refreshes.
 *
 * Anything already on disk is skipped without a network call, so on a normal
 * launch this does nothing at all.
 */
export function usePrefetchImages() {
  const pairId = useProfileStore((s) => s.pairId);
  const ownAvatar = useProfileStore((s) => s.ownProfile?.avatar_url);
  const partnerAvatar = useProfileStore((s) => s.partnerProfile?.avatar_url);
  const { data: moments } = useQuery(momentsQueryOptions(pairId));

  useEffect(() => {
    prefetchImages('avatars', [partnerAvatar, ownAvatar]);
  }, [ownAvatar, partnerAvatar]);

  useEffect(() => {
    if (!moments) return;
    prefetchImages(
      'moments',
      moments
        .map((m) => m.photo_path)
        .filter(Boolean)
        .slice(0, THREAD_PHOTOS_TO_PREFETCH)
    );
  }, [moments]);
}
