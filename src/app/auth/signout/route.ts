import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Redirige vers la racine du MÊME domaine d'où vient la déconnexion : quitter
  // depuis SparkGrowth (sparkgrowth.digital-code-growth.com) doit rester sur
  // SparkGrowth, au lieu d'un domaine SparkHub codé en dur. On lit l'hôte public
  // via les en-têtes proxy de Vercel, avec repli sur NEXT_PUBLIC_APP_URL.
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const base =
    host != null
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return NextResponse.redirect(new URL('/', base), { status: 302 })
}
