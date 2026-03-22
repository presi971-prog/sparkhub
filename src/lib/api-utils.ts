import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Vérifie que le requester est authentifié et admin.
 * Retourne { user, supabase } si OK, ou une NextResponse d'erreur.
 */
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, supabase }
}

/**
 * Vérifie que le requester est authentifié.
 * Retourne { user, supabase } si OK, ou une NextResponse d'erreur.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  return { user, supabase }
}

/**
 * Wrapper try-catch pour routes API.
 * Capture les erreurs non gérées et retourne une 500 propre.
 */
export function apiHandler(handler: (req: Request, ctx?: unknown) => Promise<NextResponse>) {
  return async (req: Request, ctx?: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      console.error(`[API Error] ${req.method} ${new URL(req.url).pathname}:`, error)
      return NextResponse.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 }
      )
    }
  }
}
