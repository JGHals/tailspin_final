import { useState, useEffect } from 'react';
import { connectionManager, ConnectionState, ConnectionStatus } from '@/lib/services/connection-manager';

export function useConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    connectionManager.getCurrentState()
  );

  useEffect(() => {
    // Subscribe to connection state changes
    const unsubscribe = connectionManager.subscribe((state) => {
      setConnectionState(state);
    });

    // Check connection on mount
    connectionManager.checkConnection();

    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    return await connectionManager.checkConnection();
  };

  return {
    ...connectionState,
    status: connectionManager.getConnectionStatus(),
    checkConnection,
  };
}

export type UseConnectionReturn = ReturnType<typeof useConnection>; 