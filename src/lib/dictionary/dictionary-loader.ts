import { Dictionary } from './dictionary-core';
import { DictionaryState, DictionaryError, DictionaryErrorCode, LoadingProgress } from './types';
import { dictionaryAccess } from './dictionary-access';
import { CACHE_CONFIG } from './constants';
import { DictionaryUnifiedCache } from './unified-cache';
import { debugLog } from '../utils/debug';

function createDictionaryError(
  code: DictionaryErrorCode,
  message: string,
  context?: Record<string, unknown>,
  retry?: () => Promise<void>
): DictionaryError {
  const error = new Error(message) as DictionaryError;
  error.code = code;
  error.context = context;
  error.retry = retry;
  return error;
}

export class DictionaryLoader {
  private dictionary: Dictionary;
  private state: DictionaryState;
  private isInitialized: boolean = false;
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private loadedPrefixes: Set<string> = new Set();
  private prefixLoadErrors: Map<string, DictionaryError> = new Map();
  private prefetchQueue: string[] = [];
  private isBackgroundLoading: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private dictionaryUnifiedCache: DictionaryUnifiedCache;

  constructor() {
    this.dictionary = new Dictionary();
    this.state = {
      status: 'loading',
      wordCount: 0,
      loadedPrefixes: 0,
      totalPrefixes: 0,
      lastUpdated: new Date().toISOString(),
      progress: {
        totalPrefixes: 0,
        loadedPrefixes: 0,
        essentialPrefixesLoaded: false,
        popularPrefixesLoaded: false,
        errors: []
      }
    };
    this.dictionaryUnifiedCache = new DictionaryUnifiedCache();
    this.initializeBackgroundProcessing();
  }

  private initializeBackgroundProcessing() {
    setInterval(() => {
      if (!this.isBackgroundLoading && this.prefetchQueue.length > 0) {
        this.processBackgroundLoading();
      }
    }, 1000);
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    prefix: string,
    errorCode: DictionaryErrorCode,
    errorMessage: string,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(operation, prefix, errorCode, errorMessage, attempt + 1);
      }

      const dictError = createDictionaryError(
        errorCode,
        errorMessage,
        { prefix, attempt, originalError: error },
        () => this.loadPrefix(prefix)
      );

      this.prefixLoadErrors.set(prefix, dictError);
      this.updateProgress();
      throw dictError;
    }
  }

  private updateProgress() {
    if (!this.state.progress) return;

    const errors = Array.from(this.prefixLoadErrors.entries()).map(([prefix, error]) => ({
      prefix,
      error
    }));

    this.state.progress = {
      ...this.state.progress,
      loadedPrefixes: this.loadedPrefixes.size,
      errors
    };

    this.state.loadedPrefixes = this.loadedPrefixes.size;
    this.state.lastUpdated = new Date().toISOString();
  }

  private async loadPrefix(prefix: string): Promise<void> {
    if (this.loadedPrefixes.has(prefix)) return;

    await this.retryOperation(
      async () => {
        const words = await dictionaryAccess.getWordsWithPrefix(prefix);
        words.forEach((word: string) => this.dictionary.addWord(word));
        this.loadedPrefixes.add(prefix);
        this.prefixLoadErrors.delete(prefix);
        this.updateProgress();
        debugLog(`Loaded prefix: ${prefix}, words: ${words.length}`);
        
        // Queue related prefixes for background loading
        this.queueRelatedPrefixes(words);
      },
      prefix,
      'PREFIX_LOAD_ERROR',
      `Failed to load prefix: ${prefix}`
    );
  }

  private queueRelatedPrefixes(words: string[]): void {
    const relatedPrefixes = new Set<string>();
    
    for (const word of words) {
      // Add prefixes of increasing length
      for (let i = 2; i <= Math.min(4, word.length); i++) {
        relatedPrefixes.add(word.slice(0, i));
      }
      
      // Add prefixes from word endings for chain possibilities
      if (word.length > 2) {
        relatedPrefixes.add(word.slice(-2));
        if (word.length > 3) {
          relatedPrefixes.add(word.slice(-3));
        }
      }
    }

    // Queue new prefixes that haven't been loaded
    for (const prefix of relatedPrefixes) {
      if (!this.loadedPrefixes.has(prefix)) {
        this.prefetchQueue.push(prefix);
      }
    }
  }

  private async processBackgroundLoading(): Promise<void> {
    if (this.isBackgroundLoading) return;
    this.isBackgroundLoading = true;

    try {
      while (this.prefetchQueue.length > 0) {
        const batch = this.prefetchQueue.splice(0, CACHE_CONFIG.PREFETCH_BATCH_SIZE);
        const uniqueBatch = batch.filter(prefix => !this.loadedPrefixes.has(prefix));

        if (uniqueBatch.length > 0) {
          await Promise.all(
            uniqueBatch.map(prefix => this.loadPrefix(prefix).catch(err => {
              debugLog(`Background load failed for prefix: ${prefix}`, err);
            }))
          );
          await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.BACKGROUND_LOAD_DELAY));
        }
      }
    } finally {
      this.isBackgroundLoading = false;
    }
  }

  public async initialize(forceReload: boolean = false): Promise<void> {
    if (this.isInitialized && !forceReload) {
      debugLog('Already initialized');
      return;
    }

    if (this.isInitializing && this.initializationPromise) {
      debugLog('Returning existing initialization promise');
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.state.status = 'initializing';
    debugLog('Starting initialization');

    this.initializationPromise = (async () => {
      try {
        await dictionaryAccess.initialize();
        
        // Load high priority prefixes first
        const highPriorityPromises = CACHE_CONFIG.HIGH_PRIORITY_PREFIXES
          .map(prefix => this.loadPrefix(prefix));
        
        await Promise.all(highPriorityPromises);
        if (this.state.progress) {
          this.state.progress.essentialPrefixesLoaded = true;
        }
        
        // Get metadata and update progress
        const analytics = dictionaryAccess.getCacheAnalytics();
        const popularPrefixes = Array.from(analytics.popularPrefixes.entries())
          .filter(([_, count]) => count > CACHE_CONFIG.POPULAR_PREFIX_THRESHOLD)
          .map(([prefix]) => prefix)
          .sort();

        this.state.totalPrefixes = popularPrefixes.length;
        if (this.state.progress) {
          this.state.progress.totalPrefixes = popularPrefixes.length;
        }
        
        // Queue popular prefixes for background loading
        this.prefetchQueue.push(...popularPrefixes);
        
        // Start background loading
        this.processBackgroundLoading().catch(error => {
          debugLog('Background load error:', error);
        });
        
        this.isInitialized = true;
        this.state.status = 'ready';
        debugLog('Dictionary initialized successfully');
      } catch (error) {
        const dictError = createDictionaryError(
          'INITIALIZATION_FAILED',
          'Failed to initialize dictionary',
          { originalError: error },
          () => this.initialize(true)
        );
        
        this.state.error = dictError;
        this.state.status = 'error';
        this.dictionary.clear();
        this.isInitialized = false;
        
        debugLog('Initialization failed', { error: dictError });
        throw dictError;
      } finally {
        this.isInitializing = false;
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  public async getWordsWithPrefix(prefix: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw createDictionaryError(
        'INITIALIZATION_FAILED',
        'Dictionary not initialized',
        { prefix }
      );
    }

    await this.loadPrefix(prefix);
    return this.dictionary.getValidNextWords(prefix);
  }

  public getDictionary(): Dictionary {
    if (!this.isInitialized) {
      throw createDictionaryError(
        'INITIALIZATION_FAILED',
        'Dictionary not initialized'
      );
    }
    return this.dictionary;
  }

  public getState(): DictionaryState {
    return { ...this.state };
  }

  public clear(): void {
    this.dictionary.clear();
    this.loadedPrefixes.clear();
    this.prefixLoadErrors.clear();
    this.state = {
      status: 'loading',
      wordCount: 0,
      loadedPrefixes: 0,
      totalPrefixes: 0,
      lastUpdated: new Date().toISOString(),
      progress: {
        totalPrefixes: 0,
        loadedPrefixes: 0,
        essentialPrefixesLoaded: false,
        popularPrefixesLoaded: false,
        errors: []
      }
    };
    this.isInitialized = false;
    dictionaryAccess.clearCache();
  }

  public getLoadingProgress(): LoadingProgress | undefined {
    return this.state.progress;
  }

  public getDictionaryUnifiedCache(): DictionaryUnifiedCache {
    return this.dictionaryUnifiedCache;
  }
}

// Export singleton instance
export const dictionaryLoader = new DictionaryLoader(); 