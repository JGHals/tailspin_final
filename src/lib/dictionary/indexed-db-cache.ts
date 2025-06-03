import { DictionaryCache, CacheAnalytics } from './types';
import { CACHE_KEYS, CACHE_CONFIG } from './constants';

class IndexedDBCache implements DictionaryCache {
  private dbName = 'tailspin_dictionary';
  private storeName = 'dictionary_store';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private analytics: CacheAnalytics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccesses: 0,
    averageAccessTime: 0,
    popularPrefixes: new Map()
  };

  constructor() {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db && this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  async get(prefix: string): Promise<string[] | null> {
    const startTime = performance.now();
    this.analytics.totalAccesses++;

    try {
      const db = await this.ensureDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(prefix);

        transaction.oncomplete = () => {
          const words = request.result;
          if (words) {
            this.analytics.hits++;
            this.updatePopularPrefix(prefix);
          } else {
            this.analytics.misses++;
          }
          
          const endTime = performance.now();
          this.updateAccessTime(endTime - startTime);
          
          resolve(words);
        };

        transaction.onerror = () => {
          this.analytics.misses++;
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      this.analytics.misses++;
      return null;
    }
  }

  async set(prefix: string, words: string[]): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        store.put(words, prefix);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to save to IndexedDB'));
      });
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        store.clear();
        this.resetAnalytics();
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('Failed to clear IndexedDB'));
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      throw error;
    }
  }

  private updatePopularPrefix(prefix: string): void {
    const count = (this.analytics.popularPrefixes.get(prefix) || 0) + 1;
    this.analytics.popularPrefixes.set(prefix, count);
  }

  private updateAccessTime(duration: number): void {
    const totalTime = this.analytics.averageAccessTime * this.analytics.totalAccesses;
    this.analytics.averageAccessTime = (totalTime + duration) / (this.analytics.totalAccesses + 1);
  }

  private resetAnalytics(): void {
    this.analytics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccesses: 0,
      averageAccessTime: 0,
      popularPrefixes: new Map()
    };
  }

  getAnalytics(): CacheAnalytics {
    return { ...this.analytics };
  }

  getSize(): number {
    return this.analytics.hits + this.analytics.misses;
  }

  getHitRate(): number {
    return this.analytics.totalAccesses === 0 
      ? 0 
      : this.analytics.hits / this.analytics.totalAccesses;
  }

  getCurrentMemoryUsage(): number {
    // Rough estimate: 100 bytes per prefix-words pair
    return this.getSize() * 100;
  }
}

export const indexedDBCache = new IndexedDBCache(); 