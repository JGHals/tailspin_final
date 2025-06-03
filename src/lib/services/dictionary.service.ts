/**
 * Local Dictionary Service
 * 
 * A high-performance, synchronous dictionary implementation optimized for UI responsiveness.
 * This service is part of Tailspin's multi-tiered dictionary architecture, specifically
 * handling performance-critical operations that require immediate feedback.
 * 
 * Key Responsibilities:
 * - Synchronous word validation for UI feedback
 * - In-memory prefix lookups for suggestions
 * - Client-side caching for performance
 * - Offline support for uninterrupted gameplay
 * 
 * Architecture Notes:
 * This service works in conjunction with FirebaseDictionaryOptimized to provide a complete
 * dictionary system. While FirebaseDictionary handles persistence and rich features,
 * this service focuses on speed and responsiveness.
 * 
 * Usage Pattern:
 * ```typescript
 * // For async operations and persistence
 * import { dictionaryAccess } from '../dictionary/firebase-dictionary';
 * await dictionaryAccess.initialize();
 * const isValid = await dictionaryAccess.isValidWord("word");
 * 
 * // For synchronous, performance-critical operations
 * const dictionaryService = new DictionaryService();
 * const isValidSync = dictionaryService.isValidWord("word");
 * ```
 * 
 * Performance Considerations:
 * - Use this service for UI feedback and rapid validation
 * - Use FirebaseDictionaryOptimized for persistence and game state
 * - Both services maintain their own caching strategies
 * 
 * Memory Management:
 * - Maintains minimal memory footprint
 * - Uses efficient data structures (Set, Map)
 * - Optimized for quick lookups
 * 
 * @see FirebaseDictionaryOptimized for persistent storage and rich features
 * @see DictionaryAccess for the unified API
 */
export class DictionaryService {
  private dictionary: Set<string>;
  private prefixMap: Map<string, string[]>;
  private validPrefixes: Set<string>;

  constructor() {
    this.dictionary = new Set();
    this.prefixMap = new Map();
    this.validPrefixes = new Set();
  }

  initialize(words: string[]) {
    this.dictionary = new Set(words);
    this.buildPrefixMap(words);
  }

  private buildPrefixMap(words: string[]) {
    this.prefixMap.clear();
    this.validPrefixes.clear();

    words.forEach(word => {
      if (word.length < 2) return;
      
      const prefix = word.slice(0, 2);
      if (!this.prefixMap.has(prefix)) {
        this.prefixMap.set(prefix, []);
      }
      this.prefixMap.get(prefix)?.push(word);
      this.validPrefixes.add(prefix);
    });
  }

  isValidWord(word: string): boolean {
    return this.dictionary.has(word);
  }

  findWordsWithPrefix(prefix: string): string[] {
    return this.prefixMap.get(prefix) || [];
  }

  hasWordsWithPrefix(prefix: string): boolean {
    return this.prefixMap.has(prefix);
  }

  getValidPrefixes(): string[] {
    return Array.from(this.validPrefixes);
  }

  isInitialized(): boolean {
    return this.dictionary.size > 0;
  }
} 