import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SITE_THEMES } from '@/app/(dashboard)/outils/mini-site/mini-site-templates'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const GENERATE_COST = 1

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { business_name, business_type, slogan, services, address, theme, hero_config, is_update } = await req.json()

    if (!business_name || !business_name.trim()) {
      return NextResponse.json({ error: 'Le nom du commerce est requis' }, { status: 400 })
    }

    // Client admin (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verifier si l'utilisateur est admin (bypass credits)
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Verification et deduction credits (sauf admin ou mise a jour)
    let creditsRemaining: number | null = null

    if (!isAdmin) {
      const { data: creditData } = await adminSupabase
        .from('credits')
        .select('balance, lifetime_spent')
        .eq('profile_id', user.id)
        .single()

      if (!creditData || creditData.balance < GENERATE_COST) {
        return NextResponse.json(
          { error: `Credits insuffisants. ${GENERATE_COST} credits requis.` },
          { status: 402 }
        )
      }

      // Deduire les credits
      await adminSupabase
        .from('credits')
        .update({
          balance: creditData.balance - GENERATE_COST,
          lifetime_spent: (creditData.lifetime_spent || 0) + GENERATE_COST,
        })
        .eq('profile_id', user.id)

      await adminSupabase
        .from('credit_transactions')
        .insert({
          profile_id: user.id,
          amount: -GENERATE_COST,
          type: 'spend',
          description: 'Mini Site Vitrine - Generation IA',
        })

      creditsRemaining = creditData.balance - GENERATE_COST
    }

    // Generer le slug
    let slug = slugify(business_name)

    // Verifier unicite du slug (sauf pour le propre site de l'utilisateur)
    const { data: existingSlug } = await adminSupabase
      .from('mini_sites')
      .select('id, profile_id')
      .eq('slug', slug)
      .single()

    if (existingSlug && existingSlug.profile_id !== user.id) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    }

    // Lancer texte IA + image IA en parallele
    const servicesText = services?.length
      ? services.map((s: { name: string; price: string }) => `${s.name}${s.price ? ` (${s.price})` : ''}`).join(', ')
      : ''

    const siteTheme = SITE_THEMES.find(t => t.id === theme) || SITE_THEMES[0]

    const [textResult, imageResult] = await Promise.allSettled([
      // 1. Texte marketing via Gemini
      generateMarketingText({
        business_name,
        business_type,
        slogan,
        servicesText,
        address,
      }),

      // 2. Image de couverture : config structuree → prompt direct → fal.ai genere
      generateHeroImage(siteTheme.aiPrompt, business_name, business_type, hero_config),
    ])

    const ai_description = textResult.status === 'fulfilled' ? textResult.value : ''
    const hero_image_url = imageResult.status === 'fulfilled' ? imageResult.value : null

    return NextResponse.json({
      success: true,
      ai_description,
      hero_image_url,
      slug,
      credits_remaining: creditsRemaining,
    })
  } catch (error) {
    console.error('Mini-site generate error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// --- Helpers ---

async function generateMarketingText({
  business_name,
  business_type,
  slogan,
  servicesText,
  address,
}: {
  business_name: string
  business_type: string
  slogan: string
  servicesText: string
  address: string
}): Promise<string> {
  const systemPrompt = `Tu es un expert en marketing local en Guadeloupe (Antilles francaises).
Ecris une description attractive et chaleureuse pour le site web d'un commerce local.

Regles :
- 3-4 paragraphes maximum
- Ton chaleureux, accueillant, professionnel
- Mentionne les specialites et l'ambiance
- References locales quand pertinent (Guadeloupe, Antilles, Caraibes)
- En francais
- Ne mets PAS de titre, juste le texte
- Ne repete pas le nom du commerce dans chaque phrase`

  const userPrompt = `Commerce : ${business_name}
Type : ${business_type || 'Commerce local'}
${slogan ? `Slogan : ${slogan}` : ''}
${servicesText ? `Services/Produits : ${servicesText}` : ''}
${address ? `Adresse : ${address}` : ''}`

  const response = await fetch('https://api.kie.ai/gemini-3/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'text', text: userPrompt }] },
      ],
      stream: false,
      include_thoughts: false,
    }),
  })

  if (!response.ok) {
    console.error('Gemini text error:', response.status)
    return ''
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// ============================================================
// CONSTRUCTION DIRECTE DU PROMPT (sans passer par Gemini)
// Chaque choix utilisateur a ses mots-cles anglais deja prets.
// On les assemble mecaniquement = pas d'interpretation, pas d'hallucination.
// ============================================================

// =====================================================
// Mots-cles ANGLAIS — COURTS et PERCUTANTS
// Flux donne plus de poids aux premiers tokens du prompt
// Donc : sujet + personnes + cadrage D'ABORD, style a la fin
// =====================================================

const PK: Record<string, Record<string, string>> = {
  // Style = suffixe technique (va A LA FIN du prompt)
  style: {
    photo_realiste: 'DSLR photography, 85mm lens, natural light, ultra-realistic',
    photo_hyper_realiste: 'hyperrealistic 8K photography, extreme detail, ray tracing',
    illustration: 'digital illustration, clean lines, vibrant colors, artstation',
    '3d_render': '3D render, octane render, volumetric lighting, CGI',
    anime: 'anime art style, cel shading, vibrant anime colors',
    aquarelle: 'watercolor painting, soft brush strokes, flowing colors',
    flat_design: 'flat design, minimalist vector, geometric shapes',
    art_conceptuel: 'concept art, surreal creative composition',
  },
  framing: {
    gros_plan: 'close-up shot',
    plan_moyen: 'medium shot',
    plan_large: 'wide-angle panoramic shot showing the full scene',
    plongee: "bird's eye view, top-down angle",
    contre_plongee: 'low-angle shot looking up',
    face: 'front-facing view',
  },
  people_count: {
    '1': 'exactly one person',
    '2-3': 'exactly three people side by side',
    groupe: 'a group of six people',
  },
  people_age: {
    enfants: 'young children',
    jeunes: 'young adults aged 20-25',
    adultes: 'adults aged 35-45',
    seniors: 'elderly people aged 60+',
    mix: 'people of mixed ages',
  },
  people_origin: {
    antillaise: 'Black Caribbean, dark brown skin, Afro-Caribbean',
    africaine: 'Black African, dark skin',
    europeenne: 'European, light skin',
    asiatique: 'East Asian',
    mixte: 'diverse mixed ethnicities',
  },
  people_action: {
    sourient: 'smiling at camera',
    mangent: 'eating and drinking',
    travaillent: 'working professionally',
    discutent: 'chatting together',
    dansent: 'dancing and celebrating',
    cuisinent: 'cooking food',
  },
  people_clothing: {
    decontracte: 'casual clothing',
    elegant: 'elegant formal attire',
    professionnel: 'professional work uniform',
    traditionnel: 'traditional Caribbean madras clothing',
  },
  commerce_view: {
    devanture: 'storefront facade from the street',
    interieur: 'interior view of the establishment',
    comptoir: 'bar counter area',
    cuisine: 'professional kitchen',
    terrasse: 'outdoor terrace seating',
  },
  product_type: {
    plats_creoles: 'Caribbean Creole dishes',
    patisseries: 'pastries and desserts',
    boissons: 'tropical cocktails and drinks',
    fruits: 'tropical fruits',
    cosmetiques: 'beauty and skincare products',
    artisanat: 'handcrafted artisan items',
    vetements: 'fashion clothing',
  },
  product_presentation: {
    gros_plan: 'extreme close-up product shot',
    table_dressee: 'arranged on a decorated table',
    etalage: 'displayed in showcase',
    en_preparation: 'being prepared',
    dans_les_mains: 'held in hands',
  },
  landscape_type: {
    plage: 'Caribbean beach with turquoise ocean and palm trees',
    montagne: 'lush tropical mountain',
    foret: 'tropical rainforest',
    ville: 'colorful Caribbean town street',
    campagne: 'tropical countryside',
    port: 'harbor with boats',
  },
  ambiance: {
    chaleureuse: 'warm welcoming atmosphere',
    festive: 'festive joyful atmosphere',
    zen: 'peaceful zen atmosphere',
    luxe: 'luxury refined atmosphere',
    dynamique: 'dynamic energetic atmosphere',
    romantique: 'romantic soft atmosphere',
    futuriste: 'futuristic modern atmosphere',
    mysterieuse: 'mysterious dark atmosphere',
  },
  lumiere: {
    matin: 'soft morning light',
    apres_midi: 'bright daylight',
    golden_hour: 'golden hour sunset',
    nuit: 'night scene with neon lights',
    tamisee: 'dim candlelight',
    studio: 'studio lighting',
    dramatique: 'dramatic chiaroscuro lighting',
  },
  couleurs: {
    chauds: 'warm red orange amber tones',
    froids: 'cool blue teal tones',
    vifs: 'vivid saturated bold colors',
    pastels: 'soft pastel colors',
    naturels: 'earthy natural tones',
    sombres: 'dark moody high contrast',
    neon: 'neon glowing electric colors',
    noir_et_or: 'black and gold',
  },
  lieu: {
    interieur: 'indoor setting',
    terrasse: 'outdoor terrace',
    plage: 'beach setting',
    rue: 'lively street',
    marche: 'colorful market',
    nature: 'tropical vegetation',
    abstrait: 'abstract gradient background',
    aucun: 'clean plain background',
  },
  elements: {
    vegetation: 'tropical palm leaves',
    fleurs: 'tropical flowers hibiscus',
    fruits: 'tropical fruits',
    mer: 'turquoise ocean waves',
    architecture: 'colorful Creole houses',
    bougies: 'candles and fairy lights',
    musique: 'musical instruments drums',
    technologie: 'digital tech elements',
    particules: 'sparkles and lens flare',
    fumee: 'atmospheric mist',
  },
}

// Traduction du texte libre via Gemini (uniquement si present)
async function translateToEnglish(text: string): Promise<string> {
  if (!text.trim()) return ''

  // Detecter si c'est deja en anglais (heuristique simple)
  const frenchWords = ['un ', 'une ', 'des ', 'le ', 'la ', 'les ', 'avec ', 'dans ', 'sur ', 'pour ', 'qui ', 'et ', 'de ', 'du ', 'au ']
  const isLikelyFrench = frenchWords.some(w => text.toLowerCase().includes(w))
  if (!isLikelyFrench) return text

  try {
    const response = await fetch('https://api.kie.ai/gemini-3/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: [{ type: 'text', text: 'Translate the following French text to English for use in an AI image generation prompt. Output ONLY the English translation. Keep it descriptive and visual. Do not add anything, do not interpret, just translate accurately.' }],
          },
          { role: 'user', content: [{ type: 'text', text }] },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) return text
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || text
  } catch {
    return text
  }
}

// =====================================================
// CONSTRUCTION DU PROMPT — ORDRE CRITIQUE POUR FLUX
//
// Flux donne le plus de poids aux PREMIERS mots.
// Ordre : SUJET + PERSONNES + CADRAGE + DECOR + AMBIANCE + STYLE
// Le style technique va A LA FIN comme qualificateur.
// =====================================================
async function buildDirectPrompt(config: Record<string, unknown>, businessType: string): Promise<string> {
  if (!config || !config.subject) return ''

  const subject = config.subject as string
  const hasPeople = subject === 'personnes' || config.include_people

  // ===================== BLOC 1 : LE SUJET (debut du prompt) =====================
  // C'est la premiere chose que Flux lit = la plus respectee
  const opening: string[] = []

  // 1a. PERSONNES — TOUT DE SUITE si demandees
  if (hasPeople) {
    const count = config.people_count as string
    const countText = PK.people_count[count] || 'people'

    const age = config.people_age as string
    const ageText = PK.people_age[age] || ''

    const origin = config.people_origin as string
    const originText = PK.people_origin[origin] || 'Black Caribbean, dark brown skin'

    const action = config.people_action as string
    const actionText = PK.people_action[action] || ''

    const clothing = config.people_clothing as string
    const clothingText = PK.people_clothing[clothing] || ''

    // Phrase complete et naturelle pour les personnes
    let peopleSentence = countText
    if (ageText) peopleSentence += `, ${ageText}`
    peopleSentence += `, ${originText}`
    if (actionText) peopleSentence += `, ${actionText}`
    if (clothingText) peopleSentence += `, ${clothingText}`

    opening.push(peopleSentence)
  }

  // 1b. SUJET si ce n'est pas "personnes"
  if (subject === 'commerce') {
    const view = config.commerce_view as string
    opening.push(PK.commerce_view[view] || `${businessType || 'local business'}`)
  } else if (subject === 'produits') {
    const pType = config.product_type as string
    const pPres = config.product_presentation as string
    const parts = [PK.product_type[pType] || 'products']
    if (pPres) parts.push(PK.product_presentation[pPres] || '')
    opening.push(parts.filter(Boolean).join(', '))
  } else if (subject === 'paysage') {
    const lType = config.landscape_type as string
    opening.push(PK.landscape_type[lType] || 'tropical landscape')
  } else if (subject === 'concept' || subject === 'objet') {
    // Le texte libre sera ajoute juste apres
  }

  // 1c. DESCRIPTION PRECISE — traduite si français (juste apres le sujet)
  if (config.subject_detail && (config.subject_detail as string).trim()) {
    const translated = await translateToEnglish((config.subject_detail as string).trim())
    opening.push(translated)
  }

  // ===================== BLOC 2 : CADRAGE =====================
  const framing = config.framing as string
  if (framing && PK.framing[framing]) {
    opening.push(PK.framing[framing])
  }

  // ===================== BLOC 3 : DECOR + AMBIANCE =====================
  const atmosphere: string[] = []

  const lieu = config.lieu as string
  if (lieu && PK.lieu[lieu]) atmosphere.push(PK.lieu[lieu])

  const ambiance = config.ambiance as string
  if (ambiance && PK.ambiance[ambiance]) atmosphere.push(PK.ambiance[ambiance])

  const lumiere = config.lumiere as string
  if (lumiere && PK.lumiere[lumiere]) atmosphere.push(PK.lumiere[lumiere])

  const couleurs = config.couleurs as string
  if (couleurs && PK.couleurs[couleurs]) atmosphere.push(PK.couleurs[couleurs])

  // Elements supplementaires (max 3 pour pas surcharger)
  if (Array.isArray(config.elements) && config.elements.length > 0) {
    const elKeywords = config.elements
      .slice(0, 3)
      .map((e: string) => PK.elements[e])
      .filter(Boolean)
    if (elKeywords.length > 0) atmosphere.push(elKeywords.join(', '))
  }

  // ===================== BLOC 4 : STYLE TECHNIQUE (fin du prompt) =====================
  const style = config.style as string
  const styleText = PK.style[style] || 'DSLR photography, natural light'

  // ===================== PRIORITE =====================
  // L'utilisateur a choisi ce qui compte le plus → on le met en PREMIER
  const priority = config.priority as string
  let priorityPrefix = ''

  if (priority === 'personnes' && hasPeople) {
    // Repeter la description des personnes au tout debut
    const count = config.people_count as string
    const origin = config.people_origin as string
    priorityPrefix = `IMPORTANT: must show ${PK.people_count[count] || 'people'}, ${PK.people_origin[origin] || 'Black Caribbean'}`
  } else if (priority === 'cadrage') {
    const f = config.framing as string
    priorityPrefix = `IMPORTANT: ${PK.framing[f] || 'medium shot'}, this framing is essential`
  } else if (priority === 'description' && config.subject_detail) {
    // La description libre a deja ete traduite et est dans opening
    priorityPrefix = 'IMPORTANT: follow the scene description exactly as written'
  } else if (priority === 'ambiance') {
    const amb = config.ambiance as string
    const lum = config.lumiere as string
    const col = config.couleurs as string
    const parts = [PK.ambiance[amb], PK.lumiere[lum], PK.couleurs[col]].filter(Boolean)
    if (parts.length > 0) priorityPrefix = `IMPORTANT: ${parts.join(', ')}`
  }

  // ===================== ASSEMBLAGE FINAL =====================
  // Priorite EN PREMIER + Sujet/Personnes + Cadrage + Decor/Ambiance + Style + No text
  const allParts = [
    ...(priorityPrefix ? [priorityPrefix] : []),
    ...opening,
    ...atmosphere,
    styleText,
    'no text, no words, no letters, no logos, no watermark',
  ].filter(Boolean)

  const prompt = allParts.join(', ')

  console.log('[MINI-SITE] Priorite choisie :', priority || 'aucune')
  console.log('[MINI-SITE] Prompt final :', prompt)
  console.log('[MINI-SITE] Longueur prompt :', prompt.length, 'chars')
  return prompt
}

async function generateHeroImage(
  themePrompt: string,
  businessName: string,
  businessType: string,
  heroConfig?: Record<string, unknown>,
): Promise<string | null> {
  let prompt: string

  if (heroConfig && heroConfig.subject) {
    // Config remplie → construction DIRECTE du prompt (pas de Gemini, pas de theme)
    const directPrompt = await buildDirectPrompt(heroConfig, businessType)

    if (directPrompt) {
      prompt = directPrompt
    } else {
      // Fallback si la construction echoue
      prompt = `Professional realistic DSLR photograph for a ${businessType || 'local business'} in Caribbean Guadeloupe, ultra-realistic, editorial photography, natural lighting, no text no letters no words no logos`
    }
  } else {
    // Pas de config → prompt generique basique (sans theme pour eviter pollution)
    prompt = `Professional realistic DSLR photograph for a ${businessType || 'local business'} called ${businessName} in Caribbean Guadeloupe, warm tropical atmosphere, ultra-realistic, editorial photography, natural lighting, no text no words no letters no logos`
  }

  console.log('[MINI-SITE] Prompt final envoye a fal.ai :', prompt)

  // fal.ai flux/dev — haute qualite
  const response = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }),
  })

  if (!response.ok) {
    console.error('fal.ai hero error:', response.status, await response.text().catch(() => ''))
    return null
  }

  const data = await response.json()
  return data.images?.[0]?.url || null
}
