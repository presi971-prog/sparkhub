import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 })
    }

    // RLS garantit que l'utilisateur ne voit que ses propres jobs
    const { data: job, error } = await supabase
      .from('ugc_video_jobs')
      .select('id, status, video_url, error, created_at, updated_at')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      status: job.status,
      video_url: job.video_url,
      error: job.error,
      created_at: job.created_at,
      updated_at: job.updated_at,
    })
  } catch (error) {
    console.error('UGC Creator status error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
