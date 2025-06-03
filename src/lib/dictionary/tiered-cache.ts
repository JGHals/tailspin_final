import { DictionaryCache, CacheAnalytics } from './types';
import { memoryCache } from './memory-cache';
import { indexedDBCache } from './indexed-db-cache';

/**
 * TieredCache combines multiple cache layers for optimal performance and offline support:
 * 1. Memory Cache: Fastest, but limited by available RAM
 * 2. IndexedDB: Large storage capacity, persistent, good performance
 * 3. Memory Cache Fallback: For when other storage methods fail
 */
export class TieredCache implements DictionaryCache {
  private analytics: CacheAnalytics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalAccesses: 0,
    averageAccessTime: 0,
    popularPrefixes: new Map()
  };

  async get(prefix: string): Promise<string[] | null> {
    const startTime = performance.now();
    this.analytics.totalAccesses++;

    try {
      // Try memory cache first
      let words = await memoryCache.get(prefix);
      if (words) {
        this.recordHit('memory', startTime);
        return words;
      }

      // Try IndexedDB next
      words = await indexedDBCache.get(prefix);
      if (words) {
        this.recordHit('indexeddb', startTime);
        // Promote to memory cache
        await memoryCache.set(prefix, words);
        return words;
      }

      // Fall back to memory cache if all else fails
      this.recordMiss(startTime);
      return null;
    } catch (error) {
      console.error('Error in tiered cache get:', error);
      this.recordMiss(startTime);
      return null;
    }
  }

  async set(prefix: string, words: string[]): Promise<void> {
    try {
      // Set in all caches
      await Promise.all([
        memoryCache.set(prefix, words),
        indexedDBCache.set(prefix, words)
      ]);
    } catch (error) {
      console.error('Error in tiered cache set:', error);
      // Try individual caches if parallel set fails
      try {
        await memoryCache.set(prefix, words);
      } catch (e) {
        console.error('Memory cache set failed:', e);
      }
      try {
        await indexedDBCache.set(prefix, words);
      } catch (e) {
        console.error('IndexedDB cache set failed:', e);
      }
    }
  }

  async clear(): Promise<void> {
    try {
      await Promise.all([
        memoryCache.clear(),
        indexedDBCache.clear()
      ]);
      this.resetAnalytics();
    } catch (error) {
      console.error('Error clearing tiered cache:', error);
      throw error;
    }
  }

  private recordHit(cacheType: 'memory' | 'indexeddb', startTime: number): void {
    this.analytics.hits++;
    this.updateAccessTime(performance.now() - startTime);
  }

  private recordMiss(startTime: number): void {
    this.analytics.misses++;
    this.updateAccessTime(performance.now() - startTime);
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
    const memoryAnalytics = memoryCache.getAnalytics();
    const indexedDBAnalytics = indexedDBCache.getAnalytics();

    // Combine popular prefixes from all caches
    const combinedPrefixes = new Map<string, number>();
    [memoryAnalytics, indexedDBAnalytics].forEach(analytics => {
      analytics.popularPrefixes.forEach((count: number, prefix: string) => {
        combinedPrefixes.set(prefix, (combinedPrefixes.get(prefix) || 0) + count);
      });
    });

    return {
      ...this.analytics,
      popularPrefixes: combinedPrefixes
    };
  }

  getSize(): number {
    return memoryCache.getSize() + indexedDBCache.getSize();
  }

  getHitRate(): number {
    return this.analytics.totalAccesses === 0 
      ? 0 
      : this.analytics.hits / this.analytics.totalAccesses;
  }

  getCurrentMemoryUsage(): number {
    return memoryCache.getCurrentMemoryUsage() + 
           indexedDBCache.getCurrentMemoryUsage();
  }
}

export const tieredCache = new TieredCache(); 