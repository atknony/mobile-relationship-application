import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cachedImageUri, evictImage, fetchImage, type ImageBucket } from '@/lib/imageCache';

/**
 * A private storage photo as a local file URI, from disk when possible.
 *
 * `cachedAtMount` says the photo was already on disk when this component first
 * rendered — i.e. the URI is available in the very first frame. Callers use it
 * to skip loading placeholders and fade-ins, which would otherwise play for a
 * photo that is in fact instant.
 */
export function useCachedImage(bucket: ImageBucket, path: string | null | undefined) {
  const queryClient = useQueryClient();
  // Synchronous disk check, once per photo rather than once per render.
  const initial = useMemo(() => cachedImageUri(bucket, path), [bucket, path]);

  const query = useQuery({
    queryKey: ['image', bucket, path],
    enabled: Boolean(path),
    initialData: initial ?? undefined,
    // A path's bytes never change, so neither does its file.
    staleTime: Infinity,
    queryFn: () => fetchImage(bucket, path as string),
  });

  /**
   * For an image view's onError. A file that will not decode is dropped so the
   * next mount downloads it again, rather than failing forever from cache. It
   * does not retry here: if the stored object itself is bad, that would loop.
   */
  const onDecodeError = useCallback(() => {
    if (!path) return;
    evictImage(bucket, path);
    queryClient.removeQueries({ queryKey: ['image', bucket, path], exact: true });
  }, [bucket, path, queryClient]);

  return { uri: query.data ?? null, cachedAtMount: initial !== null, onDecodeError };
}
