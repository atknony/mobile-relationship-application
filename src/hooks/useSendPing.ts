import { useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { usePingStore } from '@/stores/pingStore';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { QueuedPing } from '@/types/ping';

interface SendPingOptions {
  momentUri?: string; // local file:// URI from image picker
}

export function useSendPing() {
  const setPingStatus = usePingStore((s) => s.setPingStatus);
  const { enqueue, drainQueue } = useOfflineQueue();
  const { isConnected } = useNetworkStatus(drainQueue);

  const sendPing = useCallback(async ({ momentUri }: SendPingOptions = {}) => {
    const localId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    setPingStatus('sending');

    // Persist photo to app's documents dir so it survives temp-file clearing
    let persistedUri: string | undefined;
    if (momentUri) {
      const dest = `${FileSystem.documentDirectory}ping-moments/${localId}.jpg`;
      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}ping-moments/`,
        { intermediates: true }
      );
      await FileSystem.copyAsync({ from: momentUri, to: dest });
      persistedUri = dest;
    }

    const queueEntry: QueuedPing = {
      localId,
      momentUri: persistedUri,
      createdAt: Date.now(),
      retryCount: 0,
    };

    if (!isConnected) {
      // Optimistic: show sent immediately, queue for later
      setPingStatus('sent');
      await enqueue(queueEntry);
      return;
    }

    try {
      let momentUrl: string | undefined;
      if (persistedUri) {
        const fileName = `${localId}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('moments')
          .upload(`pings/${fileName}`, {
            uri: persistedUri,
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
        body: { localId, momentUrl },
      });
      if (error) throw error;

      setPingStatus('sent');
    } catch {
      // Online but failed — queue it
      setPingStatus('sent'); // optimistic; queue handles retry
      await enqueue(queueEntry);
    }
  }, [isConnected, enqueue]);

  return { sendPing };
}
