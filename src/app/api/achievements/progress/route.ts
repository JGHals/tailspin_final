import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { achievementService } from '@/lib/services/achievement-service';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth, validateRequest } from '@/lib/middleware/validate';

const ACHIEVEMENT_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for achievement endpoints
};

// Progress update schema
const ProgressUpdateSchema = z.object({
  gameResult: z.object({
    mode: z.enum(['daily', 'endless', 'versus']),
    chain: z.array(z.string()),
    rareLettersUsed: z.array(z.string()),
    invalidAttempts: z.number(),
    powerUpsUsed: z.array(z.string()),
    duration: z.number(),
    moveCount: z.number().optional(),
    parMoves: z.number().optional(),
    wordTimings: z.record(z.string(), z.number()).optional()
  })
});

/**
 * POST /api/achievements/progress
 * 
 * Update achievement progress based on game result
 * 
 * Example request:
 * ```
 * POST /api/achievements/progress
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "gameResult": {
 *     "mode": "daily",
 *     "chain": ["puzzle", "lethal", "alliance"],
 *     "rareLettersUsed": ["z", "x"],
 *     "invalidAttempts": 0,
 *     "powerUpsUsed": [],
 *     "duration": 120,
 *     "moveCount": 3,
 *     "parMoves": 4,
 *     "wordTimings": {
 *       "puzzle": 3.5,
 *       "lethal": 4.2,
 *       "alliance": 2.8
 *     }
 *   }
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "unlockedAchievements": [
 *     {
 *       "id": "puzzle_rookie",
 *       "name": "Puzzle Rookie",
 *       "description": "Solve your first daily puzzle",
 *       "category": "daily",
 *       "reward": 5,
 *       "completedAt": "2024-03-21T12:34:56Z"
 *     }
 *   ],
 *   "tokensEarned": 5
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, ACHIEVEMENT_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Validate request body
    const validationResult = await validateRequest(req, ProgressUpdateSchema);
    if (validationResult) return validationResult;

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

    // Get game result from request
    const { gameResult } = await req.json();

    // Check achievements
    const unlockedAchievements = await achievementService.checkGameAchievements(
      gameResult,
      profile
    );

    // Calculate tokens earned
    const tokensEarned = unlockedAchievements.reduce(
      (total, achievement) => total + achievement.reward,
      0
    );

    // Update user's token balance if achievements were unlocked
    if (tokensEarned > 0) {
      await userProfileService.updateTokens(decodedToken.uid, tokensEarned);
    }

    return NextResponse.json({
      success: true,
      unlockedAchievements,
      tokensEarned
    });

  } catch (error: any) {
    console.error('Error updating achievement progress:', error);
    return NextResponse.json(
      { error: 'Failed to update achievement progress' },
      { status: 500 }
    );
  }
} 