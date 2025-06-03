import { db } from '../firebase/firebase';
import { doc, updateDoc, arrayUnion, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { withRetry } from '../utils/retry';
import type { GameResult } from '../types/game';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'global' | 'daily' | 'endless' | 'versus';
  condition: string;
  reward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedAt?: string;
}

const ACHIEVEMENTS: Achievement[] = [
  // Global Achievements
  {
    id: 'wordsmith',
    name: 'Wordsmith',
    description: 'Use a 7+ letter word',
    category: 'global',
    condition: 'Use any word with 7 or more letters',
    reward: 5,
    progress: 0,
    maxProgress: 1,
    completed: false
  },
  {
    id: 'rare_collector',
    name: 'Rare Collector',
    description: 'Use Q, Z, X, or J in words',
    category: 'global',
    condition: 'Use rare letters in your words',
    reward: 10,
    progress: 0,
    maxProgress: 4,
    completed: false
  },
  {
    id: 'alphabet_explorer',
    name: 'Alphabet Explorer',
    description: 'Use 13+ unique starting letters',
    category: 'global',
    condition: 'Use different letters to start words',
    reward: 15,
    progress: 0,
    maxProgress: 13,
    completed: false
  },
  {
    id: 'vault_builder',
    name: 'Vault Builder',
    description: 'Use 250 unique words',
    category: 'global',
    condition: 'Use 250 different words across all games',
    reward: 25,
    progress: 0,
    maxProgress: 250,
    completed: false
  },
  // Daily Challenge Achievements
  {
    id: 'puzzle_rookie',
    name: 'Puzzle Rookie',
    description: 'Solve your first puzzle',
    category: 'daily',
    condition: 'Complete one daily challenge',
    reward: 5,
    progress: 0,
    maxProgress: 1,
    completed: false
  },
  {
    id: 'par_buster',
    name: 'Par Buster',
    description: 'Solve with minimum moves',
    category: 'daily',
    condition: 'Complete a daily challenge at or under par',
    reward: 10,
    progress: 0,
    maxProgress: 1,
    completed: false
  },
  {
    id: 'streak_builder',
    name: 'Streak Builder',
    description: 'Solve 7 days in a row',
    category: 'daily',
    condition: 'Complete daily challenges 7 days in a row',
    reward: 20,
    progress: 0,
    maxProgress: 7,
    completed: false
  },
  // Endless Mode Achievements
  {
    id: 'chain_master',
    name: 'Chain Master',
    description: 'Reach a 25-word chain',
    category: 'endless',
    condition: 'Create a chain of 25 words',
    reward: 15,
    progress: 0,
    maxProgress: 25,
    completed: false
  },
  {
    id: 'perfect_run',
    name: 'Perfect Run',
    description: 'No mistakes in 20+ chain',
    category: 'endless',
    condition: 'Complete a 20+ chain with no invalid attempts',
    reward: 20,
    progress: 0,
    maxProgress: 20,
    completed: false
  },
  {
    id: 'chain_terminator',
    name: 'Chain Terminator',
    description: 'Reach a valid terminal combo',
    category: 'endless',
    condition: 'End a chain with a terminal word',
    reward: 10,
    progress: 0,
    maxProgress: 1,
    completed: false
  }
];

class AchievementManager {
  private static instance: AchievementManager;
  private achievements: Achievement[] = ACHIEVEMENTS;

  private constructor() {}

  static getInstance(): AchievementManager {
    if (!this.instance) {
      this.instance = new AchievementManager();
    }
    return this.instance;
  }

  getAchievements(): Achievement[] {
    return this.achievements;
  }

  private async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const userAchievementsRef = doc(db, 'users', userId, 'achievements', 'data');
      const snapshot = await getDoc(userAchievementsRef);
      
      if (!snapshot.exists()) {
        const initialAchievements = this.achievements.map(achievement => ({
          ...achievement,
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
    achievementId: string,
    progress: number,
    completed: boolean
  ) {
    const userAchievementsRef = doc(db, 'users', userId, 'achievements', 'data');
    
    await withRetry(async () => {
      await updateDoc(userAchievementsRef, {
        [`achievements.${achievementId}.progress`]: progress,
        [`achievements.${achievementId}.completed`]: completed,
        ...(completed && { [`achievements.${achievementId}.completedAt`]: Timestamp.now() })
      });

      if (completed) {
        const achievement = this.achievements.find(a => a.id === achievementId);
        if (achievement) {
          // Update user tokens
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            tokens: arrayUnion(achievement.reward)
          });

          // Show achievement notification
          toast.success(`Achievement Unlocked: ${achievement.name}`, {
            description: `${achievement.description} (+${achievement.reward} tokens)`,
            duration: 5000
          });
        }
      }
    });
  }

  async checkGameAchievements(gameResult: GameResult, userId: string): Promise<Achievement[]> {
    const userAchievements = await this.getUserAchievements(userId);
    const unlockedAchievements: Achievement[] = [];

    // Check each achievement condition
    for (const achievement of userAchievements) {
      if (achievement.completed) continue;

      let progress = achievement.progress;
      let completed = false;

      switch (achievement.id) {
        case 'wordsmith':
          if (gameResult.chain.some(word => word.length >= 7)) {
            progress = achievement.maxProgress;
            completed = true;
          }
          break;

        case 'rare_collector':
          if (gameResult.rareLettersUsed.length > 0) {
            progress = Math.min(
              achievement.maxProgress,
              progress + gameResult.rareLettersUsed.length
            );
            completed = progress >= achievement.maxProgress;
          }
          break;

        case 'alphabet_explorer': {
          const uniqueStartLetters = new Set(gameResult.chain.map(word => word[0]));
          progress = Math.max(progress, uniqueStartLetters.size);
          completed = progress >= achievement.maxProgress;
          break;
        }

        case 'chain_master':
          if (gameResult.mode === 'endless') {
            progress = Math.max(progress, gameResult.chain.length);
            completed = progress >= achievement.maxProgress;
          }
          break;

        case 'perfect_run':
          if (gameResult.mode === 'endless' && 
              gameResult.chain.length >= 20 && 
              gameResult.invalidAttempts === 0) {
            progress = achievement.maxProgress;
            completed = true;
          }
          break;

        case 'chain_terminator':
          if (gameResult.mode === 'endless' && gameResult.terminalWords.length > 0) {
            progress = achievement.maxProgress;
            completed = true;
          }
          break;

        case 'puzzle_rookie':
          if (gameResult.mode === 'daily') {
            progress = achievement.maxProgress;
            completed = true;
          }
          break;

        case 'par_buster':
          if (gameResult.mode === 'daily' && 
              gameResult.parMoves && 
              gameResult.moveCount <= gameResult.parMoves) {
            progress = achievement.maxProgress;
            completed = true;
          }
          break;
      }

      if (progress > achievement.progress || completed) {
        await this.updateAchievement(userId, achievement.id, progress, completed);
        if (completed) {
          unlockedAchievements.push({
            ...achievement,
            progress,
            completed: true,
            completedAt: new Date().toISOString()
          });
        }
      }
    }

    return unlockedAchievements;
  }

  async getProgress(userId: string): Promise<Achievement[]> {
    return this.getUserAchievements(userId);
  }
}

export const achievementManager = AchievementManager.getInstance(); 