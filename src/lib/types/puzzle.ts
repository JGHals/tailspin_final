import { GameScore } from './game';

export interface StoredPuzzle {
  date: string;
  startWord: string;
  targetWord: string;
  parMoves: number;
  difficulty: 'easy' | 'medium' | 'hard';
  validPaths: string[][];  // Pre-calculated valid solutions
  bridgeWords: string[];   // Useful for hints
  minMoves: number;
  maxMoves: number;
  metadata: {
    averageWordLength: number;
    rareLetterCount: number;
    branchingFactor: number;  // Average number of valid next words at each step
    createdAt: string;
  };
}

export interface PuzzleGenerationConfig {
  minWordLength: number;
  maxWordLength: number;
  minValidPaths: number;
  maxParMoves: number;
  difficultyWeights: {
    wordLength: number;
    rareLetters: number;
    branchingFactor: number;
    pathLength: number;
  };
}

export interface PuzzleValidationResult {
  isValid: boolean;
  validPaths: string[][];
  bridgeWords: string[];
  minMoves: number;
  maxMoves: number;
  branchingFactor: number;
}

export interface DailyPuzzleStats {
  attempts: number;
  completions: number;
  averageMoves: number;
  averageTime: number;
  topScores: Array<{
    userId: string;
    score: GameScore;
    moves: number;
    time: number;
  }>;
} 