import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET: List pending registrations
export async function GET(req: Request) {
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
}
