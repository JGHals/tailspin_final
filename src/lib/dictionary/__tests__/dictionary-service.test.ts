import { DictionaryService } from '../dictionary-service';
import { mockWordList } from '../../test-utils/mock-data';

describe('DictionaryService', () => {
  let dictionaryService: DictionaryService;
  
  beforeEach(() => {
    dictionaryService = new DictionaryService();
  });

  describe('Initialization', () => {
    it('should initialize with an empty dictionary', () => {
      expect(dictionaryService.size()).toBe(0);
    });

    it('should load dictionary data successfully', async () => {
      await dictionaryService.initialize(mockWordList);
      expect(dictionaryService.size()).toBe(mockWordList.length);
    });

    it('should handle empty word list gracefully', async () => {
      await dictionaryService.initialize([]);
      expect(dictionaryService.size()).toBe(0);
    });

    it('should deduplicate words during initialization', async () => {
      const duplicateWords = ['test', 'test', 'best', 'best'];
      await dictionaryService.initialize(duplicateWords);
      expect(dictionaryService.size()).toBe(2);
    });
  });

  describe('Word Validation', () => {
    beforeEach(async () => {
      await dictionaryService.initialize(mockWordList);
    });

    it('should validate existing words', () => {
      expect(dictionaryService.isValidWord('puzzle')).toBe(true);
    });

    it('should reject non-existent words', () => {
      expect(dictionaryService.isValidWord('xyzabc')).toBe(false);
    });

    it('should handle case-insensitive validation', () => {
      expect(dictionaryService.isValidWord('PuZzLe')).toBe(true);
    });

    it('should reject words with special characters', () => {
      expect(dictionaryService.isValidWord('puzzle!')).toBe(false);
    });
  });

  describe('Prefix/Suffix Operations', () => {
    beforeEach(async () => {
      await dictionaryService.initialize(mockWordList);
    });

    it('should find words starting with prefix', () => {
      const words = dictionaryService.getWordsWithPrefix('puz');
      expect(words).toContain('puzzle');
    });

    it('should find words ending with suffix', () => {
      const words = dictionaryService.getWordsWithSuffix('zle');
      expect(words).toContain('puzzle');
    });

    it('should return empty array for non-existent prefix', () => {
      const words = dictionaryService.getWordsWithPrefix('xyz');
      expect(words).toHaveLength(0);
    });

    it('should return empty array for non-existent suffix', () => {
      const words = dictionaryService.getWordsWithSuffix('xyz');
      expect(words).toHaveLength(0);
    });

    it('should handle empty prefix/suffix', () => {
      expect(dictionaryService.getWordsWithPrefix('')).toEqual([]);
      expect(dictionaryService.getWordsWithSuffix('')).toEqual([]);
    });

    it('should handle null/undefined prefix/suffix', () => {
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.getWordsWithPrefix(null)).toEqual([]);
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.getWordsWithSuffix(undefined)).toEqual([]);
    });

    it('should validate two-letter chain rule', () => {
      expect(dictionaryService.isValidChainPair('puzzle', 'lethal')).toBe(true);
      expect(dictionaryService.isValidChainPair('puzzle', 'castle')).toBe(false);
    });

    it('should handle invalid words in chain rule validation', () => {
      expect(dictionaryService.isValidChainPair('xyz123', 'lethal')).toBe(false);
      expect(dictionaryService.isValidChainPair('puzzle', 'xyz123')).toBe(false);
    });

    it('should handle null/undefined in chain rule validation', () => {
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.isValidChainPair(null, 'lethal')).toBe(false);
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.isValidChainPair('puzzle', undefined)).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle initialization with invalid words', async () => {
      const invalidWords = ['test!', 'word@', '123', '', ' '];
      await dictionaryService.initialize(invalidWords);
      expect(dictionaryService.size()).toBe(0);
    });

    it('should handle initialization with mixed valid/invalid words', async () => {
      const mixedWords = ['test', 'word@', 'valid', '123'];
      await dictionaryService.initialize(mixedWords);
      expect(dictionaryService.size()).toBe(2);
      expect(dictionaryService.isValidWord('test')).toBe(true);
      expect(dictionaryService.isValidWord('valid')).toBe(true);
    });

    it('should handle null/undefined in word validation', () => {
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.isValidWord(null)).toBe(false);
      // @ts-ignore - Testing null/undefined handling
      expect(dictionaryService.isValidWord(undefined)).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large word lists efficiently', async () => {
      const largeWordList = Array.from({ length: 10000 }, (_, i) => `word${i}`);
      const startTime = performance.now();
      await dictionaryService.initialize(largeWordList);
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should init in under 1s
    });

    it('should handle concurrent operations safely', async () => {
      const ops = [
        dictionaryService.initialize(mockWordList),
        dictionaryService.isValidWord('test'),
        dictionaryService.getWordsWithPrefix('te')
      ];
      await expect(Promise.all(ops)).resolves.not.toThrow();
    });
  });
}); 