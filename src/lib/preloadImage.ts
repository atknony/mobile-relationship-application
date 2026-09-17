import { Image } from 'expo-image';
import { fetchImage, type ImageBucket } from '@/lib/imageCache';

/**
 * Gets a photo downloaded *and* decoded into expo-image's memory cache, so the
 * next view that shows it draws it in its first frame. Decoding matters as much
 * as downloading: a file on disk still takes a moment to decode, and the view
 * would show empty for that moment.
 *
 * Gives up after `timeoutMs` and never rejects — a photo that is not ready yet
 * is a reason to show it late, not an error.
 */
export async function preloadImage(
  bucket: ImageBucket,
  path: string,
  timeoutMs: number
): Promise<void> {
  const prepare = fetchImage(bucket, path)
    .then((uri) => Image.prefetch(uri, { cachePolicy: 'memory' }))
    .catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([prepare, timeout]);
  clearTimeout(timer);
}
