import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { leaderboardManager } from '@/lib/game/leaderboard-manager';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth, validateRequest } from '@/lib/middleware/validate';

const LEADERBOARD_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for leaderboard endpoints
};

// Query parameters schema
const QuerySchema = z.object({
  mode: z.enum(['daily', 'endless', 'versus']).default('daily'),
  period: z.enum(['daily', 'weekly', 'monthly', 'allTime']).default('daily')
});

/**
 * GET /api/leaderboard/daily
 * 
 * Get the daily leaderboard for a specific game mode
 * 
 * Example request:
 * ```
 * GET /api/leaderboard/daily?mode=daily&period=daily
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "leaderboard": {
 *     "entries": [
 *       {
 *         "userId": "abc123",
 *         "displayName": "User123",
 *         "photoURL": "https://...",
 *         "score": 150,
 *         "chain": ["puzzle", "lethal", "alliance"],
 *         "moveCount": 3,
 *         "date": "2024-03-21T12:34:56Z",
 *         "rareLettersUsed": ["z", "x"],
 *         "terminalWords": [],
 *         "powerUpsUsed": [],
 *         "parMoves": 4,
 *         "timeTaken": 120
 *       }
 *     ],
 *     "userRank": 5,
 *     "totalPlayers": 100,
 *     "period": "daily",
 *     "mode": "daily",
 *     "lastUpdated": "2024-03-21T12:34:56Z"
 *   }
 * }
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, LEADERBOARD_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'daily';
    const period = searchParams.get('period') || 'daily';

    const queryResult = QuerySchema.safeParse({ mode, period });
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }

    // Get user ID from auth token
    const idToken = req.headers.get('authorization')!.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Get leaderboard
    const leaderboard = await leaderboardManager.getLeaderboard(
      queryResult.data.mode,
      queryResult.data.period,
      decodedToken.uid
    );

    return NextResponse.json({
      success: true,
      leaderboard
    });

  } catch (error: any) {
    console.error('Error getting daily leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
} 