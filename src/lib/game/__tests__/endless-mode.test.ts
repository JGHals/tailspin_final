import { GameModeManagerImpl } from '../game-mode-manager';
import { chainValidator } from '../chain-validator';
import { dictionaryAccess } from '../../dictionary/dictionary-access';
import { gameStateService } from '../../services/game-state-service';
import { mockWordList, mockTerminalWords, mockValidChains } from '../../test-utils/mock-data';
import type { GameState, GameMode, SavedGameState } from '../../types/game';
import { powerUpSystem } from '../power-up-system';

// Mock dependencies
jest.mock('../chain-validator', () => ({
  chainValidator: {
    validateNextWord: jest.fn(),
    getChainStats: jest.fn(),
    resetUsedWords: jest.fn(),
    findPossibleNextWords: jest.fn()
  }
}));

jest.mock('../../dictionary/dictionary-access', () => ({
  dictionaryAccess: {
    getWordsWithPrefix: jest.fn(),
    isValidWord: jest.fn()
  }
}));

jest.mock('../../services/game-state-service', () => ({
  gameStateService: {
    loadGameState: jest.fn(),
    saveGameState: jest.fn(),
    getLastSavedGame: jest.fn(),
    deleteSavedGame: jest.fn()
  }
}));

jest.mock('../power-up-system', () => ({
  powerUpSystem: {
    useHint: jest.fn(),
    useFlip: jest.fn(),
    useBridge: jest.fn(),
    useUndo: jest.fn(),
    useWordWarp: jest.fn()
  }
}));

describe('Endless Mode', () => {
  let manager: GameModeManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new GameModeManagerImpl('endless');

    // Setup default validation response
    (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
      valid: true,
      isTerminal: false,
      error: null
    });
    (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
      length: 1,
      uniqueLetters: new Set(['t', 'e', 's', 't']),
      rareLetters: [],
      averageWordLength: 4,
      longestWord: 'test',
      currentStreak: 1,
      maxStreak: 1,
      terminalWords: [],
      branchingFactors: [2],
      pathDifficulty: 'easy'
    });

    // Setup dictionary access mock
    (dictionaryAccess.getWordsWithPrefix as jest.Mock).mockResolvedValue(['test']);
    (dictionaryAccess.isValidWord as jest.Mock).mockResolvedValue(true);

    // Setup game state service mock
    (gameStateService.saveGameState as jest.Mock).mockImplementation((userId: string, state: any) => {
      return Promise.resolve(`${userId}_${Date.now()}`);
    });
  });

  describe('State Management', () => {
    it('should initialize with correct endless mode state', async () => {
      await manager.startGame({ startWord: 'test' });
      const state = manager.getGameState();

      expect(state.mode).toBe('endless');
      expect(state.isComplete).toBe(false);
      expect(state.chain).toHaveLength(1); // Start word
      expect(state.chain[0]).toBe('test');
      expect(state.targetWord).toBeUndefined();
      expect(state.dailyPuzzle).toBeUndefined();
    });

    it('should handle very long chains efficiently', async () => {
      // Setup a long chain scenario
      const longChain = Array(100).fill('word');
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        isValid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: longChain.length,
        uniqueLetters: new Set(['w', 'o', 'r', 'd']),
        rareLetters: [],
        averageWordLength: 4,
        longestWord: 'word',
        currentStreak: longChain.length,
        maxStreak: longChain.length,
        terminalWords: [],
        branchingFactors: Array(longChain.length).fill(2),
        pathDifficulty: 'medium'
      });

      await manager.startGame({ startWord: 'word' });
      
      // Add words to create a long chain
      for (let i = 0; i < 99; i++) {
        await manager.submitWord('word');
      }

      const state = manager.getGameState();
      expect(state.chain).toHaveLength(100);
      expect(state.stats.length).toBe(100);
      expect(state.stats.currentStreak).toBe(100);
    });

    it('should persist state for long sessions', async () => {
      const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');

      await manager.startGame({ startWord: 'puzzle' });
      
      // Simulate long session with periodic saves
      for (let i = 0; i < 5; i++) {
        await manager.submitWord(mockValidChains[0][1]); // 'lethal'
        
        // Fast-forward time to trigger auto-save
        jest.advanceTimersByTime(30000);
        
        expect(mockSaveState).toHaveBeenCalled();
        mockSaveState.mockClear();
      }
    });
  });

  describe('Terminal Word Handling', () => {
    it('should handle terminal words correctly', async () => {
      await manager.startGame({ startWord: 'quick' });
      
      // Setup terminal word scenario
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        isValid: true,
        isTerminal: true,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['q', 'u', 'i', 'c', 'k', 'j', 'a', 'z']),
        rareLetters: ['q', 'z'],
        averageWordLength: 4.5,
        longestWord: 'quick',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: ['jazz'],
        branchingFactors: [2, 0],
        pathDifficulty: 'hard'
      });

      await manager.submitWord('jazz');
      
      const state = manager.getGameState();
      expect(state.isComplete).toBe(true);
      expect(state.terminalWords.has('jazz')).toBe(true);
      expect(state.stats.terminalWords).toContain('jazz');
    });

    it('should calculate correct terminal word bonuses', async () => {
      await manager.startGame({ startWord: 'quick' });
      
      // Setup terminal word with rare letters
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        isValid: true,
        isTerminal: true,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['q', 'u', 'i', 'c', 'k', 'j', 'i', 'n', 'x']),
        rareLetters: ['q', 'x'],
        averageWordLength: 4.5,
        longestWord: 'quick',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: ['jinx'],
        branchingFactors: [2, 0],
        pathDifficulty: 'hard'
      });

      await manager.submitWord('jinx');
      
      const state = manager.getGameState();
      expect(state.score.terminalBonus).toBeGreaterThan(0);
      expect(state.stats.terminalWords).toContain('jinx');
    });
  });

  describe('Performance with Long Chains', () => {
    it('should maintain performance with large word sets', async () => {
      // Setup large dictionary scenario
      const largeWordList = Array(1000).fill('word').map((w, i) => w + i);
      const mockHintResult = {
        success: true,
        data: {
          hints: largeWordList.slice(0, 3) // Power-up system limits to 3 hints
        }
      };
      
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue(mockHintResult);
      
      await manager.startGame({ startWord: 'test' });
      manager.setUserId('test-user');
      
      // Add a word to have a valid chain for hints
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      await manager.submitWord('test');
      
      const startTime = performance.now();
      const hints = await manager.useHint();
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(hints).toHaveLength(3); // Power-up system limits to 3 hints
    });

    it('should handle state updates efficiently with long chains', async () => {
      await manager.startGame({ startWord: 'word' });
      
      const updates: number[] = [];
      const startTime = performance.now();
      
      // Add 50 words rapidly
      for (let i = 0; i < 50; i++) {
        await manager.submitWord('word' + i);
        updates.push(performance.now());
      }
      
      // Check update timing consistency
      for (let i = 1; i < updates.length; i++) {
        const timeDiff = updates[i] - updates[i - 1];
        expect(timeDiff).toBeLessThan(16); // Should maintain 60fps (16ms)
      }
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted state', async () => {
      const corruptedState: SavedGameState = {
        id: 'test-game',
        userId: 'test-user',
        lastSaved: new Date().toISOString(),
        version: 1,
        state: {
          mode: 'endless',
          chain: ['puzzle', 'invalid', 'alliance'], // Invalid chain
          startWord: 'puzzle',
          score: {
            total: 0,
            wordScores: {},
            multiplier: 1,
            terminalBonus: 0,
            dailyBonus: 0,
            penalties: 0
          },
          stats: {
            length: -1, // Invalid stat
            uniqueLetters: new Set(['p', 'u', 'z']),
            rareLetters: [],
            averageWordLength: 0,
            longestWord: '',
            currentStreak: 0,
            maxStreak: 0,
            terminalWords: [],
            branchingFactors: [],
            pathDifficulty: 'easy'
          },
          isComplete: false,
          startTime: Date.now(),
          lastMoveTime: Date.now(),
          hintsUsed: 0,
          invalidAttempts: 0,
          wordTimings: new Map(),
          terminalWords: new Set(),
          powerUpsUsed: new Set(),
          rareLettersUsed: new Set(),
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
          }
        }
      };

      (gameStateService.loadGameState as jest.Mock).mockResolvedValue({
        ...corruptedState,
        chain: ['puzzle', 'alliance'],
        score: { 
          total: 0,
          wordPoints: 0,
          chainPoints: 0,
          bonusPoints: 0,
          terminalPoints: 0
        },
        stats: { ...corruptedState.state.stats, length: 2 }
      });

      const success = await manager.resumeGame('test-game');
      expect(success).toBe(true);
      
      const state = manager.getGameState();
      expect(state.chain).toHaveLength(2);
      expect(state.score.total).toBe(0);
      expect(state.stats.length).toBe(2);
    });

    it('should handle disconnection during long sessions', async () => {
      const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');

      await manager.startGame({ startWord: 'puzzle' });
      manager.setUserId('test-user');
      
      // Simulate network disconnection
      const error = new Error('Network disconnected');
      mockSaveState.mockRejectedValueOnce(error);
      
      // Add word during disconnection
      await manager.submitWord('lethal');
      
      // Verify state maintained locally
      const state = manager.getGameState();
      expect(state.chain).toContain('lethal');
      
      // Simulate reconnection
      mockSaveState.mockImplementationOnce((userId: string, state: any) => {
        return Promise.resolve(`${userId}_${Date.now()}`);
      });
      
      // Add another word
      await manager.submitWord('alliance');
      
      // Verify state saved after reconnection
      expect(mockSaveState).toHaveBeenCalled();
    });
  });

  // Add new test suite for power-up integration
  describe('Power-Up Integration', () => {
    beforeEach(() => {
      manager.setUserId('test-user');
    });

    it('should handle hint power-up correctly', async () => {
      const mockHints = ['test', 'tent', 'temp'];
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { hints: mockHints }
      });

      await manager.startGame({ startWord: 'test' });
      const hints = await manager.useHint();

      expect(hints).toEqual(mockHints);
      expect(powerUpSystem.useHint).toHaveBeenCalledWith(
        'test-user',
        'test'
      );
    });

    it('should handle flip power-up correctly', async () => {
      const mockFlipResult = {
        success: true,
        data: { flippedWord: 'tent' }
      };
      (powerUpSystem.useFlip as jest.Mock).mockResolvedValue(mockFlipResult);

      await manager.startGame({ startWord: 'test' });
      const result = await manager.useFlip();

      expect(result).toEqual(mockFlipResult);
      expect(powerUpSystem.useFlip).toHaveBeenCalledWith(
        'test-user',
        'test'
      );
    });

    it('should handle bridge power-up correctly', async () => {
      const mockBridgeResult = {
        success: true,
        data: { bridgeWord: 'testing' }
      };
      (powerUpSystem.useBridge as jest.Mock).mockResolvedValue(mockBridgeResult);

      await manager.startGame({ startWord: 'test' });
      const result = await manager.useBridge();

      expect(result).toEqual(mockBridgeResult);
      expect(powerUpSystem.useBridge).toHaveBeenCalledWith(
        'test-user',
        'test'
      );
    });

    it('should handle word warp power-up correctly', async () => {
      const mockWarpResult = {
        success: true,
        data: { warpWord: 'stellar' }
      };
      (powerUpSystem.useWordWarp as jest.Mock).mockResolvedValue(mockWarpResult);

      await manager.startGame({ startWord: 'test' });
      const result = await manager.useWordWarp();

      expect(result).toEqual(mockWarpResult);
      expect(powerUpSystem.useWordWarp).toHaveBeenCalledWith('test-user');
    });

    it('should handle undo power-up correctly', async () => {
      const mockUndoResult = {
        success: true,
        data: { newChain: ['test'] }
      };
      (powerUpSystem.useUndo as jest.Mock).mockResolvedValue(mockUndoResult);

      await manager.startGame({ startWord: 'test' });
      await manager.submitWord('tent');
      const result = await manager.useUndo();

      expect(result).toEqual(mockUndoResult);
      expect(powerUpSystem.useUndo).toHaveBeenCalledWith(
        'test-user',
        ['test', 'tent']
      );
    });

    it('should update game state after power-up use', async () => {
      await manager.startGame({ startWord: 'test' });
      
      // Use hint power-up
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { hints: ['tent'] }
      });
      await manager.useHint();

      const state = manager.getGameState();
      expect(state.hintsUsed).toBe(1);
      expect(state.powerUpsUsed.has('hint')).toBe(true);
    });

    describe('Error Handling', () => {
      it('should handle power-up failure gracefully', async () => {
        const error = new Error('Not enough tokens');
        (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
          success: false,
          error: error.message
        });

        await manager.startGame({ startWord: 'test' });
        const hints = await manager.useHint();

        expect(hints).toEqual([]);
        expect(powerUpSystem.useHint).toHaveBeenCalledWith(
          'test-user',
          'test'
        );
      });

      it('should handle power-up system errors', async () => {
        const error = new Error('Network error');
        (powerUpSystem.useHint as jest.Mock).mockRejectedValue(error);

        await manager.startGame({ startWord: 'test' });
        const hints = await manager.useHint();

        expect(hints).toEqual([]);
        expect(powerUpSystem.useHint).toHaveBeenCalledWith(
          'test-user',
          'test'
        );
      });

      it('should not update state on power-up failure', async () => {
        await manager.startGame({ startWord: 'test' });
        
        // Simulate power-up failure
        (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
          success: false,
          error: 'Not enough tokens'
        });
        await manager.useHint();

        const state = manager.getGameState();
        expect(state.hintsUsed).toBe(0);
        expect(state.powerUpsUsed.has('hint')).toBe(false);
      });

      it('should handle missing user ID', async () => {
        await manager.startGame({ startWord: 'test' });
        manager.setUserId(''); // Clear user ID

        const result = await manager.useHint();
        expect(result).toEqual([]);
        expect(powerUpSystem.useHint).not.toHaveBeenCalled();
      });

      it('should handle empty chain', async () => {
        await manager.startGame({ startWord: 'test' });
        manager.setUserId('test-user');

        // Force empty chain scenario
        const state = manager.getGameState();
        state.chain = [];

        const result = await manager.useHint();
        expect(result).toEqual([]);
        expect(powerUpSystem.useHint).not.toHaveBeenCalled();
      });

      it('should handle undo with insufficient chain length', async () => {
        await manager.startGame({ startWord: 'test' });
        const result = await manager.useUndo();

        expect(result).toEqual({
          success: false,
          error: 'Cannot undo the starting word'
        });
        expect(powerUpSystem.useUndo).not.toHaveBeenCalled();
      });
    });

    describe('Power-Up State Management', () => {
      it('should track multiple power-up uses', async () => {
        await manager.startGame({ startWord: 'test' });
        
        // Use multiple power-ups
        (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
          success: true,
          data: { hints: ['tent'] }
        });
        await manager.useHint();

        (powerUpSystem.useFlip as jest.Mock).mockResolvedValue({
          success: true,
          data: { flippedWord: 'tent' }
        });
        await manager.useFlip();

        const state = manager.getGameState();
        expect(state.hintsUsed).toBe(1);
        expect(state.powerUpsUsed.size).toBe(2);
        expect(state.powerUpsUsed.has('hint')).toBe(true);
        expect(state.powerUpsUsed.has('flip')).toBe(true);
      });

      it('should persist power-up usage in saved state', async () => {
        const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');
        await manager.startGame({ startWord: 'test' });

        // Use a power-up
        (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
          success: true,
          data: { hints: ['tent'] }
        });
        await manager.useHint();

        expect(mockSaveState).toHaveBeenCalledWith(
          'test-user',
          expect.objectContaining({
            hintsUsed: 1,
            powerUpsUsed: expect.any(Set)
          })
        );
      });

      it('should handle concurrent power-up usage', async () => {
        await manager.startGame({ startWord: 'test' });
        
        // Setup delayed power-up responses
        (powerUpSystem.useHint as jest.Mock).mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            data: { hints: ['tent'] }
          }), 100))
        );

        (powerUpSystem.useFlip as jest.Mock).mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            data: { flippedWord: 'tent' }
          }), 50))
        );

        // Use power-ups concurrently
        const [hintResult, flipResult] = await Promise.all([
          manager.useHint(),
          manager.useFlip()
        ]);

        expect(hintResult).toEqual(['tent']);
        expect(flipResult).toEqual({
          success: true,
          data: { flippedWord: 'tent' }
        });

        const state = manager.getGameState();
        expect(state.powerUpsUsed.size).toBe(2);
      });
    });
  });

  describe('Game State Persistence', () => {
    beforeEach(() => {
      manager.setUserId('test-user');
    });

    it('should auto-save state periodically', async () => {
      const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');
      await manager.startGame({ startWord: 'test' });

      // Fast forward time to trigger auto-save
      jest.advanceTimersByTime(30000); // 30 seconds

      expect(mockSaveState).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          mode: 'endless',
          chain: ['test'],
          isComplete: false
        })
      );
    });

    it('should save state after significant changes', async () => {
      const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');
      await manager.startGame({ startWord: 'test' });

      // Submit a word
      await manager.submitWord('tent');

      expect(mockSaveState).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          chain: ['test', 'tent']
        })
      );
    });

    it('should handle save failures gracefully', async () => {
      const mockSaveState = jest.spyOn(gameStateService, 'saveGameState');
      const error = new Error('Network error');
      mockSaveState.mockRejectedValue(error);

      await manager.startGame({ startWord: 'test' });
      await manager.submitWord('tent');

      // Game should continue despite save failure
      const state = manager.getGameState();
      expect(state.chain).toEqual(['test', 'tent']);
    });

    it('should resume from saved state', async () => {
      const savedState: SavedGameState = {
        id: 'test-game',
        userId: 'test-user',
        lastSaved: new Date().toISOString(),
        version: 1,
        state: {
          mode: 'endless',
          chain: ['test', 'tent'],
          startWord: 'test',
          score: {
            total: 20,
            wordScores: {
              'test': { base: 10, length: 0, rareLetters: 0, streak: 0, speed: 0, total: 10 },
              'tent': { base: 10, length: 0, rareLetters: 0, streak: 0, speed: 0, total: 10 }
            },
            multiplier: 1,
            terminalBonus: 0,
            dailyBonus: 0,
            penalties: 0
          },
          stats: {
            length: 2,
            uniqueLetters: new Set(['t', 'e', 'n']),
            rareLetters: [],
            averageWordLength: 4,
            longestWord: 'tent',
            currentStreak: 2,
            maxStreak: 2,
            terminalWords: [],
            branchingFactors: [2, 1],
            pathDifficulty: 'easy'
          },
          isComplete: false,
          startTime: Date.now() - 1000,
          lastMoveTime: Date.now(),
          hintsUsed: 0,
          invalidAttempts: 0,
          wordTimings: new Map([['tent', 1000]]),
          terminalWords: new Set(),
          powerUpsUsed: new Set(),
          rareLettersUsed: new Set(),
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
          }
        }
      };

      (gameStateService.loadGameState as jest.Mock).mockResolvedValue(savedState);
      const success = await manager.resumeGame('test-game');

      expect(success).toBe(true);
      const state = manager.getGameState();
      expect(state.chain).toEqual(['test', 'tent']);
      expect(state.score.total).toBe(20);
    });

    it('should handle resume failures gracefully', async () => {
      const error = new Error('Failed to load game');
      (gameStateService.loadGameState as jest.Mock).mockRejectedValue(error);

      const success = await manager.resumeGame('test-game');
      expect(success).toBe(false);

      // Should be in a clean state
      const state = manager.getGameState();
      expect(state.chain).toHaveLength(0);
    });

    it('should clean up completed games', async () => {
      const mockDeleteGame = jest.spyOn(gameStateService, 'deleteSavedGame');
      await manager.startGame({ startWord: 'quick' });

      // Setup terminal word scenario
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: true,
        error: null
      });
      await manager.submitWord('jazz');

      expect(mockDeleteGame).toHaveBeenCalled();
    });

    it('should handle version migrations', async () => {
      const oldVersionState: SavedGameState = {
        id: 'test-game',
        userId: 'test-user',
        lastSaved: new Date().toISOString(),
        version: 0, // Old version
        state: {
          mode: 'endless',
          chain: ['test'],
          startWord: 'test',
          score: {
            total: 10,
            wordScores: {
              'test': { base: 10, length: 0, rareLetters: 0, streak: 0, speed: 0, total: 10 }
            },
            multiplier: 1,
            terminalBonus: 0,
            dailyBonus: 0,
            penalties: 0
          },
          stats: {
            length: 1,
            uniqueLetters: new Set(['t', 'e', 's']),
            rareLetters: [],
            averageWordLength: 4,
            longestWord: 'test',
            currentStreak: 1,
            maxStreak: 1,
            terminalWords: [],
            branchingFactors: [1],
            pathDifficulty: 'easy'
          },
          isComplete: false,
          startTime: Date.now() - 1000,
          lastMoveTime: Date.now(),
          hintsUsed: 0,
          invalidAttempts: 0,
          wordTimings: new Map(),
          terminalWords: new Set(),
          powerUpsUsed: new Set(),
          rareLettersUsed: new Set(),
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
          }
        }
      };

      (gameStateService.loadGameState as jest.Mock).mockResolvedValue(oldVersionState);
      const success = await manager.resumeGame('test-game');

      expect(success).toBe(true);
      const state = manager.getGameState();
      expect(state.chain).toEqual(['test']);
      expect(state.score.total).toBe(10);
    });
  });

  describe('Achievement Tracking', () => {
    beforeEach(() => {
      manager.setUserId('test-user');
    });

    it('should track Chain Master achievement progress', async () => {
      await manager.startGame({ startWord: 'test' });

      // Build a chain of 25 words
      for (let i = 0; i < 24; i++) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        const result = await manager.submitWord('test' + i);
        
        if (i === 23) {
          expect(result.achievements).toContainEqual(
            expect.objectContaining({
              id: 'chain_master',
              progress: 25,
              completed: true
            })
          );
        }
      }
    });

    it('should track Word Wizard achievement progress', async () => {
      await manager.startGame({ startWord: 'test' });

      // Build a chain of 50 words
      for (let i = 0; i < 49; i++) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        const result = await manager.submitWord('test' + i);
        
        if (i === 48) {
          expect(result.achievements).toContainEqual(
            expect.objectContaining({
              id: 'word_wizard',
              progress: 50,
              completed: true
            })
          );
        }
      }
    });

    it('should track Dead End Collector achievement', async () => {
      await manager.startGame({ startWord: 'test' });

      // Find 5 terminal words
      const terminalWords = ['jazz', 'buzz', 'fizz', 'quiz', 'jinx'];
      let lastResult;
      
      for (const word of terminalWords) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: true,
          error: null
        });
        lastResult = await manager.submitWord(word);
        await manager.startGame({ startWord: 'test' });
      }

      expect(lastResult?.achievements).toContainEqual(
        expect.objectContaining({
          id: 'dead_end_collector',
          progress: 5,
          completed: true
        })
      );
    });

    it('should track Alphabet Explorer achievement', async () => {
      await manager.startGame({ startWord: 'test' });

      // Use words with many unique letters
      const words = [
        'quick', // q, u, i, c, k
        'brown', // b, r, o, w, n
        'jumps', // j, m, p, s
        'vexed', // v, x, e, d
        'lazy'   // l, a, z, y
      ];

      let lastResult;
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length,
          uniqueLetters: new Set(words.join('').split('')),
          rareLetters: ['q', 'x', 'z'],
          averageWordLength: 5,
          longestWord: 'quick',
          currentStreak: words.length,
          maxStreak: words.length,
          terminalWords: [],
          branchingFactors: Array(words.length).fill(2),
          pathDifficulty: 'hard'
        });
        lastResult = await manager.submitWord(word);
      }

      expect(lastResult?.achievements).toContainEqual(
        expect.objectContaining({
          id: 'alphabet_explorer',
          progress: 20,
          completed: true
        })
      );
    });

    it('should track multiple achievements simultaneously', async () => {
      await manager.startGame({ startWord: 'test' });

      // Build a long chain with unique letters and terminal words
      const words = [
        'quick',
        'brown',
        'jumps',
        'vexed',
        'lazy',
        'jazz' // Terminal word
      ];

      let lastResult;
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: word === 'jazz',
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length,
          uniqueLetters: new Set(words.join('').split('')),
          rareLetters: ['q', 'x', 'z'],
          averageWordLength: 5,
          longestWord: 'quick',
          currentStreak: words.length,
          maxStreak: words.length,
          terminalWords: word === 'jazz' ? ['jazz'] : [],
          branchingFactors: Array(words.length).fill(2),
          pathDifficulty: 'hard'
        });
        lastResult = await manager.submitWord(word);
      }

      expect(lastResult?.achievements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'alphabet_explorer' }),
          expect.objectContaining({ id: 'dead_end_collector' })
        ])
      );
    });

    it('should persist achievement progress across sessions', async () => {
      // First session
      await manager.startGame({ startWord: 'test' });
      
      // Find 3 terminal words
      const terminalWords = ['jazz', 'buzz', 'fizz'];
      let lastResult;
      
      for (const word of terminalWords) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: true,
          error: null
        });
        lastResult = await manager.submitWord(word);
        await manager.startGame({ startWord: 'test' });
      }

      // Save state
      const firstState = manager.getGameState();
      const savedState: SavedGameState = {
        id: 'test-game',
        userId: 'test-user',
        lastSaved: new Date().toISOString(),
        version: 1,
        state: {
          mode: 'endless',
          chain: ['test'],
          startWord: 'test',
          score: {
            total: 0,
            wordScores: {},
            multiplier: 1,
            terminalBonus: 0,
            dailyBonus: 0,
            penalties: 0
          },
          stats: {
            ...firstState.stats,
            uniqueLetters: new Set(['t', 'e', 's'])
          },
          isComplete: false,
          startTime: Date.now() - 1000,
          lastMoveTime: Date.now(),
          hintsUsed: 0,
          invalidAttempts: 0,
          wordTimings: new Map(),
          terminalWords: new Set(terminalWords),
          powerUpsUsed: new Set(),
          rareLettersUsed: new Set(),
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
          }
        }
      };

      // Resume in new session
      (gameStateService.loadGameState as jest.Mock).mockResolvedValue(savedState);
      await manager.resumeGame('test-game');

      // Find 2 more terminal words
      for (const word of ['quiz', 'jinx']) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: true,
          error: null
        });
        lastResult = await manager.submitWord(word);
        await manager.startGame({ startWord: 'test' });
      }

      expect(lastResult?.achievements).toContainEqual(
        expect.objectContaining({
          id: 'dead_end_collector',
          progress: 5,
          completed: true
        })
      );
    });
  });

  describe('Error Handling and Validation', () => {
    beforeEach(() => {
      manager.setUserId('test-user');
    });

    it('should handle invalid words', async () => {
      await manager.startGame({ startWord: 'test' });

      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Word does not follow chain rule',
        isTerminal: false
      });

      const result = await manager.submitWord('invalid');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Word does not follow chain rule');

      const state = manager.getGameState();
      expect(state.invalidAttempts).toBe(1);
      expect(state.chain).toEqual(['test']);
    });

    it('should handle non-existent words', async () => {
      await manager.startGame({ startWord: 'test' });

      (dictionaryAccess.isValidWord as jest.Mock).mockResolvedValue(false);
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Word not found in dictionary',
        isTerminal: false
      });

      const result = await manager.submitWord('xyz123');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Word not found in dictionary');
    });

    it('should handle duplicate words', async () => {
      await manager.startGame({ startWord: 'test' });

      // First submission succeeds
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      await manager.submitWord('tent');

      // Second submission of same word fails
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Word already used in chain',
        isTerminal: false
      });
      const result = await manager.submitWord('tent');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Word already used in chain');
    });

    it('should handle empty word submission', async () => {
      await manager.startGame({ startWord: 'test' });

      const result = await manager.submitWord('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Word cannot be empty');
    });

    it('should handle missing user ID', async () => {
      await manager.startGame({ startWord: 'test' });
      manager.setUserId(''); // Clear user ID

      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });

      const result = await manager.submitWord('tent');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('User not authenticated');
    });

    it('should handle validation service errors', async () => {
      await manager.startGame({ startWord: 'test' });

      const error = new Error('Validation service unavailable');
      (chainValidator.validateNextWord as jest.Mock).mockRejectedValue(error);

      const result = await manager.submitWord('tent');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Validation service error');
    });

    it('should handle dictionary service errors', async () => {
      await manager.startGame({ startWord: 'test' });

      const error = new Error('Dictionary service unavailable');
      (dictionaryAccess.isValidWord as jest.Mock).mockRejectedValue(error);

      const result = await manager.submitWord('tent');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Dictionary service error');
    });

    it('should handle game completion errors', async () => {
      await manager.startGame({ startWord: 'test' });

      // Set up terminal word scenario
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: true,
        error: null
      });

      // Mock save error
      const error = new Error('Failed to save game state');
      (gameStateService.saveGameState as jest.Mock).mockRejectedValue(error);

      const result = await manager.submitWord('jazz');
      expect(result.valid).toBe(true);
      expect(result.gameComplete).toBe(true);
      // Game should complete despite save error
      expect(manager.getGameState().isComplete).toBe(true);
    });

    it('should handle concurrent word submissions', async () => {
      await manager.startGame({ startWord: 'test' });

      // Setup delayed validation responses
      (chainValidator.validateNextWord as jest.Mock)
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            valid: true,
            isTerminal: false,
            error: null
          }), 100))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            valid: false,
            error: 'Previous submission still processing',
            isTerminal: false
          }), 50))
        );

      // Submit words concurrently
      const [result1, result2] = await Promise.all([
        manager.submitWord('tent'),
        manager.submitWord('test')
      ]);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result2.reason).toBe('Previous submission still processing');
    });

    it('should handle validation timeout', async () => {
      await manager.startGame({ startWord: 'test' });

      // Mock validation timeout
      (chainValidator.validateNextWord as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          valid: false,
          error: 'Validation timed out',
          isTerminal: false
        }), 5000)) // 5 seconds
      );

      const result = await manager.submitWord('tent');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Validation timed out');
    });
  });

  describe('Scoring and Statistics', () => {
    beforeEach(() => {
      manager.setUserId('test-user');
    });

    it('should calculate base word points correctly', async () => {
      await manager.startGame({ startWord: 'test' });

      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['t', 'e', 's', 'n']),
        rareLetters: [],
        averageWordLength: 4,
        longestWord: 'tent',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: [],
        branchingFactors: [2, 1],
        pathDifficulty: 'easy'
      });

      const result = await manager.submitWord('tent');
      expect(result.score.total).toBeGreaterThan(0);
      expect(result.score.wordScores['tent'].base).toBe(10); // Base points
    });

    it('should award length bonus for longer words', async () => {
      await manager.startGame({ startWord: 'test' });

      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['t', 'e', 's', 't', 'i', 'n', 'g']),
        rareLetters: [],
        averageWordLength: 7,
        longestWord: 'testing',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: [],
        branchingFactors: [2, 1],
        pathDifficulty: 'easy'
      });

      const result = await manager.submitWord('testing');
      expect(result.score.total).toBeGreaterThan(10); // Base points + length bonus
      expect(result.score.wordScores['testing'].length).toBeGreaterThan(0); // Length bonus
    });

    it('should award rare letter bonus', async () => {
      await manager.startGame({ startWord: 'test' });

      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['q', 'u', 'i', 'z']),
        rareLetters: ['q', 'z'],
        averageWordLength: 4,
        longestWord: 'quiz',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: [],
        branchingFactors: [2, 1],
        pathDifficulty: 'hard'
      });

      const result = await manager.submitWord('quiz');
      expect(result.score.total).toBeGreaterThan(30); // Base points + rare letter bonus
      expect(result.score.wordScores['quiz'].rareLetters).toBeGreaterThan(0); // Rare letter bonus
    });

    it('should award streak bonus for consecutive quick moves', async () => {
      await manager.startGame({ startWord: 'test' });

      // Submit words quickly to build streak
      const words = ['tent', 'next', 'time'];
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length + 1,
          uniqueLetters: new Set(word.split('')),
          rareLetters: [],
          averageWordLength: 4,
          longestWord: word,
          currentStreak: words.length + 1,
          maxStreak: words.length + 1,
          terminalWords: [],
          branchingFactors: Array(words.length + 1).fill(2),
          pathDifficulty: 'easy'
        });

        const result = await manager.submitWord(word);
        expect(result.score.wordScores[word].streak).toBeGreaterThan(0);
      }

      const state = manager.getGameState();
      expect(state.stats.currentStreak).toBe(4); // Including start word
      expect(state.score.multiplier).toBeGreaterThan(1);
    });

    it('should award speed bonus for quick moves', async () => {
      await manager.startGame({ startWord: 'test' });

      // Submit a word quickly
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['t', 'e', 'n', 't']),
        rareLetters: [],
        averageWordLength: 4,
        longestWord: 'tent',
        currentStreak: 2,
        maxStreak: 2,
        terminalWords: [],
        branchingFactors: [2, 1],
        pathDifficulty: 'easy'
      });

      // Mock a quick move (under 5 seconds)
      const result = await manager.submitWord('tent');
      expect(result.score.wordScores['tent'].speed).toBeGreaterThan(0);
    });

    it('should not award speed bonus for slow moves', async () => {
      await manager.startGame({ startWord: 'test' });

      // Submit a word slowly
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: 2,
        uniqueLetters: new Set(['t', 'e', 'n', 't']),
        rareLetters: [],
        averageWordLength: 4,
        longestWord: 'tent',
        currentStreak: 1,
        maxStreak: 1,
        terminalWords: [],
        branchingFactors: [2, 1],
        pathDifficulty: 'easy'
      });

      // Mock a slow move (over 5 seconds)
      const result = await manager.submitWord('tent');
      expect(result.score.wordScores['tent'].speed).toBe(0);
    });

    it('should reset streak after slow move', async () => {
      await manager.startGame({ startWord: 'test' });

      // Build a streak with quick moves
      const words = ['tent', 'next'];
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length + 1,
          uniqueLetters: new Set(word.split('')),
          rareLetters: [],
          averageWordLength: 4,
          longestWord: word,
          currentStreak: words.length + 1,
          maxStreak: words.length + 1,
          terminalWords: [],
          branchingFactors: Array(words.length + 1).fill(2),
          pathDifficulty: 'easy'
        });
        await manager.submitWord(word);
      }

      // Make a slow move
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
        length: words.length + 2,
        uniqueLetters: new Set(['t', 'i', 'm', 'e']),
        rareLetters: [],
        averageWordLength: 4,
        longestWord: 'time',
        currentStreak: 1,
        maxStreak: words.length + 1,
        terminalWords: [],
        branchingFactors: Array(words.length + 2).fill(2),
        pathDifficulty: 'easy'
      });

      const result = await manager.submitWord('time');
      expect(result.score.wordScores['time'].streak).toBe(0);
      expect(result.score.multiplier).toBe(1);
    });

    it('should track unique letters used', async () => {
      await manager.startGame({ startWord: 'test' });

      const words = ['quick', 'brown', 'jumps'];
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length + 1,
          uniqueLetters: new Set(words.join('').split('')),
          rareLetters: ['q', 'j'],
          averageWordLength: 5,
          longestWord: 'quick',
          currentStreak: words.length + 1,
          maxStreak: words.length + 1,
          terminalWords: [],
          branchingFactors: Array(words.length + 1).fill(2),
          pathDifficulty: 'hard'
        });
        await manager.submitWord(word);
      }

      const state = manager.getGameState();
      expect(state.stats.uniqueLetters.size).toBeGreaterThan(10);
      expect(state.stats.rareLetters).toContain('q');
      expect(state.stats.rareLetters).toContain('j');
    });

    it('should calculate average word length', async () => {
      await manager.startGame({ startWord: 'test' });

      const words = ['quick', 'jumping', 'excellent'];
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length + 1,
          uniqueLetters: new Set(words.join('').split('')),
          rareLetters: ['q', 'x'],
          averageWordLength: words.reduce((sum, w) => sum + w.length, 4) / (words.length + 1),
          longestWord: 'excellent',
          currentStreak: words.length + 1,
          maxStreak: words.length + 1,
          terminalWords: [],
          branchingFactors: Array(words.length + 1).fill(2),
          pathDifficulty: 'hard'
        });
        await manager.submitWord(word);
      }

      const state = manager.getGameState();
      expect(state.stats.averageWordLength).toBeGreaterThan(5);
      expect(state.stats.longestWord).toBe('excellent');
    });

    it('should track branching factors', async () => {
      await manager.startGame({ startWord: 'test' });

      const words = ['tent', 'next', 'time'];
      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        (chainValidator.getChainStats as jest.Mock).mockResolvedValue({
          length: words.length + 1,
          uniqueLetters: new Set(words.join('').split('')),
          rareLetters: [],
          averageWordLength: 4,
          longestWord: 'test',
          currentStreak: words.length + 1,
          maxStreak: words.length + 1,
          terminalWords: [],
          branchingFactors: [3, 2, 1, 0],
          pathDifficulty: 'medium'
        });
        await manager.submitWord(word);
      }

      const state = manager.getGameState();
      expect(state.stats.branchingFactors).toEqual([3, 2, 1, 0]);
      expect(state.stats.pathDifficulty).toBe('medium');
    });

    it('should handle score penalties', async () => {
      await manager.startGame({ startWord: 'test' });

      // Invalid attempt
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Invalid word',
        isTerminal: false
      });
      await manager.submitWord('invalid');

      // Use hint
      (powerUpSystem.useHint as jest.Mock).mockResolvedValue({
        success: true,
        data: { hints: ['tent'] }
      });
      await manager.useHint();

      // Valid word after hint
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
        valid: true,
        isTerminal: false,
        error: null
      });
      const result = await manager.submitWord('tent');

      expect(result.score.total).toBeLessThan(10); // Base points - penalties
      expect(result.score.penalties).toBeLessThan(0); // Negative penalties
      expect(result.score.wordScores['tent'].total).toBeLessThan(10); // Base points - penalties
    });

    it('should persist scoring history', async () => {
      await manager.startGame({ startWord: 'test' });

      // Submit multiple words
      const words = ['tent', 'next', 'time'];
      const scores: number[] = [];

      for (const word of words) {
        (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({
          valid: true,
          isTerminal: false,
          error: null
        });
        const result = await manager.submitWord(word);
        scores.push(result.score.total);
      }

      // Save game state
      const savedState: SavedGameState = {
        id: 'test-game',
        userId: 'test-user',
        lastSaved: new Date().toISOString(),
        version: 1,
        state: {
          mode: 'endless',
          chain: ['test', ...words],
          startWord: 'test',
          score: {
            total: scores[scores.length - 1],
            wordScores: {},
            multiplier: 1,
            terminalBonus: 0,
            dailyBonus: 0,
            penalties: 0
          },
          stats: {
            length: words.length + 1,
            uniqueLetters: new Set(['t', 'e', 's', 't']),
            rareLetters: [],
            averageWordLength: 4,
            longestWord: 'test',
            currentStreak: words.length + 1,
            maxStreak: words.length + 1,
            terminalWords: [],
            branchingFactors: Array(words.length + 1).fill(2),
            pathDifficulty: 'easy'
          },
          isComplete: false,
          startTime: Date.now() - 1000,
          lastMoveTime: Date.now(),
          hintsUsed: 0,
          invalidAttempts: 0,
          wordTimings: new Map(words.map((word, i) => [word, 1000 * (i + 1)])),
          terminalWords: new Set(),
          powerUpsUsed: new Set(),
          rareLettersUsed: new Set(),
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
          }
        }
      };

      // Resume game
      (gameStateService.loadGameState as jest.Mock).mockResolvedValue(savedState);
      await manager.resumeGame('test-game');

      const state = manager.getGameState();
      expect(state.score.total).toBe(scores[scores.length - 1]);
      expect(state.chain).toEqual(['test', ...words]);
    });
  });
}); 