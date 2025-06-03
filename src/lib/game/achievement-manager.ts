import type { Achievement, UserProfile } from '../types/user-profile';
import type { GameResult } from '../types/game';
import { db } from '../firebase/firebase';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';

class AchievementManager {
  private static instance: AchievementManager;
  private achievements: Achievement[] = [];

  private constructor() {
    this.initializeAchievements();
  }

  static getInstance(): AchievementManager {
    if (!this.instance) {
      this.instance = new AchievementManager();
    }
    return this.instance;
  }

  private initializeAchievements() {
    // Global Achievements
    this.achievements = [
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
      // Daily Challenge Achievements
      {
        id: 'puzzle_rookie',
        name: 'Puzzle Rookie',
        description: 'Solve your first daily puzzle',
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
      // Endless Mode Achievements
      {
        id: 'chain_master',
        name: 'Chain Master',
        description: 'Reach a 25-word chain',
        category: 'endless',
        condition: 'Create a chain of 25 words',
        reward: 20,
        progress: 0,
        maxProgress: 1,
        completed: false
      },
      {
        id: 'terminal_discoverer',
        name: 'Terminal Discoverer',
        description: 'Find your first terminal word',
        category: 'endless',
        condition: 'Find a word that no other word can follow',
        reward: 10,
        progress: 0,
        maxProgress: 1,
        completed: false
      }
    ];
  }

  async checkAchievements(gameResult: GameResult, profile: UserProfile): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];
    const userAchievements = new Map(profile.achievements.map(a => [a.id, a]));

    // Check each achievement
    for (const achievement of this.achievements) {
      // Skip if already completed
      const userAchievement = userAchievements.get(achievement.id);
      if (userAchievement?.completed) continue;

      const progress = this.calculateProgress(achievement, gameResult, profile);
      if (progress > (userAchievement?.progress || 0)) {
        const updatedAchievement = {
          ...achievement,
          progress,
          completed: progress >= achievement.maxProgress,
          completedAt: progress >= achievement.maxProgress ? new Date().toISOString() : undefined
        };

        if (updatedAchievement.completed) {
          unlockedAchievements.push(updatedAchievement);
          await this.awardAchievement(profile.uid, updatedAchievement);
        }
      }
    }

    return unlockedAchievements;
  }

  private calculateProgress(achievement: Achievement, gameResult: GameResult, profile: UserProfile): number {
    switch (achievement.id) {
      case 'wordsmith':
        return gameResult.chain.some(word => word.length >= 7) ? 1 : 0;
      
      case 'rare_collector':
        return new Set(
          gameResult.chain
            .join('')
            .toUpperCase()
            .match(/[QZXJ]/g) || []
        ).size;
      
      case 'alphabet_explorer':
        return new Set(gameResult.chain.map((word: string) => word[0])).size;
      
      case 'puzzle_rookie':
        return gameResult.mode === 'daily' ? 1 : 0;
      
      case 'par_buster':
        return (gameResult.mode === 'daily' && 
                gameResult.moveCount <= (gameResult.parMoves || Infinity)) ? 1 : 0;
      
      case 'chain_master':
        return gameResult.chain.length >= 25 ? 1 : 0;
      
      case 'terminal_discoverer':
        return gameResult.terminalWords.length > 0 ? 1 : 0;
      
      default:
        return 0;
    }
  }

  private async awardAchievement(userId: string, achievement: Achievement) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      achievements: arrayUnion(achievement),
      tokens: increment(achievement.reward)
    });
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }
}

export const achievementManager = AchievementManager.getInstance(); 