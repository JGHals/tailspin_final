import { DictionaryData, DictionaryCache, CacheAnalytics } from './types';
import { CACHE_KEYS, CACHE_CONFIG } from './constants';
import type { WordChunk } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalAccesses: number;
  lastCleanup: number;
}

interface UnifiedCacheConfig {
  maxEntries: number;
  ttl: number;
  namespace: string;
}

/**
 * Unified caching system that supports both dictionary implementations.
 * Provides tiered caching with memory and localStorage options.
 */
export class UnifiedCache<T> {
  private memoryCache: Map<string, CacheEntry<T>>;
  private config: UnifiedCacheConfig;
  private stats: CacheStats;
  protected static instances: Map<string, UnifiedCache<unknown>> = new Map();

  protected constructor(config?: Partial<UnifiedCacheConfig>) {
    this.memoryCache = new Map();
    this.config = {
      maxEntries: config?.maxEntries || CACHE_CONFIG.maxEntries,
      ttl: config?.ttl || CACHE_CONFIG.ttl,
      namespace: config?.namespace || CACHE_CONFIG.dictionary
    };
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccesses: 0,
      lastCleanup: Date.now()
    };
  }

  static getInstance<T>(config?: Partial<UnifiedCacheConfig>): UnifiedCache<T> {
    const namespace = config?.namespace || CACHE_CONFIG.dictionary;
    if (!UnifiedCache.instances.has(namespace)) {
      UnifiedCache.instances.set(namespace, new UnifiedCache<T>(config));
    }
    return UnifiedCache.instances.get(namespace) as UnifiedCache<T>;
  }

  /**
   * Get item from cache, checking both memory and localStorage
   */
  protected getSync(key: string): T | null {
    const cacheKey = `${this.config.namespace}_${key}`;
    this.stats.totalAccesses++;
    
    // Check memory cache first
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem && Date.now() < memoryItem.timestamp + this.config.ttl) {
      this.stats.hits++;
      memoryItem.accessCount++;
      memoryItem.lastAccessed = Date.now();
      return memoryItem.data;
    }

    if (memoryItem) {
      this.memoryCache.delete(cacheKey);
    }

    // Check localStorage
    const storageItem = localStorage.getItem(cacheKey);
    if (storageItem) {
      try {
        const entry = JSON.parse(storageItem) as CacheEntry<T>;
        if (Date.now() < entry.timestamp + this.config.ttl) {
          // Promote to memory cache
          this.memoryCache.set(cacheKey, entry);
          this.stats.hits++;
          return entry.data;
        }
        localStorage.removeItem(cacheKey);
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set item in both memory and localStorage caches
   */
  protected setSync(key: string, value: T): void {
    const cacheKey = `${this.config.namespace}_${key}`;
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: JSON.stringify(value).length
    };

    // Set in memory cache
    this.memoryCache.set(cacheKey, entry);

    // Maintain memory cache size limit
    if (this.memoryCache.size > this.config.maxEntries) {
      // Remove least recently accessed items
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      while (this.memoryCache.size > this.config.maxEntries) {
        const [oldestKey] = entries.shift()!;
        this.memoryCache.delete(oldestKey);
      }
    }

    // Set in localStorage
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (e) {
      // If localStorage is full, clear old items
      this.clearOldStorageItems();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (e) {
        // If still fails, just use memory cache
        console.warn('localStorage full, using memory cache only');
      }
    }
  }

  /**
   * Clear expired items from localStorage
   */
  private clearOldStorageItems(): void {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.namespace)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!) as CacheEntry<T>;
          if (now >= entry.timestamp + this.config.ttl) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.memoryCache.clear();
    // Only clear items in our namespace
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.namespace)) {
        localStorage.removeItem(key);
      }
    }
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccesses: 0,
      lastCleanup: Date.now()
    };
  }

  /**
   * Get cache statistics
   */
  protected getStats(): CacheStats & { memoryCacheSize: number; localStorageSize: number } {
    let localStorageSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.namespace)) {
        localStorageSize++;
      }
    }
    
    return {
      ...this.stats,
      memoryCacheSize: this.memoryCache.size,
      localStorageSize
    };
  }
}

export class DictionaryUnifiedCache extends UnifiedCache<string[]> implements DictionaryCache {
  constructor() {
    super({
      maxEntries: CACHE_CONFIG.maxEntries,
      ttl: CACHE_CONFIG.ttl,
      namespace: CACHE_KEYS.DICTIONARY_DATA
    });
  }

  async get(key: string): Promise<string[] | null> {
    return this.getSync(key);
  }

  async set(key: string, value: string[]): Promise<void> {
    this.setSync(key, value);
  }

  getAnalytics(): CacheAnalytics {
    const stats = this.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      evictions: 0, // Not tracked in base implementation
      totalAccesses: stats.totalAccesses,
      averageAccessTime: 0, // Not tracked in base implementation
      popularPrefixes: new Map() // Not tracked in base implementation
    };
  }

  getSize(): number {
    return this.getStats().memoryCacheSize;
  }

  getHitRate(): number {
    const stats = this.getStats();
    return stats.totalAccesses === 0 ? 0 : stats.hits / stats.totalAccesses;
  }

  getCurrentMemoryUsage(): number {
    return this.getStats().memoryCacheSize * 1024; // Rough estimate in bytes
  }
} 