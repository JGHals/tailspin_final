import { db } from '../firebase/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs, limit } from 'firebase/firestore';
import { dailyPuzzleGenerator } from './daily-puzzle-generator';
import type { DailyPuzzle } from './game-mode-manager';
import { startupService } from '../services/startup-service';
import { UnifiedCache } from '../dictionary/unified-cache';

const CACHE_KEYS = {
  PUZZLE: 'puzzle',
  COMPLETED: 'completed',
  HISTORY: 'history'
} as const;

interface PuzzleHistoryResult {
  puzzles: DailyPuzzle[];
  hasMore: boolean;
}

export class DailyPuzzleService {
  private readonly COLLECTION = 'daily_puzzles';
  private readonly COMPLETED_COLLECTION = 'completed_puzzles';
  private readonly PREFETCH_DAYS = 3;
  private readonly HISTORY_BATCH_SIZE = 10;
  
  private puzzleCache: UnifiedCache<DailyPuzzle>;
  private historyCache: UnifiedCache<PuzzleHistoryResult>;
  private completedCache: Map<string, Set<string>>; // date -> userIds
  private prefetchTimeout: NodeJS.Timeout | null = null;
  
  constructor() {
    this.puzzleCache = new UnifiedCache<DailyPuzzle>({
      maxEntries: 10,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      namespace: 'dailyPuzzles'
    });
    
    this.historyCache = new UnifiedCache<PuzzleHistoryResult>({
      maxEntries: 20,
      ttl: 12 * 60 * 60 * 1000, // 12 hours
      namespace: 'puzzleHistory'
    });
    
    this.completedCache = new Map();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  async getDailyPuzzle(date?: Date): Promise<DailyPuzzle> {
    const puzzleDate = date ? this.formatDate(date) : this.formatDate(new Date());
    
    // Try cache first
    const cached = await this.puzzleCache.get(`${CACHE_KEYS.PUZZLE}_${puzzleDate}`);
    if (cached) {
      return cached;
    }

    // Get from Firebase
    const puzzle = await this.fetchPuzzleFromFirebase(puzzleDate);
    
    // Cache the result
    await this.puzzleCache.set(`${CACHE_KEYS.PUZZLE}_${puzzleDate}`, puzzle);
    
    // Start prefetching next few days in the background
    this.schedulePrefetch();
    
    return puzzle;
  }

  private async fetchPuzzleFromFirebase(date: string): Promise<DailyPuzzle> {
    const puzzleDoc = await getDoc(doc(db, this.COLLECTION, date));
    
    if (!puzzleDoc.exists()) {
      throw new Error(`No puzzle found for date: ${date}`);
    }

    return puzzleDoc.data() as DailyPuzzle;
  }

  private schedulePrefetch(): void {
    // Cancel any existing prefetch
    if (this.prefetchTimeout) {
      clearTimeout(this.prefetchTimeout);
    }

    // Schedule prefetch for idle time (5 seconds after last action)
    this.prefetchTimeout = setTimeout(() => {
      this.prefetchUpcomingPuzzles().catch(console.error);
    }, 5000);
  }

  private async prefetchUpcomingPuzzles(): Promise<void> {
    const today = new Date();
    
    for (let i = 1; i <= this.PREFETCH_DAYS; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateStr = this.formatDate(futureDate);
      
      // Skip if already cached
      const cached = await this.puzzleCache.get(`${CACHE_KEYS.PUZZLE}_${dateStr}`);
      if (cached) continue;
      
      try {
        const puzzle = await this.fetchPuzzleFromFirebase(dateStr);
        await this.puzzleCache.set(`${CACHE_KEYS.PUZZLE}_${dateStr}`, puzzle);
      } catch (error) {
        console.error(`Failed to prefetch puzzle for ${dateStr}:`, error);
      }
    }
  }

  async getPuzzleHistory(userId: string, offset: number = 0): Promise<PuzzleHistoryResult> {
    const cacheKey = `${CACHE_KEYS.HISTORY}_${userId}_${offset}`;
    
    // Try cache first
    const cached = await this.historyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query Firebase
    const completedQuery = query(
      collection(db, this.COMPLETED_COLLECTION),
      where('userId', '==', userId),
      limit(this.HISTORY_BATCH_SIZE + 1)
    );
    
    const completedDocs = await getDocs(completedQuery);
    const puzzles: DailyPuzzle[] = [];
    
    for (const doc of completedDocs.docs.slice(0, this.HISTORY_BATCH_SIZE)) {
      const puzzle = await this.fetchPuzzleFromFirebase(doc.data().puzzleDate);
      puzzles.push(puzzle);
    }

    const result: PuzzleHistoryResult = {
      puzzles,
      hasMore: completedDocs.docs.length > this.HISTORY_BATCH_SIZE
    };

    // Cache the result
    await this.historyCache.set(cacheKey, result);

    return result;
  }

  async markPuzzleCompleted(userId: string, puzzleDate: string): Promise<void> {
    // Update local cache
    const dateSet = this.completedCache.get(puzzleDate) || new Set();
    dateSet.add(userId);
    this.completedCache.set(puzzleDate, dateSet);

    // Update Firebase
    await setDoc(
      doc(db, this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`),
      {
        userId,
        puzzleDate,
        completedAt: new Date()
      }
    );
  }

  async hasCompletedPuzzle(userId: string, puzzleDate: string): Promise<boolean> {
    // Check local cache first
    const dateSet = this.completedCache.get(puzzleDate);
    if (dateSet?.has(userId)) return true;

    // Check Firebase
    const docRef = doc(db, this.COMPLETED_COLLECTION, `${puzzleDate}_${userId}`);
    const docSnap = await getDoc(docRef);
    
    const completed = docSnap.exists();
    
    // Update cache
    if (completed) {
      const dateSet = this.completedCache.get(puzzleDate) || new Set();
      dateSet.add(userId);
      this.completedCache.set(puzzleDate, dateSet);
    }

    return completed;
  }

  clearCache(): void {
    this.puzzleCache.clear();
    this.historyCache.clear();
    this.completedCache.clear();
  }
}

// Export singleton instance
export const dailyPuzzleService = new DailyPuzzleService(); 