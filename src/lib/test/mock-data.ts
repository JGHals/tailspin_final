import type { AuthUser } from '@/lib/contexts/AuthContext'
import type { UserProfile, UserStats } from '@/lib/types/user-profile'
import type { GameState, GameScore, ChainStats } from '@/lib/types/game'

const mockScore: GameScore = {
  total: 0,
  wordScores: {},
  multiplier: 1,
  terminalBonus: 0,
  dailyBonus: 0,
  penalties: 0
}

const mockChainStats: ChainStats = {
  length: 1,
  uniqueLetters: new Set(['P', 'L', 'A', 'N', 'E', 'T']),
  rareLetters: [],
  averageWordLength: 6,
  longestWord: 'planet',
  currentStreak: 0,
  maxStreak: 0,
  terminalWords: [],
  branchingFactors: [5],
  pathDifficulty: 'medium'
}

export const mockUser: AuthUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'Test User',
  avatar: undefined,
  tokens: 100,
  maxTokens: 1000,
  isEmailVerified: true,
  stats: {
    gamesPlayed: 0,
    bestScore: 0,
    winRate: 0,
    avgWordLength: 0
  }
}

const mockStats: UserStats = {
  gamesPlayed: 0,
  totalWordsPlayed: 0,
  totalScore: 0,
  averageScore: 0,
  highestScore: 0,
  totalRareLetters: 0,
  totalTerminalWords: 0,
  averageChainLength: 0,
  fastestCompletion: Infinity,
  averageTimePerMove: 0,
  skillRating: 1000,
  uniqueWordsPlayed: new Set(),
  underParCount: 0,
  speedPrecisionCount: 0
}

export const mockGameState: GameState & { isLoading: boolean } = {
  mode: 'daily',
  chain: ['planet'],
  startWord: 'planet',
  targetWord: 'technology',
  isComplete: false,
  isLoading: false,
  score: {
    total: 0,
    wordScores: {},
    multiplier: 1,
    terminalBonus: 0,
    dailyBonus: 0,
    penalties: 0
  },
  wordTimings: new Map(),
  terminalWords: new Set(),
  startTime: Date.now(),
  lastMoveTime: Date.now(),
  powerUpsUsed: new Set(),
  rareLettersUsed: new Set(),
  invalidAttempts: 0,
  hintsUsed: 0,
  ui: {
    showTerminalCelebration: false,
    currentTerminalWord: '',
    terminalBonus: 0,
    isNewTerminalDiscovery: false,
    validationFeedback: undefined,
    letterTracking: {
      usedLetters: new Set(),
      rareLettersUsed: new Set(),
      uniqueLetterCount: 0,
      rareLetterCount: 0
    }
  },
  achievements: [],
  completionStats: {
    underPar: false,
    fastSolve: false,
    optimalPath: false,
    noMistakes: false,
    rareLetters: 0,
    powerUpsUsed: 0
  },
  stats: {
    length: 0,
    uniqueLetters: new Set(),
    rareLetters: [],
    averageWordLength: 0,
    longestWord: '',
    currentStreak: 0,
    maxStreak: 0,
    terminalWords: [],
    branchingFactors: [],
    pathDifficulty: 'easy'
  },
  dailyPuzzle: {
    date: new Date().toISOString(),
    parMoves: 5
  }
}

export const mockProfile: UserProfile = {
  uid: 'test-user-id',
  displayName: 'Test User',
  email: 'test@example.com',
  tokens: 100,
  stats: mockStats,
  achievements: [],
  gameHistory: [],
  powerUps: {
    hint: 3,
    flip: 3,
    bridge: 3,
    undo: 3,
    wordWarp: 1
  },
  dailyStreak: {
    current: 0,
    longest: 0,
    lastPlayedDate: ''
  },
  terminalWordsDiscovered: new Set(),
  lastUpdated: new Date().toISOString(),
  friends: []
} 