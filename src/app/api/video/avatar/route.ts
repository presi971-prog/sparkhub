import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { rateLimit, getRateLimitKey } from '@/lib/rate-limit'

const N8N_WEBHOOK_URL = 'https://n8n.srv940229.hstgr.cloud/webhook/avatar-video'
const CREDITS_COST = 25

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Rate limit
    const rl = rateLimit(getRateLimitKey(req, user.id), 20, 60 * 60 * 1000)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
    }

    const { imageUrl, style, duration, message } = await req.json()

    if (!imageUrl || !style) {
      return NextResponse.json(
        { error: 'imageUrl et style sont requis' },
        { status: 400 }
      )
    }

    // Vérifier les crédits (table credits, pas profiles)
    const adminSupabase = await createAdminClient()
    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData || creditData.balance < CREDITS_COST) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${CREDITS_COST} crédits requis.` },
        { status: 402 }
      )
    }

    // Déduire les crédits
    await adminSupabase
      .from('credits')
      .update({
        balance: creditData.balance - CREDITS_COST,
        lifetime_spent: (creditData.lifetime_spent || 0) + CREDITS_COST,
      })
      .eq('profile_id', user.id)

    // Enregistrer la transaction
    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -CREDITS_COST,
        type: 'spend',
        description: 'Mon Avatar Video - Génération vidéo'
      })

    // Appeler le webhook n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        image_url: imageUrl,
        style,
        duration: duration || '5s',
        message: message || ''
      })
    })

    if (!response.ok) {
      // Rembourser les crédits en cas d'erreur
      await adminSupabase
        .from('credits')
        .update({
          balance: creditData.balance,
          lifetime_spent: (creditData.lifetime_spent || 0),
        })
        .eq('profile_id', user.id)

      await adminSupabase
        .from('credit_transactions')
        .insert({
          profile_id: user.id,
          amount: CREDITS_COST,
          type: 'refund',
          description: 'Mon Avatar Video - Remboursement (erreur n8n)'
        })

      return NextResponse.json(
        { error: 'Erreur lors du démarrage de la génération' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      credits_used: CREDITS_COST,
      credits_remaining: creditData.balance - CREDITS_COST,
      message: 'Génération en cours. Vous recevrez une notification quand la vidéo sera prête.'
    })
  } catch (error) {
    console.error('Erreur avatar video:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
