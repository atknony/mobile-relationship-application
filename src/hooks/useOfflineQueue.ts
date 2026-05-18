import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { usePingStore } from '@/stores/pingStore';
import {
  MAX_PING_RETRIES,
  OFFLINE_PING_MAX_AGE_MS,
} from '@/constants/timing';
import type { QueuedPing } from '@/types/ping';

const QUEUE_STORAGE_KEY = 'imm:ping-queue';

async function persistQueue(queue: QueuedPing[]) {
  await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const { offlineQueue, dequeueOfflinePing, incrementRetryCount, setOfflineQueue, setPingStatus } =
    usePingStore();

  const drainQueue = useCallback(async () => {
    const queue = usePingStore.getState().offlineQueue;
    if (queue.length === 0) return;

    // Prune stale pings (> 24hrs old)
    const fresh = queue.filter(
      (p) => Date.now() - p.createdAt < OFFLINE_PING_MAX_AGE_MS
    );
    if (fresh.length !== queue.length) {
      setOfflineQueue(fresh);
      await persistQueue(fresh);
    }

    for (const ping of [...fresh]) {
      try {
        let momentUrl: string | undefined;
        if (ping.momentUri) {
          const fileName = ping.momentUri.split('/').pop() ?? `${ping.localId}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('moments')
            .upload(`pings/${fileName}`, {
              uri: ping.momentUri,
              type: 'image/jpeg',
              name: fileName,
            } as unknown as File);
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage
            .from('moments')
            .getPublicUrl(uploadData.path);
          momentUrl = urlData.publicUrl;
        }

        const { error } = await supabase.functions.invoke('send-ping', {
          body: { localId: ping.localId, momentUrl },
        });
        if (error) throw error;

        dequeueOfflinePing(ping.localId);
        await persistQueue(usePingStore.getState().offlineQueue);
      } catch {
        if (ping.retryCount >= MAX_PING_RETRIES - 1) {
          dequeueOfflinePing(ping.localId);
          await persistQueue(usePingStore.getState().offlineQueue);
        } else {
          incrementRetryCount(ping.localId);
          await persistQueue(usePingStore.getState().offlineQueue);
          break; // stop drain — retry on next reconnect
        }
      }
    }
    setPingStatus('idle');
  }, []);

  // Rehydrate queue from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(QUEUE_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw) as QueuedPing[];
        setOfflineQueue(stored);
      } catch {
        // corrupted data — clear it
        void AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      }
    });
  }, []);

  const enqueue = useCallback(
    async (ping: QueuedPing) => {
      usePingStore.getState().enqueueOfflinePing(ping);
      await persistQueue(usePingStore.getState().offlineQueue);
    },
    []
  );

  return { drainQueue, enqueue };
}
