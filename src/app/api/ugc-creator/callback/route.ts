import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // 1. Vérifier le callback token (envoyé par n8n en header)
    const callbackToken = req.headers.get('x-callback-token')
    if (!callbackToken) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }

    // 2. Parser le body
    const { job_id, status, video_url, error: errorMsg } = await req.json()

    if (!job_id || !status) {
      return NextResponse.json({ error: 'job_id et status requis' }, { status: 400 })
    }

    if (!['processing', 'completed', 'error'].includes(status)) {
      return NextResponse.json({ error: 'Status invalide' }, { status: 400 })
    }

    // 3. Admin client (pas d'auth user — c'est n8n qui appelle)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Vérifier que le job existe et que le token correspond
    const { data: job, error: fetchError } = await adminSupabase
      .from('ugc_video_jobs')
      .select('id, user_id, credits_used, callback_token, status')
      .eq('id', job_id)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job non trouvé' }, { status: 404 })
    }

    if (job.callback_token !== callbackToken) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 403 })
    }

    // Ignorer si le job est déjà terminé
    if (job.status === 'completed' || job.status === 'error') {
      return NextResponse.json({ success: true, message: 'Job déjà finalisé' })
    }

    // 5. Traiter selon le status
    if (status === 'completed' && video_url) {
      await adminSupabase.from('ugc_video_jobs')
        .update({ status: 'completed', video_url })
        .eq('id', job_id)

      return NextResponse.json({ success: true })
    }

    if (status === 'error') {
      // Marquer en erreur
      await adminSupabase.from('ugc_video_jobs')
        .update({ status: 'error', error: errorMsg || 'Erreur n8n' })
        .eq('id', job_id)

      // Rembourser les crédits
      const { data: creditData } = await adminSupabase
        .from('credits')
        .select('balance, lifetime_spent')
        .eq('profile_id', job.user_id)
        .single()

      if (creditData) {
        await adminSupabase.from('credits').update({
          balance: creditData.balance + job.credits_used,
          lifetime_spent: Math.max(0, (creditData.lifetime_spent || 0) - job.credits_used),
        }).eq('profile_id', job.user_id)

        await adminSupabase.from('credit_transactions').insert({
          profile_id: job.user_id,
          amount: job.credits_used,
          type: 'refund',
          description: `UGC Creator - Remboursement (${errorMsg || 'erreur n8n'})`,
        })
      }

      return NextResponse.json({ success: true })
    }

    if (status === 'processing') {
      await adminSupabase.from('ugc_video_jobs')
        .update({ status: 'processing' })
        .eq('id', job_id)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('UGC Creator callback error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
