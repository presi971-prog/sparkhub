import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const CREDITS_COST = 3
const POLL_INTERVAL = 2000
const MAX_POLL_ATTEMPTS = 60

// Prompt d'amélioration photo — mode ÉDITION explicite pour Nano Banana Pro
// Chaque prompt commence par "Using the provided image" pour forcer le mode édition
function buildEnhancePrompt(businessType: string, postStyle: string): string {
  const businessContext: Record<string, string> = {
    restaurant: 'Using the provided image, apply warm color temperature adjustments to make the dish look appetizing. Lift the midtones on greens, reds, and golden browns to bring out ingredient colors. Preserve all steam, sauce textures, and natural plating imperfections.',
    artisan: 'Using the provided image, increase clarity and sharpness to highlight craftsmanship details. Apply perspective correction if slightly tilted. Set a neutral white balance so wood, tile, concrete, and paint appear true to life.',
    beaute: 'Using the provided image, apply soft, flattering light adjustments that make skin look healthy and natural. Gently lift shadows on the face and body. Enhance hair color vibrancy and shine while keeping natural skin texture intact.',
    commerce: 'Using the provided image, make the product look clean and attractive with slightly lifted brightness and saturation. Apply subtle background blur if the background is busy. Keep all labels, textures, and fine details perfectly sharp.',
  }

  const styleIntent: Record<string, string> = {
    plat_du_jour: 'Using the provided image, make the dish the hero — slightly darken and soften the background so the plate pops forward.',
    promo: 'Using the provided image, give it a professional, bright, ad-quality look while keeping it authentic and real.',
    avant_apres: 'Using the provided image, maximize clarity and detail so the quality of the craftsmanship is immediately obvious.',
    nouveau: 'Using the provided image, slightly boost color vibrancy and contrast to create a fresh, exciting reveal feeling.',
    ambiance: 'Using the provided image, warm up the tones and enhance ambient light — lamps, natural sunlight — to create a cozy, welcoming atmosphere.',
  }

  const context = businessContext[businessType] || 'Using the provided image, gently improve the lighting and colors while keeping everything natural.'
  const intent = styleIntent[postStyle] || 'Apply professional but authentic post-processing suitable for social media.'

  const preservationFooter = `IMPORTANT: This is a photo EDITING task, not generation. Do not create a new image.
Keep all subjects, composition, natural textures, and the original aspect ratio exactly as they are.
Only make subtle, professional-level adjustments — like a good Lightroom edit.
The result should look like expert post-processing, not AI-generated.`

  return `${context}\n\n${intent}\n\n${preservationFooter}`
}

// Générer légende + hashtags via Gemini 2.5 Flash (Kie.ai)
async function generateCaptionAI(businessType: string, postStyle: string, message: string, businessName: string, photoUrl: string): Promise<{ caption: string; hashtags: string }> {
  const typeLabels: Record<string, string> = {
    restaurant: 'Restaurant / Snack',
    artisan: 'Artisan / BTP',
    beaute: 'Salon de beauté / Coiffure',
    commerce: 'Commerce / Boutique',
  }

  const styleLabels: Record<string, string> = {
    plat_du_jour: 'Plat du jour',
    promo: 'Promotion / Offre spéciale',
    avant_apres: 'Avant / Après (résultat d\'un travail)',
    nouveau: 'Nouveauté (produit, service, réalisation)',
    ambiance: 'Ambiance du lieu',
  }

  const systemPrompt = `Tu es un community manager expert en réseaux sociaux pour des petits commerces et professionnels en Guadeloupe (971, Antilles françaises).

Tu écris des légendes Instagram/Facebook qui :
- Sont en FRANÇAIS, avec un ton chaleureux et proche (tutoiement du lecteur)
- Utilisent des emojis avec goût (pas trop, bien placés)
- Sont engageantes et donnent envie de réagir, commenter ou venir
- Incluent un appel à l'action naturel
- Reflètent l'ambiance antillaise sans forcer les clichés
- Font entre 3 et 6 lignes maximum

Tu génères aussi des hashtags pertinents :
- 10 à 15 hashtags
- Mix de hashtags populaires (#guadeloupe #971 #antilles #gwada) et spécifiques au contenu
- Toujours en minuscules, sans espaces dans les hashtags
- Séparés par des espaces

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"caption": "ta légende ici", "hashtags": "#tag1 #tag2 #tag3"}`

  const styleInstructions: Record<string, string> = {
    plat_du_jour: 'Mets l\'accent sur le plat : décris-le de manière appétissante, mentionne les saveurs qu\'on imagine, donne envie de le goûter. Utilise un ton gourmand.',
    promo: 'Mets en avant l\'offre ou la promotion. Crée un sentiment d\'urgence (places limitées, durée limitée). Le lecteur doit avoir envie d\'en profiter maintenant.',
    avant_apres: 'Valorise la transformation et le savoir-faire. Montre la fierté du travail accompli. Insiste sur la qualité du résultat.',
    nouveau: 'Crée de l\'excitation autour de la nouveauté. Donne envie de découvrir et d\'essayer en premier. Ton enthousiaste.',
    ambiance: 'Décris l\'atmosphère chaleureuse du lieu. Le lecteur doit s\'imaginer y être, sentir les odeurs, entendre les sons. Ton immersif et poétique.',
  }

  const userPrompt = `Regarde cette photo et écris une légende Instagram pour :
- Type de commerce : ${typeLabels[businessType] || businessType}
- Style de post : ${styleLabels[postStyle] || postStyle}
- Nom du commerce : ${businessName || 'non précisé'}
- Message du commerçant : "${message || 'aucun message particulier'}"

CONSIGNE STYLE : ${styleInstructions[postStyle] || 'Écris une légende engageante et accrocheuse.'}

Décris ce que tu vois sur la photo et adapte ta légende en conséquence.`

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
    return {
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || '',
    }
  } catch (error) {
    console.error('Caption AI error:', error)
    const name = businessName || 'chez nous'
    return {
      caption: `${message || 'Venez découvrir ce qu\'on vous a préparé !'}\n\nOn vous attend ${name} 🌴\n\n📍 Guadeloupe`,
      hashtags: '#guadeloupe #971 #gwada #antilles #caribbean #local #decouverte',
    }
  }
}

// Polling du résultat Kie.ai
async function pollKieTask(taskId: string): Promise<string> {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))

    const response = await fetch(
      `https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${taskId}`,
      { headers: { 'Authorization': `Bearer ${KIE_API_KEY}` } }
    )

    if (!response.ok) continue

    const data = await response.json()
    const state = data.data?.state

    if (state === 'success') {
      const resultJson = JSON.parse(data.data.resultJson || '{}')
      const imageUrl = resultJson.resultUrls?.[0]
      if (!imageUrl) throw new Error('Pas d\'URL dans le résultat')
      return imageUrl
    }

    if (state === 'fail') {
      throw new Error(data.data?.failMsg || 'Échec de la génération')
    }
  }

  throw new Error('Timeout: la génération a pris trop de temps')
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

    // Lancer en parallèle : amélioration photo + génération légende
    const enhancePrompt = buildEnhancePrompt(businessType, postStyle)

    const [imageResult, captionResult] = await Promise.allSettled([
      // 1. Nano Banana Pro : améliorer la photo (pas générer une nouvelle)
      (async () => {
        const createResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${KIE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'nano-banana-pro',
            input: {
              prompt: enhancePrompt,
              image_input: [imageUrl],
              resolution: '2K',
              output_format: 'png',
            },
          }),
        })

        if (!createResponse.ok) {
          const errText = await createResponse.text()
          throw new Error(`Nano Banana Pro error: ${errText}`)
        }

        const createData = await createResponse.json()
        const taskId = createData.data?.taskId
        if (!taskId) throw new Error('Pas de taskId retourné')

        return pollKieTask(taskId)
      })(),

      // 2. Gemini 2.5 Flash : légende + hashtags (analyse la photo)
      generateCaptionAI(businessType, postStyle, message || '', businessName || '', imageUrl),
    ])

    // Image : version améliorée ou photo originale en fallback
    const finalImageUrl = imageResult.status === 'fulfilled'
      ? imageResult.value
      : imageUrl // Fallback : photo originale si l'amélioration échoue

    if (imageResult.status === 'rejected') {
      console.error('Image enhance failed (using original):', imageResult.reason)
    }

    const { caption, hashtags } = captionResult.status === 'fulfilled'
      ? captionResult.value
      : { caption: message || 'Découvrez ça !', hashtags: '#guadeloupe #971 #gwada #antilles' }

    return NextResponse.json({
      success: true,
      result: {
        image_url: finalImageUrl,
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
