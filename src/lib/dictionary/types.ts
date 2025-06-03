/**
 * Core type definitions for the Tailspin Dictionary System.
 * These types support the multi-tiered dictionary architecture.
 */

/**
 * Represents the current state of the dictionary system.
 * Used across all layers to maintain consistency.
 */
export interface DictionaryState {
  /** Current operational status of the dictionary */
  status: 'loading' | 'ready' | 'error';
  /** Total number of words in the dictionary */
  wordCount: number;
  /** Last time the dictionary was updated */
  lastUpdated?: string;
  /** Current version of the dictionary data */
  version?: string;
  /** Any error message if status is 'error' */
  error?: string;
}

/**
 * Core dictionary data structure.
 * Used by both synchronous and asynchronous implementations.
 */
export interface DictionaryData {
  /** Complete set of valid words */
  words: Set<string>;
  /** Map of two-letter prefixes to words starting with those letters */
  prefixMap: { [prefix: string]: Set<string> };
  /** Map of two-letter suffixes to words ending with those letters */
  suffixMap: { [suffix: string]: Set<string> };
  /** Set of letter combinations that no valid word starts with */
  terminalCombos: Set<string>;
  /** Dictionary data version for cache management */
  version: string;
  /** Timestamp of last update */
  lastUpdated: string;
}

/**
 * Core dictionary operations interface.
 * Implemented by both DictionaryService and FirebaseDictionary.
 */
export interface DictionaryOperations {
  /** Validates if a word exists in the dictionary */
  isValidWord(word: string): boolean | Promise<boolean>;
  /** Validates if two words can be chained (last two letters rule) */
  isValidChain(prevWord: string, nextWord: string): boolean | Promise<boolean>;
  /** Checks if a word is terminal (no valid words can follow it) */
  isTerminalWord(word: string): boolean | Promise<boolean>;
  /** Gets valid words that can follow the current word */
  getValidNextWords(currentWord: string): string[] | Promise<string[]>;
  /** Gets valid words that could precede the current word */
  getValidPreviousWords(currentWord: string): string[] | Promise<string[]>;
}

/**
 * Configuration options for dictionary initialization.
 * Used by both local and Firebase implementations.
 */
export interface DictionaryConfig {
  /** Minimum word length allowed */
  minWordLength: number;
  /** Maximum word length allowed */
  maxWordLength: number;
  /** Cache version for invalidation */
  cacheVersion: string;
  /** Prefix length for word grouping */
  prefixLength: number;
  /** Maximum results for word suggestions */
  maxSuggestions: number;
}

/**
 * Extended word information.
 * Used for rich game features and scoring.
 */
export interface DictionaryWord {
  /** The word itself */
  word: string;
  /** Word length for quick access */
  length: number;
  /** Two-letter prefix */
  prefix: string;
  /** Two-letter suffix */
  suffix: string;
  /** Whether this is a terminal word */
  isTerminal: boolean;
  /** Base score for the word */
  baseScore: number;
  /** Set of unique letters in the word */
  uniqueLetters: Set<string>;
}

/**
 * Dictionary validation result.
 * Used for detailed feedback in game mechanics.
 */
export interface ValidationResult {
  /** Whether the word/chain is valid */
  isValid: boolean;
  /** Reason for invalidity if applicable */
  reason?: string;
  /** Additional validation details */
  details?: {
    /** Whether it follows chain rules */
    followsChainRule: boolean;
    /** Whether it's a known word */
    existsInDictionary: boolean;
    /** Whether it's been used before */
    isUnique: boolean;
    /** Whether it's a terminal word */
    isTerminal: boolean;
  };
}

export interface CacheAnalytics {
  hits: number;
  misses: number;
  evictions: number;
  totalAccesses: number;
  averageAccessTime: number;
  popularPrefixes: Map<string, number>;
}

export interface DictionaryCache {
  get(prefix: string): Promise<string[] | null>;
  set(prefix: string, words: string[]): Promise<void>;
  clear(): void;
  getAnalytics(): CacheAnalytics;
  getSize(): number;
  getHitRate(): number;
  getCurrentMemoryUsage(): number;
}

/**
 * Extended operations for the Firebase implementation
 */
export interface DictionaryAccess extends DictionaryOperations {
  initialize(): Promise<void>;
  getWordsWithPrefix(prefix: string): Promise<string[]>;
  getWordsByLength(prefix: string, minLength: number, maxLength: number): Promise<string[]>;
  getPopularPrefixes(limit?: number): Promise<Array<{ prefix: string; count: number }>>;
  clearCache(): void;
  getRandomWord(options?: { minLength?: number; maxLength?: number }): Promise<string>;
  getHintWords(prefix: string, count?: number): Promise<string[]>;
}

/**
 * Dictionary metadata stored in Firebase
 */
export interface DictionaryMetadata {
  version: string;
  lastUpdated: string;
  totalWords: number;
  prefixCounts: { [prefix: string]: number };
  chunkSize: number;
}

/**
 * Word chunk stored in Firebase
 */
export interface WordChunk {
  prefix: string;
  chunkIndex: number;
  words: string[];
  minLength: number;
  maxLength: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number;  // Maximum number of entries in memory cache
  ttl: number;      // Time to live in milliseconds
  namespace?: string; // Optional namespace for partitioning cache
}

/**
 * Dictionary initialization options
 */
export interface DictionaryOptions {
  cacheConfig?: CacheConfig;
  offlineSupport?: boolean;
  preloadCommonPrefixes?: boolean;
}

export type DictionaryStatus = 'loading' | 'initializing' | 'ready' | 'error';

export type DictionaryErrorCode = 
  | 'INITIALIZATION_FAILED'
  | 'DICTIONARY_NOT_FOUND'
  | 'INVALID_METADATA'
  | 'NETWORK_ERROR'
  | 'CACHE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PREFIX_LOAD_ERROR';

export interface DictionaryError extends Error {
  code: DictionaryErrorCode;
  context?: Record<string, unknown>;
  retry?: () => Promise<void>;
}

export interface LoadingProgress {
  totalPrefixes: number;
  loadedPrefixes: number;
  essentialPrefixesLoaded: boolean;
  popularPrefixesLoaded: boolean;
  errors: Array<{
    prefix: string;
    error: DictionaryError;
  }>;
}

export interface DictionaryAccess {
  getWords(prefix: string): Promise<string[]>;
  clearCache(): void;
}

export interface MigrationProgress {
  totalPrefixes: number;
  processedPrefixes: number;
  errors: Array<{ prefix: string; error: string }>;
} 