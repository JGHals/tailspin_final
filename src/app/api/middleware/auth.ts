import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: { requireEmailVerified?: boolean; requireAdmin?: boolean } = {}
) {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check email verification if required
    if (options.requireEmailVerified) {
      const user = await adminAuth.getUser(decodedToken.uid);
      if (!user.emailVerified) {
        return NextResponse.json(
          { error: 'Email verification required' },
          { status: 403 }
        );
      }
    }

    // Check admin role if required
    if (options.requireAdmin) {
      const user = await adminAuth.getUser(decodedToken.uid);
      const isAdmin = user.customClaims?.admin === true;
      
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }
    }

    // Add user info to request
    const modifiedRequest = new Request(request.url, {
      headers: request.headers,
      method: request.method,
      body: request.body,
      signal: request.signal,
    });
    
    // Add user info to request headers
    modifiedRequest.headers.set('x-user-id', decodedToken.uid);
    modifiedRequest.headers.set('x-user-email', decodedToken.email || '');
    modifiedRequest.headers.set('x-user-verified', String(decodedToken.email_verified));

    // Call the handler with the modified request
    return handler(modifiedRequest as NextRequest);
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 