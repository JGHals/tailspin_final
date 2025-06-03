'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Dictionary } from '../dictionary/dictionary-core';
import { DictionaryState } from '../dictionary/types';
import { dictionaryLoader } from '../dictionary/dictionary-loader';
import { DictionaryErrorBoundary } from '@/components/dictionary/dictionary-error-boundary';
import { DictionaryLoadingState } from '@/components/dictionary/dictionary-loading-state';
import { startupService } from '../services/startup-service';

export interface DictionaryContextType {
  dictionary: Dictionary | null;
  state: DictionaryState;
  isReady: boolean;
  error: string | null;
  isLoading: boolean;
  getWordsWithPrefix: (prefix: string) => Promise<string[]>;
  retryInitialization: () => Promise<void>;
}

interface LoadingState {
  stage: string;
  progress: number;
  error: string | null;
}

export const DictionaryContext = createContext<DictionaryContextType>({
  dictionary: null,
  state: {
    status: 'loading',
    wordCount: 0,
    lastUpdated: new Date().toISOString(),
    loadedPrefixes: 0,
    totalPrefixes: 0
  },
  isReady: false,
  error: null,
  isLoading: true,
  getWordsWithPrefix: async () => [],
  retryInitialization: async () => {}
});

export function DictionaryProvider({ children }: { children: React.ReactNode }) {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [state, setState] = useState<DictionaryState>({
    status: 'loading',
    wordCount: 0,
    lastUpdated: new Date().toISOString(),
    loadedPrefixes: 0,
    totalPrefixes: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'Starting initialization',
    progress: 0,
    error: null
  });

  const updateLoadingState = useCallback(() => {
    const { progress, errors } = startupService.getProgress();
    const stages = Object.keys(progress);
    const completedStages = stages.filter(stage => progress[stage as keyof typeof progress]).length;
    const currentProgress = (completedStages / stages.length) * 100;

    let currentStage = 'Initializing';
    let currentError = null;

    if (errors.length > 0) {
      const latestError = errors[errors.length - 1];
      currentStage = `Retrying ${latestError.stage}`;
      currentError = latestError.error;
    } else if (progress.dictionary) {
      if (progress.cache) {
        if (progress.gameState) {
          currentStage = 'Preparing daily puzzles';
        } else {
          currentStage = 'Cleaning up game states';
        }
      } else {
        currentStage = 'Loading word cache';
      }
    } else {
      currentStage = 'Loading dictionary';
    }

    setLoadingState({
      stage: currentStage,
      progress: currentProgress,
      error: currentError
    });
  }, []);

  const initializeDictionary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await startupService.initialize();
      updateLoadingState();
      
      if (startupService.isDictionaryReady()) {
        const dict = dictionaryLoader.getDictionary();
        const state = dictionaryLoader.getState();
        
        setDictionary(dict);
        setState(state);
        setError(null);
      } else {
        throw new Error('Dictionary failed to initialize properly');
      }
    } catch (err) {
      console.error('Failed to initialize dictionary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dictionary';
      setError(errorMessage);
      setState(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoading(false);
    }
  }, [updateLoadingState]);

  const retryInitialization = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await startupService.retryFailedStages();
      await initializeDictionary();
    } catch (err) {
      console.error('Retry failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry initialization';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!mounted) return;
      await initializeDictionary();
    }

    init();

    return () => {
      mounted = false;
    };
  }, [initializeDictionary]);

  const getWordsWithPrefix = async (prefix: string): Promise<string[]> => {
    if (!startupService.isDictionaryReady()) {
      throw new Error('Dictionary not initialized');
    }
    return dictionaryLoader.getWordsWithPrefix(prefix);
  };

  const value = {
    dictionary,
    state,
    isReady: startupService.isDictionaryReady() && state.status === 'ready' && !isLoading && !error && dictionary !== null,
    error,
    isLoading,
    getWordsWithPrefix,
    retryInitialization
  };

  return (
    <DictionaryErrorBoundary onRetry={retryInitialization}>
      <DictionaryContext.Provider value={value}>
        {isLoading || error ? (
          <DictionaryLoadingState
            state={state}
            isLoading={isLoading}
            error={error}
            loadingState={loadingState}
          />
        ) : children}
      </DictionaryContext.Provider>
    </DictionaryErrorBoundary>
  );
}

export function useDictionary() {
  const context = useContext(DictionaryContext);
  if (context === undefined) {
    throw new Error('useDictionary must be used within a DictionaryProvider');
  }
  return context;
} 