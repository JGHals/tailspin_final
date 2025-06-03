import { db } from '../firebase/firebase';
import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import type { 
  UserProfile, 
  Achievement, 
  GameHistory, 
  PowerUpInventory,
  UserStats 
} from '../types/user-profile';
import type { GameResult } from '../types/game';

export class UserProfileService {
  private readonly COLLECTION = 'user_profiles';
  private cache: Map<string, UserProfile> = new Map();

  private createDefaultProfile(uid: string, displayName: string, email: string, photoURL?: string): UserProfile {
    return {
      uid,
      displayName,
      email,
      photoURL,
      tokens: 0,
      powerUps: {
        hint: 3,
        flip: 3,
        bridge: 3,
        undo: 3,
        wordWarp: 1
      },
      stats: {
        gamesPlayed: 0,
        totalWordsPlayed: 0,
        totalScore: 0,
        averageScore: 0,
        highestScore: 0,
        totalRareLetters: 0,
        totalTerminalWords: 0,
        averageChainLength: 0,
        fastestCompletion: Infinity,
        averageTimePerMove: 0,
        skillRating: 1000,
        uniqueWordsPlayed: new Set(),
        underParCount: 0,
        speedPrecisionCount: 0
      },
      achievements: [],
      gameHistory: [],
      dailyStreak: {
        current: 0,
        longest: 0,
        lastPlayedDate: ''
      },
      terminalWordsDiscovered: new Set(),
      lastUpdated: new Date().toISOString(),
      friends: []
    };
  }

  async getProfile(uid: string): Promise<UserProfile | null> {
    // Check cache first
    if (this.cache.has(uid)) {
      return this.cache.get(uid)!;
    }

    // Get from Firebase
    const profileDoc = await getDoc(doc(db, this.COLLECTION, uid));
    
    if (profileDoc.exists()) {
      const data = profileDoc.data();
      // Convert Firestore data to UserProfile (handling Sets)
      const profile: UserProfile = {
        ...data,
        stats: {
          ...data.stats,
          uniqueWordsPlayed: new Set(data.stats.uniqueWordsPlayed)
        },
        terminalWordsDiscovered: new Set(data.terminalWordsDiscovered),
        friends: data.friends || [] // Ensure friends array exists
      } as UserProfile;
      
      this.cache.set(uid, profile);
      return profile;
    }

    return null;
  }

  async createProfile(uid: string, displayName: string, email: string, photoURL?: string): Promise<UserProfile> {
    const profile = this.createDefaultProfile(uid, displayName, email, photoURL);
    
    // Store in Firebase
    await setDoc(doc(db, this.COLLECTION, uid), {
      ...profile,
      stats: {
        ...profile.stats,
        uniqueWordsPlayed: Array.from(profile.stats.uniqueWordsPlayed)
      },
      terminalWordsDiscovered: Array.from(profile.terminalWordsDiscovered),
      friends: profile.friends // Store friends array as is
    });
    
    this.cache.set(uid, profile);
    return profile;
  }

  async updateProfile(profile: UserProfile): Promise<void> {
    // Update in Firebase (converting Sets to Arrays)
    await updateDoc(doc(db, this.COLLECTION, profile.uid), {
      ...profile,
      stats: {
        ...profile.stats,
        uniqueWordsPlayed: Array.from(profile.stats.uniqueWordsPlayed)
      },
      terminalWordsDiscovered: Array.from(profile.terminalWordsDiscovered),
      lastUpdated: new Date().toISOString()
    });
    
    // Update cache
    this.cache.set(profile.uid, profile);
  }

  async addGameHistory(uid: string, history: GameHistory): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) return;

    // Update game history
    profile.gameHistory.push(history);

    // Update stats
    const stats = profile.stats;
    stats.gamesPlayed++;
    stats.totalScore += history.score;
    stats.averageScore = stats.totalScore / stats.gamesPlayed;
    stats.highestScore = Math.max(stats.highestScore, history.score);
    stats.totalWordsPlayed += history.chain.length;
    history.chain.forEach(word => stats.uniqueWordsPlayed.add(word));
    stats.totalRareLetters += history.rareLettersUsed.length;
    stats.totalTerminalWords += history.terminalWords.length;
    stats.averageChainLength = stats.totalWordsPlayed / stats.gamesPlayed;
    stats.fastestCompletion = Math.min(stats.fastestCompletion, history.duration);
    stats.averageTimePerMove = history.duration / history.chain.length;

    // Update terminal words discovered
    history.terminalWords.forEach(word => profile.terminalWordsDiscovered.add(word));

    // Update daily streak if applicable
    if (history.mode === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const lastPlayed = new Date(profile.dailyStreak.lastPlayedDate);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastPlayed.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
        profile.dailyStreak.current++;
        profile.dailyStreak.longest = Math.max(profile.dailyStreak.longest, profile.dailyStreak.current);
      } else if (lastPlayed.toISOString().split('T')[0] !== today) {
        profile.dailyStreak.current = 1;
      }
      profile.dailyStreak.lastPlayedDate = today;
    }

    await this.updateProfile(profile);
  }

  async updateTokens(uid: string, amount: number): Promise<number> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const profileRef = doc(db, this.COLLECTION, uid);
        const profileDoc = await transaction.get(profileRef);
        
        if (!profileDoc.exists()) {
          throw new Error('Profile not found');
        }

        const currentTokens = profileDoc.data().tokens || 0;
        const newTokens = Math.max(0, currentTokens + amount); // Prevent negative tokens
        
        transaction.update(profileRef, { 
          tokens: newTokens,
          lastUpdated: new Date().toISOString()
        });

        // Update cache
        const profile = this.cache.get(uid);
        if (profile) {
          profile.tokens = newTokens;
          this.cache.set(uid, profile);
        }

        return newTokens;
      });

      return result;
    } catch (error) {
      console.error('Error updating tokens:', error);
      throw error;
    }
  }

  async usePowerUp(uid: string, type: keyof PowerUpInventory): Promise<boolean> {
    const profile = await this.getProfile(uid);
    if (!profile || profile.powerUps[type] <= 0) return false;

    profile.powerUps[type]--;
    await this.updateProfile(profile);
    return true;
  }

  async addPowerUp(uid: string, type: keyof PowerUpInventory, amount: number = 1): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) return;

    profile.powerUps[type] += amount;
    await this.updateProfile(profile);
  }

  async updateAchievement(uid: string, achievement: Achievement): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) return;

    const existingIndex = profile.achievements.findIndex(a => a.id === achievement.id);
    if (existingIndex >= 0) {
      profile.achievements[existingIndex] = achievement;
    } else {
      profile.achievements.push(achievement);
    }

    // If achievement was just completed, award tokens
    if (achievement.completed && !profile.achievements[existingIndex]?.completed) {
      profile.tokens += achievement.reward;
    }

    await this.updateProfile(profile);
  }

  async updateGameStats(userId: string, gameResult: GameResult): Promise<void> {
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return;

      const stats = userDoc.data().stats || {};
      const uniqueWordsPlayed = new Set([...(stats.uniqueWordsPlayed || []), ...gameResult.chain]);

      // Calculate if this game was under par (for daily mode)
      const isUnderPar = gameResult.mode === 'daily' && 
        gameResult.parMoves && 
        gameResult.moveCount < gameResult.parMoves;

      // Calculate if this was a speed-precision game
      const isSpeedPrecision = gameResult.mode === 'daily' && 
        gameResult.invalidAttempts === 0 && 
        gameResult.duration < 120;

      const newStats = {
        'stats.gamesPlayed': increment(1),
        'stats.totalWordsPlayed': increment(gameResult.chain.length),
        'stats.totalScore': increment(gameResult.score.total),
        'stats.averageScore': gameResult.score.total / (stats.gamesPlayed + 1),
        'stats.highestScore': Math.max(gameResult.score.total, stats.highestScore || 0),
        'stats.totalRareLetters': increment(gameResult.rareLettersUsed.length),
        'stats.totalTerminalWords': increment(gameResult.terminalWords.length),
        'stats.averageChainLength': gameResult.chain.length / (stats.gamesPlayed + 1),
        'stats.fastestCompletion': Math.min(gameResult.duration, stats.fastestCompletion || Infinity),
        'stats.averageTimePerMove': gameResult.duration / gameResult.chain.length,
        'stats.uniqueWordsPlayed': Array.from(uniqueWordsPlayed),
        'stats.underParCount': increment(isUnderPar ? 1 : 0),
        'stats.speedPrecisionCount': increment(isSpeedPrecision ? 1 : 0)
      };

      transaction.update(userRef, newStats);
    });
  }

  async addFriend(uid: string, friendId: string): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) throw new Error('Profile not found');

    // Check if already friends
    if (profile.friends.includes(friendId)) return;

    // Add friend
    await updateDoc(doc(db, this.COLLECTION, uid), {
      friends: [...profile.friends, friendId]
    });

    // Update cache
    profile.friends.push(friendId);
    this.cache.set(uid, profile);
  }

  async removeFriend(uid: string, friendId: string): Promise<void> {
    const profile = await this.getProfile(uid);
    if (!profile) throw new Error('Profile not found');

    // Remove friend
    const updatedFriends = profile.friends.filter(id => id !== friendId);
    await updateDoc(doc(db, this.COLLECTION, uid), {
      friends: updatedFriends
    });

    // Update cache
    profile.friends = updatedFriends;
    this.cache.set(uid, profile);
  }

  async getFriends(uid: string): Promise<UserProfile[]> {
    const profile = await this.getProfile(uid);
    if (!profile) throw new Error('Profile not found');

    // Get all friend profiles
    const friendProfiles = await Promise.all(
      profile.friends.map(friendId => this.getProfile(friendId))
    );

    // Filter out any null profiles
    return friendProfiles.filter((profile): profile is UserProfile => profile !== null);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private getInitialStats(): UserStats {
    return {
      gamesPlayed: 0,
      totalWordsPlayed: 0,
      totalScore: 0,
      averageScore: 0,
      highestScore: 0,
      totalRareLetters: 0,
      totalTerminalWords: 0,
      averageChainLength: 0,
      fastestCompletion: Infinity,
      averageTimePerMove: 0,
      skillRating: 1000,
      uniqueWordsPlayed: new Set(),
      underParCount: 0,
      speedPrecisionCount: 0
    };
  }

  private updateStatsFromHistory(stats: UserStats, history: GameHistory): void {
    stats.totalWordsPlayed += history.chain.length;
    stats.totalScore += history.score;
    stats.averageScore = stats.totalScore / stats.gamesPlayed;
    stats.highestScore = Math.max(stats.highestScore, history.score);
    stats.totalRareLetters += history.rareLettersUsed.length;
    stats.totalTerminalWords += history.terminalWords.length;
    stats.averageChainLength = (stats.averageChainLength * (stats.gamesPlayed - 1) + history.chain.length) / stats.gamesPlayed;
    stats.fastestCompletion = Math.min(stats.fastestCompletion, history.duration);
    stats.averageTimePerMove = history.duration / history.chain.length;
    history.chain.forEach(word => stats.uniqueWordsPlayed.add(word));
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService(); 