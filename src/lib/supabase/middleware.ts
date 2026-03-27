import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const protectedPaths = ['/tableau-de-bord', '/profil', '/credits', '/outils', '/admin']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  const authPaths = ['/connexion', '/inscription']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Only call getUser() on protected/auth paths (avoid network call on public pages)
  if (isProtectedPath || isAuthPath) {
    let user = null

    try {
      // Timeout de 3s pour éviter GATEWAY_TIMEOUT sur cookies expirés
      const result = await Promise.race([
        supabase.auth.getUser(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ])

      if (result && typeof result === 'object' && 'data' in result) {
        user = (result as { data: { user: unknown } }).data.user
      }
    } catch {
      // Si getUser() échoue, traiter comme non connecté
      user = null
    }

    if (isProtectedPath && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/connexion'
      url.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    if (isAuthPath && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/tableau-de-bord'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
