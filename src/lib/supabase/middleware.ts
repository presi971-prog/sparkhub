import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Lightweight middleware: no Supabase client, no network calls.
  // Auth is checked by cookie presence only. Real auth validation
  // happens in page-level server components (getUser()).

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))

  // Protected routes — redirect to login if no session cookie
  const protectedPaths = ['/tableau-de-bord', '/profil', '/credits', '/outils', '/admin']
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages — redirect to dashboard if already logged in
  const authPaths = ['/connexion', '/inscription']
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthPath && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/tableau-de-bord'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
