import { db } from '../../firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  Timestamp,
  writeBatch,
  QueryConstraint
} from 'firebase/firestore';
import { dictionaryAccess } from '../../dictionary/dictionary-access';
import { RARE_LETTERS } from '../scoring';
import { tokenManager } from '../token-manager';

export interface EndlessResult {
  userId: string;
  sessionId: string;
  chain: string[];
  score: number;
  duration: number;
  terminalWords: string[];
  powerUpsUsed: string[];
  uniqueLettersUsed: string[];
  timestamp: Timestamp;
}

export interface EndlessLeaderboardEntry extends EndlessResult {
  rank: number;
}

export interface LetterStats {
  letter: string;
  usageCount: number;
  lastUsed: Timestamp;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (result: EndlessResult) => boolean;
  reward: number; // Token reward
}

class EndlessModeManager {
  private static readonly COLLECTION_RESULTS = 'endless_results';
  private static readonly COLLECTION_LETTER_STATS = 'letter_stats';
  private static readonly COLLECTION_ACHIEVEMENTS = 'achievements';

  private achievements: Achievement[] = [
    {
      id: 'chain_master',
      name: 'Chain Master',
      description: 'Reach a 25-word chain',
      condition: (result) => result.chain.length >= 25,
      reward: 10
    },
    {
      id: 'word_wizard',
      name: 'Word Wizard',
      description: 'Reach a 50-word chain',
      condition: (result) => result.chain.length >= 50,
      reward: 25
    },
    {
      id: 'endless_legend',
      name: 'Endless Legend',
      description: 'Reach a 100-word chain',
      condition: (result) => result.chain.length >= 100,
      reward: 50
    },
    {
      id: 'chain_terminator',
      name: 'Chain Terminator',
      description: 'End with a terminal word',
      condition: (result) => result.terminalWords.length >= 1,
      reward: 5
    },
    {
      id: 'dead_end_collector',
      name: 'Dead End Collector',
      description: 'Find 5 different terminal words',
      condition: (result) => result.terminalWords.length >= 5,
      reward: 15
    },
    {
      id: 'alphabet_explorer',
      name: 'Alphabet Explorer',
      description: 'Use 20 different letters',
      condition: (result) => result.uniqueLettersUsed.length >= 20,
      reward: 10
    },
    {
      id: 'alphabet_master',
      name: 'Alphabet Master',
      description: 'Use all 26 letters',
      condition: (result) => result.uniqueLettersUsed.length >= 26,
      reward: 25
    },
    {
      id: 'score_champion',
      name: 'Score Champion',
      description: 'Score 1000+ points',
      condition: (result) => result.score >= 1000,
      reward: 15
    },
    {
      id: 'score_legend',
      name: 'Score Legend',
      description: 'Score 5000+ points',
      condition: (result) => result.score >= 5000,
      reward: 30
    },
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Complete 20+ chain in under 5 minutes',
      condition: (result) => 
        result.chain.length >= 20 && result.duration <= 300,
      reward: 20
    }
  ];

  async startSession(): Promise<string> {
    // Create a new session document
    const sessionRef = doc(collection(db, EndlessModeManager.COLLECTION_RESULTS));
    return sessionRef.id;
  }

  async submitResult(result: EndlessResult): Promise<{
    achievements: Achievement[];
    totalTokens: number;
  }> {
    // Save result
    await setDoc(
      doc(collection(db, EndlessModeManager.COLLECTION_RESULTS), result.sessionId),
      {
        ...result,
        timestamp: Timestamp.now()
      }
    );

    // Check for achievements
    const earnedAchievements = this.achievements.filter(
      achievement => achievement.condition(result)
    );

    // Calculate token rewards
    const tokenReward = tokenManager.getEndlessReward(
      result.chain.length,
      result.terminalWords.length,
      result.duration,
      result.powerUpsUsed.length
    );

    // Add achievement token rewards
    const achievementTokens = earnedAchievements.reduce(
      (sum, achievement) => sum + achievement.reward,
      0
    );

    const totalTokens = tokenReward + achievementTokens;

    // Add tokens to user's balance
    if (totalTokens > 0) {
      await tokenManager.addTokens(
        result.userId,
        totalTokens,
        'Endless mode completion and achievements',
        'endless',
        result.sessionId
      );
    }

    return {
      achievements: earnedAchievements,
      totalTokens
    };
  }

  async getLeaderboard(
    timeframe: 'daily' | 'weekly' | 'allTime' = 'allTime',
    maxResults: number = 10
  ): Promise<EndlessResult[]> {
    const resultsRef = collection(db, EndlessModeManager.COLLECTION_RESULTS);
    
    let q = query(resultsRef, orderBy('score', 'desc'));
    
    if (timeframe !== 'allTime') {
      const cutoff = new Date();
      if (timeframe === 'daily') {
        cutoff.setHours(0, 0, 0, 0);
      } else {
        cutoff.setDate(cutoff.getDate() - 7);
      }
      
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(cutoff)));
    }
    
    q = query(q, limit(maxResults));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as EndlessResult);
  }

  async getPersonalBest(userId: string): Promise<EndlessResult | null> {
    const resultsRef = collection(db, EndlessModeManager.COLLECTION_RESULTS);
    const q = query(
      resultsRef,
      where('userId', '==', userId),
      orderBy('score', 'desc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    return querySnapshot.docs[0].data() as EndlessResult;
  }

  async getTerminalWordLibrary(userId: string): Promise<string[]> {
    const resultsRef = collection(db, EndlessModeManager.COLLECTION_RESULTS);
    const q = query(resultsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const allTerminalWords = new Set<string>();
    
    querySnapshot.docs.forEach(doc => {
      const result = doc.data() as EndlessResult;
      result.terminalWords.forEach(word => allTerminalWords.add(word));
    });
    
    return Array.from(allTerminalWords);
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  async getLetterStats(): Promise<LetterStats[]> {
    const statsRef = collection(db, EndlessModeManager.COLLECTION_LETTER_STATS);
    const querySnapshot = await getDocs(statsRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data()
    } as LetterStats));
  }

  async suggestStartWord(): Promise<string> {
    // Get a random word from the dictionary
    // In a real implementation, you might want to:
    // 1. Choose words with common endings
    // 2. Avoid words that quickly lead to terminal positions
    // 3. Consider difficulty level
    // This is a simplified implementation
    const commonPrefixes = ['ch', 'th', 'wh', 'sh', 'br', 'tr', 'st'];
    const randomPrefix = commonPrefixes[Math.floor(Math.random() * commonPrefixes.length)];
    
    const words = await dictionaryAccess.getWordsWithPrefix(randomPrefix);
    if (words.length === 0) return 'chain'; // Fallback

    return words[Math.floor(Math.random() * words.length)];
  }

  calculateAchievements(result: EndlessResult): string[] {
    const achievements: string[] = [];

    // Chain length achievements
    if (result.chain.length >= 25) achievements.push('Chain Master');
    if (result.chain.length >= 50) achievements.push('Word Wizard');
    if (result.chain.length >= 100) achievements.push('Endless Legend');

    // Terminal word achievements
    if (result.terminalWords.length >= 1) achievements.push('Chain Terminator');
    if (result.terminalWords.length >= 5) achievements.push('Dead End Collector');

    // Letter variety achievements
    if (result.uniqueLettersUsed.length >= 20) achievements.push('Alphabet Explorer');
    if (result.uniqueLettersUsed.length >= 26) achievements.push('Alphabet Master');

    // Score achievements
    if (result.score >= 1000) achievements.push('Score Champion');
    if (result.score >= 5000) achievements.push('Score Legend');

    // Speed achievements
    if (result.duration <= 300 && result.chain.length >= 20) achievements.push('Speed Demon');

    return achievements;
  }
}

// Export singleton instance
export const endlessModeManager = new EndlessModeManager(); 