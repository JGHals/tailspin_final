import { NextRequest, NextResponse } from 'next/server';
import { achievementService } from '@/lib/services/achievement-service';
import { userProfileService } from '@/lib/services/user-profile-service';
import type { GameResult } from '@/lib/types/game';

export interface CheckAchievementsRequest {
  gameResult: GameResult;
}

/**
 * POST /api/achievements/check
 * 
 * Check and update achievements after completing a game
 * 
 * Example request:
 * ```
 * POST /api/achievements/check
 * {
 *   "gameResult": {
 *     "mode": "daily",
 *     "chain": ["puzzle", "lethal", "alliance"],
 *     "score": {
 *       "total": 45,
 *       "wordScores": { "puzzle": 15, "lethal": 15, "alliance": 15 },
 *       "multiplier": 1,
 *       "terminalBonus": 0,
 *       "dailyBonus": 0,
 *       "penalties": 0
 *     },
 *     "moveCount": 2,
 *     "rareLettersUsed": ["Z"],
 *     "terminalWords": [],
 *     "invalidAttempts": 0,
 *     "parMoves": 3,
 *     "duration": 45,
 *     "powerUpsUsed": [],
 *     "date": "2024-03-21T12:00:00Z"
 *   }
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Get user ID from auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const userId = authHeader.split(' ')[1];

    const body = await req.json() as CheckAchievementsRequest;
    const { gameResult } = body;

    // Get user profile for achievement checking
    const profile = await userProfileService.getProfile(userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check achievements based on game result
    const unlockedAchievements = await achievementService.checkGameAchievements(gameResult, profile);

    return NextResponse.json({ 
      unlockedAchievements,
      message: unlockedAchievements.length > 0 ? 'New achievements unlocked!' : 'No new achievements'
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    );
  }
} 