import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { profileId, points, action, description } = await req.json()

  if (!profileId || !points || !action) {
    return NextResponse.json(
      { error: 'profileId, points, and action are required' },
      { status: 400 }
    )
  }

  const supabase = await createAdminClient()

  const { error } = await supabase.rpc('add_points', {
    p_profile_id: profileId,
    p_points: points,
    p_action: action,
    p_description: description || null
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
