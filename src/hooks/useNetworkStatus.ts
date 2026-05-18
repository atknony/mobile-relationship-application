import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
}

export function useNetworkStatus(onReconnect?: () => void): NetworkStatus {
  const [isConnected, setIsConnected] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;

      if (!connected) {
        wasOffline.current = true;
      } else if (wasOffline.current) {
        wasOffline.current = false;
        onReconnect?.();
      }

      setIsConnected(connected);
    });

    return () => unsubscribe();
  }, [onReconnect]);

  return { isConnected };
}
