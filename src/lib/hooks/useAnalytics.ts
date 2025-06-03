import { useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { analyticsService } from '../analytics/analytics-service';
import type { GameResult } from '../types/game';
import type { PlayerInsights } from '../analytics/analytics-service';

export function useAnalytics() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackGameCompletion = useCallback(async (gameResult: GameResult) => {
    if (!user?.uid) return;
    
    try {
      setIsLoading(true);
      await analyticsService.trackGameCompletion(gameResult, user.uid);
    } catch (error) {
      console.error('Failed to track game completion:', error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const measurePerformance = useCallback(async <T>(
    type: 'dictionary_load' | 'word_validation' | 'chain_validation' | 'score_submission',
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return analyticsService.measurePerformance(type, operation, metadata);
  }, []);

  const getPlayerInsights = useCallback(async (
    dateRange?: { start: Date; end: Date }
  ): Promise<PlayerInsights | null> => {
    if (!user?.uid) return null;

    try {
      setIsLoading(true);
      return await analyticsService.getPlayerInsights(user.uid, dateRange);
    } catch (error) {
      console.error('Failed to get player insights:', error);
      setError(error as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  const queryAnalytics = useCallback(async (params: {
    gameMode?: 'daily' | 'endless' | 'versus';
    dateRange?: { start: Date; end: Date };
    minScore?: number;
    minChainLength?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  }) => {
    if (!user?.uid) return [];

    try {
      setIsLoading(true);
      return await analyticsService.queryAnalytics({
        ...params,
        userId: user.uid
      });
    } catch (error) {
      console.error('Failed to query analytics:', error);
      setError(error as Error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  return {
    trackGameCompletion,
    measurePerformance,
    getPlayerInsights,
    queryAnalytics,
    isLoading,
    error
  };
} 