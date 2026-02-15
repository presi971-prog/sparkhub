import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SITE_THEMES } from '@/app/(dashboard)/outils/mini-site/mini-site-templates'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!
const CREDITS_COST = 150

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

    if (!is_update && !isAdmin) {
      const { data: creditData } = await adminSupabase
        .from('credits')
        .select('balance, lifetime_spent')
        .eq('profile_id', user.id)
        .single()

      if (!creditData || creditData.balance < CREDITS_COST) {
        return NextResponse.json(
          { error: `Credits insuffisants. ${CREDITS_COST} credits requis.` },
          { status: 402 }
        )
      }

      // Deduire les credits
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
          description: 'Mini Site Vitrine - Generation IA',
        })

      creditsRemaining = creditData.balance - CREDITS_COST
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

  const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
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

// Mots-cles ANGLAIS pour chaque option du questionnaire
const PROMPT_KEYWORDS: Record<string, Record<string, string>> = {
  style: {
    photo_realiste: 'professional DSLR photography, Canon EOS R5, 85mm lens, shallow depth of field, natural light, ultra-realistic',
    photo_hyper_realiste: 'hyperrealistic photography, 8K resolution, ray tracing, photorealistic, macro detail, lifelike, extreme detail',
    illustration: 'digital illustration, clean lines, vibrant colors, detailed artwork, professional illustration, artstation quality',
    '3d_render': '3D render, octane render, smooth surfaces, glossy materials, volumetric lighting, CGI, unreal engine',
    anime: 'anime art style, cel shading, vibrant anime colors, detailed anime illustration, studio quality anime',
    aquarelle: 'watercolor painting, soft brush strokes, artistic, wet on wet technique, flowing colors, delicate washes',
    flat_design: 'flat design, minimalist vector illustration, geometric shapes, clean lines, simple bold shapes',
    art_conceptuel: 'concept art, surreal composition, creative, artistic, imaginative, detailed concept artwork',
  },
  framing: {
    gros_plan: 'close-up shot, tight framing',
    plan_moyen: 'medium shot, waist-up framing',
    plan_large: 'wide-angle shot, panoramic view, full scene visible',
    plongee: "bird's eye view, top-down perspective, overhead angle",
    contre_plongee: 'low-angle shot, looking up, heroic perspective, dramatic angle',
    face: 'front view, straight-on portrait framing, facing camera',
  },
  people_count: {
    '1': 'a single person',
    '2-3': 'two or three people together',
    groupe: 'a group of people',
  },
  people_age: {
    enfants: 'young children',
    jeunes: 'young adults in their twenties',
    adultes: 'adults in their thirties to forties',
    seniors: 'senior elderly people',
    mix: 'people of mixed ages from young to old',
  },
  people_origin: {
    antillaise: 'Black Caribbean people, dark brown skin, Afro-Caribbean features',
    africaine: 'Black African people, dark skin, African features',
    europeenne: 'European people, light skin, Caucasian features',
    asiatique: 'Asian people, East Asian features',
    mixte: 'diverse mixed-ethnicity people of different origins',
  },
  people_action: {
    sourient: 'smiling warmly and posing for the camera, friendly expression',
    mangent: 'eating food and drinking, enjoying a meal',
    travaillent: 'working professionally, focused on their craft',
    discutent: 'having a conversation, chatting happily',
    dansent: 'dancing and celebrating, festive movement',
    cuisinent: 'cooking in a kitchen, preparing food, chef at work',
  },
  people_clothing: {
    decontracte: 'wearing casual tropical clothing, t-shirt, relaxed style',
    elegant: 'wearing elegant formal clothing, well-dressed, chic attire',
    professionnel: 'wearing professional work uniform, chef coat, work apron',
    traditionnel: 'wearing traditional Caribbean clothing, madras fabric, Creole dress',
  },
  commerce_view: {
    devanture: 'storefront exterior facade, seen from the street',
    interieur: 'interior of the establishment, indoor ambiance, dining area',
    comptoir: 'bar counter, front desk, service counter',
    cuisine: 'professional kitchen, cooking workshop, behind the scenes',
    terrasse: 'outdoor terrace, open-air seating, al fresco dining',
  },
  product_type: {
    plats_creoles: 'Caribbean Creole dishes, colombo, bokit, accras, court-bouillon',
    patisseries: 'pastries and desserts, cakes, tropical pastries, sweet treats',
    boissons: 'tropical cocktails, fresh fruit juice, ti-punch, colorful drinks',
    fruits: 'tropical fruits, mango, pineapple, passion fruit, guava, coconut',
    cosmetiques: 'cosmetic products, natural skincare, beauty products, bottles and jars',
    artisanat: 'handmade crafts, artisan jewelry, handcrafted items',
    vetements: 'fashion clothing, dresses, fabric, clothing display',
  },
  product_presentation: {
    gros_plan: 'extreme close-up of the product, detailed texture visible, food photography macro',
    table_dressee: 'beautifully arranged on a decorated table, styled food photography, table setting',
    etalage: 'displayed in a shop window, market stall display, arranged showcase',
    en_preparation: 'being prepared, in the making, work in progress, hands crafting',
    dans_les_mains: 'held in hands, person presenting the product, human touch',
  },
  landscape_type: {
    plage: 'Caribbean beach, white sand, turquoise ocean, palm trees, tropical coastline',
    montagne: 'lush green mountain, tropical volcano, La Soufriere, misty peaks',
    foret: 'tropical rainforest, lush vegetation, waterfalls, jungle canopy',
    ville: 'colorful Caribbean town, vibrant street, Creole architecture, Pointe-a-Pitre',
    campagne: 'sugar cane fields, banana plantations, green countryside, rural tropics',
    port: 'harbor marina, fishing boats, Caribbean port, waterfront docks',
  },
  ambiance: {
    chaleureuse: 'warm welcoming cozy atmosphere, inviting feel',
    festive: 'festive colorful joyful celebration, party vibes',
    zen: 'peaceful zen calm serene relaxing atmosphere',
    luxe: 'elegant luxury refined upscale premium atmosphere',
    dynamique: 'dynamic energetic vibrant lively atmosphere',
    romantique: 'romantic soft dreamy tender atmosphere',
    futuriste: 'futuristic modern technological sci-fi atmosphere',
    mysterieuse: 'mysterious dark moody dramatic atmosphere',
  },
  lumiere: {
    matin: 'soft morning light, dawn, early sunlight, fresh daybreak',
    apres_midi: 'bright tropical daylight, strong sunshine, midday sun',
    golden_hour: 'golden hour sunset light, warm orange glow, magic hour',
    nuit: 'nighttime scene, neon lights, city lights, urban night glow',
    tamisee: 'dim candlelight, intimate warm glow, low ambient light',
    studio: 'professional studio lighting, softbox, even illumination, clean light',
    dramatique: 'dramatic chiaroscuro lighting, strong shadows, high contrast light',
  },
  couleurs: {
    chauds: 'warm color palette, red, orange, amber, golden tones',
    froids: 'cool color palette, blue, teal, cyan, icy tones',
    vifs: 'vivid saturated bold colors, high color intensity, vibrant',
    pastels: 'soft pastel color palette, muted gentle colors, delicate hues',
    naturels: 'earthy natural tones, wood brown, forest green, sand beige',
    sombres: 'dark moody palette, deep shadows, high contrast, low key',
    neon: 'neon glowing colors, electric blue, hot pink, fluorescent purple',
    noir_et_or: 'black and gold color scheme, luxury premium aesthetic, gilded accents',
  },
  lieu: {
    interieur: 'indoor interior setting, inside a room',
    terrasse: 'outdoor covered terrace, open-air patio with shade',
    plage: 'beach setting, sandy shore, ocean backdrop',
    rue: 'lively street scene, urban sidewalk, city backdrop',
    marche: 'colorful market stalls, open-air market, vendors',
    nature: 'natural tropical vegetation backdrop, lush greenery, flowers',
    abstrait: 'abstract gradient background, artistic blurred backdrop, smooth colors',
    aucun: 'clean solid background, plain backdrop, isolated subject, white background',
  },
  elements: {
    vegetation: 'tropical plants, palm leaves, banana leaves, lush foliage',
    fleurs: 'tropical flowers, hibiscus, bougainvillea, frangipani blossoms',
    fruits: 'tropical fruits scattered, pineapple, mango, coconut, exotic fruits',
    mer: 'ocean waves, turquoise sea water, surf, Caribbean sea',
    architecture: 'Creole architecture, colorful wooden houses, colonial balconies',
    bougies: 'candles, fairy lights, warm bokeh lights, decorative lanterns',
    musique: 'musical instruments, Caribbean drums, ka drum, guitar, maracas',
    technologie: 'technology elements, screens, circuits, digital holographic effects',
    particules: 'light particles, sparkles, lens flare, magical glowing dust',
    fumee: 'atmospheric smoke, mist, fog, wispy haze, dreamy vapor',
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
    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
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

// Construire le prompt DIRECTEMENT a partir des choix utilisateur
// Pas de Gemini qui reinterprete, pas de theme qui pollue
async function buildDirectPrompt(config: Record<string, unknown>, businessType: string): Promise<string> {
  if (!config || !config.subject) return ''

  const parts: string[] = []

  // 1. STYLE VISUEL — premier mot-cle, le plus important
  const style = config.style as string
  if (style && PROMPT_KEYWORDS.style[style]) {
    parts.push(PROMPT_KEYWORDS.style[style])
  } else {
    parts.push('professional DSLR photography, ultra-realistic, natural light')
  }

  // 2. SUJET — description du sujet principal
  const subject = config.subject as string
  const subjectDescriptions: Record<string, string> = {
    personnes: 'portrait of people',
    commerce: `${businessType || 'local business'} establishment`,
    produits: `${businessType || 'artisan'} products`,
    paysage: 'landscape scenery',
    concept: 'conceptual visual',
    objet: 'detailed object',
  }
  parts.push(subjectDescriptions[subject] || 'scene')

  // 3. DESCRIPTION PRECISE (texte libre — traduit si français)
  if (config.subject_detail && (config.subject_detail as string).trim()) {
    const translated = await translateToEnglish((config.subject_detail as string).trim())
    parts.push(translated)
  }

  // 4. CADRAGE
  const framing = config.framing as string
  if (framing && PROMPT_KEYWORDS.framing[framing]) {
    parts.push(PROMPT_KEYWORDS.framing[framing])
  }

  // 5. PERSONNES — on les decrit de facon tres explicite
  const hasPeople = config.subject === 'personnes' || config.include_people
  if (hasPeople) {
    const peopleParts: string[] = []

    const count = config.people_count as string
    if (count && PROMPT_KEYWORDS.people_count[count]) peopleParts.push(PROMPT_KEYWORDS.people_count[count])
    else peopleParts.push('a person')

    const age = config.people_age as string
    if (age && PROMPT_KEYWORDS.people_age[age]) peopleParts.push(PROMPT_KEYWORDS.people_age[age])

    const origin = config.people_origin as string
    if (origin && PROMPT_KEYWORDS.people_origin[origin]) {
      peopleParts.push(PROMPT_KEYWORDS.people_origin[origin])
    } else {
      // Default Guadeloupe
      peopleParts.push('Black Caribbean people, dark brown skin, Afro-Caribbean features')
    }

    const action = config.people_action as string
    if (action && PROMPT_KEYWORDS.people_action[action]) peopleParts.push(PROMPT_KEYWORDS.people_action[action])

    const clothing = config.people_clothing as string
    if (clothing && PROMPT_KEYWORDS.people_clothing[clothing]) peopleParts.push(PROMPT_KEYWORDS.people_clothing[clothing])

    // IMPORTANT: on insiste pour que les gens apparaissent
    parts.push(`featuring ${peopleParts.join(', ')}`)
  }

  // 6. Champs conditionnels par sujet
  if (subject === 'commerce') {
    const view = config.commerce_view as string
    if (view && PROMPT_KEYWORDS.commerce_view[view]) parts.push(PROMPT_KEYWORDS.commerce_view[view])
  }
  if (subject === 'produits') {
    const pType = config.product_type as string
    if (pType && PROMPT_KEYWORDS.product_type[pType]) parts.push(PROMPT_KEYWORDS.product_type[pType])
    const pPres = config.product_presentation as string
    if (pPres && PROMPT_KEYWORDS.product_presentation[pPres]) parts.push(PROMPT_KEYWORDS.product_presentation[pPres])
  }
  if (subject === 'paysage') {
    const lType = config.landscape_type as string
    if (lType && PROMPT_KEYWORDS.landscape_type[lType]) parts.push(PROMPT_KEYWORDS.landscape_type[lType])
  }

  // 7. AMBIANCE & ATMOSPHERE
  const ambiance = config.ambiance as string
  if (ambiance && PROMPT_KEYWORDS.ambiance[ambiance]) parts.push(PROMPT_KEYWORDS.ambiance[ambiance])

  const lumiere = config.lumiere as string
  if (lumiere && PROMPT_KEYWORDS.lumiere[lumiere]) parts.push(PROMPT_KEYWORDS.lumiere[lumiere])

  const couleurs = config.couleurs as string
  if (couleurs && PROMPT_KEYWORDS.couleurs[couleurs]) parts.push(PROMPT_KEYWORDS.couleurs[couleurs])

  const lieu = config.lieu as string
  if (lieu && PROMPT_KEYWORDS.lieu[lieu]) parts.push(PROMPT_KEYWORDS.lieu[lieu])

  // 8. ELEMENTS SUPPLEMENTAIRES
  if (Array.isArray(config.elements) && config.elements.length > 0) {
    const elKeywords = config.elements
      .map((e: string) => PROMPT_KEYWORDS.elements[e])
      .filter(Boolean)
    if (elKeywords.length > 0) parts.push(elKeywords.join(', '))
  }

  // 9. SUFFIXE OBLIGATOIRE — interdire le texte
  parts.push('no text, no words, no letters, no logos, no signage, no watermark')

  // Assembler
  const prompt = parts.join('. ').replace(/\.\./g, '.').replace(/\. ,/g, ',')

  console.log('[MINI-SITE] Prompt genere directement :', prompt)
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
