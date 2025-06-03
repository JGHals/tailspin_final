import { NextRequest, NextResponse } from 'next/server';
import { achievementService } from '@/lib/services/achievement-service';

/**
 * GET /api/achievements/stats
 * 
 * Get achievement statistics for the authenticated user
 * 
 * Example request:
 * ```
 * GET /api/achievements/stats
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "stats": {
 *     "total": 25,
 *     "completed": 12,
 *     "inProgress": 13,
 *     "byCategory": {
 *       "global": { "total": 10, "completed": 5 },
 *       "daily": { "total": 8, "completed": 4 },
 *       "endless": { "total": 7, "completed": 3 }
 *     }
 *   }
 * }
 * ```
 */
export async function GET(req: NextRequest) {
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

    const stats = await achievementService.getAchievementStats(userId);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching achievement stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch achievement stats' },
      { status: 500 }
    );
  }
} 