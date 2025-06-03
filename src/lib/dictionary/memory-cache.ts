import { DictionaryCache, CacheAnalytics } from './types';
import { CACHE_CONFIG } from './constants';

class MemoryCache implements DictionaryCache {
  private cache: Map<string, string[]>;
  private analytics: CacheAnalytics;
  private lastAccessed: Map<string, number>;

  constructor() {
    this.cache = new Map();
    this.lastAccessed = new Map();
    this.analytics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalAccesses: 0,
      averageAccessTime: 0,
      popularPrefixes: new Map()
    };
  }

  async get(prefix: string): Promise<string[] | null> {
    const startTime = performance.now();
    this.analytics.totalAccesses++;

    const words = this.cache.get(prefix);
    if (words) {
      this.analytics.hits++;
      this.updatePopularPrefix(prefix);
      this.lastAccessed.set(prefix, Date.now());
      this.updateAccessTime(performance.now() - startTime);
      return words;
    }

    this.analytics.misses++;
    this.updateAccessTime(performance.now() - startTime);
    return null;
  }

  async set(prefix: string, words: string[]): Promise<void> {
    // Maintain cache size limit
    if (this.cache.size >= CACHE_CONFIG.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(prefix, words);
    this.lastAccessed.set(prefix, Date.now());
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.lastAccessed.clear();
    this.resetAnalytics();
  }

  private evictLeastRecentlyUsed(): void {
    let oldestPrefix = '';
    let oldestTime = Date.now();

    this.lastAccessed.forEach((time, prefix) => {
      if (time < oldestTime) {
        oldestTime = time;
        oldestPrefix = prefix;
      }
    });

    if (oldestPrefix) {
      this.cache.delete(oldestPrefix);
      this.lastAccessed.delete(oldestPrefix);
      this.analytics.evictions++;
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
    return this.cache.size;
  }

  getHitRate(): number {
    return this.analytics.totalAccesses === 0 
      ? 0 
      : this.analytics.hits / this.analytics.totalAccesses;
  }

  getCurrentMemoryUsage(): number {
    // Rough estimate: 100 bytes per prefix-words pair
    return this.cache.size * 100;
  }
}

export const memoryCache = new MemoryCache(); 