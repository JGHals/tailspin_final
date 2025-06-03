import { AchievementSystem, achievementSystem } from '../achievement-system';
import { userProfileService } from '../../services/user-profile-service';
import type { Achievement, UserProfile, GameHistory } from '../../types/user-profile';
import type { GameResult } from '../../types/game';
import { mockWordList, mockRareLetterWords, mockTerminalWords } from '../../test-utils/mock-data';

// Mock dependencies
jest.mock('../../services/user-profile-service', () => ({
  userProfileService: {
    getProfile: jest.fn(),
    updateAchievement: jest.fn(),
    updateProfile: jest.fn()
  }
}));

describe('AchievementSystem', () => {
  const mockUserId = 'test-user-123';
  let system: AchievementSystem;

  // Mock profile data
  const createMockProfile = (overrides = {}): UserProfile => ({
    uid: mockUserId,
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: '',
    tokens: 100,
    achievements: [],
    gameHistory: [],
    powerUps: {
      flip: 0,
      hint: 0,
      bridge: 0,
      undo: 0,
      wordWarp: 0
    },
    dailyStreak: {
      current: 0,
      longest: 0,
      lastPlayedDate: ''
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
      fastestCompletion: 0,
      averageTimePerMove: 0,
      skillRating: 0,
      uniqueWordsPlayed: new Set(),
      underParCount: 0,
      speedPrecisionCount: 0
    },
    terminalWordsDiscovered: new Set(),
    lastUpdated: new Date().toISOString(),
    friends: [],
    ...overrides
  });

  // Mock game result data
  const createMockGameResult = (overrides = {}): GameResult => ({
    userId: mockUserId,
    username: 'Test User',
    mode: 'endless',
    chain: ['puzzle', 'lethal', 'alliance'],
    score: {
      total: 100,
      wordScores: {},
      multiplier: 1,
      terminalBonus: 0,
      dailyBonus: 0,
      penalties: 0
    },
    moveCount: 2,
    rareLettersUsed: [],
    terminalWords: [],
    invalidAttempts: 0,
    duration: 120,
    powerUpsUsed: [],
    date: new Date().toISOString(),
    wordTimings: new Map(),
    ...overrides
  });

  // Mock game history data
  const createMockGameHistory = (overrides = {}): GameHistory => ({
    id: 'game-123',
    mode: 'endless',
    date: new Date().toISOString(),
    score: 100,
    chain: ['puzzle', 'lethal', 'alliance'],
    duration: 120,
    hintsUsed: 0,
    uniqueLettersUsed: ['p', 'u', 'z', 'l', 'e'],
    rareLettersUsed: [],
    longestWord: 'alliance',
    terminalWords: [],
    ...overrides
  });

  beforeEach(() => {
    system = new AchievementSystem();
    jest.clearAllMocks();
  });

  describe('Achievement Progress Tracking', () => {
    describe('Global Achievements', () => {
      it('should track wordsmith achievement (7+ letter word)', async () => {
        const profile = createMockProfile();
        const gameHistory = createMockGameHistory({
          chain: ['puzzle', 'lethal', 'xylophone'],
          longestWord: 'xylophone'
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const wordsmith = achievements.find(a => a.id === 'wordsmith');
        expect(wordsmith).toBeDefined();
        expect(wordsmith?.completed).toBe(true);
        expect(userProfileService.updateAchievement).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ id: 'wordsmith', completed: true })
        );
      });

      it('should track rare letter collector achievement', async () => {
        const profile = createMockProfile();
        const gameHistory = createMockGameHistory({
          chain: ['quick', 'jazz', 'xylophone'],
          rareLettersUsed: ['Q', 'Z', 'X']
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const collector = achievements.find(a => a.id === 'rare_collector');
        expect(collector).toBeDefined();
        expect(collector?.progress).toBe(3);
        expect(userProfileService.updateAchievement).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ id: 'rare_collector', progress: 3 })
        );
      });

      it('should track alphabet explorer achievement', async () => {
        const profile = createMockProfile();
        const gameHistory = createMockGameHistory({
          chain: ['puzzle', 'lethal', 'alliance', 'test', 'best', 'rest', 'quest',
                 'zeal', 'xylophone', 'jazz', 'quick', 'wizard', 'stellar'],
          uniqueLettersUsed: Array.from(new Set('puzzlelethalalliancetestbestrestquestzealxylophonequickwizardstellar'))
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const explorer = achievements.find(a => a.id === 'alphabet_explorer');
        expect(explorer).toBeDefined();
        expect(explorer?.progress).toBeGreaterThanOrEqual(13);
        expect(userProfileService.updateAchievement).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ id: 'alphabet_explorer' })
        );
      });
    });

    describe('Daily Challenge Achievements', () => {
      it('should track puzzle rookie achievement', async () => {
        const profile = createMockProfile();
        const gameHistory = createMockGameHistory({
          mode: 'daily',
          chain: ['puzzle', 'lethal'],
          score: 100
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const rookie = achievements.find(a => a.id === 'puzzle_rookie');
        expect(rookie).toBeDefined();
        expect(rookie?.completed).toBe(true);
      });

      it('should track streak builder achievement', async () => {
        const profile = createMockProfile({
          dailyStreak: {
            current: 6,
            longest: 6,
            lastPlayedDate: new Date().toISOString().split('T')[0]
          }
        });
        const gameHistory = createMockGameHistory({ mode: 'daily' });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const streakBuilder = achievements.find(a => a.id === 'streak_builder');
        expect(streakBuilder).toBeDefined();
        expect(streakBuilder?.progress).toBe(7);
        expect(streakBuilder?.completed).toBe(true);
      });

      it('should track no help needed achievement', async () => {
        const profile = createMockProfile({
          gameHistory: Array(4).fill(createMockGameHistory({
            mode: 'daily',
            hintsUsed: 0
          }))
        });
        const gameHistory = createMockGameHistory({
          mode: 'daily',
          hintsUsed: 0
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const noHelp = achievements.find(a => a.id === 'no_help_needed');
        expect(noHelp).toBeDefined();
        expect(noHelp?.progress).toBe(5);
        expect(noHelp?.completed).toBe(true);
      });
    });

    describe('Endless Mode Achievements', () => {
      it('should track chain master achievement', async () => {
        const profile = createMockProfile();
        const gameHistory = createMockGameHistory({
          mode: 'endless',
          chain: Array(25).fill('word')
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const chainMaster = achievements.find(a => a.id === 'chain_master');
        expect(chainMaster).toBeDefined();
        expect(chainMaster?.completed).toBe(true);
      });

      it('should track dead end collector achievement', async () => {
        const profile = createMockProfile({
          terminalWordsDiscovered: new Set(mockTerminalWords)
        });
        const gameHistory = createMockGameHistory({
          mode: 'endless',
          terminalWords: ['jazz']
        });

        const achievements = await system.checkAchievements(mockUserId, gameHistory);
        
        const collector = achievements.find(a => a.id === 'dead_end_collector');
        expect(collector).toBeDefined();
        expect(collector?.progress).toBe(mockTerminalWords.length);
      });
    });
  });

  describe('Achievement Persistence', () => {
    it('should not duplicate completed achievements', async () => {
      const profile = createMockProfile({
        achievements: [{
          id: 'wordsmith',
          name: 'Wordsmith',
          description: 'Use a word with 7+ letters',
          category: 'global',
          condition: 'Use a word with 7 or more letters',
          reward: 10,
          progress: 1,
          maxProgress: 1,
          completed: true,
          completedAt: new Date().toISOString()
        }]
      });
      (userProfileService.getProfile as jest.Mock).mockResolvedValue(profile);

      const gameHistory = createMockGameHistory({
        chain: ['xylophone'],
        longestWord: 'xylophone'
      });

      const achievements = await system.checkAchievements(mockUserId, gameHistory);
      expect(achievements).toHaveLength(0);
      expect(userProfileService.updateAchievement).not.toHaveBeenCalled();
    });

    it('should update progress on incomplete achievements', async () => {
      const profile = createMockProfile({
        achievements: [{
          id: 'rare_collector',
          name: 'Rare Letter Collector',
          description: 'Use 3 rare letters (Q, Z, X, J)',
          category: 'global',
          condition: 'Use Q, Z, X, or J in words',
          reward: 15,
          progress: 2,
          maxProgress: 3,
          completed: false
        }]
      });
      (userProfileService.getProfile as jest.Mock).mockResolvedValue(profile);

      const gameHistory = createMockGameHistory({
        chain: ['jazz'],
        rareLettersUsed: ['Z']
      });

      const achievements = await system.checkAchievements(mockUserId, gameHistory);
      expect(achievements).toHaveLength(0);
      expect(userProfileService.updateAchievement).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          id: 'rare_collector',
          progress: 3
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user profile', async () => {
      (userProfileService.getProfile as jest.Mock).mockResolvedValue(null);

      const gameHistory = createMockGameHistory();
      const achievements = await system.checkAchievements(mockUserId, gameHistory);
      
      expect(achievements).toEqual([]);
      expect(userProfileService.updateAchievement).not.toHaveBeenCalled();
    });

    it('should handle profile service errors', async () => {
      (userProfileService.getProfile as jest.Mock).mockRejectedValue(new Error('Profile error'));

      const gameHistory = createMockGameHistory();
      const achievements = await system.checkAchievements(mockUserId, gameHistory);
      
      expect(achievements).toEqual([]);
      expect(userProfileService.updateAchievement).not.toHaveBeenCalled();
    });
  });
}); 