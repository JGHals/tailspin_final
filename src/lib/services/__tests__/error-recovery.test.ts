import { ErrorRecoveryService } from '../error-recovery';
import { chainValidator } from '../../game/chain-validator';
import type { GameState } from '../../types/game';

// Mock chainValidator
jest.mock('../../game/chain-validator', () => ({
  validateNextWord: jest.fn(),
  isTerminalPosition: jest.fn()
}));

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let mockState: GameState;

  beforeEach(() => {
    service = new ErrorRecoveryService();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock game state
    mockState = {
      mode: 'endless',
      chain: ['puzzle', 'lethal', 'alliance'],
      startWord: 'puzzle',
      isComplete: false,
      score: {
        total: 0,
        wordPoints: 0,
        chainPoints: 0,
        bonusPoints: 0,
        terminalPoints: 0
      },
      wordTimings: new Map([
        ['puzzle', Date.now() - 20000],
        ['lethal', Date.now() - 10000],
        ['alliance', Date.now()]
      ]),
      terminalWords: new Set(),
      startTime: Date.now() - 30000,
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
          usedLetters: new Set(['p', 'u', 'z', 'l', 'e']),
          rareLettersUsed: new Set(['z']),
          uniqueLetterCount: 5,
          rareLetterCount: 1
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
    };
  });

  describe('validateState', () => {
    it('should validate a correct state without errors', async () => {
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });
      
      const result = await service.validateState(mockState);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid words in chain', async () => {
      (chainValidator.validateNextWord as jest.Mock)
        .mockResolvedValueOnce({ valid: true })
        .mockResolvedValueOnce({ valid: false, reason: 'Invalid word' });
      
      const result = await service.validateState(mockState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid word at position 2: alliance');
    });

    it('should detect missing timing data', async () => {
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });
      mockState.wordTimings.delete('lethal');
      
      const result = await service.validateState(mockState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing timing data for word: lethal');
    });

    it('should detect missing UI tracking data', async () => {
      (chainValidator.validateNextWord as jest.Mock).mockResolvedValue({ valid: true });
      mockState.ui.letterTracking = undefined as any;
      
      const result = await service.validateState(mockState);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing letter tracking data');
    });
  });

  describe('attemptRecovery', () => {
    it('should recover from invalid chain state', async () => {
      (chainValidator.validateNextWord as jest.Mock)
        .mockResolvedValueOnce({ valid: true })
        .mockResolvedValueOnce({ valid: true })
        .mockResolvedValueOnce({ valid: false });
      
      const error = { message: 'invalid chain state' };
      const result = await service.attemptRecovery(error, mockState);
      
      expect(result.recovered).toBe(true);
      expect(result.state.chain).toHaveLength(2);
      expect(result.state.lastError).toContain('Chain was corrupted');
    });

    it('should recover from missing word timings', async () => {
      mockState.wordTimings.clear();
      const error = { message: 'missing word timings' };
      
      const result = await service.attemptRecovery(error, mockState);
      
      expect(result.recovered).toBe(true);
      expect(result.state.wordTimings.size).toBe(mockState.chain.length);
      expect(result.state.lastError).toContain('Word timings were missing');
    });

    it('should recover from corrupted UI state', async () => {
      mockState.ui.letterTracking = undefined as any;
      const error = { message: 'corrupted UI state' };
      
      const result = await service.attemptRecovery(error, mockState);
      
      expect(result.recovered).toBe(true);
      expect(result.state.ui.letterTracking).toBeDefined();
      expect(result.state.ui.letterTracking.usedLetters.size).toBeGreaterThan(0);
      expect(result.state.lastError).toContain('UI state was corrupted');
    });

    it('should handle unrecoverable errors', async () => {
      const error = { message: 'unknown error' };
      const result = await service.attemptRecovery(error, mockState);
      
      expect(result.recovered).toBe(false);
      expect(result.state).toBe(mockState);
    });

    it('should maintain game mode and essential data after recovery', async () => {
      const error = { message: 'corrupted UI state' };
      const result = await service.attemptRecovery(error, mockState);
      
      expect(result.state.mode).toBe(mockState.mode);
      expect(result.state.startWord).toBe(mockState.startWord);
      expect(result.state.startTime).toBe(mockState.startTime);
    });
  });
}); 