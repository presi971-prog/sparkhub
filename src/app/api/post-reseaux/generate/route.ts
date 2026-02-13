import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const CREDITS_COST = 3

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant / Snack',
  artisan: 'Artisan / BTP',
  beaute: 'Salon de beauté / Coiffure',
  commerce: 'Commerce / Boutique',
}

const STYLE_LABELS: Record<string, string> = {
  plat_du_jour: 'Plat du jour — mise en valeur d\'un plat ou produit phare',
  promo: 'Promotion — offre spéciale, réduction, événement',
  avant_apres: 'Avant / Après — montrer le résultat d\'un travail',
  nouveau: 'Nouveauté — nouveau produit, service ou réalisation',
  ambiance: 'Ambiance — montrer l\'atmosphère du lieu',
}

// Agent IA unique : analyse la photo + contexte pro → génère prompt d'édition + légende + hashtags
async function analyzeAndGenerate(
  photoUrl: string,
  businessType: string,
  postStyle: string,
  businessName: string,
  message: string
): Promise<{ editPrompt: string; caption: string; hashtags: string }> {

  const systemPrompt = `Tu es un expert à DOUBLE compétence :

1. DIRECTEUR PHOTO professionnel — tu analyses des photos et tu rédiges des instructions de retouche précises pour un outil d'édition IA (Nano Banana Pro). Tu utilises le vocabulaire Lightroom : color temperature, midtones, shadows, highlights, clarity, white balance, contrast, saturation, exposure, depth of field.

2. COMMUNITY MANAGER expert réseaux sociaux — tu écris des légendes Instagram/Facebook pour des petits commerces en Guadeloupe (971, Antilles françaises).

CONTEXTE DU PROFESSIONNEL :
- Type d'activité : ${TYPE_LABELS[businessType] || businessType}
- Objectif du post : ${STYLE_LABELS[postStyle] || postStyle}
- Nom du commerce : ${businessName || 'non précisé'}
- Message du commerçant : "${message || 'aucun message particulier'}"

TES 2 MISSIONS (dans cet ordre) :

MISSION 1 — PROMPT D'ÉDITION PHOTO (en anglais)
Analyse la photo fournie et rédige un prompt d'édition en anglais pour Nano Banana Pro. Le prompt doit :
- Commencer par "Using the provided image"
- Décrire ce que tu VOIS (sujet principal, éclairage actuel, couleurs, défauts)
- Donner 3-5 corrections PRÉCISES adaptées à ce que tu vois ET à l'objectif du post
- Utiliser des termes de photographie (color temperature, midtones, shadows, clarity, exposure, white balance, depth of field)
- Terminer par l'instruction de préservation

Exemples de corrections contextuelles :
- Restaurant/Plat du jour : réchauffer les tons, faire ressortir les couleurs des ingrédients, flouter l'arrière-plan si encombré, le plat doit être le héros
- Artisan/Avant-Après : maximiser clarté et netteté, correction perspective si besoin, balance des blancs neutre pour les matériaux
- Beauté/Nouveau : éclairage doux et flatteur, couleurs cheveux vibrantes, texture peau naturelle
- Commerce/Promo : produit net et lumineux, look publicitaire mais authentique, étiquettes lisibles
- Ambiance : tons chauds, lumière ambiante renforcée, atmosphère accueillante

MISSION 2 — LÉGENDE + HASHTAGS (en français)
Écris une légende Instagram/Facebook en français qui :
- Tutoie le lecteur, ton chaleureux et proche
- Utilise des emojis avec goût (pas trop)
- Est engageante, donne envie de réagir ou venir
- Inclut un appel à l'action naturel
- Reflète l'ambiance antillaise sans clichés
- Fait 3 à 6 lignes max
- Est adaptée à ce que tu vois sur la photo

Génère aussi 10-15 hashtags pertinents (minuscules, sans espaces, séparés par des espaces). Mix de hashtags populaires (#guadeloupe #971 #antilles #gwada) et spécifiques au contenu.

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"editPrompt": "Using the provided image... (en anglais)", "caption": "ta légende ici (en français)", "hashtags": "#tag1 #tag2 #tag3"}`

  const userPrompt = `Analyse cette photo et exécute tes 2 missions. Regarde attentivement ce qu'il y a sur la photo avant de répondre.`

  try {
    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: photoUrl } },
            { type: 'text', text: userPrompt },
          ] },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      console.error('Gemini error:', response.status, await response.text())
      throw new Error('Erreur Gemini')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanContent)

    // Ajouter le footer de préservation au prompt d'édition
    const preservationFooter = `\n\nIMPORTANT: This is a photo EDITING task, not generation. Do not create a new image. Keep all subjects, composition, natural textures, and the original aspect ratio exactly as they are. Only make subtle, professional-level adjustments — like a good Lightroom edit. The result should look like expert post-processing, not AI-generated.`

    return {
      editPrompt: (parsed.editPrompt || 'Using the provided image, gently improve the lighting and colors while keeping everything natural.') + preservationFooter,
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    }
  } catch (error) {
    console.error('Analyze AI error:', error)
    const name = businessName || 'chez nous'

    // Fallback : prompt générique + légende basique
    const fallbackPrompts: Record<string, string> = {
      restaurant: 'Using the provided image, apply warm color temperature, lift midtones on food colors, and preserve natural textures.',
      artisan: 'Using the provided image, increase clarity and sharpness, correct perspective, and set neutral white balance.',
      beaute: 'Using the provided image, apply soft flattering light, lift shadows, and enhance hair vibrancy while keeping natural skin texture.',
      commerce: 'Using the provided image, brighten the product, apply subtle background blur, and keep all labels and details sharp.',
    }

    return {
      editPrompt: (fallbackPrompts[businessType] || 'Using the provided image, gently improve the lighting and colors.') +
        '\n\nIMPORTANT: This is a photo EDITING task, not generation. Do not create a new image. Keep all subjects, composition, natural textures, and the original aspect ratio exactly as they are.',
      caption: `${message || 'Venez découvrir ce qu\'on vous a préparé !'}\n\nOn vous attend ${name} 🌴\n\n📍 Guadeloupe`,
      hashtags: '#guadeloupe #971 #gwada #antilles #caribbean #local #decouverte',
    }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { imageUrl, businessType, businessName, postStyle, message } = await req.json()

    if (!imageUrl || !businessType || !postStyle) {
      return NextResponse.json(
        { error: 'imageUrl, businessType et postStyle sont requis' },
        { status: 400 }
      )
    }

    // Client admin direct (bypass RLS complet)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -CREDITS_COST,
        type: 'spend',
        description: 'Post Réseaux Sociaux - Photo améliorée + légende IA'
      })

    // 1. Agent IA : analyse photo + contexte → prompt d'édition + légende + hashtags
    const { editPrompt, caption, hashtags } = await analyzeAndGenerate(
      imageUrl, businessType, postStyle, businessName || '', message || ''
    )

    console.log('Edit prompt generated:', editPrompt.slice(0, 200))

    // 2. Soumettre le job fal.ai avec le prompt sur mesure
    let falStatusUrl: string | null = null
    let falResponseUrl: string | null = null
    let falError: string | null = null

    try {
      const submitResponse = await fetch('https://queue.fal.run/fal-ai/nano-banana-pro/edit', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: editPrompt,
          image_urls: [imageUrl],
          resolution: '2K',
        }),
      })

      if (!submitResponse.ok) {
        const errText = await submitResponse.text()
        throw new Error(`fal.ai (${submitResponse.status}): ${errText}`)
      }

      const submitData = await submitResponse.json()
      falStatusUrl = submitData.status_url || null
      falResponseUrl = submitData.response_url || null

      if (!falStatusUrl) {
        throw new Error(`fal.ai: pas de status_url. Réponse: ${JSON.stringify(submitData)}`)
      }
    } catch (error) {
      falError = error instanceof Error ? error.message : 'Erreur fal.ai'
      console.error('fal.ai submit error:', error)
    }

    // 3. Retourner immédiatement avec légende + URLs polling
    return NextResponse.json({
      success: true,
      result: {
        image_url: imageUrl,
        fal_status_url: falStatusUrl,
        fal_response_url: falResponseUrl,
        fal_error: falError,
        caption,
        hashtags,
        credits_used: CREDITS_COST,
        credits_remaining: creditData.balance - CREDITS_COST
      }
    })
  } catch (error) {
    console.error('Erreur post réseaux:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
