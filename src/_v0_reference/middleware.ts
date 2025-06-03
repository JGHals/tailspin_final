import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // In a real app, you would check for a session cookie or token
  // For this demo, we'll just check localStorage in the client components

  // Protected routes that require authentication
  const protectedPaths = ["/profile"]

  const path = request.nextUrl.pathname

  // Check if the path is in the protected routes
  if (protectedPaths.some((prefix) => path.startsWith(prefix))) {
    // In a real app, you would redirect if no valid session exists
    // For this demo, we'll handle auth checks in the client components
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
