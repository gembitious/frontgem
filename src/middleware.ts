import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth'
import { serverEnv } from '@/lib/env'

// Gate the admin editor and the publish API behind the session cookie.
export async function middleware(req: NextRequest) {
  let authed = false
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    authed = await verifySession(serverEnv.authSecret(), token)
  } catch {
    // Misconfigured secret → fail closed.
    authed = false
  }

  if (authed) return NextResponse.next()

  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/write/:path*',
    '/api/publish/:path*',
    '/api/preview/:path*',
    '/api/revise/:path*',
    '/api/upload/:path*',
    '/api/lapidary/:path*',
  ],
}
