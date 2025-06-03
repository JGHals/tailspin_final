import { GameManager } from '../game-manager';
import { dailyPuzzleService } from '../daily-puzzle-service';
import { chainValidator } from '../chain-validator';
import { powerUpSystem } from '../power-up-system';
import { errorRecovery } from '../../services/error-recovery';
import { createGamePersistence } from '../../services/game-persistence';
import type { GameState, DailyPuzzle, PowerUpResult } from '../../types/game';

// Mock dependencies
jest.mock('../daily-puzzle-service');
jest.mock('../chain-validator');
jest.mock('../power-up-system');
jest.mock('../../services/error-recovery');
jest.mock('../../services/game-persistence');

describe('Daily Challenge Mode', () => {
  const userId = 'test-user-123';
  let manager: GameManager;
  let mockPersistence: jest.Mocked<ReturnType<typeof createGamePersistence>>;
  let mockDailyPuzzle: DailyPuzzle;

  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    mode: 'daily',
    chain: [],
    startWord: '',
    targetWord: '',
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

    // Setup daily puzzle mock
    mockDailyPuzzle = {
      date: new Date().toISOString().split('T')[0],
      startWord: 'puzzle',
      targetWord: 'lethal',
      parMoves: 3
    };
    (dailyPuzzleService.getDailyPuzzle as jest.Mock).mockResolvedValue(mockDailyPuzzle);

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
    
    manager = new GameManager(userId);
  });

  describe('Daily Puzzle Initialization', () => {
    it('should initialize with daily puzzle', async () => {
      await manager.initialize('daily');

      expect(dailyPuzzleService.getDailyPuzzle).toHaveBeenCalled();
      expect(manager.getState().startWord).toBe('puzzle');
      expect(manager.getState().targetWord).toBe('lethal');
      expect(manager.getState().mode).toBe('daily');
    });

    it('should handle invalid daily puzzle', async () => {
      const invalidPuzzle = { ...mockDailyPuzzle, startWord: 'invalid' };
      (dailyPuzzleService.getDailyPuzzle as jest.Mock).mockResolvedValue(invalidPuzzle);
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: false, reason: 'Invalid word' });

      await expect(manager.initialize('daily')).rejects.toThrow();
    });

    it('should restore in-progress daily puzzle', async () => {
      const savedState = createMockState({
        mode: 'daily',
        chain: ['puzzle'],
        startWord: 'puzzle',
        targetWord: 'lethal',
        wordTimings: new Map([['puzzle', Date.now()]])
      });
      mockPersistence.loadGameState.mockResolvedValue(savedState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('daily');

      expect(manager.getState().chain).toEqual(['puzzle']);
      expect(manager.getState().targetWord).toBe('lethal');
    });
  });

  describe('Par Moves Tracking', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should track moves against par', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.underPar).toBe(true);
    });

    it('should handle over par completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('legal');
      await manager.addWord('alpha');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.underPar).toBe(false);
    });
  });

  describe('Target Word Validation', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should validate path to target word', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().isComplete).toBe(true);
    });

    it('should reject invalid paths to target', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('legal');
      await manager.addWord('alpha');

      expect(manager.getState().isComplete).toBe(false);
    });

    it('should handle multiple valid paths to target', async () => {
      // Path 1
      await manager.addWord('puzzle');
      await manager.addWord('lethal');
      expect(manager.getState().isComplete).toBe(true);

      // Reset for Path 2
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      await manager.addWord('legal');
      await manager.addWord('lethal');
      expect(manager.getState().isComplete).toBe(true);
    });
  });

  describe('Daily Completion Stats', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should track fast solve completion', async () => {
      const startTime = Date.now() - 90000; // 90 seconds ago
      manager['state'].startTime = startTime;

      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.fastSolve).toBe(true);
    });

    it('should track optimal path completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.optimalPath).toBe(true);
    });

    it('should track no mistakes completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.noMistakes).toBe(true);
    });
  });

  describe('Daily Streak Handling', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should increment streak on completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().stats.currentStreak).toBe(1);
    });

    it('should update max streak when exceeded', async () => {
      const state = createMockState({
        stats: {
          length: 4,
          uniqueLetters: new Set(['p', 'u', 'z', 'l', 'e']),
          rareLetters: ['z'],
          averageWordLength: 5,
          longestWord: 'puzzle',
          currentStreak: 4,
          maxStreak: 4,
          terminalWords: [],
          branchingFactors: [],
          pathDifficulty: 'easy'
        }
      });
      mockPersistence.loadGameState.mockResolvedValue(state);
      await manager.initialize('daily');
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().stats.maxStreak).toBe(5);
    });
  });

  describe('Daily Leaderboard Integration', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should submit score to leaderboard on completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      // Verify leaderboard submission
      expect(mockPersistence.saveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          isComplete: true,
          score: expect.any(Object)
        }),
        true
      );
    });

    it('should include completion stats in leaderboard submission', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(mockPersistence.saveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          completionStats: expect.objectContaining({
            underPar: true,
            fastSolve: expect.any(Boolean),
            optimalPath: true,
            noMistakes: true
          })
        }),
        true
      );
    });
  });

  describe('Daily-specific Achievements', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should award achievement for under par completion', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().achievements).toContainEqual(
        expect.objectContaining({
          id: expect.stringContaining('UNDER_PAR')
        })
      );
    });

    it('should award achievement for fast solve', async () => {
      const startTime = Date.now() - 90000; // 90 seconds ago
      manager['state'].startTime = startTime;

      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().achievements).toContainEqual(
        expect.objectContaining({
          id: expect.stringContaining('SPEED_DEMON')
        })
      );
    });

    it('should award achievement for perfect line', async () => {
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().achievements).toContainEqual(
        expect.objectContaining({
          id: expect.stringContaining('PERFECT_LINE')
        })
      );
    });
  });

  describe('Power-up Restrictions', () => {
    beforeEach(async () => {
      await manager.initialize('daily');
    });

    it('should limit hint usage in daily mode', async () => {
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { words: ['hint1', 'hint2'] }
      });

      await manager.useHint();
      await manager.useHint();
      const hints = await manager.useHint();

      expect(hints).toEqual([]);
      expect(manager.getState().hintsUsed).toBe(3);
    });

    it('should apply power-up penalties to score', async () => {
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { words: ['hint'] }
      });

      const initialScore = manager.getState().score.total;
      await manager.useHint();
      
      expect(manager.getState().score.total).toBeLessThan(initialScore);
    });

    it('should track power-ups in completion stats', async () => {
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { words: ['hint'] }
      });

      await manager.useHint();
      await manager.addWord('puzzle');
      await manager.addWord('lethal');

      expect(manager.getState().completionStats.powerUpsUsed).toBe(1);
    });
  });
}); 