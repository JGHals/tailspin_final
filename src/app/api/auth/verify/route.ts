import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { auth as clientAuth } from '@/lib/firebase/firebase';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth } from '@/lib/middleware/validate';

const AUTH_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 requests per minute for verification
};

/**
 * POST /api/auth/verify
 * 
 * Verify the current user's session and return updated user data
 * 
 * Example request:
 * ```
 * POST /api/auth/verify
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "user": {
 *     "id": "abc123",
 *     "email": "user@example.com",
 *     "username": "User123",
 *     "avatar": "https://...",
 *     "tokens": 10,
 *     "maxTokens": 50,
 *     "stats": {
 *       "gamesPlayed": 5,
 *       "bestScore": 100,
 *       "winRate": 0.8,
 *       "avgWordLength": 6.2
 *     }
 *   }
 * }
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, AUTH_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Get user ID from auth token
    const idToken = req.headers.get('authorization')!.split(' ')[1];

    // Verify token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user profile
    const userProfile = await userProfileService.getProfile(decodedToken.uid);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: decodedToken.uid,
        email: decodedToken.email || null,
        username: userProfile.displayName,
        avatar: userProfile.photoURL,
        tokens: userProfile.tokens,
        maxTokens: 50,
        stats: {
          gamesPlayed: userProfile.stats.gamesPlayed,
          bestScore: userProfile.stats.highestScore,
          winRate: userProfile.stats.gamesPlayed > 0 
            ? (userProfile.stats.averageScore) 
            : 0,
          avgWordLength: userProfile.stats.averageChainLength
        },
        discoveredTerminals: Array.from(userProfile.terminalWordsDiscovered)
      }
    });

  } catch (error: any) {
    console.error('Verification error:', error);

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }

    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
} 