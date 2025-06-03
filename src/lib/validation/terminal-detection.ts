import { dictionaryAccess } from '../dictionary/dictionary-access';
import { WordValidationResult, ValidationError } from '../types/validation';

/**
 * Known terminal combinations that no valid English word starts with
 * This is used for quick rejection before dictionary lookup
 */
const KNOWN_TERMINAL_COMBOS = new Set([
  'ng', 'ly', 'ed', 'ck', 'ft', 'xt', 'mp'
  // Add more as discovered
]);

/**
 * Checks if a word is terminal (no valid words can follow it in the chain)
 * 
 * The check is performed in two stages for efficiency:
 * 1. Quick check against known terminal combinations
 * 2. Dictionary lookup for words starting with the last two letters
 * 
 * This staged approach helps avoid unnecessary dictionary lookups
 * for common terminal combinations.
 * 
 * @param word - The word to check for terminal status
 * @returns Validation result with terminal status and explanation
 */
export async function isTerminalWord(word: string): Promise<WordValidationResult> {
  const result: WordValidationResult = {
    isValid: true, // Terminal words are still valid words
    word,
    isTerminalWord: false,
    errors: []
  };

  if (!word || word.length < 2) {
    result.isValid = false;
    result.errors?.push({
      type: 'length',
      message: 'Word must be at least 2 letters long'
    });
    return result;
  }

  const lastTwoLetters = word.slice(-2).toLowerCase();

  // Quick check against known terminal combinations
  if (KNOWN_TERMINAL_COMBOS.has(lastTwoLetters)) {
    result.isTerminalWord = true;
    return result;
  }

  // Check dictionary for possible next words
  const nextWords = await dictionaryAccess.getWordsWithPrefix(lastTwoLetters);
  result.isTerminalWord = nextWords.length === 0;

  // Add explanation if it's a terminal word
  if (result.isTerminalWord) {
    result.errors?.push({
      type: 'terminal',
      message: `No valid words start with "${lastTwoLetters}"`,
      details: 'This is a terminal word - it ends the chain'
    });
  }

  return result;
}

/**
 * Helper function to check if a two-letter combination is known to be terminal
 * This is used for quick checks without dictionary access
 */
export function isTerminalCombo(combo: string): boolean {
  return KNOWN_TERMINAL_COMBOS.has(combo.toLowerCase());
}

/**
 * Gets all possible next words that could follow the given word
 * Returns empty array if it's a terminal word
 */
export async function getNextPossibleWords(word: string): Promise<string[]> {
  if (!word || word.length < 2) return [];
  
  const lastTwoLetters = word.slice(-2).toLowerCase();
  
  // Quick check for known terminal combos
  if (isTerminalCombo(lastTwoLetters)) {
    return [];
  }

  return dictionaryAccess.getWordsWithPrefix(lastTwoLetters);
}

// Example usage:
/*
const result = await isTerminalWord('walking');
if (result.isTerminalWord) {
  console.log(`"${result.word}" is terminal: ${result.errors?.[0]?.message}`);
} else {
  console.log(`"${result.word}" can be continued in the chain`);
}
*/ 