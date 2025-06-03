export type LeaderboardPeriod = 'daily' | 'weekly' | 'allTime';
export type LeaderboardMode = 'daily' | 'endless' | 'versus';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  score: number;
  wordCount: number;
  timestamp: string;
  rank: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank: number | null;
  period: LeaderboardPeriod;
  mode: LeaderboardMode;
  lastUpdated: string;
} 