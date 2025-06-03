import { GameChainValidator } from '../chain-validator';
import { mockWordList, mockValidChains, mockInvalidChains, mockTerminalWords } from '../../test-utils/mock-data';
import { dictionaryAccess } from '../../dictionary/dictionary-access';

jest.mock('../../dictionary/dictionary-access', () => ({
  dictionaryAccess: {
    isValidWord: jest.fn(),
    findNextValidWords: jest.fn(),
    initialize: jest.fn()
  }
}));

describe('GameChainValidator - Basic Validation', () => {
  let validator: GameChainValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new GameChainValidator();
    
    // Setup mock dictionary responses
    (dictionaryAccess.isValidWord as jest.Mock).mockImplementation(
      (word: string) => Promise.resolve(mockWordList.includes(word.toLowerCase()))
    );
    (dictionaryAccess.findNextValidWords as jest.Mock).mockImplementation(
      (word: string) => {
        const lastTwo = word.slice(-2).toLowerCase();
        return Promise.resolve(
          mockWordList.filter(w => w.startsWith(lastTwo) && w !== word.toLowerCase())
        );
      }
    );
  });

  describe('Chain Validation', () => {
    it('should validate empty chain', async () => {
      const result = await validator.validateChain([]);
      expect(result).toBe(false);
    });

    it('should validate single word chain', async () => {
      const result = await validator.validateChain(['puzzle']);
      expect(result).toBe(true);
    });

    it('should validate valid chains', async () => {
      for (const chain of mockValidChains) {
        const result = await validator.validateChain(chain);
        expect(result).toBe(true);
      }
    });

    it('should reject chains with invalid words', async () => {
      const result = await validator.validateChain(['puzzle', 'xyz123']);
      expect(result).toBe(false);
    });

    it('should reject chains with duplicate words', async () => {
      const result = await validator.validateChain(['puzzle', 'lethal', 'puzzle']);
      expect(result).toBe(false);
    });

    it('should reject chains breaking the chain rule', async () => {
      for (const chain of mockInvalidChains) {
        const result = await validator.validateChain(chain);
        expect(result).toBe(false);
      }
    });

    it('should handle case-insensitive validation', async () => {
      const result = await validator.validateChain(['PUZZLE', 'lethal', 'ALLIANCE']);
      expect(result).toBe(true);
    });
  });

  describe('Terminal Word Detection', () => {
    it('should identify terminal words', async () => {
      for (const word of mockTerminalWords) {
        const result = await validator.isTerminalPosition(word);
        expect(result).toBe(true);
      }
    });

    it('should reject non-terminal words', async () => {
      for (const word of ['puzzle', 'lethal', 'alliance']) {
        const result = await validator.isTerminalPosition(word);
        expect(result).toBe(false);
      }
    });

    it('should handle invalid words in terminal check', async () => {
      const result = await validator.isTerminalPosition('xyz123');
      expect(result).toBe(true); // Invalid words are considered terminal
    });
  });

  describe('Next Word Suggestions', () => {
    it('should find possible next words', async () => {
      const nextWords = await validator.findPossibleNextWords('puzzle');
      expect(nextWords).toContain('lethal');
    });

    it('should return empty array for invalid words', async () => {
      const nextWords = await validator.findPossibleNextWords('xyz123');
      expect(nextWords).toHaveLength(0);
    });

    it('should return empty array for terminal words', async () => {
      for (const word of mockTerminalWords) {
        const nextWords = await validator.findPossibleNextWords(word);
        expect(nextWords).toHaveLength(0);
      }
    });

    it('should handle case-insensitive word suggestions', async () => {
      const nextWords = await validator.findPossibleNextWords('PUZZLE');
      expect(nextWords).toContain('lethal');
    });
  });

  // Additional tests for async-specific behavior
  describe('Async Behavior', () => {
    it('should handle concurrent validation requests', async () => {
      const promises = mockValidChains.map(chain => validator.validateChain(chain));
      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);
    });

    it('should maintain state correctly during async operations', async () => {
      // First validation
      await validator.validateChain(['puzzle', 'lethal']);
      
      // Concurrent operations
      const [nextWords, isTerminal] = await Promise.all([
        validator.findPossibleNextWords('lethal'),
        validator.isTerminalPosition('lethal')
      ]);

      expect(Array.isArray(nextWords)).toBe(true);
      expect(typeof isTerminal).toBe('boolean');
    });
  });

  // Additional tests for enhanced features
  describe('Enhanced Validation Features', () => {
    it('should provide detailed validation results', async () => {
      const result = await validator.validateNextWord(['puzzle'], 'lethal');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result.valid).toBe(true);
    });

    it('should track used words across validations', async () => {
      await validator.validateChain(['puzzle', 'lethal']);
      const result = await validator.validateNextWord(['puzzle', 'lethal'], 'lethal');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('already used');
    });

    it('should reset state correctly', async () => {
      await validator.validateChain(['puzzle', 'lethal']);
      validator.resetUsedWords();
      const result = await validator.validateNextWord([], 'puzzle');
      expect(result.valid).toBe(true);
    });
  });
}); 