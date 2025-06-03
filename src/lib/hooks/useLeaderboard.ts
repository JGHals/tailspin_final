import { useState, useEffect, useCallback } from 'react';
import { leaderboardManagerV2 } from '../game/leaderboard-manager-v2';
import type { LeaderboardData, LeaderboardMode, LeaderboardPeriod } from '../types/leaderboard';
import { useAuth } from './useAuth';
import { useConnection } from '../contexts/connection-context';

export function useLeaderboard(
  mode: LeaderboardMode,
  period: LeaderboardPeriod = 'daily',
  realtime: boolean = false
) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { isOnline } = useConnection();

  const fetchLeaderboard = useCallback(async () => {
    if (!isOnline) {
      setError(new Error('Cannot fetch leaderboard while offline'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const leaderboardData = await leaderboardManagerV2.getLeaderboard(
        mode,
        period,
        user?.id
      );
      setData(leaderboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
    } finally {
      setLoading(false);
    }
  }, [mode, period, user?.id, isOnline]);

  useEffect(() => {
    if (realtime && isOnline) {
      const unsubscribe = leaderboardManagerV2.subscribeToLeaderboard(
        mode,
        period,
        (leaderboardData) => {
          setData(leaderboardData);
          setLoading(false);
          setError(null);
        }
      );
      return () => unsubscribe();
    } else {
      fetchLeaderboard();
    }
  }, [mode, period, realtime, isOnline, fetchLeaderboard]);

  const refresh = useCallback(() => {
    if (!realtime) {
      fetchLeaderboard();
    }
  }, [realtime, fetchLeaderboard]);

  return {
    data,
    error,
    loading,
    refresh
  };
} 