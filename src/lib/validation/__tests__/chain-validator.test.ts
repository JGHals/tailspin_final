import { ChainValidator } from '../chain-validator';
import { DictionaryService } from '../../dictionary/dictionary-service';
import { mockWordList, mockValidChains, mockInvalidChains, mockTerminalWords } from '../../test-utils/mock-data';

describe('ChainValidator', () => {
  let validator: ChainValidator;
  let dictionary: DictionaryService;

  beforeEach(async () => {
    dictionary = new DictionaryService();
    await dictionary.initialize(mockWordList);
    validator = new ChainValidator(dictionary);
  });

  describe('Chain Validation', () => {
    it('should validate empty chain', () => {
      const result = validator.validateChain([]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Chain cannot be empty');
    });

    it('should validate single word chain', () => {
      const result = validator.validateChain(['puzzle']);
      expect(result.isValid).toBe(true);
    });

    it('should validate valid chains', () => {
      mockValidChains.forEach(chain => {
        const result = validator.validateChain(chain);
        console.log('Testing chain:', chain);
        console.log('Validation result:', result);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject chains with invalid words', () => {
      const result = validator.validateChain(['puzzle', 'xyz123']);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid word');
    });

    it('should reject chains with duplicate words', () => {
      const result = validator.validateChain(['puzzle', 'lethal', 'puzzle']);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Chain contains duplicate words');
    });

    it('should reject chains breaking the chain rule', () => {
      mockInvalidChains.forEach(chain => {
        const result = validator.validateChain(chain);
        expect(result.isValid).toBe(false);
      });
    });

    it('should handle case-insensitive validation', () => {
      const result = validator.validateChain(['PUZZLE', 'lethal', 'ALLIANCE']);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Terminal Word Detection', () => {
    it('should identify terminal words', () => {
      mockTerminalWords.forEach(word => {
        expect(validator.isTerminalWord(word)).toBe(true);
      });
    });

    it('should reject non-terminal words', () => {
      ['puzzle', 'lethal', 'alliance'].forEach(word => {
        expect(validator.isTerminalWord(word)).toBe(false);
      });
    });

    it('should handle invalid words in terminal check', () => {
      expect(validator.isTerminalWord('xyz123')).toBe(false);
    });
  });

  describe('Next Word Suggestions', () => {
    it('should find possible next words', () => {
      const nextWords = validator.findPossibleNextWords('puzzle');
      expect(nextWords).toContain('lethal');
    });

    it('should return empty array for invalid words', () => {
      const nextWords = validator.findPossibleNextWords('xyz123');
      expect(nextWords).toHaveLength(0);
    });

    it('should return empty array for terminal words', () => {
      mockTerminalWords.forEach(word => {
        const nextWords = validator.findPossibleNextWords(word);
        expect(nextWords).toHaveLength(0);
      });
    });

    it('should handle case-insensitive word suggestions', () => {
      const nextWords = validator.findPossibleNextWords('PUZZLE');
      expect(nextWords).toContain('lethal');
    });
  });
}); 