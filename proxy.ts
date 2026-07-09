import { NextRequest, NextResponse } from 'next/server'

/** Routes that never require terms acceptance */
const PUBLIC_ROUTES = new Set(['/', '/terms', '/privacy', '/declined'])

/** Prefixes that are always public (assets, API, PWA) */
const PUBLIC_PREFIXES = ['/_next/', '/api/', '/favicon', '/sw.js', '/manifest', '/icons/']

/** Googlebot and other crawlers pass through for SEO */
const BOT_UA_REGEX = /googlebot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot/i

const TERMS_COOKIE = 'cinemaphora_terms'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ua = request.headers.get('user-agent') || ''

  // Always allow bots through (SEO)
  if (BOT_UA_REGEX.test(ua)) return NextResponse.next()

  // Always allow public prefixes
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Always allow public routes
  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next()

  // Check the terms cookie
  const termsCookie = request.cookies.get(TERMS_COOKIE)
  if (termsCookie?.value === 'true') return NextResponse.next()

  // Unagreed user on a protected route → redirect to /declined with return URL
  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/declined'
  redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
  return NextResponse.redirect(redirectUrl)
}

export default proxy

export const proxyConfig = {
  /*
   * Match all request paths EXCEPT:
   * - _next/static (static files)
   * - _next/image (image optimization)
   * - favicon, icons, manifest, sw.js
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon|icons|manifest|sw\\.js).*)',
  ],
}
