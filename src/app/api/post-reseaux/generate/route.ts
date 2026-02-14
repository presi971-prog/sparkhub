import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const CREDITS_COST = 3

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurant / Snack / Food truck',
  artisan: 'Artisan / BTP / Rénovation',
  beaute: 'Salon de beauté / Coiffure / Esthétique',
  commerce: 'Commerce / Boutique / Magasin',
  sport: 'Sport / Bien-être / Coach / Salle de sport / Yoga / Spa',
  tourisme: 'Tourisme / Hébergement / Hôtel / Gîte / Location / Excursions',
  auto: 'Auto / Moto / Garage / Mécanicien / Carrossier',
  evenementiel: 'Événementiel / DJ / Photographe / Animateur / Décorateur',
}

const STYLE_LABELS: Record<string, string> = {
  plat_du_jour: 'Plat du jour — mise en valeur d\'un plat ou produit phare',
  promo: 'Promotion — offre spéciale, réduction, événement',
  avant_apres: 'Avant / Après — montrer le résultat d\'un travail ou une transformation',
  nouveau: 'Nouveauté — nouveau produit, service ou réalisation',
  ambiance: 'Ambiance — montrer l\'atmosphère du lieu',
  performance: 'Performance — action en mouvement, énergie et dynamisme',
  lieu: 'Le lieu — l\'espace mis en valeur avec une ambiance qui donne envie',
}

// Agent IA unique : analyse la photo + contexte pro → génère prompt compositing + légende + hashtags
async function analyzeAndGenerate(
  photoUrl: string,
  businessType: string,
  postStyle: string,
  businessName: string,
  message: string
): Promise<{ editPrompt: string; caption: string; hashtags: string }> {

  const systemPrompt = `Tu es un expert à DOUBLE compétence :

1. DIRECTEUR ARTISTIQUE publicitaire — tu analyses des photos de produits/réalisations et tu rédiges des instructions de COMPOSITING pour un outil IA d'édition d'image (Nano Banana Pro). Ton objectif : garder le sujet principal INTACT et générer un environnement/décor adapté autour.

2. COMMUNITY MANAGER expert réseaux sociaux — tu écris des légendes Instagram/Facebook pour des petits commerces en Guadeloupe (971, Antilles françaises).

CONTEXTE DU PROFESSIONNEL :
- Type d'activité : ${TYPE_LABELS[businessType] || businessType}
- Objectif du post : ${STYLE_LABELS[postStyle] || postStyle}
- Nom du commerce : ${businessName || 'non précisé'}
- Message du commerçant : "${message || 'aucun message particulier'}"

TES 2 MISSIONS (dans cet ordre) :

MISSION 1 — PROMPT DE COMPOSITING PHOTO (en anglais)
Analyse la photo fournie et rédige un prompt en anglais pour Nano Banana Pro. Le prompt doit :
- Commencer par "Using the provided image"
- Identifier clairement le SUJET PRINCIPAL (le plat, le produit, le travail réalisé, la coiffure, etc.)
- Demander de GARDER le sujet principal INTACT (forme, couleurs, textures, détails)
- Décrire précisément l'ENVIRONNEMENT/DÉCOR à GÉNÉRER autour du sujet selon l'objectif du post

RÈGLES PAR STYLE DE POST :

"Plat du jour" (restaurant) :
→ Le plat reste IDENTIQUE. Générer autour : une belle table en bois ou nappe élégante, des couverts, un verre, un arrière-plan flou de restaurant chaleureux avec lumière chaude. Le plat doit être le héros de l'image.

"Promotion" (tous types) :
→ Le produit/sujet reste IDENTIQUE. Générer : un fond publicitaire professionnel, lumineux et propre. Éclairage studio, fond uni ou dégradé doux. L'image doit ressembler à une pub pro.

"Avant / Après" (artisan, beauté, auto, sport) :
→ Le travail/résultat reste IDENTIQUE. Générer : un fond épuré et neutre (blanc, gris clair) qui met toute l'attention sur le résultat. Éclairage net et uniforme. Clarté maximale.

"Nouveauté" (tous types) :
→ Le produit/sujet reste IDENTIQUE. Générer : un décor moderne et frais, couleurs vives, feeling de révélation/lancement. Peut inclure des éléments décoratifs contemporains (plantes, textures).

"Ambiance" (restaurant, beauté, commerce, tourisme, événementiel) :
→ Le lieu/sujet reste IDENTIQUE mais sublimé. Générer : lumière dorée/golden hour, atmosphère chaleureuse et accueillante, renforcer l'ambiance existante. Peut ajouter des éléments d'ambiance (bougies, lumières tamisées).

"Performance" (sport, événementiel) :
→ Le sujet en action reste IDENTIQUE. Générer : un fond dynamique avec effet de mouvement, éclairage dramatique, lignes d'énergie. L'image doit transmettre la puissance et le dynamisme. Fond sombre avec spots lumineux ou fond extérieur sportif.

"Le lieu" (sport, tourisme) :
→ L'espace/lieu reste IDENTIQUE mais sublimé. Générer : lumière naturelle magnifiée, ciel bleu ou coucher de soleil, végétation tropicale renforcée. Pour un gîte/hôtel : ambiance paradisiaque. Pour une salle de sport : ambiance motivante avec éclairage pro.

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

  const userPrompt = `Analyse cette photo et exécute tes 2 missions. Regarde attentivement le SUJET PRINCIPAL de la photo — c'est lui qui doit rester intact. Puis décris l'environnement idéal à générer autour.`

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

    // Ajouter le footer de compositing au prompt d'édition
    const compositingFooter = `\n\nCRITICAL RULES: Keep the MAIN SUBJECT (product, dish, work, person) exactly as it is — same shape, colors, textures, details. Do NOT alter, distort, or regenerate the subject. You may enhance the BACKGROUND and ENVIRONMENT around the subject: generate a new setting, improve lighting, add contextual elements. The subject must remain photographically real and untouched. The final image should look like a professional product photography composite.`

    return {
      editPrompt: (parsed.editPrompt || 'Using the provided image, keep the main subject intact and place it in a clean, professional environment with warm lighting.') + compositingFooter,
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    }
  } catch (error) {
    console.error('Analyze AI error:', error)
    const name = businessName || 'chez nous'

    // Fallback : prompt générique compositing + légende basique
    const fallbackPrompts: Record<string, string> = {
      restaurant: 'Using the provided image, keep the dish exactly as it is and place it on an elegant wooden table with warm restaurant lighting in the background.',
      artisan: 'Using the provided image, keep the work/result exactly as it is and place it on a clean, neutral background with bright uniform lighting.',
      beaute: 'Using the provided image, keep the subject exactly as it is and enhance the environment with soft, flattering studio lighting and a clean backdrop.',
      commerce: 'Using the provided image, keep the product exactly as it is and place it in a professional advertising setting with clean studio lighting.',
      sport: 'Using the provided image, keep the subject exactly as it is and place them in a dynamic sports environment with dramatic lighting and energy.',
      tourisme: 'Using the provided image, keep the place exactly as it is and enhance with tropical paradise atmosphere, blue sky, and warm natural light.',
      auto: 'Using the provided image, keep the vehicle/work exactly as it is and place it in a clean professional garage or showroom setting.',
      evenementiel: 'Using the provided image, keep the subject exactly as it is and place in a festive, vibrant event atmosphere with dramatic lighting.',
    }

    return {
      editPrompt: (fallbackPrompts[businessType] || 'Using the provided image, keep the main subject intact and place it in a clean, professional environment with warm lighting.') +
        '\n\nCRITICAL: Keep the MAIN SUBJECT exactly as it is — same shape, colors, textures. Only change the background and environment around it.',
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
        description: 'Post Réseaux Sociaux - Mise en scène photo + légende IA'
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
