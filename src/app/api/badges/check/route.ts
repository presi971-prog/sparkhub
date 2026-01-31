import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { profileId } = await req.json()

  if (!profileId) {
    return NextResponse.json(
      { error: 'profileId is required' },
      { status: 400 }
    )
  }

  const supabase = await createAdminClient()

  const { data: newBadges, error } = await supabase.rpc('check_and_award_badges', {
    p_profile_id: profileId
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const awarded = (newBadges || []).filter((b: { newly_awarded: boolean }) => b.newly_awarded)

  return NextResponse.json({
    newBadges: awarded,
    count: awarded.length
  })
}
