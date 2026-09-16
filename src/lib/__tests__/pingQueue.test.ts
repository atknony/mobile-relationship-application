import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_PING_RETRIES, OFFLINE_PING_MAX_AGE_MS } from '@/constants/timing';
import type { QueuedPing } from '@/types/ping';

const QUEUE_STORAGE_KEY = 'imm:ping-queue';
const USER_ID = 'user-1';

const mockInvoke = jest.fn();
const mockUpload = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    storage: { from: () => ({ upload: (...args: unknown[]) => mockUpload(...args) }) },
  },
}));

type PingQueue = typeof import('@/lib/pingQueue');
type PingStore = typeof import('@/stores/pingStore');

/** The queue holds module-level state, so each test gets a fresh copy. */
async function loadQueue(): Promise<{ queue: PingQueue; store: PingStore }> {
  let modules: { queue: PingQueue; store: PingStore };
  await jest.isolateModulesAsync(async () => {
    const queue = require('@/lib/pingQueue') as PingQueue;
    const store = require('@/stores/pingStore') as PingStore;
    const auth = require('@/stores/authStore') as typeof import('@/stores/authStore');
    auth.useAuthStore.setState({ user: { id: USER_ID } as never, isDemo: false });
    modules = { queue, store };
  });
  return modules!;
}

function queuedPing(overrides: Partial<QueuedPing> = {}): QueuedPing {
  return {
    localId: 'ping-1',
    userId: USER_ID,
    createdAt: Date.now(),
    retryCount: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  mockInvoke.mockReset().mockResolvedValue({ error: null });
  mockUpload.mockReset().mockResolvedValue({ data: { path: 'p.jpg' }, error: null });
  await AsyncStorage.clear();
});

describe('enqueue and persistence', () => {
  it('persists a queued ping so it survives a restart', async () => {
    const { queue } = await loadQueue();
    await queue.enqueuePing(queuedPing());

    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('keeps a ping enqueued while rehydration is still in flight', async () => {
    await AsyncStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify([queuedPing({ localId: 'stored' })])
    );
    const { queue, store } = await loadQueue();

    // No await between these: the stored read resolves after the enqueue,
    // which used to overwrite the in-memory entry.
    const enqueued = queue.enqueuePing(queuedPing({ localId: 'fresh' }));
    await enqueued;

    const ids = store.usePingStore.getState().offlineQueue.map((p) => p.localId);
    expect(ids).toContain('fresh');
    expect(ids).toContain('stored');
  });
});

describe('draining', () => {
  it('delivers a queued ping and removes it', async () => {
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(queuedPing());

    await queue.drainQueue('reconnect');

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
  });

  it('sends a ping only once when two drains run concurrently', async () => {
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(queuedPing());

    // Two reconnect events arriving together previously ran two independent
    // drains over the same queue, sending the ping twice.
    await Promise.all([queue.drainQueue('reconnect'), queue.drainQueue('foreground')]);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
  });

  it('counts a retry and keeps the ping when delivery fails', async () => {
    mockInvoke.mockResolvedValue({ error: new Error('offline') });
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(queuedPing());

    await queue.drainQueue('reconnect');

    const [entry] = store.usePingStore.getState().offlineQueue;
    expect(entry.retryCount).toBe(1);
  });

  it('drops a ping once it is out of retries and reports it', async () => {
    mockInvoke.mockResolvedValue({ error: new Error('offline') });
    const { queue, store } = await loadQueue();
    const events: string[] = [];
    queue.subscribeToPingQueue((e) => events.push(e.type));

    await queue.enqueuePing(queuedPing({ retryCount: MAX_PING_RETRIES - 1 }));
    await queue.drainQueue('reconnect');

    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
    // Previously this drop was silent, after the UI had claimed "ping sent".
    expect(events).toContain('dropped');
  });

  it('discards pings older than the age limit without sending them', async () => {
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(
      queuedPing({ createdAt: Date.now() - OFFLINE_PING_MAX_AGE_MS - 1 })
    );

    await queue.drainQueue('reconnect');

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
  });

  it('never sends a ping belonging to a different user', async () => {
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(queuedPing({ userId: 'someone-else' }));

    await queue.drainQueue('boot');

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
  });
});

describe('sending', () => {
  it('reports failure rather than hanging when the photo copy fails', async () => {
    const fs = require('expo-file-system/legacy');
    (fs.copyAsync as jest.Mock).mockRejectedValueOnce(new Error('no space'));

    const { queue, store } = await loadQueue();
    await queue.sendPing({ momentUri: 'file:///tmp/photo.jpg' });

    // Staying on 'sending' would leave the ping button disabled for the rest
    // of the session.
    expect(store.usePingStore.getState().pingStatus).toBe('failed');
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('sign-out', () => {
  it('purges the persisted queue, not just the in-memory one', async () => {
    const { queue, store } = await loadQueue();
    await queue.enqueuePing(queuedPing());

    await queue.resetPingQueue();

    // Leaving this behind is what let one user's pings be sent from the next
    // user's account after a sign-in on the same device.
    expect(await AsyncStorage.getItem(QUEUE_STORAGE_KEY)).toBeNull();
    expect(store.usePingStore.getState().offlineQueue).toHaveLength(0);
  });
});
