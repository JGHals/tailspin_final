import { useState, useEffect } from 'react';
import type { LeaderboardData, LeaderboardPeriod, LeaderboardMode } from '../types/leaderboard';
import { leaderboardManagerV2 } from '../game/leaderboard-manager-v2';
import { useConnection } from '../contexts/connection-context';

export function useRealtimeLeaderboard(
  mode: LeaderboardMode,
  period: LeaderboardPeriod = 'daily',
  userId?: string,
  maxEntries: number = 100
) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useConnection();

  useEffect(() => {
    if (!isOnline) {
      setError('Cannot fetch leaderboard while offline');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = leaderboardManagerV2.subscribeToLeaderboard(
      mode,
      period,
      (leaderboardData) => {
        setData(leaderboardData);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [mode, period, userId, maxEntries, isOnline]);

  return { data, loading, error };
} 