import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { leaderboardManager } from '@/lib/game/leaderboard-manager';
import { userProfileService } from '@/lib/services/user-profile-service';
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
 * GET /api/leaderboard/friends
 * 
 * Get the leaderboard for the user and their friends
 * 
 * Example request:
 * ```
 * GET /api/leaderboard/friends?mode=daily&period=daily
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
 *     "userRank": 1,
 *     "totalPlayers": 5,
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

    // Get user profile to get friend IDs
    const profile = await userProfileService.getProfile(decodedToken.uid);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get friend IDs from profile
    const friendIds = profile.friends || [];

    // Get friend leaderboard
    const leaderboard = await leaderboardManager.getFriendLeaderboard(
      decodedToken.uid,
      friendIds,
      queryResult.data.mode,
      queryResult.data.period
    );

    return NextResponse.json({
      success: true,
      leaderboard
    });

  } catch (error: any) {
    console.error('Error getting friend leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
} 