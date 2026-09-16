import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const SIGNED_URL_TTL_SECONDS = 60 * 60;
// Re-sign well before expiry so a long-lived screen never shows a dead image.
const STALE_TIME_MS = (SIGNED_URL_TTL_SECONDS - 5 * 60) * 1000;

/**
 * Turns a private storage path into a temporary URL an <Image> can load.
 * Signed URLs are deliberately never persisted — they expire and they carry a
 * token, so they are minted per view instead.
 */
export function useSignedMomentUrl(path: string | undefined) {
  return useQuery({
    queryKey: ['moment-url', path],
    enabled: Boolean(path),
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from('moments')
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
