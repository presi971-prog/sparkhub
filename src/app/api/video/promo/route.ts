import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = 'https://n8n.srv940229.hstgr.cloud/webhook/promo-produit'
const CREDITS_COST = 25

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const {
      imageUrl,
      style,
      duration,
      productDescription,
      characterDescription,
      locationDescription
    } = await req.json()

    if (!imageUrl || !style || !characterDescription) {
      return NextResponse.json(
        { error: 'imageUrl, style et characterDescription sont requis' },
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
        description: 'Promo Produit - Génération vidéo'
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
        product_description: productDescription || '',
        character_description: characterDescription,
        location_description: locationDescription || ''
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

    return NextResponse.json({
      success: true,
      message: 'Génération en cours. Vous recevrez une notification quand la vidéo sera prête.'
    })
  } catch (error) {
    console.error('Erreur promo produit:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
