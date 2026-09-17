/** An in-memory stand-in for expo-file-system: a set of file URIs. */
const mockDisk = new Set<string>();
const mockSign = jest.fn();
const mockDownload = jest.fn();

jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return [...mockDisk].some((f) => f.startsWith(`${this.uri}/`)) || mockDisk.has(this.uri);
    }
    create() {
      mockDisk.add(this.uri);
    }
    delete() {
      for (const f of [...mockDisk]) if (f === this.uri || f.startsWith(`${this.uri}/`)) mockDisk.delete(f);
    }
    list() {
      return [...mockDisk].filter((f) => f.startsWith(`${this.uri}/`)).map((f) => new File(f));
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.split('/').pop() as string;
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    get modificationTime() {
      return 0;
    }
    delete() {
      mockDisk.delete(this.uri);
    }
    async move(dest: File) {
      mockDisk.delete(this.uri);
      mockDisk.add(dest.uri);
      this.uri = dest.uri;
    }
    async copy(dest: File) {
      mockDisk.add(dest.uri);
    }
    static async downloadFileAsync(url: string, dest: File) {
      await mockDownload(url, dest.uri);
      mockDisk.add(dest.uri);
      return dest;
    }
  }

  return { Directory, File, Paths: { cache: new Directory('cache') } };
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrl: (...args: unknown[]) => mockSign(...args) }),
    },
  },
}));

type Cache = typeof import('@/lib/imageCache');

function load(): Cache {
  let mod!: Cache;
  jest.isolateModules(() => {
    mod = require('@/lib/imageCache') as Cache;
  });
  return mod;
}

const PATH = 'user-1/avatar-1.jpg';

beforeEach(() => {
  mockDisk.clear();
  jest.clearAllMocks();
  mockSign.mockResolvedValue({ data: { signedUrl: 'https://signed/x?token=1' }, error: null });
  mockDownload.mockResolvedValue(undefined);
});

it('serves a cached photo synchronously, without signing or downloading', async () => {
  const cache = load();
  mockDisk.add('cache/images/avatars__user-1__avatar-1.jpg');

  expect(cache.cachedImageUri('avatars', PATH)).toBe('cache/images/avatars__user-1__avatar-1.jpg');
  await expect(cache.fetchImage('avatars', PATH)).resolves.toBe(
    'cache/images/avatars__user-1__avatar-1.jpg'
  );
  expect(mockSign).not.toHaveBeenCalled();
  expect(mockDownload).not.toHaveBeenCalled();
});

it('keys by storage path, so a fresh signed URL on the next launch is still a hit', async () => {
  const first = load();
  await first.fetchImage('moments', PATH);
  expect(mockDownload).toHaveBeenCalledTimes(1);

  // A new launch: new module state, and signing would now return a new token.
  mockSign.mockResolvedValue({ data: { signedUrl: 'https://signed/x?token=2' }, error: null });
  const second = load();
  await second.fetchImage('moments', PATH);
  expect(mockDownload).toHaveBeenCalledTimes(1);
  expect(mockSign).toHaveBeenCalledTimes(1);
});

it('shares one download between concurrent requests for the same photo', async () => {
  const cache = load();
  const [a, b] = await Promise.all([
    cache.fetchImage('moments', PATH),
    cache.fetchImage('moments', PATH),
  ]);
  expect(a).toBe(b);
  expect(mockDownload).toHaveBeenCalledTimes(1);
});

it('never leaves a failed download behind looking like a cached photo', async () => {
  const cache = load();
  mockDownload.mockImplementation(async (_url: string, dest: string) => {
    mockDisk.add(dest); // partial bytes written...
    throw new Error('HTTP 400'); // ...then the request fails
  });

  await expect(cache.fetchImage('moments', PATH)).rejects.toThrow('HTTP 400');
  expect(cache.cachedImageUri('moments', PATH)).toBeNull();
  expect([...mockDisk].filter((f) => f.startsWith('cache/images/'))).toEqual([]);
});

it('discards a download that finishes after the cache was cleared by sign-out', async () => {
  const cache = load();
  let finish!: () => void;
  mockDownload.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));

  const pending = cache.fetchImage('avatars', PATH);
  await new Promise<void>((r) => setTimeout(r, 0)); // let signing resolve and the download start
  cache.clearImageCache();
  finish();

  await expect(pending).rejects.toThrow();
  expect(cache.cachedImageUri('avatars', PATH)).toBeNull();
});

it('seeds an uploaded photo so the sender never downloads it', async () => {
  const cache = load();
  mockDisk.add('file:///picked.jpg');
  await cache.seedImage('moments', PATH, 'file:///picked.jpg');
  await cache.fetchImage('moments', PATH);
  expect(mockDownload).not.toHaveBeenCalled();
});
