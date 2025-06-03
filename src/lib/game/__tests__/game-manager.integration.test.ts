import { GameManager } from '../game-manager';
import { createGamePersistence } from '../../services/game-persistence';
import { errorRecovery } from '../../services/error-recovery';
import { chainValidator } from '../chain-validator';
import { powerUpSystem } from '../power-up-system';
import type { GameState } from '../../types/game';

// Mock dependencies
jest.mock('../../services/game-persistence');
jest.mock('../../services/error-recovery');
jest.mock('../chain-validator');
jest.mock('../power-up-system');

describe('GameManager Integration', () => {
  const userId = 'test-user-123';
  let manager: GameManager;
  let mockPersistence: jest.Mocked<ReturnType<typeof createGamePersistence>>;

  const createMockState = (overrides: Partial<GameState> = {}): GameState => ({
    mode: 'endless',
    chain: [],
    startWord: '',
    isComplete: false,
    score: {
      total: 0,
      wordPoints: 0,
      chainPoints: 0,
      bonusPoints: 0,
      terminalPoints: 0
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
    
    manager = new GameManager(userId);
  });

  describe('Game State Management', () => {
    it('should initialize with saved state if available', async () => {
      const savedState = createMockState({
        mode: 'endless',
        chain: ['puzzle', 'lethal'],
        startWord: 'puzzle',
        wordTimings: new Map([
          ['puzzle', Date.now() - 10000],
          ['lethal', Date.now()]
        ])
      });
      mockPersistence.loadGameState.mockResolvedValue(savedState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('endless');

      expect(mockPersistence.loadGameState).toHaveBeenCalled();
      expect(mockPersistence.startAutoSave).toHaveBeenCalled();
      expect(manager.getState().chain).toEqual(['puzzle', 'lethal']);
    });

    it('should handle corrupted saved state', async () => {
      const corruptedState = createMockState({
        mode: 'endless',
        chain: ['puzzle', 'invalid'],
        startWord: 'puzzle'
      });
      mockPersistence.loadGameState.mockResolvedValue(corruptedState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ 
        isValid: false, 
        errors: ['Invalid word at position 1: invalid'] 
      });
      (errorRecovery.attemptRecovery as jest.Mock).mockResolvedValue({
        recovered: true,
        state: createMockState({
          mode: 'endless',
          chain: ['puzzle'],
          startWord: 'puzzle'
        })
      });

      await manager.initialize('endless');

      expect(errorRecovery.validateState).toHaveBeenCalled();
      expect(errorRecovery.attemptRecovery).toHaveBeenCalled();
      expect(manager.getState().chain).toEqual(['puzzle']);
    });

    it('should start fresh if recovery fails', async () => {
      const corruptedState = createMockState({
        mode: 'endless',
        chain: ['puzzle', 'invalid'],
        startWord: 'puzzle'
      });
      mockPersistence.loadGameState.mockResolvedValue(corruptedState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ 
        isValid: false, 
        errors: ['Invalid word at position 1: invalid'] 
      });
      (errorRecovery.attemptRecovery as jest.Mock).mockResolvedValue({
        recovered: false,
        state: corruptedState
      });

      await manager.initialize('endless');

      expect(manager.getState().chain).toEqual([]);
      expect(manager.getState().mode).toBe('endless');
    });
  });

  describe('Game Play with Recovery', () => {
    beforeEach(async () => {
      await manager.initialize('endless');
    });

    it('should save state after successful word addition', async () => {
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });

      await manager.addWord('puzzle');

      expect(mockPersistence.saveGameState).toHaveBeenCalledWith(
        expect.objectContaining({
          chain: ['puzzle']
        }),
        true
      );
    });

    it('should attempt recovery on error during word addition', async () => {
      (chainValidator.validateNextWord as jest.Mock)
        .mockResolvedValueOnce({ valid: true })
        .mockRejectedValueOnce(new Error('validation error'));
      
      await manager.addWord('puzzle');
      const result = await manager.addWord('invalid');

      expect(errorRecovery.attemptRecovery).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Game state was recovered');
    });

    it('should maintain game integrity during power-up usage', async () => {
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { words: ['hint'] }
      });

      await manager.addWord('puzzle');
      const hints = await manager.useHint();

      expect(hints).toEqual(['hint']);
      expect(manager.getState().powerUpsUsed.has('hint')).toBe(true);
      expect(mockPersistence.saveGameState).toHaveBeenCalled();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should properly cleanup resources', async () => {
      await manager.initialize('endless');
      manager.cleanup();

      expect(mockPersistence.stopAutoSave).toHaveBeenCalled();
    });

    it('should handle cleanup even if not initialized', () => {
      manager.cleanup();
      expect(mockPersistence.stopAutoSave).toHaveBeenCalled();
    });
  });

  describe('Power-Up Integration', () => {
    beforeEach(async () => {
      await manager.initialize('endless');
      await manager.addWord('puzzle');
    });

    it('should handle flip power-up with state persistence', async () => {
      (powerUpSystem.useFlip as jest.Mock).mockResolvedValue({
        success: true,
        data: { flippedWord: 'lethal' }
      });

      const result = await manager.useFlip();

      expect(result).toBe(true);
      expect(manager.getState().powerUpsUsed.has('flip')).toBe(true);
      expect(mockPersistence.saveGameState).toHaveBeenCalled();
    });

    it('should recover from flip power-up failure', async () => {
      (powerUpSystem.useFlip as jest.Mock).mockRejectedValue(new Error('power-up error'));
      (errorRecovery.attemptRecovery as jest.Mock).mockResolvedValue({
        recovered: true,
        state: createMockState({
          chain: ['puzzle'],
          startWord: 'puzzle',
          powerUpsUsed: new Set()
        })
      });

      const result = await manager.useFlip();

      expect(result).toBe(false);
      expect(errorRecovery.attemptRecovery).toHaveBeenCalled();
    });

    it('should handle bridge power-up with validation', async () => {
      (powerUpSystem.useBridge as jest.Mock).mockResolvedValue({
        success: true,
        data: { bridgeWord: 'alliance' }
      });
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });

      const result = await manager.useBridge();

      expect(result).toBe(true);
      expect(manager.getState().powerUpsUsed.has('bridge')).toBe(true);
      expect(chainValidator.validateNextWord).toHaveBeenCalled();
    });

    it('should handle word warp with state updates', async () => {
      (powerUpSystem.useWordWarp as jest.Mock).mockResolvedValue({
        success: true,
        data: { warpWord: 'zebra' }
      });

      const result = await manager.useWordWarp();

      expect(result).toBe(true);
      expect(manager.getState().powerUpsUsed.has('warp')).toBe(true);
      expect(manager.getState().rareLettersUsed.has('z')).toBe(true);
    });

    it('should handle undo with state restoration', async () => {
      await manager.addWord('lethal');
      (powerUpSystem.useUndo as jest.Mock).mockResolvedValue({
        success: true
      });

      const result = await manager.useUndo();

      expect(result.success).toBe(true);
      expect(manager.getState().chain).toEqual(['puzzle']);
      expect(mockPersistence.saveGameState).toHaveBeenCalled();
    });
  });

  describe('Terminal Word Handling', () => {
    beforeEach(async () => {
      await manager.initialize('endless');
    });

    it('should handle terminal word discovery', async () => {
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ 
        valid: true,
        isTerminal: true 
      });

      await manager.addWord('puzzle');
      await manager.addWord('lexicon');

      expect(manager.getState().terminalWords.has('lexicon')).toBe(true);
      expect(manager.getState().ui.showTerminalCelebration).toBe(true);
      expect(manager.getState().ui.currentTerminalWord).toBe('lexicon');
    });

    it('should persist terminal word achievements', async () => {
      const terminalState = createMockState({
        chain: ['puzzle', 'lexicon'],
        terminalWords: new Set(['lexicon']),
        ui: {
          showTerminalCelebration: true,
          currentTerminalWord: 'lexicon',
          terminalBonus: 50,
          isNewTerminalDiscovery: true,
          letterTracking: {
            usedLetters: new Set(['p', 'u', 'z', 'l', 'e', 'x', 'i', 'c', 'o', 'n']),
            rareLettersUsed: new Set(['x']),
            uniqueLetterCount: 10,
            rareLetterCount: 1
          }
        }
      });

      mockPersistence.loadGameState.mockResolvedValue(terminalState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('endless');
      
      expect(manager.getState().terminalWords.has('lexicon')).toBe(true);
      expect(manager.getState().ui.letterTracking.rareLettersUsed.has('x')).toBe(true);
    });
  });

  describe('State Persistence and Reconstruction', () => {
    it('should preserve timing data across reloads', async () => {
      const now = Date.now();
      const timingState = createMockState({
        chain: ['puzzle', 'lethal'],
        startWord: 'puzzle',
        startTime: now - 20000,
        lastMoveTime: now - 5000,
        wordTimings: new Map([
          ['puzzle', now - 15000],
          ['lethal', now - 5000]
        ])
      });

      mockPersistence.loadGameState.mockResolvedValue(timingState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('endless');

      expect(manager.getState().wordTimings.get('puzzle')).toBe(now - 15000);
      expect(manager.getState().wordTimings.get('lethal')).toBe(now - 5000);
    });

    it('should reconstruct game stats after reload', async () => {
      const statsState = createMockState({
        chain: ['puzzle', 'lethal', 'alliance'],
        stats: {
          length: 3,
          uniqueLetters: new Set(['p', 'u', 'z', 'l', 'e', 't', 'h', 'a', 'i', 'n', 'c']),
          rareLetters: ['z'],
          averageWordLength: 6.33,
          longestWord: 'alliance',
          currentStreak: 3,
          maxStreak: 3,
          terminalWords: [],
          branchingFactors: [5, 4, 3],
          pathDifficulty: 'medium'
        }
      });

      mockPersistence.loadGameState.mockResolvedValue(statsState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('endless');

      const state = manager.getState();
      expect(state.stats.uniqueLetters.size).toBe(11);
      expect(state.stats.rareLetters).toContain('z');
      expect(state.stats.longestWord).toBe('alliance');
    });

    it('should handle achievement persistence', async () => {
      const achievementState = createMockState({
        achievements: [{
          id: 'CHAIN_MASTER',
          name: 'Chain Master',
          description: 'Create a chain of 25+ words',
          category: 'endless',
          condition: 'chain.length >= 25',
          reward: 100,
          progress: 25,
          maxProgress: 25,
          completed: true,
          completedAt: new Date().toISOString(),
          icon: '🔗'
        }, {
          id: 'WORD_WIZARD',
          name: 'Word Wizard',
          description: 'Create a chain of 50+ words',
          category: 'endless',
          condition: 'chain.length >= 50',
          reward: 200,
          progress: 50,
          maxProgress: 50,
          completed: true,
          completedAt: new Date().toISOString(),
          icon: '🧙‍♂️'
        }],
        completionStats: {
          underPar: true,
          fastSolve: true,
          optimalPath: true,
          noMistakes: true,
          rareLetters: 3,
          powerUpsUsed: 1
        }
      });

      mockPersistence.loadGameState.mockResolvedValue(achievementState);
      (errorRecovery.validateState as jest.Mock).mockResolvedValue({ isValid: true, errors: [] });

      await manager.initialize('endless');

      expect(manager.getState().achievements[0].id).toBe('CHAIN_MASTER');
      expect(manager.getState().completionStats.rareLetters).toBe(3);
    });
  });
}); 