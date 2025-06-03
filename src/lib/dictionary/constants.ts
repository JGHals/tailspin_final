import { DictionaryConfig } from './types';
import { TERMINAL_COMBOS, VALID_STARTING_COMBOS, VALID_FLIPS } from '../validation/constants';

export const DICTIONARY_CONFIG: DictionaryConfig = {
  minWordLength: 2,
  maxWordLength: 15,
  cacheVersion: '1.0.0',
  firebasePath: 'dictionary'
};

export const CACHE_KEYS = {
  DICTIONARY_DATA: 'tailspin_dictionary_data',
  DICTIONARY_VERSION: 'tailspin_dictionary_version',
  DICTIONARY_TIMESTAMP: 'tailspin_dictionary_timestamp',
  PREFIX_DATA: 'tailspin_prefix_data'
} as const;

// Re-export existing constants
export {
  TERMINAL_COMBOS,
  VALID_STARTING_COMBOS,
  VALID_FLIPS
};

// Scoring constants
export const SCORING = {
  BASE_SCORE: 10,
  LENGTH_BONUS: 1,  // per letter over 5
  RARE_LETTER_BONUS: 5,
  RARE_LETTERS: new Set(['Q', 'Z', 'X', 'J']),
  TERMINAL_BONUS: 20
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  maxEntries: 200,
  ttl: 1000 * 60 * 30, // 30 minutes
  dictionary: 'tailspin_dictionary',
  MIN_PREFETCH_COUNT: 10,
  POPULAR_PREFIX_THRESHOLD: 5,
  BACKGROUND_LOAD_DELAY: 100,
  PREFETCH_BATCH_SIZE: 5,
  HIGH_PRIORITY_PREFIXES: ['th', 'an', 'in', 'er', 're', 'co', 'pr', 'st', 'de', 'di']
} as const;

// Firebase configuration
export const FIREBASE_CONFIG = {
  CHUNK_SIZE: 500, // Maximum words per document
  METADATA_DOC: 'metadata',
  COLLECTIONS: {
    DICTIONARY: 'dictionary',
    PREFIXES: 'prefixes',
    METADATA: 'metadata'
  },
  INDEXES: {
    PREFIX_LENGTH: 'prefix_length_idx',
    POPULARITY: 'popularity_idx'
  },
  BATCH_SIZE: 500 // Maximum operations per batch
} as const; 