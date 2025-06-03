import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth, validateRequest } from '@/lib/middleware/validate';

const USER_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for token endpoints
};

// Token update schema
const TokenUpdateSchema = z.object({
  amount: z.number().int(),
  reason: z.enum([
    'daily_challenge',
    'achievement',
    'streak_bonus',
    'power_up_purchase',
    'game_reward',
    'admin_grant'
  ])
});

/**
 * GET /api/user/tokens
 * 
 * Get the current user's token balance
 * 
 * Example request:
 * ```
 * GET /api/user/tokens
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "tokens": 100
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
      tokens: profile.tokens
    });

  } catch (error: any) {
    console.error('Error getting tokens:', error);
    return NextResponse.json(
      { error: 'Failed to get tokens' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/tokens
 * 
 * Update the user's token balance
 * 
 * Example request:
 * ```
 * POST /api/user/tokens
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "amount": 10,
 *   "reason": "daily_challenge"
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "tokens": 110,
 *   "change": 10
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, USER_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Validate request body
    const validationResult = await validateRequest(req, TokenUpdateSchema);
    if (validationResult) return validationResult;

    // Get user ID from auth token
    const idToken = req.headers.get('authorization')!.split(' ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Get update data
    const { amount, reason } = await req.json();

    // Update tokens
    const newBalance = await userProfileService.updateTokens(decodedToken.uid, amount);

    return NextResponse.json({
      success: true,
      tokens: newBalance,
      change: amount
    });

  } catch (error: any) {
    console.error('Error updating tokens:', error);
    return NextResponse.json(
      { error: 'Failed to update tokens' },
      { status: 500 }
    );
  }
} 