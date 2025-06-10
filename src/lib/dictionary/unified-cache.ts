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
 * Server-safe implementation using only memory cache.
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
   * Get item from cache
   */
  async get(key: string): Promise<T | null> {
    const cacheKey = `${this.config.namespace}_${key}`;
    this.stats.totalAccesses++;
    
    // Check memory cache
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

    this.stats.misses++;
    return null;
  }

  /**
   * Set item in cache
   */
  async set(key: string, value: T): Promise<void> {
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
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.memoryCache.clear();
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
  getStats(): CacheStats & { memoryCacheSize: number } {
    return {
      ...this.stats,
      memoryCacheSize: this.memoryCache.size
    };
  }
}

export class DictionaryUnifiedCache extends UnifiedCache<string[]> implements DictionaryCache {
  constructor() {
    super({
      maxEntries: CACHE_CONFIG.maxEntries,
      ttl: CACHE_CONFIG.ttl,
      namespace: CACHE_CONFIG.dictionary
    });
  }

  getAnalytics(): CacheAnalytics {
    const stats = this.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      evictions: 0, // Not tracked in memory-only implementation
      totalAccesses: stats.totalAccesses,
      averageAccessTime: 0, // Not tracked in memory-only implementation
      popularPrefixes: new Map() // Not tracked in memory-only implementation
    };
  }

  getSize(): number {
    return this.getStats().memoryCacheSize;
  }

  getHitRate(): number {
    const stats = this.getStats();
    return stats.hits / (stats.hits + stats.misses);
  }

  getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }
} 