export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'global' | 'daily' | 'endless' | 'versus';
  condition: string;
  reward: number; // token reward
  progress: number;
  maxProgress: number;
  completed: boolean;
  completedAt?: string;
  icon?: string;
}

export interface GameHistory {
  id: string;
  mode: 'daily' | 'endless' | 'versus';
  date: string;
  score: number;
  chain: string[];
  duration: number;
  hintsUsed: number;
  uniqueLettersUsed: string[];
  rareLettersUsed: string[];
  longestWord: string;
  terminalWords: string[];
}

export interface PowerUpInventory {
  flip: number;
  hint: number;
  bridge: number;
  undo: number;
  wordWarp: number;
}

export interface DailyStreak {
  current: number;
  longest: number;
  lastPlayedDate: string;
}

export interface UserStats {
  gamesPlayed: number;
  totalWordsPlayed: number;
  totalScore: number;
  averageScore: number;
  highestScore: number;
  totalRareLetters: number;
  totalTerminalWords: number;
  averageChainLength: number;
  fastestCompletion: number;
  averageTimePerMove: number;
  skillRating: number;
  uniqueWordsPlayed: Set<string>;
  underParCount: number;
  speedPrecisionCount: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  tokens: number;
  achievements: Achievement[];
  gameHistory: GameHistory[];
  powerUps: PowerUpInventory;
  dailyStreak: DailyStreak;
  stats: UserStats;
  terminalWordsDiscovered: Set<string>;
  lastUpdated: string;
  friends: string[]; // Array of friend UIDs
} 