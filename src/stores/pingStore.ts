import { create } from 'zustand';
import type { IncomingPing, PingStatus, QueuedPing } from '@/types/ping';

interface PingState {
  // Outgoing
  pingStatus: PingStatus;
  offlineQueue: QueuedPing[];

  // Incoming
  incomingPing: IncomingPing | null;

  // Actions
  setPingStatus: (status: PingStatus) => void;
  enqueueOfflinePing: (ping: QueuedPing) => void;
  dequeueOfflinePing: (localId: string) => void;
  incrementRetryCount: (localId: string) => void;
  clearOfflineQueue: () => void;
  setOfflineQueue: (queue: QueuedPing[]) => void;

  setIncomingPing: (ping: IncomingPing | null) => void;
  dismissIncomingPing: () => void;
}

export const usePingStore = create<PingState>((set) => ({
  pingStatus: 'idle',
  offlineQueue: [],
  incomingPing: null,

  setPingStatus: (pingStatus) => set({ pingStatus }),

  enqueueOfflinePing: (ping) =>
    set((state) => ({ offlineQueue: [...state.offlineQueue, ping] })),

  dequeueOfflinePing: (localId) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((p) => p.localId !== localId),
    })),

  incrementRetryCount: (localId) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.map((p) =>
        p.localId === localId ? { ...p, retryCount: p.retryCount + 1 } : p
      ),
    })),

  clearOfflineQueue: () => set({ offlineQueue: [] }),

  setOfflineQueue: (queue) => set({ offlineQueue: queue }),

  setIncomingPing: (incomingPing) => set({ incomingPing }),

  dismissIncomingPing: () => set({ incomingPing: null }),
}));
