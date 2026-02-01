import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const tool = searchParams.get('tool') || 'avatar_video'

    const adminSupabase = await createAdminClient()

    // Chercher la dernière vidéo générée pour cet utilisateur et cet outil
    const { data: video, error } = await adminSupabase
      .from('generated_videos')
      .select('*')
      .eq('user_id', user.id)
      .eq('tool', tool)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!video) {
      return NextResponse.json({ status: 'none', video: null })
    }

    return NextResponse.json({
      status: video.status,
      video: {
        id: video.id,
        url: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        createdAt: video.created_at,
        style: video.style
      }
    })
  } catch (error) {
    console.error('Erreur video status:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
