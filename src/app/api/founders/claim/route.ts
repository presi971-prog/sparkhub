import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { profileId, userType } = await req.json()

  if (!profileId || !userType) {
    return NextResponse.json(
      { error: 'profileId and userType are required' },
      { status: 400 }
    )
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase.rpc('claim_founder_slot', {
    p_profile_id: profileId,
    p_user_type: userType
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data?.[0] || { success: false })
}
