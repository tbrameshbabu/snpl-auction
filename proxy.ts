import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env'

const ROLE_PREFIXES = {
  '/player': 'player',
  '/team-owner': 'team_owner',
  '/auctioneer': 'auctioneer',
} as const

const PROTECTED_PREFIXES = [...Object.keys(ROLE_PREFIXES), '/auction']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refreshes the session cookies when expired; must run before any early return.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect responses must carry any cookies refreshed above.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  const pathname = request.nextUrl.pathname
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!isProtectedRoute) {
    return supabaseResponse
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.search = ''
    url.searchParams.set('redirectTo', pathname)
    return redirectTo(url)
  }

  const requiredRole = Object.entries(ROLE_PREFIXES).find(([prefix]) => pathname.startsWith(prefix))?.[1]
  if (requiredRole) {
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== requiredRole) {
      return redirectTo(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
