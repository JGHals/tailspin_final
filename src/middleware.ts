import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // Maximum requests per window
const API_RATE_LIMIT_WINDOW = 10 * 1000; // 10 seconds for API
const API_MAX_REQUESTS = 20; // Maximum API requests per window

// In-memory store for rate limiting
// Note: In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, { count: number; timestamp: number }>();

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Get client IP from headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Select rate limit configuration based on route type
  const windowMs = isApiRoute ? API_RATE_LIMIT_WINDOW : RATE_LIMIT_WINDOW;
  const maxRequests = isApiRoute ? API_MAX_REQUESTS : MAX_REQUESTS;

  // Get or create rate limit entry
  const now = Date.now();
  const rateLimit = rateLimitStore.get(ip) ?? { count: 0, timestamp: now };

  // Reset count if window has passed
  if (now - rateLimit.timestamp > windowMs) {
    rateLimit.count = 0;
    rateLimit.timestamp = now;
  }

  // Increment request count
  rateLimit.count++;
  rateLimitStore.set(ip, rateLimit);

  // Check if rate limit exceeded
  if (rateLimit.count > maxRequests) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((rateLimit.timestamp + windowMs - now) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.timestamp + windowMs - now) / 1000).toString()
        }
      }
    );
  }

  return response;
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Apply to all routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 