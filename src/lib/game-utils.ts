import { dictionaryAccess } from './dictionary/dictionary-access';
import { VALID_STARTING_COMBOS, VALID_FLIPS } from './validation/constants';

/**
 * Gets a random valid starting combination for word chains
 * Optionally excludes specific combinations
 */
export function getRandomStartingCombo(exclude: string[] = []): string {
  const validCombos = VALID_STARTING_COMBOS.filter(combo => !exclude.includes(combo));
  return validCombos[Math.floor(Math.random() * validCombos.length)];
}

/**
 * Checks if a two-letter combination can be flipped
 * Used for the "flip" power-up
 */
export function canFlipCombo(combo: string): boolean {
  return combo in VALID_FLIPS || Object.values(VALID_FLIPS).includes(combo as typeof VALID_FLIPS[keyof typeof VALID_FLIPS]);
}

/**
 * Gets the flipped version of a two-letter combination
 * Returns null if the combo cannot be flipped
 */
export function getFlippedCombo(combo: string): string | null {
  if (combo in VALID_FLIPS) {
    return VALID_FLIPS[combo as keyof typeof VALID_FLIPS];
  }
  
  // Check reverse flips
  const reverseFlip = Object.entries(VALID_FLIPS).find(([_, flip]) => flip === combo);
  return reverseFlip ? reverseFlip[0] : null;
}

/**
 * Gets a random word from the dictionary
 * Can be filtered by length requirements
 */
export async function getRandomWord(options?: { minLength?: number; maxLength?: number }): Promise<string> {
  return dictionaryAccess.getRandomWord(options);
}

/**
 * Gets hint words that could be used next in the chain
 * Used for the "hint" power-up
 */
export async function getHintWords(prefix: string, count = 3): Promise<string[]> {
  return dictionaryAccess.getHintWords(prefix, count);
}
