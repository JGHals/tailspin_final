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

/**
 * Represents the complete state of a game session.
 * Used across all layers of the state management system.
 */
export interface GameState {
  /** Current game mode */
  mode: GameMode;
  /** Sequence of words in the current chain */
  chain: string[];
  /** Initial word of the chain */
  startWord: string;
  /** Target word for daily challenges */
  targetWord?: string;
  /** Whether the game has been completed */
  isComplete: boolean;
  /** Current score information */
  score: GameScore;
  /** Timing information for each word played */
  wordTimings: Map<string, number>;
  /** Set of discovered terminal words */
  terminalWords: Set<string>;
  /** Last error message if any */
  lastError?: string;
  /** Timestamp when game started */
  startTime: number;
  /** Timestamp of last move */
  lastMoveTime: number;
  /** Daily puzzle specific information */
  dailyPuzzle?: {
    date: string;
    parMoves: number;
  };
  /** Set of power-ups used in the game */
  powerUpsUsed: Set<string>;
  /** Set of rare letters used in words */
  rareLettersUsed: Set<string>;
  /** Count of invalid word attempts */
  invalidAttempts: number;
  /** Count of hints used */
  hintsUsed: number;
  /** Available hints */
  hints?: string[];
  /** Multiplayer specific state */
  versusState?: {
    opponentId: string;
    opponentScore: number;
    opponentChain: string[];
    timeLeft: number;
  };
  /** UI-specific state information */
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
  /** Earned achievements */
  achievements?: Achievement[];
  /** Game completion statistics */
  completionStats?: {
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

/**
 * Represents a game state saved to Firebase.
 * Used by GameStateService for persistence.
 */
export interface SavedGameState {
  /** Unique identifier for the saved game */
  id: string;
  /** User who owns this saved game */
  userId: string;
  /** When the game was last saved */
  lastSaved: string;
  /** Version of the game state format */
  version: number;
  /** The complete game state */
  state: GameState;
}

/**
 * Represents an error in the game state system.
 * Used for error tracking and recovery.
 */
export interface GameStateError {
  /** Error code for categorization */
  code: string;
  /** Human-readable error message */
  message: string;
  /** When the error occurred */
  timestamp: string;
  /** Partial game state when error occurred */
  gameState?: Partial<SavedGameState>;
} 