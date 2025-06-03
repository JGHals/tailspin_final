import { db } from '../firebase/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import type { LeaderboardData, LeaderboardEntry, LeaderboardPeriod, LeaderboardMode } from '../types/leaderboard';
import type { GameResult } from '../types/game';
import { withRetry } from '../utils/retry';

const CACHE_KEY_PREFIX = 'tailspin_leaderboard_';
const OFFLINE_QUEUE_KEY = 'tailspin_offline_scores';

class LeaderboardManager {
  private static instance: LeaderboardManager;
  private offlineQueue: Array<{
    userId: string;
    displayName: string;
    photoURL: string | undefined;
    gameResult: GameResult;
  }> = [];

  private constructor() {
    this.loadOfflineQueue();
    window.addEventListener('online', this.processOfflineQueue.bind(this));
  }

  static getInstance(): LeaderboardManager {
    if (!this.instance) {
      this.instance = new LeaderboardManager();
    }
    return this.instance;
  }

  private getCacheKey(mode: LeaderboardMode, period: LeaderboardPeriod): string {
    return `${CACHE_KEY_PREFIX}${mode}_${period}`;
  }

  private loadOfflineQueue() {
    const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (saved) {
      try {
        this.offlineQueue = JSON.parse(saved);
      } catch (err) {
        console.error('Error loading offline queue:', err);
        this.offlineQueue = [];
      }
    }
  }

  private saveOfflineQueue() {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
  }

  private async processOfflineQueue() {
    if (!navigator.onLine || this.offlineQueue.length === 0) return;

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of queue) {
      try {
        await this.submitScore(
          item.userId,
          item.displayName,
          item.photoURL,
          item.gameResult
        );
      } catch (err) {
        console.error('Error processing offline score:', err);
        // Re-queue failed items
        this.offlineQueue.push(item);
        this.saveOfflineQueue();
      }
    }
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
    displayName: string,
    photoURL: string | undefined,
    gameResult: GameResult
  ): Promise<void> {
    const entry: LeaderboardEntry = {
      userId,
      displayName,
      photoURL,
      score: gameResult.score.total,
      chain: gameResult.chain,
      moveCount: gameResult.moveCount,
      date: new Date().toISOString(),
      rareLettersUsed: gameResult.rareLettersUsed,
      terminalWords: gameResult.terminalWords,
      powerUpsUsed: gameResult.powerUpsUsed,
      parMoves: gameResult.parMoves,
      timeTaken: gameResult.duration
    };

    if (!navigator.onLine) {
      this.offlineQueue.push({ userId, displayName, photoURL, gameResult });
      this.saveOfflineQueue();
      return;
    }

    await withRetry(async () => {
      await addDoc(collection(db, 'leaderboard'), {
        ...entry,
        timestamp: Timestamp.now()
      });
    });
  }

  async getLeaderboard(
    mode: LeaderboardMode,
    period: LeaderboardPeriod = 'daily',
    userId?: string
  ): Promise<LeaderboardData> {
    const cacheKey = this.getCacheKey(mode, period);
    const cached = localStorage.getItem(cacheKey);

    if (!navigator.onLine && cached) {
      return JSON.parse(cached);
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
      const entries: LeaderboardEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.userId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          score: data.score,
          chain: data.chain,
          moveCount: data.moveCount,
          date: data.date,
          rareLettersUsed: data.rareLettersUsed,
          terminalWords: data.terminalWords,
          powerUpsUsed: data.powerUpsUsed,
          parMoves: data.parMoves,
          timeTaken: data.timeTaken
        };
      });

      let userRank: number | undefined;
      if (userId) {
        userRank = entries.findIndex(entry => entry.userId === userId) + 1;
      }

      const result: LeaderboardData = {
        entries,
        userRank,
        totalPlayers: entries.length,
        period,
        mode,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify(result));

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
    const cacheKey = `${this.getCacheKey(mode, period)}_friends_${userId}`;
    const cached = localStorage.getItem(cacheKey);

    if (!navigator.onLine && cached) {
      return JSON.parse(cached);
    }

    const startDate = this.getStartDate(period);
    const allIds = [userId, ...friendIds];

    const data = await withRetry(async () => {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(
        leaderboardRef,
        where('userId', 'in', allIds),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('mode', '==', mode),
        orderBy('score', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.userId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          score: data.score,
          chain: data.chain,
          moveCount: data.moveCount,
          date: data.date,
          rareLettersUsed: data.rareLettersUsed,
          terminalWords: data.terminalWords,
          powerUpsUsed: data.powerUpsUsed,
          parMoves: data.parMoves,
          timeTaken: data.timeTaken
        };
      });

      const userRank = entries.findIndex(entry => entry.userId === userId) + 1;

      const result: LeaderboardData = {
        entries,
        userRank,
        totalPlayers: entries.length,
        period,
        mode,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify(result));

      return result;
    });

    return data;
  }
}

export const leaderboardManager = LeaderboardManager.getInstance(); 