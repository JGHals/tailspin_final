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
  mode: z.enum(['daily', 'endless', 'versus']).default('endless'),
  period: z.enum(['daily', 'weekly', 'monthly', 'allTime']).default('allTime'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * GET /api/leaderboard/global
 * 
 * Get the global leaderboard for a specific game mode
 * 
 * Example request:
 * ```
 * GET /api/leaderboard/global?mode=endless&period=allTime&page=1&limit=20
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
 *     "period": "allTime",
 *     "mode": "endless",
 *     "lastUpdated": "2024-03-21T12:34:56Z"
 *   },
 *   "pagination": {
 *     "currentPage": 1,
 *     "totalPages": 5,
 *     "hasNextPage": true,
 *     "hasPreviousPage": false
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
    const mode = searchParams.get('mode') || 'endless';
    const period = searchParams.get('period') || 'allTime';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const queryResult = QuerySchema.safeParse({ mode, period, page, limit });
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

    // Calculate pagination
    const totalPages = Math.ceil(leaderboard.totalPlayers / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };

    // Slice entries for current page
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    leaderboard.entries = leaderboard.entries.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      leaderboard,
      pagination
    });

  } catch (error: any) {
    console.error('Error getting global leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
} 