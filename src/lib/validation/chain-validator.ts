import { DictionaryService } from '../dictionary/dictionary-service';

export class ChainValidator {
  private dictionary: DictionaryService;

  constructor(dictionary: DictionaryService) {
    this.dictionary = dictionary;
  }

  validateChain(chain: string[]): ValidationResult {
    if (!chain.length) {
      return { isValid: false, error: 'Chain cannot be empty' };
    }

    // Check for duplicates
    const uniqueWords = new Set(chain.map(word => word.toLowerCase()));
    if (uniqueWords.size !== chain.length) {
      return { isValid: false, error: 'Chain contains duplicate words' };
    }

    // Validate each word and chain rule
    for (let i = 0; i < chain.length; i++) {
      const word = chain[i].toLowerCase();

      // Validate word exists in dictionary
      if (!this.dictionary.isValidWord(word)) {
        return { isValid: false, error: `Invalid word: ${word}` };
      }

      // Validate chain rule (except for first word)
      if (i > 0) {
        const prevWord = chain[i - 1].toLowerCase();
        const lastTwoLetters = prevWord.slice(-2);
        if (!word.startsWith(lastTwoLetters)) {
          return { 
            isValid: false, 
            error: `Chain rule violation between: ${prevWord} and ${word}` 
          };
        }
      }
    }

    return { isValid: true };
  }

  isTerminalWord(word: string): boolean {
    if (!this.dictionary.isValidWord(word)) {
      return false;
    }

    const lastTwoLetters = word.slice(-2).toLowerCase();
    return this.dictionary.getWordsWithPrefix(lastTwoLetters).length === 0;
  }

  findPossibleNextWords(currentWord: string): string[] {
    if (!this.dictionary.isValidWord(currentWord)) {
      return [];
    }

    const lastTwoLetters = currentWord.slice(-2).toLowerCase();
    return this.dictionary.getWordsWithPrefix(lastTwoLetters);
  }
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
} 