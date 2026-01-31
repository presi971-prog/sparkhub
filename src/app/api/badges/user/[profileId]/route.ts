import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params

  const supabase = await createClient()

  // Get earned badges
  const { data: earnedBadges, error: earnedError } = await supabase
    .from('profile_badges')
    .select(`
      earned_at,
      badges (
        id,
        name,
        description,
        icon,
        category,
        points_reward
      )
    `)
    .eq('profile_id', profileId)

  if (earnedError) {
    return NextResponse.json({ error: earnedError.message }, { status: 500 })
  }

  // Get all badges
  const { data: allBadges, error: allError } = await supabase
    .from('badges')
    .select('*')
    .order('category')

  if (allError) {
    return NextResponse.json({ error: allError.message }, { status: 500 })
  }

  // Combine to show earned status
  const badgesWithStatus = allBadges.map(badge => ({
    ...badge,
    earned: earnedBadges?.some((eb: any) => eb.badges?.id === badge.id) || false,
    earned_at: earnedBadges?.find((eb: any) => eb.badges?.id === badge.id)?.earned_at || null
  }))

  return NextResponse.json(badgesWithStatus)
}
