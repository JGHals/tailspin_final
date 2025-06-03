import { dictionaryAccess } from '../dictionary/dictionary-access';
import { VALID_STARTING_COMBOS } from './constants';
import { 
  WordValidationResult, 
  ValidationError, 
  WordStats, 
  ValidationErrorType,
  ChainValidationResult
} from '../types/validation';

const RARE_LETTERS = new Set(['Q', 'Z', 'X', 'J']);
const MIN_WORD_LENGTH = 2;

/**
 * Validates a word for the TailSpin game.
 * 
 * Validation occurs in a specific order to optimize performance and user experience:
 * 1. Basic validation (length) - fastest, catches obvious issues
 * 2. Dictionary check - async but necessary before chain rules
 * 3. Chain rules - only if word exists
 * 4. Game-specific rules - mode-dependent checks
 * 
 * @param word - The word to validate
 * @param chain - The current chain of words (optional)
 * @param gameMode - The current game mode (optional)
 * @returns A structured validation result
 */
export async function validateWord(
  word: string,
  chain: string[] = [],
  gameMode?: 'daily' | 'endless' | 'versus'
): Promise<WordValidationResult> {
  const errors: ValidationError[] = [];
  const result: WordValidationResult = {
    isValid: true,
    word,
    isTerminalWord: false,
    errors: []
  };

  // Step 1: Basic Validation
  if (!word || word.length < MIN_WORD_LENGTH) {
    errors.push({
      type: 'length',
      message: `Word must be at least ${MIN_WORD_LENGTH} letters long`
    });
    result.isValid = false;
  }

  // Step 2: Dictionary Validation
  // We do this early because there's no point checking chain rules
  // if the word doesn't exist
  const isInDictionary = await dictionaryAccess.isValidWord(word);
  if (!isInDictionary) {
    errors.push({
      type: 'dictionary',
      message: 'Word not found in dictionary'
    });
    result.isValid = false;
  }

  // Step 3: Chain Rules
  if (chain.length > 0) {
    const prevWord = chain[chain.length - 1];
    const lastTwoLetters = prevWord.slice(-2).toLowerCase();
    const firstTwoLetters = word.slice(0, 2).toLowerCase();
    
    result.matchesLastWord = lastTwoLetters === firstTwoLetters;
    
    if (!result.matchesLastWord) {
      errors.push({
        type: 'chain',
        message: `Word must start with "${lastTwoLetters}"`
      });
      result.isValid = false;
    }
  }

  // Step 4: Duplicate Check
  if (chain.includes(word)) {
    errors.push({
      type: 'duplicate',
      message: 'Word already used in this game'
    });
    result.isValid = false;
  }

  // Only proceed with advanced validation if basic validation passed
  if (result.isValid) {
    // Check for terminal word
    const nextWords = await dictionaryAccess.findNextValidWords(word);
    result.isTerminalWord = nextWords.length === 0;

    // Terminal word handling based on game mode
    if (result.isTerminalWord && gameMode === 'daily') {
      errors.push({
        type: 'terminal',
        message: 'Terminal words are not allowed in Daily Challenge mode',
        details: 'This word has no valid next moves'
      });
      result.isValid = false;
    }

    // Calculate word statistics
    const stats: WordStats = {
      length: word.length,
      rareLetters: Array.from(word.toUpperCase())
        .filter(letter => RARE_LETTERS.has(letter)),
      branchingFactor: nextWords.length,
      possibleNextWords: nextWords.length,
      pathDifficulty: calculatePathDifficulty(nextWords.length)
    };
    result.stats = stats;

    // Add hints for hard paths
    if (stats.pathDifficulty === 'hard' && nextWords.length > 0) {
      result.suggestedWords = nextWords
        .slice(0, 3)
        .map(w => `${w.slice(0, 3)}...`);
    }
  }

  // Add errors if any occurred
  if (errors.length > 0) {
    result.errors = errors;
  }

  return result;
}

/**
 * Helper function to determine path difficulty based on branching factor
 */
function calculatePathDifficulty(branchingFactor: number): 'easy' | 'medium' | 'hard' {
  if (branchingFactor >= 15) return 'easy';
  if (branchingFactor >= 7) return 'medium';
  return 'hard';
}

/**
 * Checks if two words can be chained together according to game rules
 * The next word must start with the last two letters of the previous word
 */
export function checkWordConnection(prevWord: string, nextWord: string): boolean {
  if (!prevWord || !nextWord || prevWord.length < 2 || nextWord.length < 2) {
    return false;
  }

  const lastTwoLetters = prevWord.slice(-2).toLowerCase();
  const firstTwoLetters = nextWord.slice(0, 2).toLowerCase();

  return lastTwoLetters === firstTwoLetters;
}

/**
 * Checks if a two-letter combination is valid for starting words
 */
export function isValidStartingCombo(combo: string): boolean {
  return VALID_STARTING_COMBOS.includes(combo.toLowerCase() as typeof VALID_STARTING_COMBOS[number]);
}

/**
 * Validates a complete word chain.
 * This function checks that:
 * 1. All words exist in the dictionary
 * 2. Each word properly chains to the next (last two letters rule)
 * 3. No words are duplicated in the chain
 * 4. Terminal words are handled appropriately for the game mode
 * 
 * @param words - Array of words to validate as a chain
 * @param gameMode - Optional game mode for specific validation rules
 * @returns Detailed chain validation result
 */
export async function validateWordChain(
  words: string[],
  gameMode?: 'daily' | 'endless' | 'versus'
): Promise<ChainValidationResult> {
  const result: ChainValidationResult = {
    isValid: true,
    chain: words,
    errors: [],
    stats: {
      totalLength: 0,
      uniqueLetters: new Set<string>(),
      rareLetters: [],
      averageWordLength: 0,
      terminalWords: [],
      averageBranchingFactor: 0,
      overallDifficulty: 'medium'
    }
  };

  if (!words.length) {
    result.isValid = false;
    result.errors?.push({
      type: 'length',
      message: 'Chain cannot be empty'
    });
    return result;
  }

  let totalBranchingFactor = 0;
  const seenWords = new Set<string>();

  // Validate each word and its connection to the next
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const validation = await validateWord(word, words.slice(0, i), gameMode);

    // Track statistics
    if (validation.stats) {
      result.stats.totalLength += validation.stats.length;
      validation.stats.rareLetters.forEach(l => {
        if (!result.stats.rareLetters.includes(l)) {
          result.stats.rareLetters.push(l);
        }
      });
      totalBranchingFactor += validation.stats.branchingFactor;
      
      // Track unique letters
      Array.from(word.toUpperCase()).forEach(l => {
        result.stats.uniqueLetters.add(l);
      });
    }

    // Check for validation errors
    if (!validation.isValid) {
      result.isValid = false;
      if (validation.errors) {
        result.errors?.push(...validation.errors);
      }
    }

    // Track terminal words
    if (validation.isTerminalWord) {
      result.stats.terminalWords.push(word);
    }

    // Check for duplicates
    if (seenWords.has(word)) {
      result.isValid = false;
      result.errors?.push({
        type: 'duplicate',
        message: `Word "${word}" appears multiple times in the chain`
      });
    }
    seenWords.add(word);
  }

  // Calculate final statistics
  result.stats.averageWordLength = result.stats.totalLength / words.length;
  result.stats.averageBranchingFactor = totalBranchingFactor / words.length;
  result.stats.overallDifficulty = calculatePathDifficulty(
    result.stats.averageBranchingFactor
  );

  return result;
}

// Example usage:
/*
const result = await validateWord('puzzle', ['happy'], 'endless');
if (result.isValid) {
  console.log('Word is valid!');
  if (result.stats?.rareLetters.length > 0) {
    console.log('Used rare letters:', result.stats.rareLetters);
  }
} else {
  console.log('Validation failed:', result.errors?.[0]?.message);
}
*/ 