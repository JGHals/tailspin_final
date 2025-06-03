import { db } from '../firebase/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  Timestamp,
  onSnapshot,
  doc,
  DocumentData
} from 'firebase/firestore';
import type { 
  LeaderboardData, 
  LeaderboardEntry, 
  LeaderboardPeriod, 
  LeaderboardMode 
} from '../types/leaderboard';
import type { GameResult } from '../types/game';

class LeaderboardManagerV2 {
  private static instance: LeaderboardManagerV2;
  private activeSubscriptions: Map<string, () => void> = new Map();

  private constructor() {}

  static getInstance(): LeaderboardManagerV2 {
    if (!this.instance) {
      this.instance = new LeaderboardManagerV2();
    }
    return this.instance;
  }

  private getStartDate(period: LeaderboardPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const day = now.getDay();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      case 'allTime':
        return new Date(0); // Beginning of time
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  private getLeaderboardId(mode: LeaderboardMode, period: LeaderboardPeriod): string {
    return `${mode}_${period}`;
  }

  async getLeaderboard(
    mode: LeaderboardMode,
    period: LeaderboardPeriod,
    userId?: string
  ): Promise<LeaderboardData> {
    try {
      const startDate = this.getStartDate(period);
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(
        leaderboardRef,
        where('mode', '==', mode),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc'),
        orderBy('score', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      let userRank: number | null = null;

      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const entry: LeaderboardEntry = {
          id: doc.id,
          userId: data.userId,
          username: data.username,
          score: data.score,
          wordCount: data.wordCount,
          timestamp: data.timestamp.toDate().toISOString(),
          rank: index + 1
        };
        entries.push(entry);

        if (userId && data.userId === userId) {
          userRank = index + 1;
        }
      });

      return {
        entries,
        userRank,
        period,
        mode,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw new Error('Failed to fetch leaderboard');
    }
  }

  subscribeToLeaderboard(
    mode: LeaderboardMode,
    period: LeaderboardPeriod,
    callback: (data: LeaderboardData) => void
  ): () => void {
    const leaderboardId = this.getLeaderboardId(mode, period);
    
    // Unsubscribe from existing subscription if any
    if (this.activeSubscriptions.has(leaderboardId)) {
      this.activeSubscriptions.get(leaderboardId)?.();
      this.activeSubscriptions.delete(leaderboardId);
    }

    const startDate = this.getStartDate(period);
    const leaderboardRef = collection(db, 'leaderboard');
    const q = query(
      leaderboardRef,
      where('mode', '==', mode),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      orderBy('score', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const entry: LeaderboardEntry = {
          id: doc.id,
          userId: data.userId,
          username: data.username,
          score: data.score,
          wordCount: data.wordCount,
          timestamp: data.timestamp.toDate().toISOString(),
          rank: index + 1
        };
        entries.push(entry);
      });

      callback({
        entries,
        userRank: null, // User rank is not tracked in real-time
        period,
        mode,
        lastUpdated: new Date().toISOString()
      });
    });

    this.activeSubscriptions.set(leaderboardId, unsubscribe);
    return unsubscribe;
  }

  async submitScore(result: GameResult): Promise<void> {
    if (!result.userId || !result.username) {
      throw new Error('User information missing');
    }

    try {
      const leaderboardRef = collection(db, 'leaderboard');
      await addDoc(leaderboardRef, {
        userId: result.userId,
        username: result.username,
        score: result.score,
        wordCount: result.chain.length,
        mode: result.mode,
        timestamp: Timestamp.now(),
        chain: result.chain // Store the word chain for verification
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      throw new Error('Failed to submit score');
    }
  }

  unsubscribeAll(): void {
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.activeSubscriptions.clear();
  }
}

export const leaderboardManagerV2 = LeaderboardManagerV2.getInstance(); 