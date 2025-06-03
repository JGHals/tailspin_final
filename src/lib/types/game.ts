import type { Achievement } from './user-profile';

export type GameMode = 'daily' | 'endless' | 'versus';

export interface DailyPuzzle {
  date: string;
  startWord: string;
  targetWord: string;
  parMoves: number;
}

export interface GameScore {
  total: number;
  wordScores: {
    [word: string]: {
      base: number;
      length: number;
      rareLetters: number;
      streak: number;
      speed: number;
      total: number;
    }
  };
  multiplier: number;
  terminalBonus: number;
  dailyBonus: number;
  penalties: number;
}

export interface PowerUpResult {
  success: boolean;
  error?: string;
  data?: {
    originalPrefix?: string;
    flippedPrefix?: string;
    bridgeWord?: string;
    words?: string[];
  };
}

export interface ChainStats {
  length: number;
  uniqueLetters: Set<string>;
  rareLetters: string[];
  averageWordLength: number;
  longestWord: string;
  currentStreak: number;
  maxStreak: number;
  terminalWords: string[];
  branchingFactors: number[];
  pathDifficulty: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  mode: GameMode;
  chain: string[];
  startWord: string;
  targetWord?: string;
  isComplete: boolean;
  score: GameScore;
  wordTimings: Map<string, number>;
  terminalWords: Set<string>;
  lastError?: string;
  startTime: number;
  lastMoveTime: number;
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
  powerUpsUsed: Set<string>;
  rareLettersUsed: Set<string>;
  invalidAttempts: number;
  hintsUsed: number;
  hints?: string[];
  versusState?: {
    opponentId: string;
    opponentScore: number;
    opponentChain: string[];
    timeLeft: number;
  };
  ui: {
    showTerminalCelebration: boolean;
    currentTerminalWord: string;
    terminalBonus: number;
    isNewTerminalDiscovery: boolean;
    letterTracking: {
      usedLetters: Set<string>;
      rareLettersUsed: Set<string>;
      uniqueLetterCount: number;
      rareLetterCount: number;
    };
    validationFeedback?: {
      type: 'success' | 'warning' | 'error';
      message: string;
      details?: string;
      suggestedWords?: string[];
    };
    chainQuality?: {
      branchingFactor: number;
      difficulty: string;
      riskLevel: 'low' | 'medium' | 'high';
      suggestedMoves?: string[];
    };
  };
  achievements: Achievement[];
  completionStats: {
    underPar: boolean;
    fastSolve: boolean;
    optimalPath: boolean;
    noMistakes: boolean;
    rareLetters: number;
    powerUpsUsed: number;
  };
  stats: ChainStats;
}

export interface GameResult {
  userId: string;
  username: string;
  mode: 'daily' | 'endless' | 'versus';
  chain: string[];
  score: {
    total: number;
    wordScores: Record<string, {
      base: number;
      length: number;
      rareLetters: number;
      streak: number;
      speed: number;
    }>;
    multiplier: number;
    terminalBonus: number;
    dailyBonus: number;
    penalties: number;
  };
  moveCount: number;
  rareLettersUsed: string[];
  terminalWords: string[];
  invalidAttempts: number;
  parMoves?: number;
  duration: number;
  powerUpsUsed: string[];
  date: string;
  wordTimings: Map<string, number>;
  pathAnalysis?: {
    averageBranchingFactor: number;
    maxBranchingFactor: number;
    minBranchingFactor: number;
    terminalRisk: number;
    difficulty: 'easy' | 'medium' | 'hard';
    deadEndWords: string[];
  };
}

export interface SavedGameState {
  id: string;
  userId: string;
  mode: GameMode;
  chain: string[];
  startWord: string;
  targetWord?: string;
  score: GameScore;
  stats: ChainStats;
  isComplete: boolean;
  startTime: number;
  lastMoveTime: number;
  hintsUsed: number;
  invalidAttempts: number;
  wordTimings: { word: string; time: number }[];
  terminalWords: string[];
  powerUpsUsed: string[];
  rareLettersUsed: string[];
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
  lastSaved: string;
  version: number;
}

export interface GameStateError {
  code: string;
  message: string;
  timestamp: string;
  gameState?: Partial<SavedGameState>;
} 