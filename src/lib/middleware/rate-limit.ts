import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per interval
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new LRUCache<string, RateLimitInfo>({
  max: 10000, // Maximum number of users to track
  ttl: 60 * 60 * 1000, // Time to live: 1 hour
});

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
};

export const GAME_ENDPOINTS_RATE_LIMIT: RateLimitConfig = {
  interval: 60 * 1000, // 1 minute
  maxRequests: 120 // 120 requests per minute for game endpoints
};

/**
 * Rate limiting middleware for API routes
 * 
 * @param req - Next.js request object
 * @param config - Rate limit configuration
 * @returns Response if rate limit exceeded, undefined otherwise
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<NextResponse | undefined> {
  // Get user identifier (IP address or user ID from auth token)
  const userId = req.headers.get('authorization')?.split(' ')[1] || 
                req.ip ||
                'anonymous';
  
  const key = `${userId}:${req.nextUrl.pathname}`;
  const now = Date.now();

  // Get current rate limit info
  const currentLimit = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + config.interval
  };

  // Reset if outside time window
  if (now > currentLimit.resetTime) {
    currentLimit.count = 0;
    currentLimit.resetTime = now + config.interval;
  }

  currentLimit.count++;
  rateLimitStore.set(key, currentLimit);

  // Set rate limit headers
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', Math.max(0, config.maxRequests - currentLimit.count).toString());
  headers.set('X-RateLimit-Reset', new Date(currentLimit.resetTime).toISOString());

  // Check if rate limit exceeded
  if (currentLimit.count > config.maxRequests) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter: Math.ceil((currentLimit.resetTime - now) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((currentLimit.resetTime - now) / 1000).toString(),
          ...Object.fromEntries(headers)
        }
      }
    );
  }

  return undefined;
} 