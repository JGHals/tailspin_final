import type { Achievement, UserProfile, GameHistory } from '../types/user-profile';
import { userProfileService } from '../services/user-profile-service';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: 'global' | 'daily' | 'endless' | 'versus';
  condition: string;
  reward: number;
  maxProgress: number;
  checkProgress: (profile: UserProfile, currentGame?: GameHistory) => number;
}

export class AchievementSystem {
  private achievements: AchievementDefinition[] = [
    // Global Achievements
    {
      id: 'wordsmith',
      name: 'Wordsmith',
      description: 'Use a 7+ letter word',
      category: 'global',
      condition: 'Use any word with 7 or more letters',
      reward: 5,
      maxProgress: 1,
      checkProgress: (profile, currentGame) => {
        // Check current game first
        if (currentGame?.longestWord && currentGame.longestWord.length >= 7) {
          return 1;
        }
        // Check game history if not found in current game
        return profile.gameHistory.some(h => h.longestWord && h.longestWord.length >= 7) ? 1 : 0;
      }
    },
    {
      id: 'rare_collector',
      name: 'Rare Collector',
      description: 'Use Q, Z, X, or J',
      category: 'global',
      condition: 'Use any word containing Q, Z, X, or J',
      reward: 10,
      maxProgress: 4,
      checkProgress: (profile, currentGame) => {
        const rareLetters = new Set(['Q', 'Z', 'X', 'J']);
        const usedRare = new Set<string>();
        
        // Check current game
        if (currentGame) {
          currentGame.rareLettersUsed.forEach(letter => usedRare.add(letter));
        }
        
        // Check history
        profile.gameHistory.forEach(history => {
          history.rareLettersUsed.forEach(letter => usedRare.add(letter));
        });
        
        return Array.from(usedRare).filter(letter => rareLetters.has(letter)).length;
      }
    },
    {
      id: 'alphabet_explorer',
      name: 'Alphabet Explorer',
      description: 'Use 13+ unique starting letters',
      category: 'global',
      condition: 'Start words with 13 different letters',
      reward: 15,
      maxProgress: 13,
      checkProgress: (profile, currentGame) => {
        const startLetters = new Set<string>();
        
        // Check current game
        if (currentGame) {
          currentGame.chain.forEach(word => startLetters.add(word[0].toUpperCase()));
        }
        
        // Check history
        profile.gameHistory.forEach(history => {
          history.chain.forEach(word => startLetters.add(word[0].toUpperCase()));
        });
        
        return startLetters.size;
      }
    },
    {
      id: 'vault_builder',
      name: 'Vault Builder',
      description: '250 unique words used',
      category: 'global',
      condition: 'Use 250 different words across all games',
      reward: 25,
      maxProgress: 250,
      checkProgress: (profile) => profile.stats.uniqueWordsPlayed.size
    },

    // Daily Challenge Achievements
    {
      id: 'puzzle_rookie',
      name: 'Puzzle Rookie',
      description: 'Solve your first puzzle',
      category: 'daily',
      condition: 'Complete one daily challenge',
      reward: 5,
      maxProgress: 1,
      checkProgress: (profile) => 
        profile.gameHistory.filter(h => h.mode === 'daily').length > 0 ? 1 : 0
    },
    {
      id: 'streak_builder',
      name: 'Streak Builder',
      description: 'Solve 7 days in a row',
      category: 'daily',
      condition: 'Complete daily challenges 7 days in a row',
      reward: 20,
      maxProgress: 7,
      checkProgress: (profile) => profile.dailyStreak.current
    },
    {
      id: 'no_help_needed',
      name: 'No Help Needed',
      description: 'Solve 5 without hints',
      category: 'daily',
      condition: 'Complete 5 daily challenges without using hints',
      reward: 15,
      maxProgress: 5,
      checkProgress: (profile) => {
        return profile.gameHistory
          .filter(h => h.mode === 'daily' && h.hintsUsed === 0)
          .length;
      }
    },

    // Endless Mode Achievements
    {
      id: 'chain_master',
      name: 'Chain Master',
      description: 'Reach a 25-word chain',
      category: 'endless',
      condition: 'Create a chain of 25 words in Endless mode',
      reward: 20,
      maxProgress: 1,
      checkProgress: (profile, currentGame) => {
        if (currentGame?.mode === 'endless' && currentGame.chain.length >= 25) return 1;
        return profile.gameHistory.some(h => 
          h.mode === 'endless' && h.chain.length >= 25
        ) ? 1 : 0;
      }
    },
    {
      id: 'dead_end_collector',
      name: 'Dead End Collector',
      description: 'Log all 2-letter terminal endings',
      category: 'endless',
      condition: 'Discover terminal words with different endings',
      reward: 30,
      maxProgress: 50, // Approximate number of possible terminal endings
      checkProgress: (profile) => profile.terminalWordsDiscovered.size
    }
  ];

  async checkAchievements(uid: string, currentGame?: GameHistory): Promise<Achievement[]> {
    const profile = await userProfileService.getProfile(uid);
    if (!profile) return [];

    const updatedAchievements: Achievement[] = [];

    for (const definition of this.achievements) {
      // Find existing achievement or create new one
      let achievement = profile.achievements.find(a => a.id === definition.id) || {
        ...definition,
        progress: 0,
        completed: false
      };

      // Check progress
      const newProgress = definition.checkProgress(profile, currentGame);
      
      if (newProgress > achievement.progress) {
        achievement.progress = newProgress;
        
        // Check if newly completed
        if (newProgress >= definition.maxProgress && !achievement.completed) {
          achievement.completed = true;
          achievement.completedAt = new Date().toISOString();
        }

        // Update achievement in profile
        await userProfileService.updateAchievement(uid, achievement);
        updatedAchievements.push(achievement);
      }
    }

    return updatedAchievements;
  }

  getAchievementDefinitions(): AchievementDefinition[] {
    return [...this.achievements];
  }
}

// Export singleton instance
export const achievementSystem = new AchievementSystem(); 