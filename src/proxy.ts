import { NextRequest, NextResponse } from 'next/server';
import {
  apiAuthPrefix,
  authRoutes,
  publicRoutes,
} from '../routes';


/**
 * Next.js 16 Proxy - for routing and redirects only
 * Auth checks are handled in layouts, not here
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API auth routes
  if (pathname.startsWith(apiAuthPrefix)) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow auth routes
  if (authRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // All other routes - allow (auth check happens in layout)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
