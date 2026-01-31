import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profileId')

  if (!profileId) {
    return NextResponse.json(
      { error: 'profileId is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
