import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const TTL_SECONDS = 60 * 60;
// Re-sign well before expiry so a long-lived screen never shows a dead image.
const STALE_TIME_MS = (TTL_SECONDS - 5 * 60) * 1000;

/**
 * Turns a private storage path into a temporary URL an <Image> can load.
 *
 * Signed URLs are deliberately never persisted — they expire and they carry a
 * token, so they are minted per view instead.
 */
export function useSignedUrl(path: string | null | undefined, bucket: 'moments' | 'avatars') {
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: Boolean(path),
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, TTL_SECONDS);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}

export function useSignedMomentUrl(path: string | null | undefined) {
  return useSignedUrl(path, 'moments');
}
