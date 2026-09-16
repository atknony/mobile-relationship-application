import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { usePingStore } from '@/stores/pingStore';
import { MAX_PING_RETRIES, OFFLINE_PING_MAX_AGE_MS } from '@/constants/timing';
import type { QueuedPing } from '@/types/ping';

/**
 * Single owner of the ping send path: the offline queue, its persistence, and
 * the network listener that drains it.
 *
 * This is a module singleton rather than a hook or provider because drains run
 * from NetInfo/AppState callbacks with no component mounted, and because the
 * root layout swaps route groups on sign-out — a (home)-scoped provider would
 * tear the listener down mid-drain. Previously these lived in hooks called from
 * three places at once, which meant duplicate listeners and concurrent drains
 * sending the same ping twice.
 */

const QUEUE_STORAGE_KEY = 'imm:ping-queue';
const PHOTO_DIR = `${FileSystem.documentDirectory}ping-moments/`;
const MAX_BUFFERED_EVENTS = 20;

export type PingQueueEvent =
  | { type: 'drained'; delivered: number; remaining: number }
  | { type: 'dropped'; count: number; reason: 'exhausted' | 'expired' }
  | { type: 'sendFailed'; localId: string };

// `generation` invalidates in-flight work after a sign-out: every await point
// re-checks it before writing, so a drain that started as user A can never
// persist state into user B's session.
let generation = 0;
let rehydratePromise: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let inFlight: Promise<void> | null = null;
let rerunRequested = false;
let teardown: (() => void) | null = null;
const sendingIds = new Set<string>();

const subscribers = new Set<(event: PingQueueEvent) => void>();
const bufferedEvents: PingQueueEvent[] = [];

function emit(event: PingQueueEvent) {
  if (subscribers.size === 0) {
    // A drain can finish while no screen is mounted; hold the news until one is.
    bufferedEvents.push(event);
    if (bufferedEvents.length > MAX_BUFFERED_EVENTS) bufferedEvents.shift();
    return;
  }
  subscribers.forEach((fn) => fn(event));
}

export function subscribeToPingQueue(callback: (event: PingQueueEvent) => void) {
  subscribers.add(callback);
  if (bufferedEvents.length > 0) {
    bufferedEvents.splice(0).forEach(callback);
  }
  return () => {
    subscribers.delete(callback);
  };
}

/** Serialized so interleaved writers cannot persist a stale snapshot. */
function persistQueue(): Promise<void> {
  writeChain = writeChain
    .then(() =>
      AsyncStorage.setItem(
        QUEUE_STORAGE_KEY,
        JSON.stringify(usePingStore.getState().offlineQueue)
      )
    )
    .catch(() => {});
  return writeChain;
}

function whenRehydrated(): Promise<void> {
  if (!rehydratePromise) {
    const gen = generation;
    rehydratePromise = AsyncStorage.getItem(QUEUE_STORAGE_KEY)
      .then((raw) => {
        if (!raw || gen !== generation) return;
        try {
          const stored = JSON.parse(raw) as QueuedPing[];
          // Merge, never replace: a ping enqueued while this read was in
          // flight would otherwise be silently dropped.
          usePingStore.getState().mergeQueue(stored);
        } catch {
          void AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
        }
      })
      .catch(() => {});
  }
  return rehydratePromise;
}

async function persistPhoto(momentUri: string, localId: string): Promise<string> {
  // Image-picker URIs live in OS temp dirs that can be cleared before a queued
  // ping is ever sent.
  const dest = `${PHOTO_DIR}${localId}.jpg`;
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  await FileSystem.copyAsync({ from: momentUri, to: dest });
  return dest;
}

async function discardPhoto(entry: QueuedPing) {
  if (!entry.momentUri?.startsWith(PHOTO_DIR)) return;
  try {
    await FileSystem.deleteAsync(entry.momentUri, { idempotent: true });
  } catch {
    // Best effort — a leftover file is not worth failing a delivered ping.
  }
}

/** The one place a ping is actually uploaded and sent. */
async function deliverPing(entry: QueuedPing): Promise<void> {
  let momentUrl: string | undefined;

  if (entry.momentUri) {
    const fileName = `${entry.localId}.jpg`;
    const { data, error } = await supabase.storage
      .from('moments')
      .upload(`pings/${fileName}`, {
        uri: entry.momentUri,
        type: 'image/jpeg',
        name: fileName,
      } as unknown as File);
    if (error) throw error;
    momentUrl = supabase.storage.from('moments').getPublicUrl(data.path).data.publicUrl;
  }

  const { error } = await supabase.functions.invoke('send-ping', {
    body: { localId: entry.localId, momentUrl },
  });
  if (error) throw error;
}

export async function enqueuePing(entry: QueuedPing): Promise<void> {
  await whenRehydrated();
  usePingStore.getState().enqueueOfflinePing(entry);
  await persistQueue();
}

export async function sendPing({ momentUri }: { momentUri?: string } = {}): Promise<void> {
  const auth = useAuthStore.getState();
  usePingStore.getState().setPingStatus('sending');

  // Demo mode has no pair row behind it, so the Edge Function would reject the
  // ping — play back the success state instead.
  if (auth.isDemo) {
    usePingStore.getState().setPingStatus('sent');
    return;
  }

  const localId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const entry: QueuedPing = {
    localId,
    userId: auth.user?.id,
    momentUri: momentUri ? await persistPhoto(momentUri, localId) : undefined,
    createdAt: Date.now(),
    retryCount: 0,
  };

  if (useNetworkStore.getState().isConnected === false) {
    usePingStore.getState().setPingStatus('sent');
    await enqueuePing(entry);
    return;
  }

  try {
    await deliverPing(entry);
    void discardPhoto(entry);
    usePingStore.getState().setPingStatus('sent');
  } catch {
    // Queued for retry, but the user asked to send *now* and it did not go —
    // saying "sent" here is the lie this whole status flow exists to avoid.
    await enqueuePing(entry);
    usePingStore.getState().setPingStatus('failed');
    emit({ type: 'sendFailed', localId });
  }
}

async function doDrain(): Promise<void> {
  const gen = generation;
  await whenRehydrated();
  if (gen !== generation) return;

  const queue = usePingStore.getState().offlineQueue;
  if (queue.length === 0) return;

  const userId = useAuthStore.getState().user?.id;
  const now = Date.now();
  const fresh: QueuedPing[] = [];
  let expired = 0;

  for (const entry of queue) {
    // Left over from a previous session on this device.
    if (entry.userId && entry.userId !== userId) {
      void discardPhoto(entry);
      continue;
    }
    if (now - entry.createdAt >= OFFLINE_PING_MAX_AGE_MS) {
      expired += 1;
      void discardPhoto(entry);
      continue;
    }
    fresh.push(entry);
  }

  if (fresh.length !== queue.length) {
    usePingStore.getState().setOfflineQueue(fresh);
    await persistQueue();
    if (expired > 0) emit({ type: 'dropped', count: expired, reason: 'expired' });
  }

  let delivered = 0;
  let exhausted = 0;

  for (const entry of fresh) {
    if (gen !== generation) return;
    if (sendingIds.has(entry.localId)) continue;
    sendingIds.add(entry.localId);

    try {
      await deliverPing(entry);
      if (gen !== generation) return;
      usePingStore.getState().dequeueOfflinePing(entry.localId);
      void discardPhoto(entry);
      await persistQueue();
      delivered += 1;
    } catch {
      if (gen !== generation) return;
      if (entry.retryCount >= MAX_PING_RETRIES - 1) {
        usePingStore.getState().dequeueOfflinePing(entry.localId);
        void discardPhoto(entry);
        await persistQueue();
        exhausted += 1;
      } else {
        usePingStore.getState().incrementRetryCount(entry.localId);
        await persistQueue();
        break; // stop the run — the rest retry on the next reconnect
      }
    } finally {
      sendingIds.delete(entry.localId);
    }
  }

  if (exhausted > 0) emit({ type: 'dropped', count: exhausted, reason: 'exhausted' });
  if (delivered > 0) {
    emit({
      type: 'drained',
      delivered,
      remaining: usePingStore.getState().offlineQueue.length,
    });
  }
}

/**
 * Concurrent callers join the running drain instead of racing it; a request
 * that arrives mid-run triggers exactly one re-run afterwards.
 */
export function drainQueue(_reason: 'boot' | 'reconnect' | 'foreground' | 'enqueue'): Promise<void> {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = doDrain().finally(() => {
    inFlight = null;
    if (rerunRequested) {
      rerunRequested = false;
      void drainQueue('reconnect');
    }
  });
  return inFlight;
}

/** Sign-out purge: nothing from this session may survive into the next one. */
export async function resetPingQueue(): Promise<void> {
  generation += 1;
  rehydratePromise = null;
  inFlight = null;
  rerunRequested = false;
  sendingIds.clear();
  bufferedEvents.length = 0;
  usePingStore.getState().clearOfflineQueue();
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {
    // Nothing useful to do; the userId guard on each entry is the backstop.
  }
}

/** Idempotent — safe to call from an effect that may re-run. */
export function initPingQueue(): () => void {
  if (teardown) return teardown;

  let wasOffline = false;

  const unsubscribeNet = NetInfo.addEventListener((state) => {
    const connected = state.isConnected ?? true;
    useNetworkStore.getState().setConnected(connected);

    if (!connected) {
      wasOffline = true;
    } else if (wasOffline) {
      wasOffline = false;
      void drainQueue('reconnect');
    }
  });

  const appStateSub = AppState.addEventListener('change', (status) => {
    if (status === 'active') void drainQueue('foreground');
  });

  void drainQueue('boot');

  teardown = () => {
    unsubscribeNet();
    appStateSub.remove();
    teardown = null;
  };
  return teardown;
}
