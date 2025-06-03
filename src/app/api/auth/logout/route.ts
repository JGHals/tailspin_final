import { NextRequest, NextResponse } from 'next/server';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateAuth } from '@/lib/middleware/validate';

const AUTH_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 5 // 5 requests per minute for auth endpoints
};

/**
 * POST /api/auth/logout
 * 
 * Sign out the current user
 * 
 * Example request:
 * ```
 * POST /api/auth/logout
 * Authorization: Bearer {firebaseIdToken}
 * ```
 * 
 * Example response:
 * ```json
 * {
 *   "success": true
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

    // Sign out from Firebase
    await signOut(auth);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 