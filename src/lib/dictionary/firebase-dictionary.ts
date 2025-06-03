import { db } from '../firebase/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  runTransaction,
  DocumentData,
  orderBy,
  limit
} from 'firebase/firestore';
import { FIREBASE_CONFIG, DICTIONARY_CONFIG } from './constants';
import type { DictionaryAccess, DictionaryMetadata, CacheAnalytics, DictionaryOperations } from './types';

interface WordChunk {
  words: string[];
  prefix: string;
  chunkIndex: number;
  wordCount: number;
  minLength: number;
  maxLength: number;
  updatedAt: string;
}

/**
 * Optimized dictionary implementation using Firebase for storage and caching.
 * This is the primary dictionary implementation used by the game.
 * 
 * Features:
 * - Efficient prefix-based word lookup
 * - Local caching for frequently accessed words
 * - Real-time updates for dictionary changes
 * - Batch loading for performance
 * 
 * Usage:
 * ```typescript
 * // Initialize
 * await dictionaryAccess.initialize();
 * 
 * // Validate a word
 * const isValid = await dictionaryAccess.isValidWord("puzzle");
 * 
 * // Get next possible words
 * const nextWords = await dictionaryAccess.getValidNextWords("puzzle");
 * ```
 */
export class FirebaseDictionaryOptimized implements DictionaryAccess, DictionaryOperations {
  private metadata: DictionaryMetadata | null = null;
  private chunkCache: Map<string, WordChunk[]> = new Map();
  private initialized: boolean = false;

  private getChunkRef(prefix: string, chunkIndex: number) {
    return doc(
      collection(db, FIREBASE_CONFIG.COLLECTIONS.PREFIXES),
      `${prefix}_${chunkIndex}`
    );
  }

  private getMetadataRef() {
    return doc(
      collection(db, FIREBASE_CONFIG.COLLECTIONS.METADATA),
      FIREBASE_CONFIG.METADATA_DOC
    );
  }

  private async loadMetadata(): Promise<DictionaryMetadata> {
    if (this.metadata) return this.metadata;

    const metadataDoc = await getDoc(this.getMetadataRef());
    if (!metadataDoc.exists()) {
      throw new Error('Dictionary metadata not found');
    }

    this.metadata = metadataDoc.data() as DictionaryMetadata;
    return this.metadata;
  }

  async getWords(prefix: string): Promise<string[]> {
    // Check cache first
    const cached = this.chunkCache.get(prefix);
    if (cached) {
      return cached.flatMap(chunk => chunk.words);
    }

    // Query all chunks for this prefix
    const prefixRef = collection(db, FIREBASE_CONFIG.COLLECTIONS.PREFIXES);
    const chunks = await getDocs(
      query(
        prefixRef,
        where('prefix', '==', prefix),
        orderBy('chunkIndex')
      )
    );

    if (chunks.empty) return [];

    // Process and cache chunks
    const wordChunks: WordChunk[] = [];
    chunks.forEach(doc => {
      const chunk = doc.data() as WordChunk;
      wordChunks.push(chunk);
    });

    this.chunkCache.set(prefix, wordChunks);
    return wordChunks.flatMap(chunk => chunk.words);
  }

  async updateWords(prefix: string, words: string[]): Promise<void> {
    const chunks: WordChunk[] = [];
    
    // Split words into chunks
    for (let i = 0; i < words.length; i += FIREBASE_CONFIG.CHUNK_SIZE) {
      const chunkWords = words.slice(i, i + FIREBASE_CONFIG.CHUNK_SIZE);
      const lengths = chunkWords.map(w => w.length);
      
      chunks.push({
        words: chunkWords,
        prefix,
        chunkIndex: Math.floor(i / FIREBASE_CONFIG.CHUNK_SIZE),
        wordCount: chunkWords.length,
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        updatedAt: new Date().toISOString()
      });
    }

    // Use batched writes for chunks
    const batches: Array<Promise<void>> = [];
    for (let i = 0; i < chunks.length; i += FIREBASE_CONFIG.BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchChunks = chunks.slice(i, i + FIREBASE_CONFIG.BATCH_SIZE);

      batchChunks.forEach(chunk => {
        const chunkRef = this.getChunkRef(prefix, chunk.chunkIndex);
        batch.set(chunkRef, chunk);
      });

      batches.push(batch.commit());
    }

    // Update metadata in transaction
    await runTransaction(db, async transaction => {
      const metadata = await this.loadMetadata();
      
      metadata.prefixCounts[prefix] = words.length;
      metadata.lastUpdated = new Date().toISOString();
      metadata.totalWords = Object.values(metadata.prefixCounts)
        .reduce((sum: number, count: number) => sum + count, 0);

      transaction.set(this.getMetadataRef(), metadata);
    });

    // Wait for all batches to complete
    await Promise.all(batches);
    
    // Update cache
    this.chunkCache.set(prefix, chunks);
  }

  async getWordsByLength(prefix: string, minLength: number, maxLength: number): Promise<string[]> {
    const prefixRef = collection(db, FIREBASE_CONFIG.COLLECTIONS.PREFIXES);
    const chunks = await getDocs(
      query(
        prefixRef,
        where('prefix', '==', prefix),
        where('minLength', '<=', maxLength),
        where('maxLength', '>=', minLength)
      )
    );

    if (chunks.empty) return [];

    const words: string[] = [];
    chunks.forEach(doc => {
      const chunk = doc.data() as WordChunk;
      words.push(...chunk.words.filter(w => 
        w.length >= minLength && w.length <= maxLength
      ));
    });

    return words;
  }

  async getPopularPrefixes(limit: number = 10): Promise<Array<{ prefix: string; count: number }>> {
    const metadata = await this.loadMetadata();
    return Object.entries(metadata.prefixCounts)
      .map(([prefix, count]) => ({ prefix, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  clearCache(): void {
    this.chunkCache.clear();
    this.metadata = null;
  }

  /**
   * Initializes the dictionary by loading metadata from Firebase.
   * Must be called before using any other methods.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadMetadata();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize dictionary:', error);
      throw error;
    }
  }

  async getWordsWithPrefix(prefix: string): Promise<string[]> {
    return this.getWords(prefix);
  }

  getCacheAnalytics(): CacheAnalytics {
    const popularPrefixes = new Map<string, number>();
    let hits = 0;
    let misses = 0;
    let evictions = 0;
    let totalAccesses = 0;
    let totalTime = 0;

    // Calculate cache statistics
    this.chunkCache.forEach((chunks, prefix) => {
      const wordCount = chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0);
      popularPrefixes.set(prefix, wordCount);
      hits += wordCount;
      totalAccesses += wordCount;
    });

    return {
      hits,
      misses,
      evictions,
      totalAccesses,
      averageAccessTime: totalAccesses > 0 ? totalTime / totalAccesses : 0,
      popularPrefixes
    };
  }

  async isValidWord(word: string): Promise<boolean> {
    const prefix = word.slice(0, 2);
    const words = await this.getWords(prefix);
    return words.includes(word);
  }

  async findNextValidWords(lastWord: string): Promise<string[]> {
    const prefix = lastWord.slice(-2);
    return this.getWords(prefix);
  }

  isValidChain(prevWord: string, nextWord: string): boolean {
    if (!prevWord || !nextWord) return false;
    return nextWord.startsWith(prevWord.slice(-2));
  }

  async isTerminalWord(word: string): Promise<boolean> {
    const nextWords = await this.findNextValidWords(word);
    return nextWords.length === 0;
  }

  getValidNextWords(currentWord: string): Promise<string[]> {
    return this.findNextValidWords(currentWord);
  }

  getValidPreviousWords(currentWord: string): Promise<string[]> {
    const prefix = currentWord.slice(0, 2);
    return this.getWords(prefix);
  }

  async getRandomWord(options?: { minLength?: number; maxLength?: number }): Promise<string> {
    const metadata = await this.loadMetadata();
    const prefixes = Object.keys(metadata.prefixCounts);
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    let words = await this.getWords(randomPrefix);
    
    if (options) {
      const { minLength = 2, maxLength = 15 } = options;
      words = words.filter(w => w.length >= minLength && w.length <= maxLength);
    }
    
    return words[Math.floor(Math.random() * words.length)];
  }

  async getHintWords(prefix: string, count: number = 3): Promise<string[]> {
    const words = await this.getWords(prefix);
    return words
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }
} 