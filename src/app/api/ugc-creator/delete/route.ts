import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 2. Parse body
    const { jobId } = await req.json()
    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 })
    }

    // 3. Admin client
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Vérifier que le job appartient à l'utilisateur
    const { data: job, error: fetchError } = await adminSupabase
      .from('ugc_video_jobs')
      .select('id, user_id, status')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
    }

    // 5. Supprimer le job (seulement si completed ou error)
    if (job.status !== 'completed' && job.status !== 'error') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un job en cours' },
        { status: 400 }
      )
    }

    await adminSupabase
      .from('ugc_video_jobs')
      .delete()
      .eq('id', jobId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('UGC Creator delete error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
