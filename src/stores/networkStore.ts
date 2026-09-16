import { create } from 'zustand';

interface NetworkState {
  // null until the first NetInfo event arrives. Treated as online when
  // sending, so a cold start never wrongly queues; the offline chip only
  // renders on an explicit `false`.
  isConnected: boolean | null;
  setConnected: (isConnected: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: null,
  setConnected: (isConnected) => set({ isConnected }),
}));
