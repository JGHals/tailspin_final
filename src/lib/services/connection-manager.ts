import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useContext } from 'react';

export type ConnectionState = {
  isOnline: boolean;
  lastSynced: Date | null;
  isFirebaseConnected: boolean;
};

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

class ConnectionManager {
  private static instance: ConnectionManager;
  private currentState: ConnectionState = {
    isOnline: true,
    lastSynced: null,
    isFirebaseConnected: true
  };
  private listeners: Set<(state: ConnectionState) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      // Initialize online/offline listeners
      window.addEventListener('online', () => this.updateConnectionState(true));
      window.addEventListener('offline', () => this.updateConnectionState(false));
      
      // Initialize Firebase connection state monitoring
      this.initializeFirebaseConnection();
    }
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private initializeFirebaseConnection() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const userStatusRef = doc(db, 'status', user.uid);
        
        // Update user status when online
        setDoc(userStatusRef, {
          state: 'online',
          lastChanged: serverTimestamp(),
        });

        // Set up cleanup for page unload
        window.addEventListener('beforeunload', () => {
          setDoc(userStatusRef, {
            state: 'offline',
            lastChanged: serverTimestamp(),
          });
        });
      }
    });
  }

  private updateConnectionState(isOnline: boolean) {
    this.currentState = {
      ...this.currentState,
      isOnline,
      lastSynced: isOnline ? new Date() : this.currentState.lastSynced
    };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  getCurrentState(): ConnectionState {
    return this.currentState;
  }

  getConnectionStatus(): ConnectionStatus {
    const { isOnline, isFirebaseConnected } = this.currentState;
    if (!isOnline) return 'offline';
    if (!isFirebaseConnected) return 'reconnecting';
    return 'online';
  }

  subscribe(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health-check');
      const isConnected = response.ok;
      this.updateConnectionState(isConnected);
      return isConnected;
    } catch (error) {
      this.updateConnectionState(false);
      return false;
    }
  }
}

export const connectionManager = ConnectionManager.getInstance(); 