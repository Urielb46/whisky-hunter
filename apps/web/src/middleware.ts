import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const EXCLUDED_PATHS = ['/age-verify', '/privacy', '/terms'];
const EXCLUDED_PREFIXES = ['/api', '/_next', '/favicon.ico'];
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|webp|css|js|woff|woff2|gif|ttf|otf|map)$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow excluded exact paths
  if (EXCLUDED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow excluded prefixes
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow static file extensions
  if (STATIC_EXTENSIONS.test(pathname)) {
    return NextResponse.next();
  }

  // Check for age confirmation cookie
  const ageConfirmed = request.cookies.get('age_confirmed')?.value;

  if (ageConfirmed === 'true') {
    return NextResponse.next();
  }

  // Redirect to age verification
  const returnUrl = encodeURIComponent(pathname + request.nextUrl.search);
  const verifyUrl = new URL(`/age-verify?return=${returnUrl}`, request.url);
  return NextResponse.redirect(verifyUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
