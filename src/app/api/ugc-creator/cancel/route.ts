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

    // 2. Récupérer jobId
    const { jobId } = await req.json()
    if (!jobId) {
      return NextResponse.json({ error: 'jobId requis' }, { status: 400 })
    }

    // 3. Admin client (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Récupérer le job (vérifier qu'il appartient à l'utilisateur)
    const { data: job } = await adminSupabase
      .from('ugc_video_jobs')
      .select('id, user_id, status, credits_used')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (!job) {
      return NextResponse.json({ error: 'Job introuvable' }, { status: 404 })
    }

    // 5. On ne peut annuler que les jobs en cours
    if (!['submitted', 'processing'].includes(job.status)) {
      return NextResponse.json({ error: 'Ce job ne peut plus être annulé' }, { status: 400 })
    }

    // 6. Passer en "cancelled"
    await adminSupabase
      .from('ugc_video_jobs')
      .update({ status: 'error', error: 'Annulé par l\'utilisateur' })
      .eq('id', job.id)

    // 7. Rembourser les crédits
    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (creditData) {
      await adminSupabase.from('credits').update({
        balance: creditData.balance + job.credits_used,
        lifetime_spent: Math.max(0, (creditData.lifetime_spent || 0) - job.credits_used),
      }).eq('profile_id', user.id)

      await adminSupabase.from('credit_transactions').insert({
        profile_id: user.id,
        amount: job.credits_used,
        type: 'refund',
        description: 'UGC Creator - Annulé par l\'utilisateur',
      })
    }

    return NextResponse.json({
      success: true,
      credits_refunded: job.credits_used,
    })

  } catch (error) {
    console.error('UGC Creator cancel error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
