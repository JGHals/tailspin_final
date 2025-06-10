import { db } from '../firebase/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import type { LeaderboardData, LeaderboardEntry, LeaderboardPeriod, LeaderboardMode } from '../types/leaderboard';
import type { GameResult } from '../types/game';
import { withRetry } from '../utils/retry';

// Server-side in-memory cache
const CACHE = new Map<string, { data: LeaderboardData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class LeaderboardManager {
  private static instance: LeaderboardManager;

  private constructor() {}

  static getInstance(): LeaderboardManager {
    if (!this.instance) {
      this.instance = new LeaderboardManager();
    }
    return this.instance;
  }

  private getCacheKey(mode: LeaderboardMode, period: LeaderboardPeriod): string {
    return `${mode}_${period}`;
  }

  private getStartDate(period: LeaderboardPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return startOfWeek;
      case 'allTime':
        return new Date(0); // Beginning of time
      default:
        return now;
    }
  }

  async submitScore(
    userId: string,
    username: string,
    gameResult: GameResult
  ): Promise<void> {
    const entry = {
      userId,
      username,
      score: gameResult.score.total,
      wordCount: gameResult.chain.length,
      timestamp: new Date().toISOString()
    };

    await withRetry(async () => {
      const docRef = await addDoc(collection(db, 'leaderboard'), {
        ...entry,
        timestamp: Timestamp.now()
      });

      // Invalidate cache for this mode
      const cacheKey = this.getCacheKey(gameResult.mode, 'daily');
      CACHE.delete(cacheKey);
    });
  }

  async getLeaderboard(
    mode: LeaderboardMode,
    period: LeaderboardPeriod = 'daily',
    userId?: string
  ): Promise<LeaderboardData> {
    const cacheKey = this.getCacheKey(mode, period);
    const cached = CACHE.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    const startDate = this.getStartDate(period);
    
    const data = await withRetry(async () => {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(
        leaderboardRef,
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('mode', '==', mode),
        orderBy('score', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          username: data.username,
          score: data.score,
          wordCount: data.wordCount,
          timestamp: data.timestamp.toDate().toISOString(),
          rank: index + 1
        };
      });

      let userRank: number | null = null;
      if (userId) {
        const userIndex = entries.findIndex(entry => entry.userId === userId);
        userRank = userIndex >= 0 ? userIndex + 1 : null;
      }

      const result: LeaderboardData = {
        entries,
        userRank,
        period,
        mode,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      CACHE.set(cacheKey, { data: result, timestamp: now });

      return result;
    });

    return data;
  }

  async getFriendLeaderboard(
    userId: string,
    friendIds: string[],
    mode: LeaderboardMode,
    period: LeaderboardPeriod = 'daily'
  ): Promise<LeaderboardData> {
    const cacheKey = `friends_${userId}_${mode}_${period}`;
    const cached = CACHE.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }

    const startDate = this.getStartDate(period);
    
    const data = await withRetry(async () => {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(
        leaderboardRef,
        where('userId', 'in', [userId, ...friendIds]),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('mode', '==', mode),
        orderBy('score', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          username: data.username,
          score: data.score,
          wordCount: data.wordCount,
          timestamp: data.timestamp.toDate().toISOString(),
          rank: index + 1
        };
      });

      const userIndex = entries.findIndex(entry => entry.userId === userId);
      const userRank = userIndex >= 0 ? userIndex + 1 : null;

      const result: LeaderboardData = {
        entries,
        userRank,
        period,
        mode,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      CACHE.set(cacheKey, { data: result, timestamp: now });

      return result;
    });

    return data;
  }
}

export const leaderboardManager = LeaderboardManager.getInstance(); 