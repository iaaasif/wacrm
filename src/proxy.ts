import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  try {
    // Skip session refresh for API routes that handle their own auth
    if (request.nextUrl.pathname.startsWith('/api/') && !request.nextUrl.pathname.startsWith('/api/whatsapp/')) {
      return NextResponse.next({ request })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase config is not provided, allow request through gracefully
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie)
      })
      return response
    }

    // Auth pages - redirect to dashboard if already logged in
    if (user && (
      request.nextUrl.pathname === '/login' ||
      request.nextUrl.pathname === '/signup' ||
      request.nextUrl.pathname === '/forgot-password'
    )) {
      const url = request.nextUrl.clone()
      const inviteToken = request.nextUrl.searchParams.get('invite')
      if (
        inviteToken &&
        (request.nextUrl.pathname === '/login' ||
          request.nextUrl.pathname === '/signup')
      ) {
        url.pathname = `/join/${encodeURIComponent(inviteToken)}`
        url.search = ''
      } else {
        url.pathname = '/dashboard'
        url.search = ''
      }
      return withRefreshedCookies(NextResponse.redirect(url))
    }

    // Protected pages - redirect to login if not authenticated
    const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/flows', '/agents', '/notifications', '/settings']
    if (!user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return withRefreshedCookies(NextResponse.redirect(url))
    }

    // API routes that need auth (not webhooks)
    if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
        !request.nextUrl.pathname.includes('/webhook')) {
      return withRefreshedCookies(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      )
    }

    return supabaseResponse
  } catch (err) {
    console.error('[Proxy Error]:', err)
    // Never crash with 500 on unhandled proxy exceptions
    return NextResponse.next({ request })
  }
}

// Support both Next.js 16 proxy convention and legacy middleware caller
export const middleware = proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
