import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { TOOLS_CONFIG } from '@/config/tiers'

const N8N_UGC_WEBHOOK_URL = process.env.N8N_UGC_WEBHOOK_URL!
const CREDITS_COST = TOOLS_CONFIG.video_ugc.credits

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // 2. Validation FormData
    const formData = await req.formData()
    const type = formData.get('type') as string
    const qui = formData.get('qui') as string
    const lieu = formData.get('lieu') as string
    const action = formData.get('action') as string
    const ambiance = formData.get('ambiance') as string
    const file = formData.get('image') as File

    if (!type || !qui || !lieu || !action || !ambiance || !file) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    if (!['Produit', 'Mascotte ou personnage'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop lourde (max 10 Mo)' }, { status: 400 })
    }

    // 3. Admin client (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 4. Vérifier crédits
    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData || creditData.balance < CREDITS_COST) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${CREDITS_COST} crédits requis, ${creditData?.balance || 0} disponibles.` },
        { status: 402 }
      )
    }

    // 5. Upload image vers Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('ugc-videos')
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError || !uploadData) {
      console.error('UGC upload error:', uploadError)
      return NextResponse.json({ error: 'Erreur upload image' }, { status: 500 })
    }

    const { data: urlData } = adminSupabase.storage
      .from('ugc-videos')
      .getPublicUrl(uploadData.path)

    const imageUrl = urlData.publicUrl

    // 6. Déduire les crédits
    await adminSupabase.from('credits').update({
      balance: creditData.balance - CREDITS_COST,
      lifetime_spent: (creditData.lifetime_spent || 0) + CREDITS_COST,
    }).eq('profile_id', user.id)

    await adminSupabase.from('credit_transactions').insert({
      profile_id: user.id,
      amount: -CREDITS_COST,
      type: 'spend',
      description: 'UGC Creator (Veo 3.1)',
    })

    // 7. Générer callback token
    const callbackToken = randomUUID()

    // 8. Insérer le job
    const { data: job, error: insertError } = await adminSupabase
      .from('ugc_video_jobs')
      .insert({
        user_id: user.id,
        status: 'submitted',
        type,
        qui,
        lieu,
        action,
        ambiance,
        image_url: imageUrl,
        credits_used: CREDITS_COST,
        callback_token: callbackToken,
      })
      .select('id')
      .single()

    if (insertError || !job) {
      console.error('UGC job insert error:', insertError)
      // Rembourser
      await adminSupabase.from('credits').update({
        balance: creditData.balance,
        lifetime_spent: creditData.lifetime_spent || 0,
      }).eq('profile_id', user.id)
      await adminSupabase.from('credit_transactions').insert({
        profile_id: user.id,
        amount: CREDITS_COST,
        type: 'refund',
        description: 'UGC Creator - Remboursement (erreur création job)',
      })
      return NextResponse.json({ error: 'Erreur création job' }, { status: 500 })
    }

    // 9. Appeler webhook n8n
    // N.B. : ne pas utiliser NEXT_PUBLIC_APP_URL (baked at build, valeur incorrecte)
    const callbackUrl = 'https://sparkhub.digital-code-growth.com/api/ugc-creator/callback'

    const webhookRes = await fetch(N8N_UGC_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.id,
        image_url: imageUrl,
        type,
        qui,
        lieu,
        action,
        ambiance,
        callback_url: callbackUrl,
        callback_token: callbackToken,
      }),
    })

    if (!webhookRes.ok) {
      console.error('n8n webhook error:', webhookRes.status, await webhookRes.text().catch(() => ''))
      // Marquer en erreur et rembourser
      await adminSupabase.from('ugc_video_jobs')
        .update({ status: 'error', error: 'Erreur connexion n8n' })
        .eq('id', job.id)
      await adminSupabase.from('credits').update({
        balance: creditData.balance,
        lifetime_spent: creditData.lifetime_spent || 0,
      }).eq('profile_id', user.id)
      await adminSupabase.from('credit_transactions').insert({
        profile_id: user.id,
        amount: CREDITS_COST,
        type: 'refund',
        description: 'UGC Creator - Remboursement (erreur n8n)',
      })
      return NextResponse.json({ error: 'Erreur lancement génération' }, { status: 500 })
    }

    // 10. Succès
    return NextResponse.json({
      success: true,
      jobId: job.id,
      credits_used: CREDITS_COST,
      credits_remaining: creditData.balance - CREDITS_COST,
    })

  } catch (error) {
    console.error('UGC Creator generate error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
