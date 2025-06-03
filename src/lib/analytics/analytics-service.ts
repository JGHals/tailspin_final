import { db } from '../firebase/firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  Timestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore';
import type { GameResult } from '../types/game';
import { withRetry } from '../utils/retry';
import { chainValidator } from '../game/chain-validator';

interface PerformanceMetric {
  type: 'dictionary_load' | 'word_validation' | 'chain_validation' | 'score_submission';
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface GameAnalytics {
  userId: string;
  gameMode: 'daily' | 'endless' | 'versus';
  sessionDuration: number;
  wordsPlayed: number;
  uniqueLettersUsed: string[];
  rareLettersUsed: string[];
  terminalWordsFound: string[];
  powerUpsUsed: string[];
  averageWordLength: number;
  maxChainLength: number;
  hintsUsed: number;
  invalidAttempts: number;
  timestamp: Date;
  pathAnalysis?: {
    averageBranchingFactor: number;
    maxBranchingFactor: number;
    minBranchingFactor: number;
    terminalRisk: number;
    difficulty: 'easy' | 'medium' | 'hard';
    deadEndWords: string[];
  };
  moveTimings: {
    averageMoveTime: number;
    fastMoves: number; // moves under 5s
    slowMoves: number; // moves over 30s
    moveTimeDistribution: number[]; // array of move times in ms
  };
  playerBehavior: {
    preferredWordLength: number;
    riskTaking: number; // 0-1 scale based on choosing low branching paths
    explorationScore: number; // 0-1 scale based on letter variety
    consistencyScore: number; // 0-1 scale based on move time variance
    recoveryRate: number; // 0-1 scale, recovery from dead ends/invalid moves
  };
  performance: {
    averageValidationTime: number;
    averageRenderTime: number;
    errorRate: number;
    clientSpecs?: {
      deviceMemory?: number;
      hardwareConcurrency?: number;
      connection?: {
        effectiveType?: string;
        rtt?: number;
      };
    };
  };
}

interface AnalyticsQuery {
  gameMode?: 'daily' | 'endless' | 'versus';
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  minScore?: number;
  minChainLength?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface PlayerInsights {
  preferredGameMode: 'daily' | 'endless' | 'versus';
  averageSessionDuration: number;
  peakPlayTimes: string[];
  wordPreferences: {
    averageLength: number;
    mostUsedLetters: string[];
    rareLetterUsage: number;
  };
  skillMetrics: {
    averageScore: number;
    averageChainLength: number;
    completionRate: number;
    improvementRate: number;
    consistencyScore: number;
  };
  behaviorPatterns: {
    riskTaking: number;
    exploration: number;
    adaptability: number;
    speedVsAccuracy: number;
  };
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private performanceMetrics: PerformanceMetric[] = [];
  private batchSize = 10;
  private flushInterval = 60000; // 1 minute

  private constructor() {
    this.setupPeriodicFlush();
  }

  static getInstance(): AnalyticsService {
    if (!this.instance) {
      this.instance = new AnalyticsService();
    }
    return this.instance;
  }

  private setupPeriodicFlush() {
    setInterval(() => {
      if (this.performanceMetrics.length > 0) {
        this.flushPerformanceMetrics();
      }
    }, this.flushInterval);
  }

  private async calculatePlayerBehavior(
    chain: string[],
    moveTimings: number[],
    invalidAttempts: number,
    deadEnds: number
  ): Promise<GameAnalytics['playerBehavior']> {
    // Calculate preferred word length
    const preferredWordLength = chain.reduce((sum, word) => sum + word.length, 0) / chain.length;

    // Calculate risk taking based on branching factors
    let riskSum = 0;
    for (const word of chain) {
      const nextWords = await chainValidator.findPossibleNextWords(word);
      riskSum += nextWords.length < 5 ? 1 : 0; // Consider low branching factor choices as risky
    }
    const riskTaking = chain.length > 0 ? riskSum / chain.length : 0;

    // Calculate exploration score based on unique letters used
    const uniqueLetters = new Set(chain.join('').toLowerCase());
    const explorationScore = uniqueLetters.size / 26; // Normalize by alphabet size

    // Calculate consistency based on move timing variance
    const avgMoveTime = moveTimings.reduce((a, b) => a + b, 0) / moveTimings.length;
    const variance = moveTimings.reduce((sum, time) => sum + Math.pow(time - avgMoveTime, 2), 0) / moveTimings.length;
    const consistencyScore = Math.max(0, 1 - (Math.sqrt(variance) / avgMoveTime));

    // Calculate recovery rate
    const totalChallenges = invalidAttempts + deadEnds;
    const recoveryRate = totalChallenges > 0 ? 
      (chain.length / (chain.length + invalidAttempts)) : 1;

    return {
      preferredWordLength,
      riskTaking,
      explorationScore,
      consistencyScore,
      recoveryRate
    };
  }

  private async calculateMoveTimings(
    wordTimings: Map<string, number>
  ): Promise<GameAnalytics['moveTimings']> {
    const timings = Array.from(wordTimings.values());
    const avgMoveTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    
    return {
      averageMoveTime: avgMoveTime,
      fastMoves: timings.filter(t => t < 5000).length,
      slowMoves: timings.filter(t => t > 30000).length,
      moveTimeDistribution: timings
    };
  }

  private getClientPerformanceMetrics(): GameAnalytics['performance']['clientSpecs'] {
    if (typeof window === 'undefined') return {};

    return {
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      connection: {
        effectiveType: (navigator as any).connection?.effectiveType,
        rtt: (navigator as any).connection?.rtt
      }
    };
  }

  async trackGameCompletion(gameResult: GameResult, userId: string) {
    // Get path analysis for the chain
    const pathAnalysis = await chainValidator.analyzePath(gameResult.chain);
    
    // Calculate move timings
    const moveTimings = await this.calculateMoveTimings(
      new Map(gameResult.chain.map((word, i) => [word, i === 0 ? 0 : 5000])) // placeholder timings
    );

    // Calculate player behavior metrics
    const playerBehavior = await this.calculatePlayerBehavior(
      gameResult.chain,
      moveTimings.moveTimeDistribution,
      gameResult.invalidAttempts || 0,
      pathAnalysis.deadEndWords.length
    );

    const analytics: GameAnalytics = {
      userId,
      gameMode: gameResult.mode,
      sessionDuration: gameResult.duration,
      wordsPlayed: gameResult.chain.length,
      uniqueLettersUsed: Array.from(new Set(gameResult.chain.join('').split(''))),
      rareLettersUsed: gameResult.rareLettersUsed,
      terminalWordsFound: gameResult.terminalWords,
      powerUpsUsed: gameResult.powerUpsUsed,
      averageWordLength: gameResult.chain.reduce((sum, word) => sum + word.length, 0) / gameResult.chain.length,
      maxChainLength: gameResult.chain.length,
      hintsUsed: gameResult.powerUpsUsed.filter(p => p === 'hint').length,
      invalidAttempts: gameResult.invalidAttempts || 0,
      timestamp: new Date(),
      pathAnalysis: {
        averageBranchingFactor: pathAnalysis.averageBranchingFactor,
        maxBranchingFactor: pathAnalysis.maxBranchingFactor,
        minBranchingFactor: pathAnalysis.minBranchingFactor,
        terminalRisk: pathAnalysis.terminalRisk,
        difficulty: pathAnalysis.difficulty,
        deadEndWords: pathAnalysis.deadEndWords
      },
      moveTimings,
      playerBehavior,
      performance: {
        averageValidationTime: 0, // Will be populated from performance metrics
        averageRenderTime: 0,
        errorRate: 0,
        clientSpecs: this.getClientPerformanceMetrics()
      }
    };

    await withRetry(async () => {
      // Add analytics record
      await addDoc(collection(db, 'game_analytics'), {
        ...analytics,
        timestamp: Timestamp.fromDate(analytics.timestamp)
      });

      // Update user stats with atomic operations
      const userRef = doc(db, 'users', userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) return;

        const stats = userDoc.data().stats || {};
        const newStats = {
          'stats.gamesPlayed': increment(1),
          'stats.totalWordsPlayed': increment(analytics.wordsPlayed),
          'stats.totalScore': increment(gameResult.score.total),
          'stats.averageScore': gameResult.score.total / (stats.gamesPlayed + 1),
          'stats.highestScore': Math.max(gameResult.score.total, stats.highestScore || 0),
          'stats.totalRareLetters': increment(analytics.rareLettersUsed.length),
          'stats.totalTerminalWords': increment(analytics.terminalWordsFound.length),
          'stats.averageChainLength': analytics.maxChainLength / (stats.gamesPlayed + 1),
          'stats.fastestCompletion': Math.min(analytics.sessionDuration, stats.fastestCompletion || Infinity),
          'stats.averageTimePerMove': analytics.sessionDuration / analytics.wordsPlayed,
          'stats.skillRating': this.calculateSkillRating(analytics)
        };

        transaction.update(userRef, newStats);
      });
    });
  }

  private calculateSkillRating(analytics: GameAnalytics): number {
    const baseScore = 1000;
    const factors = {
      chainLength: 0.3,
      moveSpeed: 0.2,
      accuracy: 0.2,
      difficulty: 0.15,
      exploration: 0.15
    };

    const chainScore = (analytics.maxChainLength / 20) * factors.chainLength;
    const speedScore = (1 - (analytics.moveTimings.averageMoveTime / 30000)) * factors.moveSpeed;
    const accuracyScore = (1 - (analytics.invalidAttempts / analytics.wordsPlayed)) * factors.accuracy;
    const difficultyScore = (analytics.pathAnalysis?.terminalRisk || 0) * factors.difficulty;
    const explorationScore = analytics.playerBehavior.explorationScore * factors.exploration;

    return Math.round(
      baseScore * (1 + chainScore + speedScore + accuracyScore + difficultyScore + explorationScore)
    );
  }

  async getPlayerInsights(userId: string, dateRange?: { start: Date; end: Date }): Promise<PlayerInsights> {
    const analyticsRef = collection(db, 'game_analytics');
    const constraints = [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    ];
    
    if (dateRange) {
      constraints.push(
        where('timestamp', '>=', Timestamp.fromDate(dateRange.start)),
        where('timestamp', '<=', Timestamp.fromDate(dateRange.end))
      );
    }

    const q = query(analyticsRef, ...constraints, limit(100));
    const snapshot = await getDocs(q);
    const games = snapshot.docs.map(doc => doc.data() as GameAnalytics);

    if (games.length === 0) {
      throw new Error('No games found for analysis');
    }

    // Calculate game mode preference
    const modeCounts = games.reduce((acc, game) => {
      acc[game.gameMode] = (acc[game.gameMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const preferredGameMode = Object.entries(modeCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0] as 'daily' | 'endless' | 'versus';

    // Calculate peak play times
    const playHours = games.map(g => new Date(g.timestamp).getHours());
    const hourCounts = playHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakPlayTimes = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);

    // Calculate word preferences
    const allWords = games.flatMap(g => g.uniqueLettersUsed);
    const letterCounts = allWords.reduce((acc, letter) => {
      acc[letter] = (acc[letter] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedLetters = Object.entries(letterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([letter]) => letter);

    // Calculate improvement rate
    const recentGames = games.slice(0, 10);
    const olderGames = games.slice(-10);
    const recentAvg = recentGames.reduce((sum, g) => sum + g.maxChainLength, 0) / recentGames.length;
    const olderAvg = olderGames.reduce((sum, g) => sum + g.maxChainLength, 0) / olderGames.length;
    const improvementRate = (recentAvg - olderAvg) / olderAvg;

    return {
      preferredGameMode,
      averageSessionDuration: games.reduce((sum, g) => sum + g.sessionDuration, 0) / games.length,
      peakPlayTimes,
      wordPreferences: {
        averageLength: games.reduce((sum, g) => sum + g.averageWordLength, 0) / games.length,
        mostUsedLetters,
        rareLetterUsage: games.reduce((sum, g) => sum + g.rareLettersUsed.length, 0) / games.length
      },
      skillMetrics: {
        averageScore: games.reduce((sum, g) => sum + g.maxChainLength * 10, 0) / games.length,
        averageChainLength: games.reduce((sum, g) => sum + g.maxChainLength, 0) / games.length,
        completionRate: games.filter(g => g.maxChainLength > 5).length / games.length,
        improvementRate,
        consistencyScore: games.reduce((sum, g) => sum + (g.playerBehavior?.consistencyScore || 0), 0) / games.length
      },
      behaviorPatterns: {
        riskTaking: games.reduce((sum, g) => sum + (g.playerBehavior?.riskTaking || 0), 0) / games.length,
        exploration: games.reduce((sum, g) => sum + (g.playerBehavior?.explorationScore || 0), 0) / games.length,
        adaptability: games.reduce((sum, g) => sum + (g.playerBehavior?.recoveryRate || 0), 0) / games.length,
        speedVsAccuracy: games.reduce((sum, g) => sum + (g.moveTimings.fastMoves / g.maxChainLength), 0) / games.length
      }
    };
  }

  async queryAnalytics(queryParams: AnalyticsQuery): Promise<GameAnalytics[]> {
    const analyticsRef = collection(db, 'game_analytics');
    const constraints: any[] = [];

    if (queryParams.gameMode) {
      constraints.push(where('gameMode', '==', queryParams.gameMode));
    }
    if (queryParams.userId) {
      constraints.push(where('userId', '==', queryParams.userId));
    }
    if (queryParams.dateRange) {
      constraints.push(
        where('timestamp', '>=', Timestamp.fromDate(queryParams.dateRange.start)),
        where('timestamp', '<=', Timestamp.fromDate(queryParams.dateRange.end))
      );
    }
    if (queryParams.minScore) {
      constraints.push(where('maxChainLength', '>=', queryParams.minScore));
    }
    if (queryParams.minChainLength) {
      constraints.push(where('maxChainLength', '>=', queryParams.minChainLength));
    }
    if (queryParams.difficulty) {
      constraints.push(where('pathAnalysis.difficulty', '==', queryParams.difficulty));
    }

    constraints.push(orderBy('timestamp', 'desc'));
    const queryRef = query(analyticsRef, ...constraints, limit(100));
    const snapshot = await getDocs(queryRef);

    return snapshot.docs.map(doc => doc.data() as GameAnalytics);
  }

  trackPerformance(metric: PerformanceMetric) {
    this.performanceMetrics.push({
      ...metric,
      metadata: {
        ...metric.metadata,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      }
    });

    if (this.performanceMetrics.length >= this.batchSize) {
      this.flushPerformanceMetrics();
    }
  }

  private async flushPerformanceMetrics() {
    if (this.performanceMetrics.length === 0) return;

    const metrics = [...this.performanceMetrics];
    this.performanceMetrics = [];

    try {
      await withRetry(async () => {
        const batch = metrics.map(metric => 
          addDoc(collection(db, 'performance_metrics'), {
            ...metric,
            timestamp: Timestamp.now()
          })
        );
        await Promise.all(batch);
      });
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
      // Re-add failed metrics to the queue
      this.performanceMetrics.push(...metrics);
    }
  }

  async measurePerformance<T>(
    type: PerformanceMetric['type'],
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await operation();
      this.trackPerformance({
        type,
        duration: performance.now() - startTime,
        success: true,
        metadata
      });
      return result;
    } catch (error: any) {
      this.trackPerformance({
        type,
        duration: performance.now() - startTime,
        success: false,
        error: error?.message || 'Unknown error',
        metadata
      });
      throw error;
    }
  }
}

export const analyticsService = AnalyticsService.getInstance(); 