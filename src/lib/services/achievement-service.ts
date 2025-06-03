import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import { withRetry } from '../utils/retry';
import type { Achievement, UserProfile, GameHistory } from '../types/user-profile';
import type { GameResult } from '../types/game';
import { userProfileService } from '../services/user-profile-service';
import { toast } from 'sonner';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'global' | 'daily' | 'endless' | 'versus';
  condition: string;
  reward: number;
  maxProgress: number;
  icon?: string;
  checkProgress: (result: GameResult, profile: UserProfile, currentGame?: GameHistory) => number;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  // Global Achievements
  {
    id: 'wordsmith',
    name: 'Wordsmith',
    description: 'Use a 7+ letter word',
    category: 'global',
    condition: 'Use any word with 7 or more letters',
    reward: 5,
    maxProgress: 1,
    icon: '📚',
    checkProgress: (result) => 
      result.chain.some(word => word.length >= 7) ? 1 : 0
  },
  {
    id: 'rare_collector',
    name: 'Rare Collector',
    description: 'Use Q, Z, X, or J in words',
    category: 'global',
    condition: 'Use rare letters in your words',
    reward: 10,
    maxProgress: 4,
    icon: '💎',
    checkProgress: (result) => 
      Math.min(4, result.rareLettersUsed.length)
  },
  {
    id: 'alphabet_explorer',
    name: 'Alphabet Explorer',
    description: 'Use 13+ unique starting letters',
    category: 'global',
    condition: 'Use different letters to start words',
    reward: 15,
    maxProgress: 13,
    icon: '🔤',
    checkProgress: (result) => {
      const startLetters = new Set(result.chain.map(word => word[0].toUpperCase()));
      return startLetters.size;
    }
  },
  {
    id: 'vault_builder',
    name: 'Vault Builder',
    description: 'Use 250 unique words',
    category: 'global',
    condition: 'Use 250 different words across all games',
    reward: 25,
    maxProgress: 250,
    icon: '🏛️',
    checkProgress: (_, profile) => profile.stats.uniqueWordsPlayed.size
  },
  // Daily Challenge Achievements
  {
    id: 'puzzle_rookie',
    name: 'Puzzle Rookie',
    description: 'Solve your first daily puzzle',
    category: 'daily',
    condition: 'Complete one daily challenge',
    reward: 5,
    maxProgress: 1,
    icon: '🎯',
    checkProgress: (result) => 
      result.mode === 'daily' ? 1 : 0
  },
  {
    id: 'par_buster',
    name: 'Par Buster',
    description: 'Solve with minimum moves',
    category: 'daily',
    condition: 'Complete a daily challenge at or under par',
    reward: 10,
    maxProgress: 1,
    icon: '⛳',
    checkProgress: (result) => 
      result.mode === 'daily' && 
      result.parMoves && 
      result.moveCount <= result.parMoves ? 1 : 0
  },
  {
    id: 'streak_builder',
    name: 'Streak Builder',
    description: 'Solve 7 days in a row',
    category: 'daily',
    condition: 'Complete daily challenges 7 days in a row',
    reward: 20,
    maxProgress: 7,
    icon: '🔥',
    checkProgress: (_, profile) => profile.dailyStreak.current
  },
  {
    id: 'under_par',
    name: 'Under Par',
    description: 'Complete a daily challenge in fewer moves than par',
    category: 'daily',
    condition: 'Beat the par score in a daily challenge',
    reward: 15,
    maxProgress: 1,
    icon: '🎯',
    checkProgress: (result) => 
      result.mode === 'daily' && 
      result.parMoves && 
      result.moveCount < result.parMoves ? 1 : 0
  },
  {
    id: 'perfect_line',
    name: 'Perfect Line',
    description: 'Complete a daily challenge with no invalid attempts or hints',
    category: 'daily',
    condition: 'Complete without mistakes or hints',
    reward: 20,
    maxProgress: 1,
    icon: '✨',
    checkProgress: (result) => 
      result.mode === 'daily' && 
      result.invalidAttempts === 0 && 
      result.powerUpsUsed.length === 0 ? 1 : 0
  },
  {
    id: 'efficiency_expert',
    name: 'Efficiency Expert',
    description: 'Complete 5 daily challenges under par',
    category: 'daily',
    condition: 'Beat par score multiple times',
    reward: 25,
    maxProgress: 5,
    icon: '⚡',
    checkProgress: (result, profile) => {
      if (result.mode !== 'daily') return profile.stats.underParCount || 0;
      const isUnderPar = result.parMoves && result.moveCount < result.parMoves;
      return isUnderPar ? (profile.stats.underParCount || 0) + 1 : profile.stats.underParCount || 0;
    }
  },
  {
    id: 'optimization_master',
    name: 'Optimization Master',
    description: 'Complete a daily challenge with all moves under 5 seconds',
    category: 'daily',
    condition: 'All moves quick and accurate',
    reward: 30,
    maxProgress: 1,
    icon: '⚡',
    checkProgress: (result) => {
      if (result.mode !== 'daily') return 0;
      const allMovesQuick = Array.from(result.wordTimings?.values() || [])
        .every(time => time < 5000);
      return allMovesQuick ? 1 : 0;
    }
  },
  {
    id: 'speed_and_precision',
    name: 'Speed AND Precision',
    description: 'Complete 3 daily challenges under 2 minutes with no mistakes',
    category: 'daily',
    condition: 'Fast and accurate completions',
    reward: 35,
    maxProgress: 3,
    icon: '🎯',
    checkProgress: (result, profile) => {
      if (result.mode !== 'daily') return profile.stats.speedPrecisionCount || 0;
      const isPerfect = result.invalidAttempts === 0 && result.duration < 120;
      return isPerfect ? (profile.stats.speedPrecisionCount || 0) + 1 : profile.stats.speedPrecisionCount || 0;
    }
  },
  // Endless Mode Achievements
  {
    id: 'chain_master',
    name: 'Chain Master',
    description: 'Reach a 25-word chain',
    category: 'endless',
    condition: 'Create a chain of 25 words',
    reward: 15,
    maxProgress: 25,
    icon: '⛓️',
    checkProgress: (result) => 
      result.mode === 'endless' ? result.chain.length : 0
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    description: 'No mistakes in 20+ chain',
    category: 'endless',
    condition: 'Complete a 20+ chain with no invalid attempts',
    reward: 20,
    maxProgress: 1,
    icon: '✨',
    checkProgress: (result) => 
      result.mode === 'endless' && 
      result.chain.length >= 20 && 
      result.invalidAttempts === 0 ? 1 : 0
  },
  {
    id: 'chain_terminator',
    name: 'Chain Terminator',
    description: 'End with a terminal word',
    category: 'endless',
    condition: 'End a chain with a terminal word',
    reward: 10,
    maxProgress: 1,
    icon: '🎯',
    checkProgress: (result) => 
      result.mode === 'endless' && 
      result.terminalWords.length > 0 ? 1 : 0
  },
  {
    id: 'branching_master',
    name: 'Branching Master',
    description: 'Create a chain with average branching factor above 10',
    category: 'endless',
    condition: 'Maintain high branching possibilities',
    reward: 20,
    maxProgress: 1,
    icon: '🌳',
    checkProgress: (result) => {
      if (result.mode !== 'endless') return 0;
      const avgBranching = result.pathAnalysis?.averageBranchingFactor || 0;
      return avgBranching > 10 ? 1 : 0;
    }
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Use 20 unique letters in a single chain',
    category: 'endless',
    condition: 'High letter variety in one game',
    reward: 25,
    maxProgress: 1,
    icon: '🔍',
    checkProgress: (result) => {
      if (result.mode !== 'endless') return 0;
      const uniqueLetters = new Set(result.chain.join('').toUpperCase());
      return uniqueLetters.size >= 20 ? 1 : 0;
    }
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a 15+ chain with all moves under 3 seconds',
    category: 'endless',
    condition: 'Fast moves in long chain',
    reward: 30,
    maxProgress: 1,
    icon: '⚡',
    checkProgress: (result) => {
      if (result.mode !== 'endless' || result.chain.length < 15) return 0;
      const allMovesQuick = Array.from(result.wordTimings?.values() || [])
        .every(time => time < 3000);
      return allMovesQuick ? 1 : 0;
    }
  },
  {
    id: 'recovery_expert',
    name: 'Recovery Expert',
    description: 'Continue a chain after 3 terminal words in one game',
    category: 'endless',
    condition: 'Recover from multiple dead ends',
    reward: 25,
    maxProgress: 1,
    icon: '🔄',
    checkProgress: (result) => {
      if (result.mode !== 'endless') return 0;
      return result.terminalWords.length >= 3 ? 1 : 0;
    }
  }
];

class AchievementService {
  private static instance: AchievementService;
  private readonly USER_ACHIEVEMENTS_COLLECTION = 'achievements';
  private achievements: AchievementDefinition[] = ACHIEVEMENTS;

  private constructor() {}

  static getInstance(): AchievementService {
    if (!this.instance) {
      this.instance = new AchievementService();
    }
    return this.instance;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const userAchievementsRef = doc(db, 'users', userId, this.USER_ACHIEVEMENTS_COLLECTION, 'data');
      const snapshot = await withRetry(() => getDoc(userAchievementsRef));

      if (!snapshot.exists()) {
        // Initialize achievements for new user
        const initialAchievements = this.achievements.map(def => ({
          ...def,
          progress: 0,
          completed: false
        }));
        await setDoc(userAchievementsRef, { achievements: initialAchievements });
        return initialAchievements;
      }

      return snapshot.data().achievements;
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  private async updateAchievement(
    userId: string, 
    achievement: Achievement,
    newProgress: number,
    completed: boolean
  ): Promise<void> {
    const userAchievementsRef = doc(db, 'users', userId, this.USER_ACHIEVEMENTS_COLLECTION, 'data');
    
    await withRetry(async () => {
      // Update achievement progress
      await updateDoc(userAchievementsRef, {
        [`achievements.${achievement.id}.progress`]: newProgress,
        [`achievements.${achievement.id}.completed`]: completed,
        ...(completed && { 
          [`achievements.${achievement.id}.completedAt`]: Timestamp.now() 
        })
      });

      // If newly completed, award tokens and show notification
      if (completed && !achievement.completed) {
        // Update user tokens
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          tokens: arrayUnion(achievement.reward)
        });

        // Show achievement notification using toast
        toast.success(`Achievement Unlocked: ${achievement.name}`, {
          description: `${achievement.description} (+${achievement.reward} tokens)`,
          duration: 5000,
          icon: achievement.icon
        });
      }
    });
  }

  async checkGameAchievements(gameResult: GameResult, profile: UserProfile): Promise<Achievement[]> {
    const userAchievements = await this.getUserAchievements(profile.uid);
    const unlockedAchievements: Achievement[] = [];

    for (const achievement of userAchievements) {
      if (achievement.completed) continue;

      const definition = this.achievements.find(def => def.id === achievement.id);
      if (!definition) continue;

      const newProgress = definition.checkProgress(gameResult, profile);
      if (newProgress > achievement.progress) {
        const completed = newProgress >= achievement.maxProgress;
        
        await this.updateAchievement(
          profile.uid,
          achievement,
          newProgress,
          completed
        );

        if (completed) {
          unlockedAchievements.push({
            ...achievement,
            progress: newProgress,
            completed: true,
            completedAt: new Date().toISOString()
          });
        }
      }
    }

    return unlockedAchievements;
  }

  async checkHistoryAchievements(userId: string, currentGame?: GameHistory): Promise<Achievement[]> {
    const profile = await userProfileService.getProfile(userId);
    if (!profile) return [];

    const userAchievements = await this.getUserAchievements(userId);
    const unlockedAchievements: Achievement[] = [];

    for (const achievement of userAchievements) {
      if (achievement.completed) continue;

      const definition = this.achievements.find(def => def.id === achievement.id);
      if (!definition) continue;

      // Convert GameHistory to GameResult format for consistency
      const gameResult: GameResult = currentGame ? {
        mode: currentGame.mode,
        chain: currentGame.chain,
        score: {
          total: currentGame.score,
          wordScores: {},
          multiplier: 1,
          terminalBonus: 0,
          dailyBonus: 0,
          penalties: 0
        },
        moveCount: currentGame.chain.length - 1,
        rareLettersUsed: currentGame.rareLettersUsed,
        terminalWords: currentGame.terminalWords,
        invalidAttempts: 0, // Not tracked in history
        parMoves: undefined, // Not tracked in history
        duration: currentGame.duration,
        powerUpsUsed: [], // Not tracked in history
        date: currentGame.date
      } : {
        mode: 'endless',
        chain: [],
        score: {
          total: 0,
          wordScores: {},
          multiplier: 1,
          terminalBonus: 0,
          dailyBonus: 0,
          penalties: 0
        },
        moveCount: 0,
        rareLettersUsed: [],
        terminalWords: [],
        invalidAttempts: 0,
        parMoves: undefined,
        duration: 0,
        powerUpsUsed: [],
        date: new Date().toISOString()
      };

      const newProgress = definition.checkProgress(gameResult, profile, currentGame);
      if (newProgress > achievement.progress) {
        const completed = newProgress >= achievement.maxProgress;
        
        await this.updateAchievement(
          userId,
          achievement,
          newProgress,
          completed
        );

        if (completed) {
          unlockedAchievements.push({
            ...achievement,
            progress: newProgress,
            completed: true,
            completedAt: new Date().toISOString()
          });
        }
      }
    }

    return unlockedAchievements;
  }

  getAchievementDefinitions(): AchievementDefinition[] {
    return this.achievements;
  }

  // Helper method for getting achievement stats (used by useAchievements hook)
  async getAchievementStats(userId: string) {
    const achievements = await this.getUserAchievements(userId);
    return {
      total: achievements.length,
      completed: achievements.filter(a => a.completed).length,
      inProgress: achievements.filter(a => !a.completed && a.progress > 0).length,
      totalTokens: achievements.reduce((sum, a) => sum + (a.completed ? a.reward : 0), 0)
    };
  }
}

// Export singleton instance
export const achievementService = AchievementService.getInstance(); 