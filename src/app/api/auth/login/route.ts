import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { userProfileService } from '@/lib/services/user-profile-service';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { validateRequest } from '@/lib/middleware/validate';
import { withAuth } from '../../middleware/auth';

// Login request schema
const LoginSchema = z.object({
  method: z.enum(['email', 'google']),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

const AUTH_RATE_LIMIT = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 5 // 5 requests per minute for auth endpoints
};

/**
 * POST /api/auth/login
 * 
 * Login with email/password or Google
 * 
 * Example requests:
 * ```
 * // Email login
 * POST /api/auth/login
 * {
 *   "method": "email",
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * // Google login
 * POST /api/auth/login
 * {
 *   "method": "google"
 * }
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
 *     "maxTokens": 50
 *   }
 * }
 * ```
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();
      
      return NextResponse.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
        },
        token: idToken,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      } else if (error.code === 'auth/too-many-requests') {
        return NextResponse.json(
          { error: 'Too many login attempts. Please try again later.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Login failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
} 