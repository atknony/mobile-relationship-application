import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from '@/lib/supabase';

export type ImageBucket = 'moments' | 'avatars';

/**
 * Photos kept on disk, keyed by their storage path.
 *
 * Images used to be re-downloaded on every launch, and no image library's cache
 * could have prevented it on its own. Both buckets are private, so an image is
 * loaded through a signed URL, and every launch mints a new one with a new
 * token. An image cache keyed by URL (React Native's Image, and expo-image by
 * default) therefore saw a brand-new image every time, after first waiting a
 * round trip just to get the URL.
 *
 * The storage path is the stable identity instead, and it is safe to cache
 * forever: a ping photo is never rewritten, and an avatar change always uploads
 * to a fresh path (lib/avatar.ts) rather than overwriting. So a cached file is
 * served straight from disk — no signing, no network — and the existence check
 * is synchronous, which lets a screen render the photo in its very first frame.
 *
 * Signed URLs are still never stored: one is minted only to fill a cache miss
 * and is thrown away once the download finishes.
 */

// Resolved on first use, not at import: nothing should touch native file-system
// APIs while the bundle is still being evaluated.
let rootDir: Directory | null = null;
function root(): Directory {
  rootDir ??= new Directory(Paths.cache, 'images');
  return rootDir;
}

/** Enough for months of a couple's thread; the oldest downloads go first. */
const MAX_FILES = 400;
const PREFETCH_CONCURRENCY = 3;
/** A download starts immediately, so the URL only has to outlive the request. */
const SIGNED_URL_TTL_SECONDS = 120;

const inflight = new Map<string, Promise<string>>();

// Bumped when the cache is cleared, so a download that was already in flight
// when someone signed out does not write the old account's photo into the
// fresh cache.
let epoch = 0;

function keyOf(bucket: ImageBucket, path: string) {
  return `${bucket}/${path}`;
}

function fileFor(bucket: ImageBucket, path: string): File {
  // Flat directory: paths are `<uuid>/<name>.jpg`, so replacing the separator is
  // enough to make a unique, filesystem-safe name.
  return new File(root(), `${bucket}__${path.replace(/\//g, '__')}`);
}

function ensureRoot() {
  if (!root().exists) root().create({ intermediates: true, idempotent: true });
}

/** The local URI if this photo is already on disk. Synchronous. */
export function cachedImageUri(bucket: ImageBucket, path: string | null | undefined): string | null {
  if (!path) return null;
  try {
    const file = fileFor(bucket, path);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * Resolves to a local file URI for the photo, downloading it once if needed.
 * Concurrent calls for the same photo share one download.
 */
export function fetchImage(bucket: ImageBucket, path: string): Promise<string> {
  const cached = cachedImageUri(bucket, path);
  if (cached) return Promise.resolve(cached);

  const key = keyOf(bucket, path);
  const pending = inflight.get(key);
  if (pending) return pending;

  const startedIn = epoch;
  const download = (async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) throw error ?? new Error('Could not sign image');

    ensureRoot();
    const target = fileFor(bucket, path);
    // Into a temporary name first, then moved into place: a download cut off
    // half-way must never be found later as a "cached" photo.
    const partial = new File(root(), `${target.name}.${Date.now()}.part`);
    try {
      await File.downloadFileAsync(data.signedUrl, partial, { idempotent: true });
      if (startedIn !== epoch) throw new Error('Image cache was cleared');
      await partial.move(target, { overwrite: true });
    } catch (err) {
      if (partial.exists) partial.delete();
      throw err;
    }
    return target.uri;
  })().finally(() => inflight.delete(key));

  inflight.set(key, download);
  return download;
}

/**
 * Warms the cache in the background so a screen opens with its photos already
 * there. Failures are ignored: the screen will simply fetch it when it mounts.
 */
export function prefetchImages(bucket: ImageBucket, paths: (string | null | undefined)[]): void {
  const queue = [...new Set(paths.filter((p): p is string => Boolean(p)))].filter(
    (p) => !cachedImageUri(bucket, p)
  );
  if (queue.length === 0) return;

  const worker = async () => {
    for (let path = queue.shift(); path; path = queue.shift()) {
      try {
        await fetchImage(bucket, path);
      } catch {
        // Best effort.
      }
    }
  };
  for (let i = 0; i < Math.min(PREFETCH_CONCURRENCY, queue.length); i++) void worker();
}

/**
 * Puts a photo this device just uploaded straight into the cache, so the
 * sender never downloads the picture they already have.
 */
export async function seedImage(bucket: ImageBucket, path: string, localUri: string): Promise<void> {
  try {
    ensureRoot();
    await new File(localUri).copy(fileFor(bucket, path), { overwrite: true });
  } catch {
    // Best effort: it will be downloaded on first view instead.
  }
}

/** Drops one photo — used when a cached file turns out not to decode. */
export function evictImage(bucket: ImageBucket, path: string): void {
  try {
    const file = fileFor(bucket, path);
    if (file.exists) file.delete();
  } catch {
    // Nothing to do.
  }
}

/** Wipes every cached photo. Called on sign-out: they belong to that account. */
export function clearImageCache(): void {
  epoch += 1;
  inflight.clear();
  try {
    if (root().exists) root().delete();
  } catch {
    // The OS may already have purged the cache directory.
  }
}

/** Keeps the cache bounded. Cheap enough to run once per launch. */
export function pruneImageCache(maxFiles = MAX_FILES): void {
  try {
    if (!root().exists) return;
    const files = root().list().filter((entry): entry is File => entry instanceof File);
    // Leftovers from a download the app was killed during. Only old ones: a
    // download started this launch may be writing one right now.
    const abandonedBefore = Date.now() - 5 * 60 * 1000;
    files
      .filter((f) => f.name.endsWith('.part') && (f.modificationTime ?? 0) < abandonedBefore)
      .forEach((f) => f.delete());

    const complete = files.filter((f) => !f.name.endsWith('.part'));
    if (complete.length <= maxFiles) return;
    complete
      .sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0))
      .slice(0, complete.length - maxFiles)
      .forEach((f) => f.delete());
  } catch {
    // A failed prune costs disk space, not correctness.
  }
}
