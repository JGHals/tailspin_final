import { dictionaryAccess } from '../dictionary-access';
import { jest } from '@jest/globals';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../../lib/firebase/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn()
}));

describe('Dictionary Access Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock metadata document
    (getDoc as jest.Mock).mockImplementation(async (docRef: any) => {
      if (docRef.path === 'dictionary/metadata') {
        return {
          exists: () => true,
          data: () => ({
            totalWords: 359032,
            prefixCounts: {
              'ap': 100,
              'ba': 100,
              'ch': 100,
              'te': 2929,
              'pu': 23,
              'le': 100,
              'al': 100,
              'ce': 100,
              'zz': 0,
              'he': 100
            }
          })
        };
      }
      return { exists: () => false };
    });

    // Mock word documents
    (getDocs as jest.Mock).mockImplementation(async (query: any) => {
      const prefix = query._queryConstraints[0]._value as keyof typeof wordsByPrefix;
      const wordsByPrefix = {
        'ap': ['apple'],
        'ba': ['banana'],
        'ch': ['cherry'],
        'te': ['te', 'tea', 'teaberry', 'teaberries', 'teaboard'],
        'pu': ['puzzle', 'puzzleation', 'puzzled', 'puzzledly', 'puzzledness'],
        'le': ['lethal', 'lemon'],
        'al': ['al', 'ala', 'alabama', 'alabaman', 'alabamian'],
        'ce': ['ce', 'ceanothus', 'cearin', 'cease', 'ceased'],
        'zz': [],
        'he': ['he', 'head', 'heal', 'health', 'healthy']
      };
      const words = wordsByPrefix[prefix] || [];

      return {
        empty: words.length === 0,
        forEach: (callback: (doc: any) => void) => {
          callback({
            data: () => ({ words })
          });
        }
      };
    });
  });

  describe('isValidWord', () => {
    const testCases = [
      { word: 'apple', expected: true, description: 'common word' },
      { word: 'puzzle', expected: true, description: 'game example word' },
      { word: 'lethal', expected: true, description: 'game example word' },
      { word: 'alliance', expected: true, description: 'game example word' },
      { word: 'notaword', expected: false, description: 'invalid word' },
      { word: 'a', expected: false, description: 'too short' },
      { word: 'supercalifragilisticexpialidocious', expected: false, description: 'too long' }
    ];

    testCases.forEach(({ word, expected, description }) => {
      test(`validates ${description}: "${word}"`, async () => {
        const result = await dictionaryAccess.isValidWord(word);
        console.log(`"${word}" is ${result ? 'valid' : 'invalid'}`);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getWordsWithPrefix', () => {
    const prefixes = ['ap', 'ba', 'ch', 'te', 'puz'];

    prefixes.forEach(prefix => {
      test(`finds words starting with "${prefix}"`, async () => {
        const words = await dictionaryAccess.getWordsWithPrefix(prefix);
        console.log(`Words with prefix "${prefix}": ${words.slice(0, 5).join(', ')}${words.length > 5 ? '...' : ''} (${words.length} total)`);
        expect(Array.isArray(words)).toBe(true);
        words.forEach(word => {
          expect(word.startsWith(prefix)).toBe(true);
        });
      });
    });

    test('returns empty array for short prefix', async () => {
      const words = await dictionaryAccess.getWordsWithPrefix('a');
      expect(words).toEqual([]);
    });
  });

  describe('findNextValidWords', () => {
    const chainWords = ['puzzle', 'lethal', 'alliance'];

    chainWords.forEach(word => {
      test(`finds valid next words after "${word}"`, async () => {
        const lastTwo = word.slice(-2);
        const nextWords = await dictionaryAccess.findNextValidWords(word);
        console.log(`Valid words after "${word}": ${nextWords.slice(0, 5).join(', ')}${nextWords.length > 5 ? '...' : ''} (${nextWords.length} total)`);
        expect(Array.isArray(nextWords)).toBe(true);
        nextWords.forEach(nextWord => {
          expect(nextWord.startsWith(lastTwo)).toBe(true);
        });
      });
    });
  });

  describe('isTerminalWord', () => {
    const testCases = [
      { word: 'jazz', expected: true, description: 'likely terminal (ends in zz)' },
      { word: 'the', expected: false, description: 'common non-terminal' },
      { word: 'puzzle', expected: false, description: 'game example word' }
    ];

    testCases.forEach(({ word, expected, description }) => {
      test(`correctly identifies ${description}: "${word}"`, async () => {
        const isTerminal = await dictionaryAccess.isTerminalWord(word);
        console.log(`"${word}" is ${isTerminal ? 'a terminal word' : 'not a terminal word'}`);
        expect(isTerminal).toBe(expected);
      });
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    // Wait for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
}); 