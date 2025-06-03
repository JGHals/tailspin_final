import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth, validateRequest } from '@/lib/middleware/validate';

const USER_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 30 // 30 requests per minute for profile endpoints
};

// Update profile schema
const UpdateProfileSchema = z.object({
  displayName: z.string().min(3).max(30).optional(),
  photoURL: z.string().url().optional()
});

/**
 * GET /api/user/profile
 * 
 * Get the current user's profile
 * 
 * Example request:
 * ```
 * GET /api/user/profile
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "profile": {
 *     "uid": "abc123",
 *     "displayName": "User123",
 *     "email": "user@example.com",
 *     "photoURL": "https://...",
 *     "tokens": 10,
 *     "stats": {
 *       "gamesPlayed": 5,
 *       "totalScore": 500,
 *       "averageScore": 100,
 *       "highestScore": 150,
 *       "averageChainLength": 8.5
 *     },
 *     "powerUps": {
 *       "hint": 3,
 *       "flip": 2,
 *       "bridge": 1,
 *       "undo": 3,
 *       "wordWarp": 1
 *     },
 *     "dailyStreak": {
 *       "current": 3,
 *       "longest": 5,
 *       "lastPlayedDate": "2024-03-21"
 *     }
 *   }
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
      profile: {
        ...profile,
        // Convert Sets to Arrays for JSON serialization
        stats: {
          ...profile.stats,
          uniqueWordsPlayed: Array.from(profile.stats.uniqueWordsPlayed)
        },
        terminalWordsDiscovered: Array.from(profile.terminalWordsDiscovered)
      }
    });

  } catch (error: any) {
    console.error('Error getting profile:', error);
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * 
 * Update the current user's profile
 * 
 * Example request:
 * ```
 * PATCH /api/user/profile
 * Authorization: Bearer {firebaseIdToken}
 * {
 *   "displayName": "NewUsername",
 *   "photoURL": "https://..."
 * }
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true,
 *   "profile": {
 *     "uid": "abc123",
 *     "displayName": "NewUsername",
 *     "email": "user@example.com",
 *     "photoURL": "https://..."
 *   }
 * }
 * ```
 */
export async function PATCH(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await rateLimit(req, USER_RATE_LIMIT);
    if (rateLimitResult) return rateLimitResult;

    // Validate auth header
    const authResult = validateAuth(req);
    if (authResult) return authResult;

    // Validate request body
    const validationResult = await validateRequest(req, UpdateProfileSchema);
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

    // Update profile with new values
    const updates = await req.json();
    Object.assign(profile, updates);

    // Save updated profile
    await userProfileService.updateProfile(profile);

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        // Convert Sets to Arrays for JSON serialization
        stats: {
          ...profile.stats,
          uniqueWordsPlayed: Array.from(profile.stats.uniqueWordsPlayed)
        },
        terminalWordsDiscovered: Array.from(profile.terminalWordsDiscovered)
      }
    });

  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 