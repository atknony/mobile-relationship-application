import { useCallback } from 'react';
import { sendPing } from '@/lib/pingQueue';

interface SendPingOptions {
  momentUri?: string; // local file:// URI from image picker
}

export function useSendPing() {
  return {
    sendPing: useCallback((options: SendPingOptions = {}) => sendPing(options), []),
  };
}
