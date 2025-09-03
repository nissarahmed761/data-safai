import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple middleware to protect routes
export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected, /api/protected)
  const path = request.nextUrl.pathname

  // Define public routes that don't require authentication
  const isPublicRoute = path === '/' || 
                       path.startsWith('/sign-in') || 
                       path.startsWith('/sign-up') ||
                       path.startsWith('/api/auth') ||
                       path.startsWith('/api/webhook')

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check if user has a session
  // This is a basic check - Clerk will handle the actual authentication
  const hasSession = request.cookies.has('__session') || 
                     request.cookies.has('__clerk_db_jwt') ||
                     request.cookies.has('__clerk_session')

  if (!hasSession) {
    // Redirect to sign-in if no session found
    const signInUrl = new URL('/sign-in', request.url)
    signInUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(signInUrl)
  }

  // Allow access to protected routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
