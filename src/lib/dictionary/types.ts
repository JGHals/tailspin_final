export interface DictionaryWord {
  word: string;
  length: number;
  prefix: string;
  suffix: string;
  score: number;
}

/**
 * Dictionary data structure for storing and accessing words
 */
export interface DictionaryData {
  words: string[];
  prefixes: Set<string>;
  suffixes: Set<string>;
  metadata: {
    totalWords: number;
    averageLength: number;
    lastUpdated: Date;
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
 * Core dictionary operations interface.
 * Implemented by both Firebase and Local dictionary services.
 */
export interface DictionaryOperations {
  /**
   * Validates if a word exists in the dictionary
   */
  isValidWord(word: string): boolean | Promise<boolean>;

  /**
   * Validates if two words can form a valid chain
   */
  isValidChain(prevWord: string, nextWord: string): boolean;

  /**
   * Gets all valid words that can follow the given word
   */
  getValidNextWords(word: string): string[] | Promise<string[]>;

  /**
   * Gets all valid words that could precede the given word
   */
  getValidPreviousWords(word: string): string[] | Promise<string[]>;

  /**
   * Checks if a word is terminal (no valid next words)
   */
  isTerminalWord(word: string): boolean | Promise<boolean>;
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

export interface DictionaryConfig {
  minWordLength: number;
  maxWordLength: number;
  cacheVersion: string;
  firebasePath: string;
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

export interface ValidationResult {
  isValid: boolean;
  error?: DictionaryError;
  suggestions?: string[];
  context?: {
    chainLength?: number;
    isTerminal?: boolean;
    branchingFactor?: number;
    rareLetters?: string[];
  };
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

/**
 * Dictionary state for tracking loading and initialization
 */
export interface DictionaryState {
  status: DictionaryStatus;
  error?: DictionaryError;
  lastUpdated: string;
  wordCount: number;
  loadedPrefixes: number;
  totalPrefixes: number;
  progress?: LoadingProgress;
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