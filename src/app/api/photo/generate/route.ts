import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = 'https://n8n.srv940229.hstgr.cloud/webhook/photo-pub-pro'
const CREDITS_COST = 5

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { imageUrl, mode, style, instructions } = await req.json()

    if (!imageUrl || !mode || !style) {
      return NextResponse.json(
        { error: 'imageUrl, mode et style sont requis' },
        { status: 400 }
      )
    }

    // Vérifier les crédits
    const adminSupabase = await createAdminClient()
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (!profile || profile.credits < CREDITS_COST) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${CREDITS_COST} crédits requis.` },
        { status: 402 }
      )
    }

    // Déduire les crédits
    await adminSupabase
      .from('profiles')
      .update({ credits: profile.credits - CREDITS_COST })
      .eq('id', user.id)

    // Enregistrer la transaction de crédits
    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -CREDITS_COST,
        type: 'usage',
        description: 'Photo Pub Pro - Génération image'
      })

    // Appeler le webhook n8n
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        image_url: imageUrl,
        mode,
        style,
        instructions: instructions || ''
      })
    })

    if (!response.ok) {
      // Rembourser les crédits en cas d'erreur
      await adminSupabase
        .from('profiles')
        .update({ credits: profile.credits })
        .eq('id', user.id)

      return NextResponse.json(
        { error: 'Erreur lors du démarrage de la génération' },
        { status: 500 }
      )
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      result: {
        image_url: result.image_url,
        credits_used: CREDITS_COST,
        credits_remaining: profile.credits - CREDITS_COST
      }
    })
  } catch (error) {
    console.error('Erreur photo pub pro:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
