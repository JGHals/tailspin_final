import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth } from '@/lib/middleware/validate';

const USER_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for stats endpoints
};

/**
 * GET /api/user/stats
 * 
 * Get the current user's game stats
 * 
 * Example request:
 * ```
 * GET /api/user/stats
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "stats": {
 *     "gamesPlayed": 10,
 *     "totalWordsPlayed": 150,
 *     "totalScore": 1500,
 *     "averageScore": 150,
 *     "highestScore": 200,
 *     "totalRareLetters": 15,
 *     "totalTerminalWords": 5,
 *     "averageChainLength": 15,
 *     "fastestCompletion": 120,
 *     "averageTimePerMove": 8,
 *     "skillRating": 1200,
 *     "uniqueWordsPlayed": ["puzzle", "lethal", "alliance"],
 *     "underParCount": 3,
 *     "speedPrecisionCount": 5
 *   },
 *   "dailyStreak": {
 *     "current": 3,
 *     "longest": 5,
 *     "lastPlayedDate": "2024-03-21"
 *   },
 *   "terminalWordsDiscovered": ["xyz", "qrt"]
 * }
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, USER_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Get user ID from auth token
    const idToken = req.headers.get('authorization')!.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Get user profile
    const profile = await userProfileService.getProfile(decodedToken.uid);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        ...profile.stats,
        uniqueWordsPlayed: Array.from(profile.stats.uniqueWordsPlayed)
      },
      dailyStreak: profile.dailyStreak,
      terminalWordsDiscovered: Array.from(profile.terminalWordsDiscovered)
    });

  } catch (error: any) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
} 