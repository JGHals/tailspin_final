/**
 * Types for the TailSpin word validation system.
 * These types provide structured results for all validation operations.
 */

/**
 * Represents the difficulty of continuing the chain from a given word
 * Based on the branching factor (number of possible next words)
 */
export type PathDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Represents the type of validation error that occurred
 */
export type ValidationErrorType = 
  | 'dictionary'    // Word not found in dictionary
  | 'chain'         // Doesn't follow chain rules (last two letters)
  | 'duplicate'     // Word already used in current game
  | 'length'        // Word too short
  | 'terminal'      // Word is terminal (in modes where that's not allowed)
  | 'gameMode';     // Specific game mode restriction

/**
 * Detailed validation error information
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  details?: string;
}

/**
 * Statistics about the validated word and its position in the chain
 */
export interface WordStats {
  length: number;
  rareLetters: string[];
  branchingFactor: number;
  possibleNextWords: number;
  pathDifficulty: PathDifficulty;
}

/**
 * Complete validation result for a word in the chain
 */
export interface WordValidationResult {
  // Basic validation
  isValid: boolean;
  word: string;
  errors?: ValidationError[];
  
  // Chain position
  isTerminalWord: boolean;
  matchesLastWord?: boolean;  // Only relevant if not first word
  
  // Game statistics
  stats?: WordStats;
  
  // Hints and help
  suggestedWords?: string[];  // Only provided for invalid words or hard paths
}

/**
 * Result of validating an entire word chain
 */
export interface ChainValidationResult {
  isValid: boolean;
  chain: string[];
  errors?: ValidationError[];
  stats: {
    totalLength: number;
    uniqueLetters: Set<string>;
    rareLetters: string[];
    averageWordLength: number;
    terminalWords: string[];
    averageBranchingFactor: number;
    overallDifficulty: PathDifficulty;
  };
}

// Example usage:
/*
const result: WordValidationResult = {
  isValid: true,
  word: "puzzle",
  isTerminalWord: false,
  matchesLastWord: true,
  stats: {
    length: 6,
    rareLetters: ["z"],
    branchingFactor: 12,
    possibleNextWords: 12,
    pathDifficulty: "medium"
  }
};
*/ 