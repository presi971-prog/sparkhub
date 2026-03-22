import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-utils'

// GET: List pending registrations (admin only)
export async function GET(req: Request) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'pending'

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API Error] GET /api/admin/registrations:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
