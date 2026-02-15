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

      // 2. Image de couverture : config structuree → Gemini compose → fal.ai genere
      generateHeroImage(siteTheme.aiPrompt, business_name, business_type, hero_config, siteTheme.id),
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

// Labels humains pour construire la description structuree
const HERO_LABELS: Record<string, Record<string, string>> = {
  style: {
    photo_realiste: 'photographie realiste professionnelle (DSLR, natural light)',
    photo_hyper_realiste: 'photographie hyper-realiste ultra-detaillee (8K, macro detail, ray tracing)',
    illustration: 'illustration digitale moderne (digital art, clean lines, vibrant)',
    '3d_render': 'rendu 3D lisse et moderne (3D render, octane render, smooth, glossy)',
    anime: 'style anime/manga japonais (anime art style, cel shading, vibrant colors)',
    aquarelle: 'aquarelle / peinture artistique (watercolor painting, artistic brush strokes, soft edges)',
    flat_design: 'flat design minimaliste (flat illustration, simple shapes, geometric, minimal)',
    art_conceptuel: 'art conceptuel creatif (concept art, surreal, artistic, creative composition)',
  },
  subject: {
    personnes: 'des personnes',
    commerce: 'un lieu commercial',
    produits: 'des produits/plats',
    paysage: 'un paysage',
    concept: 'un concept/une idee abstraite',
    objet: 'un objet precis',
  },
  framing: {
    gros_plan: 'gros plan (close-up shot)',
    plan_moyen: 'plan moyen (medium shot)',
    plan_large: 'plan large panoramique (wide-angle shot, panoramic)',
    plongee: 'vue du dessus / plongee (bird\'s eye view, top-down, overhead)',
    contre_plongee: 'contre-plongee (low-angle shot, looking up, heroic perspective)',
    face: 'de face / portrait (front view, portrait framing)',
  },
  people_count: { '1': 'une seule personne', '2-3': '2 ou 3 personnes', groupe: 'un groupe de personnes' },
  people_age: { enfants: 'enfants', jeunes: 'jeunes (18-30 ans)', adultes: 'adultes (30-50 ans)', seniors: 'seniors (50+)', mix: 'ages melanges' },
  people_origin: { antillaise: 'antillaise/caribbeenne (Black Caribbean, dark brown skin, Afro-Caribbean features)', africaine: 'africaine (Black African features, dark skin)', europeenne: 'europeenne (European features, light skin)', asiatique: 'asiatique (Asian features)', mixte: 'origines mixtes/diverse (mixed ethnicities)' },
  people_action: { sourient: 'qui sourient et posent face camera', mangent: 'en train de manger/boire', travaillent: 'en train de travailler', discutent: 'en train de discuter', dansent: 'en train de danser/faire la fete', cuisinent: 'en train de cuisiner' },
  people_clothing: { decontracte: 'tenue decontractee (casual clothing)', elegant: 'tenue elegante/chic (elegant, formal wear)', professionnel: 'tenue professionnelle/uniforme (professional uniform, work clothes)', traditionnel: 'tenue traditionnelle (traditional Caribbean clothing, madras)' },
  commerce_view: { devanture: 'la devanture/facade', interieur: "l'interieur/la salle", comptoir: 'le comptoir/bar', cuisine: 'la cuisine/atelier', terrasse: 'la terrasse' },
  product_type: { plats_creoles: 'plats creoles', patisseries: 'patisseries/desserts', boissons: 'boissons/cocktails', fruits: 'fruits tropicaux', cosmetiques: 'cosmetiques/soins', artisanat: 'artisanat/bijoux', vetements: 'vetements/mode' },
  product_presentation: { gros_plan: 'en gros plan (close-up focus)', table_dressee: 'sur une table dressee', etalage: 'en etalage/vitrine', en_preparation: 'en preparation', dans_les_mains: 'tenus dans les mains' },
  landscape_type: { plage: 'plage/bord de mer', montagne: 'montagne/volcan', foret: 'foret tropicale', ville: 'ville/rue', campagne: 'campagne/champs', port: 'port/marina' },
  ambiance: { chaleureuse: 'chaleureuse et familiale', festive: 'festive et coloree', zen: 'zen et apaisante', luxe: 'chic et raffinee', dynamique: 'dynamique et energique', romantique: 'romantique et douce', futuriste: 'futuriste et technologique', mysterieuse: 'mysterieuse et sombre' },
  lumiere: { matin: 'lumiere du matin (soft morning light)', apres_midi: 'plein soleil (bright daylight)', golden_hour: 'coucher de soleil (golden hour, warm sunset)', nuit: 'nuit/neons (night, neon lights, city lights)', tamisee: 'lumiere tamisee/intime (dim, candlelight, intimate)', studio: 'eclairage studio professionnel (studio lighting, softbox)', dramatique: 'eclairage dramatique contrastee (dramatic lighting, chiaroscuro, high contrast)' },
  couleurs: { chauds: 'tons chauds (warm tones: red, orange, amber)', froids: 'tons froids (cool tones: blue, teal, cyan)', vifs: 'couleurs vives et eclatantes (vivid, saturated, bold colors)', pastels: 'couleurs pastels et douces (soft pastel palette)', naturels: 'couleurs naturelles (earthy tones: wood, green, brown)', sombres: 'couleurs sombres et contrastees (dark, moody, high contrast)', neon: 'neon/electrique (neon colors, electric blue, hot pink, glowing)', noir_et_or: 'noir et or (black and gold, luxury, premium)' },
  lieu: { interieur: 'en interieur', terrasse: 'sur une terrasse', plage: 'a la plage', rue: 'dans une rue animee', marche: 'dans un marche', nature: 'en pleine nature/vegetation', abstrait: 'fond abstrait/gradie (abstract gradient background)', aucun: 'fond neutre/transparent (clean background, isolated subject)' },
  elements: { vegetation: 'vegetation tropicale (tropical plants, palm leaves)', fleurs: 'fleurs (tropical flowers, hibiscus)', fruits: 'fruits tropicaux (tropical fruits, mango, pineapple)', mer: 'mer/ocean (ocean, waves, turquoise water)', architecture: 'architecture creole (Creole architecture, colorful buildings)', bougies: 'bougies/lumieres decoratives (candles, fairy lights, bokeh)', musique: 'instruments/musique (musical instruments, drums)', technologie: 'technologie/digital (tech elements, screens, circuits, data)', particules: 'particules/effets lumineux (light particles, sparkles, lens flare)', fumee: 'fumee/brume (smoke, mist, fog, atmospheric haze)' },
}

function buildStructuredDescription(config: Record<string, unknown>): string {
  if (!config || !config.subject) return ''

  const parts: string[] = []

  // 1. STYLE VISUEL (le plus important pour le prompt)
  if (config.style) parts.push(`STYLE VISUEL : ${HERO_LABELS.style[config.style as string] || config.style}`)

  // 2. SUJET PRINCIPAL
  parts.push(`SUJET PRINCIPAL : ${HERO_LABELS.subject[config.subject as string] || config.subject}`)

  // 3. DESCRIPTION PRECISE (texte libre du pro — PRIORITAIRE)
  if (config.subject_detail && (config.subject_detail as string).trim()) {
    parts.push(`DESCRIPTION PRECISE DU CLIENT (A RESPECTER ABSOLUMENT) : ${(config.subject_detail as string).trim()}`)
  }

  // 4. CADRAGE
  if (config.framing) parts.push(`CADRAGE : ${HERO_LABELS.framing[config.framing as string] || config.framing}`)

  // 5. PERSONNES (sujet principal ou ajoutees en plus)
  const hasPeople = config.subject === 'personnes' || config.include_people
  if (hasPeople) {
    parts.push('--- PERSONNES DANS L\'IMAGE ---')
    if (config.people_count) parts.push(`Nombre : ${HERO_LABELS.people_count[config.people_count as string] || config.people_count}`)
    if (config.people_age) parts.push(`Age : ${HERO_LABELS.people_age[config.people_age as string] || config.people_age}`)
    if (config.people_origin) parts.push(`Apparence/Origine : ${HERO_LABELS.people_origin[config.people_origin as string] || config.people_origin}`)
    if (config.people_action) parts.push(`Action : ${HERO_LABELS.people_action[config.people_action as string] || config.people_action}`)
    if (config.people_clothing) parts.push(`Vetements : ${HERO_LABELS.people_clothing[config.people_clothing as string] || config.people_clothing}`)
  }

  // 6. Champs conditionnels selon le sujet
  if (config.subject === 'commerce' && config.commerce_view) {
    parts.push(`Vue commerce : ${HERO_LABELS.commerce_view[config.commerce_view as string] || config.commerce_view}`)
  }
  if (config.subject === 'produits') {
    if (config.product_type) parts.push(`Type produit : ${HERO_LABELS.product_type[config.product_type as string] || config.product_type}`)
    if (config.product_presentation) parts.push(`Presentation : ${HERO_LABELS.product_presentation[config.product_presentation as string] || config.product_presentation}`)
  }
  if (config.subject === 'paysage' && config.landscape_type) {
    parts.push(`Type paysage : ${HERO_LABELS.landscape_type[config.landscape_type as string] || config.landscape_type}`)
  }

  // 7. Universels
  parts.push('--- AMBIANCE & ATMOSPHERE ---')
  if (config.ambiance) parts.push(`Ambiance : ${HERO_LABELS.ambiance[config.ambiance as string] || config.ambiance}`)
  if (config.lumiere) parts.push(`Lumiere : ${HERO_LABELS.lumiere[config.lumiere as string] || config.lumiere}`)
  if (config.couleurs) parts.push(`Couleurs dominantes : ${HERO_LABELS.couleurs[config.couleurs as string] || config.couleurs}`)
  if (config.lieu) parts.push(`Decor/Arriere-plan : ${HERO_LABELS.lieu[config.lieu as string] || config.lieu}`)
  if (Array.isArray(config.elements) && config.elements.length > 0) {
    const elLabels = config.elements.map((e: string) => HERO_LABELS.elements[e] || e)
    parts.push(`Elements supplementaires : ${elLabels.join(', ')}`)
  }

  return parts.join('\n')
}

async function optimizeImagePrompt(
  structuredDescription: string,
  businessType: string,
  themeId: string,
): Promise<string> {
  const systemPrompt = `Tu es un EXPERT MONDIAL en prompts de generation d'images par IA (Flux, Stable Diffusion, Midjourney, DALL-E).

Tu recois une FICHE TECHNIQUE structuree qui decrit exactement ce que le client veut. Ton role est de la transformer en un prompt PARFAIT en anglais.

METHODE STRICTE :
1. COMMENCE par le STYLE VISUEL indique dans la fiche — c'est le mot-cle le plus important du prompt (photo, illustration, 3D, anime, etc.)
2. INTEGRE la DESCRIPTION PRECISE du client mot pour mot si elle est presente — c'est la PRIORITE ABSOLUE
3. AJOUTE le CADRAGE demande (close-up, wide-angle, bird's eye view, etc.)
4. DECRIS les PERSONNES exactement comme demande (nombre, age, apparence, action, vetements) — ne pas omettre les personnes si elles sont demandees
5. COMPOSE l'ambiance, la lumiere, les couleurs, le decor et les elements supplementaires
6. ENRICHIS avec des mots-cles techniques adaptes au style choisi

MOTS-CLES PAR STYLE (a integrer dans le prompt) :
- Photo realiste → "DSLR photography, Canon EOS R5, 85mm lens, shallow depth of field, natural light, ultra-realistic"
- Hyper-realiste → "hyperrealistic, 8K resolution, ray tracing, photorealistic, macro detail, lifelike"
- Illustration → "digital illustration, clean lines, vibrant colors, detailed artwork, professional illustration"
- 3D render → "3D render, octane render, smooth surfaces, glossy, volumetric lighting, CGI"
- Anime → "anime art style, cel shading, vibrant anime colors, detailed anime, studio quality"
- Aquarelle → "watercolor painting, soft brush strokes, artistic, wet on wet technique, flowing colors"
- Flat design → "flat design, minimalist, geometric shapes, clean vector illustration, simple"
- Art conceptuel → "concept art, surreal composition, creative, artistic, imaginative, detailed"

FORMAT DE SORTIE :
- UNIQUEMENT le prompt en anglais. Pas de guillemets, pas d'explication, pas de "Here is the prompt"
- 3 a 6 phrases descriptives
- Format paysage 16:9

CONTEXTE GUADELOUPE (Caraibes francaises) :
- Si des personnes sont demandees SANS precision d'apparence → afro-caribbeennes par defaut : "Black Caribbean people, dark brown skin"
- Si une apparence est PRECISEE dans la fiche → RESPECTER exactement ce qui est demande
- Integrer des elements caribbeens quand pertinent

REGLES ABSOLUES :
- CHAQUE element de la fiche DOIT etre dans le prompt — ne rien oublier, ne rien filtrer, ne rien ignorer
- Si des PERSONNES sont demandees, elles DOIVENT apparaitre dans le prompt de facon explicite et detaillee
- Si une DESCRIPTION PRECISE est fournie, elle est PRIORITAIRE sur tout le reste
- Toujours terminer par : "no text, no words, no letters, no logos, no signage, no watermark"

Theme visuel du site : ${themeId}`

  const userPrompt = `Type de commerce : ${businessType || 'commerce local'}

FICHE TECHNIQUE :
${structuredDescription}`

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
          { role: 'user', content: [{ type: 'text', text: userPrompt }] },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      console.error('Gemini prompt optimization error:', response.status)
      return ''
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
  } catch (error) {
    console.error('Gemini prompt optimization failed:', error)
    return ''
  }
}

async function generateHeroImage(
  themePrompt: string,
  businessName: string,
  businessType: string,
  heroConfig?: Record<string, unknown>,
  themeId?: string,
): Promise<string | null> {
  let prompt: string

  // Construire la description structuree a partir de la config
  const structuredDesc = heroConfig ? buildStructuredDescription(heroConfig) : ''

  if (structuredDesc) {
    // Config remplie → Gemini compose le prompt a partir des donnees structurees
    const optimizedPrompt = await optimizeImagePrompt(
      structuredDesc,
      businessType,
      themeId || 'tropical_creole',
    )

    if (optimizedPrompt) {
      prompt = optimizedPrompt
    } else {
      // Fallback si Gemini echoue
      prompt = `Professional realistic DSLR photograph for a ${businessType || 'local business'} in Caribbean Guadeloupe, ${themePrompt}, ultra-realistic, editorial photography, natural lighting, no text no letters no words no logos`
    }
  } else {
    // Pas de config → prompt generique du theme
    prompt = `${themePrompt}, realistic professional DSLR photograph, natural lighting, for a ${businessType || 'local business'} in Caribbean Guadeloupe, ultra-realistic, editorial photography, no text no words no letters no logos`
  }

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
    console.error('fal.ai hero error:', response.status)
    return null
  }

  const data = await response.json()
  return data.images?.[0]?.url || null
}
