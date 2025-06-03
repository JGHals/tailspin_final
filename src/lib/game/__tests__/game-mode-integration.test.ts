import { GameManager } from '../game-manager';
import { createGamePersistence } from '../../services/game-persistence';
import { errorRecovery } from '../../services/error-recovery';
import { chainValidator } from '../chain-validator';
import { powerUpSystem } from '../power-up-system';
import { dailyPuzzleService } from '../daily-puzzle-service';
import type { GameState, DailyPuzzle } from '../../types/game';

// Mock dependencies
jest.mock('../../services/game-persistence');
jest.mock('../../services/error-recovery');
jest.mock('../chain-validator');
jest.mock('../power-up-system');
jest.mock('../daily-puzzle-service');

describe('Game Mode Integration', () => {
  const userId = 'test-user-123';
  let manager: GameManager;
  let mockPersistence: jest.Mocked<ReturnType<typeof createGamePersistence>>;
  let mockDailyPuzzle: DailyPuzzle;

  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    mode: 'endless',
    chain: [],
    startWord: '',
    isComplete: false,
    score: {
      total: 0,
      wordScores: {},
      multiplier: 1,
      terminalBonus: 0,
      dailyBonus: 0,
      penalties: 0
    },
    wordTimings: new Map(),
    terminalWords: new Set(),
    startTime: Date.now(),
    lastMoveTime: Date.now(),
    powerUpsUsed: new Set(),
    rareLettersUsed: new Set(),
    invalidAttempts: 0,
    hintsUsed: 0,
    ui: {
      showTerminalCelebration: false,
      currentTerminalWord: '',
      terminalBonus: 0,
      isNewTerminalDiscovery: false,
      letterTracking: {
        usedLetters: new Set(),
        rareLettersUsed: new Set(),
        uniqueLetterCount: 0,
        rareLetterCount: 0
      }
    },
    achievements: [],
    completionStats: {
      underPar: false,
      fastSolve: false,
      optimalPath: false,
      noMistakes: false,
      rareLetters: 0,
      powerUpsUsed: 0
    },
    stats: {
      length: 0,
      uniqueLetters: new Set(),
      rareLetters: [],
      averageWordLength: 0,
      longestWord: '',
      currentStreak: 0,
      maxStreak: 0,
      terminalWords: [],
      branchingFactors: [],
      pathDifficulty: 'easy'
    },
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup persistence mock
    mockPersistence = {
      saveGameState: jest.fn(),
      loadGameState: jest.fn(),
      startAutoSave: jest.fn(),
      stopAutoSave: jest.fn()
    } as any;
    (createGamePersistence as jest.Mock).mockReturnValue(mockPersistence);

    // Setup chainValidator mock
    (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });

    // Setup daily puzzle mock
    mockDailyPuzzle = {
      date: new Date().toISOString().split('T')[0],
      startWord: 'puzzle',
      targetWord: 'lethal',
      parMoves: 3
    };
    (dailyPuzzleService.getDailyPuzzle as jest.Mock).mockResolvedValue(mockDailyPuzzle);
    
    manager = new GameManager(userId);
  });

  describe('Mode Switching', () => {
    it('should preserve achievements when switching modes', async () => {
      // Start in endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      const endlessState = manager.getState();
      expect(endlessState.mode).toBe('endless');
      expect(endlessState.chain).toEqual(['puzzle', 'lethal']);

      // Switch to daily mode
      await manager.initialize('daily');
      const dailyState = manager.getState();
      
      // Achievements should persist
      expect(dailyState.achievements).toEqual(endlessState.achievements);
      expect(dailyState.stats.maxStreak).toBe(endlessState.stats.maxStreak);
    });

    it('should maintain power-up inventory across modes', async () => {
      // Setup power-up state
      const powerUpState = createMockState({
        powerUpsUsed: new Set(['hint']),
        hintsUsed: 1
      });
      mockPersistence.loadGameState.mockResolvedValue(powerUpState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      // Start in endless mode
      await manager.initialize('endless');
      const endlessState = manager.getState();
      expect(endlessState.powerUpsUsed.has('hint')).toBe(true);

      // Switch to daily mode
      await manager.initialize('daily');
      const dailyState = manager.getState();
      expect(dailyState.powerUpsUsed.has('hint')).toBe(true);
      expect(dailyState.hintsUsed).toBe(1);
    });
  });

  describe('Shared Systems', () => {
    it('should apply consistent scoring rules across modes', async () => {
      // Setup chain validator to simulate rare letters
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ 
        valid: true,
        stats: {
          rareLetters: ['z'],
          uniqueLetters: new Set(['p', 'u', 'z', 'l', 'e'])
        }
      });

      // Test in endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      const endlessScore = manager.getState().score.total;

      // Test in daily mode
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      const dailyScore = manager.getState().score.total;

      // Base scoring should be consistent
      expect(endlessScore).toBe(dailyScore);
    });

    it('should track achievements consistently across modes', async () => {
      // Setup achievement trigger condition
      const achievementState = createMockState({
        chain: ['puzzle', 'lethal', 'alliance'],
        stats: {
          length: 3,
          uniqueLetters: new Set(['p', 'u', 'z', 'l', 'e', 't', 'h', 'a', 'i', 'n', 'c']),
          rareLetters: ['z'],
          averageWordLength: 5.33,
          longestWord: 'alliance',
          currentStreak: 3,
          maxStreak: 3,
          terminalWords: [],
          branchingFactors: [2, 3, 1],
          pathDifficulty: 'medium'
        }
      });

      // Test in endless mode
      mockPersistence.loadGameState.mockResolvedValue(achievementState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });
      
      await manager.initialize('endless');
      const endlessAchievements = manager.getState().achievements;

      // Test in daily mode
      await manager.initialize('daily');
      const dailyAchievements = manager.getState().achievements;

      // Core achievements should persist
      expect(dailyAchievements).toEqual(endlessAchievements);
    });

    it('should handle power-ups consistently across modes', async () => {
      // Setup power-up success response
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { words: ['hint1', 'hint2'] }
      });

      // Test in endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      const endlessHints = await manager.useHint();

      // Test in daily mode
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      const dailyHints = await manager.useHint();

      // Power-up behavior should be consistent
      expect(endlessHints).toEqual(dailyHints);
    });
  });

  describe('Mode-Specific Rules', () => {
    it('should enforce daily challenge target word', async () => {
      await manager.initialize('daily');
      
      // Add words leading to target
      await manager.addWord('puzzle');
      await manager.addWord('lethal');
      
      const state = manager.getState();
      expect(state.isComplete).toBe(true);
      expect(state.completionStats.underPar).toBe(true);
    });

    it('should handle terminal words differently per mode', async () => {
      // Setup terminal word condition
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ 
        valid: true,
        isTerminal: true 
      });

      // Test in endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      await manager.addWord('lexicon');
      
      const endlessState = manager.getState();
      expect(endlessState.ui.showTerminalCelebration).toBe(true);
      expect(endlessState.terminalWords.has('lexicon')).toBe(true);

      // Test in daily mode
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      await manager.addWord('lexicon');
      
      const dailyState = manager.getState();
      expect(dailyState.ui.showTerminalCelebration).toBe(false);
      expect(dailyState.terminalWords.has('lexicon')).toBe(false);
    });

    it('should apply mode-specific scoring bonuses', async () => {
      // Setup chain validator
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });

      // Test in endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      await manager.addWord('lethal');
      const endlessScore = manager.getState().score;

      // Test in daily mode with under par completion
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      await manager.addWord('lethal');
      const dailyScore = manager.getState().score;

      // Daily mode should have additional bonus
      expect(dailyScore.total).toBeGreaterThan(endlessScore.total);
    });
  });

  describe('Data Persistence', () => {
    it('should save mode-specific data correctly', async () => {
      // Start in daily mode
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      
      expect(mockPersistence.saveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'daily',
          chain: ['puzzle']
        }),
        true
      );

      // Switch to endless mode
      await manager.initialize('endless');
      await manager.addWord('puzzle');
      
      expect(mockPersistence.saveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'endless',
          chain: ['puzzle']
        }),
        true
      );
    });

    it('should restore mode-specific state correctly', async () => {
      // Setup daily mode state
      const dailyState = createMockState({
        mode: 'daily',
        chain: ['puzzle'],
        startWord: 'puzzle',
        targetWord: 'lethal',
        completionStats: {
          underPar: false,
          fastSolve: false,
          optimalPath: false,
          noMistakes: true,
          rareLetters: 0,
          powerUpsUsed: 0
        }
      });

      mockPersistence.loadGameState.mockResolvedValue(dailyState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('daily');
      const restoredState = manager.getState();
      
      expect(restoredState.mode).toBe('daily');
      expect(restoredState.targetWord).toBe('lethal');
      expect(restoredState.completionStats.noMistakes).toBe(true);
    });
  });
}); 