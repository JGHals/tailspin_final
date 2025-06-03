import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { achievementService } from '@/lib/services/achievement-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth } from '@/lib/middleware/validate';

const ACHIEVEMENT_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for achievement endpoints
};

/**
 * GET /api/achievements/list
 * 
 * Get all achievements and their definitions, along with the user's progress
 * 
 * Example request:
 * ```
 * GET /api/achievements/list
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "achievements": [
 *     {
 *       "id": "wordsmith",
 *       "name": "Wordsmith",
 *       "description": "Use a 7+ letter word",
 *       "category": "global",
 *       "condition": "Use any word with 7 or more letters",
 *       "reward": 5,
 *       "progress": 0,
 *       "maxProgress": 1,
 *       "completed": false,
 *       "icon": "📚"
 *     },
 *     // ... more achievements
 *   ],
 *   "stats": {
 *     "total": 20,
 *     "completed": 5,
 *     "totalRewards": 75,
 *     "byCategory": {
 *       "global": { "total": 8, "completed": 2 },
 *       "daily": { "total": 6, "completed": 1 },
 *       "endless": { "total": 6, "completed": 2 }
 *     }
 *   }
 * }
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, ACHIEVEMENT_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Get user ID from auth token
    const idToken = req.headers.get('authorization')!.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Get user achievements and stats
    const [achievements, stats] = await Promise.all([
      achievementService.getUserAchievements(decodedToken.uid),
      achievementService.getAchievementStats(decodedToken.uid)
    ]);

    return NextResponse.json({
      success: true,
      achievements,
      stats
    });

  } catch (error: any) {
    console.error('Error getting achievements:', error);
    return NextResponse.json(
      { error: 'Failed to get achievements' },
      { status: 500 }
    );
  }
} 