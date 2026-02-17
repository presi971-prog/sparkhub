import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { TOOLS_CONFIG } from '@/config/tiers'

const KIE_API_KEY = process.env.KIE_API_KEY!
const FAL_KEY = process.env.FAL_KEY!

// Tarification : qualité × variantes
const PRICING: Record<string, Record<number, number>> = {
  standard: { 1: TOOLS_CONFIG.photo_standard_1.credits, 4: TOOLS_CONFIG.photo_standard_4.credits },
  '4k_pro': { 1: TOOLS_CONFIG.photo_4k_1.credits, 4: TOOLS_CONFIG.photo_4k_4.credits },
}

// Modèle fal.ai selon qualité
const FAL_MODELS: Record<string, string> = {
  standard: 'fal-ai/flux/dev',
  '4k_pro': 'fal-ai/flux-pro',
}

// Formats de sortie
const IMAGE_SIZES: Record<string, string> = {
  square: 'square_hd',
  portrait: 'portrait_4_3',
  landscape: 'landscape_16_9',
  story: 'portrait_16_9',
}

// ═══════════════════════════════════════════════════════════════
// CATÉGORIES PHOTO
// ═══════════════════════════════════════════════════════════════

const PHOTO_CATEGORIES: Record<string, {
  label: string
  context: string
  lighting_hint: string
  texture_hint: string
  mood: string
}> = {
  portrait_pro: {
    label: 'Portrait Pro',
    context: 'professional headshot, corporate portrait, personal branding photo',
    lighting_hint: 'Rembrandt lighting with 3200K key light at 45 degrees, soft fill light from reflector, subtle rim light separating subject from background',
    texture_hint: 'natural skin pores, subtle oil sheen on T-zone, individual hair strands catching light, fabric weave visible on clothing',
    mood: 'confident, approachable, professional, authentic',
  },
  produit: {
    label: 'Photo Produit',
    context: 'product photography, commercial still life, e-commerce photo, packshot',
    lighting_hint: 'large softbox overhead at 45 degrees, white bounce card underneath for fill, backlight for edge separation, controlled specular highlights',
    texture_hint: 'material texture (metal reflection, glass transparency, fabric weave, wood grain), micro-details, surface imperfections for realism',
    mood: 'premium, clean, desirable, tactile',
  },
  food: {
    label: 'Food & Restaurant',
    context: 'food photography, restaurant scene, culinary editorial, gastronomic still life',
    lighting_hint: 'natural window sidelight at 90 degrees (3800K-4500K), dark moody shadows on opposite side, backlight catching steam and condensation',
    texture_hint: 'steam wisps rising, condensation droplets, sauce drips, visible seasoning grains, charred marks, bread crust detail, herb leaf veins',
    mood: 'appetizing, warm, indulgent, sensory, authentic',
  },
  immobilier: {
    label: 'Immobilier & Déco',
    context: 'real estate photography, interior design, architectural photo, home staging',
    lighting_hint: 'mixed lighting: warm interior lamps (2700K) combined with cool daylight from windows (5500K), balanced HDR exposure, no blown highlights',
    texture_hint: 'wood floor grain, marble veining, fabric upholstery weave, tile grout lines, plant leaf details, rug patterns, wall paint texture',
    mood: 'inviting, spacious, aspirational, livable, warm',
  },
  lifestyle: {
    label: 'Lifestyle & Mode',
    context: 'fashion editorial, lifestyle brand photo, street style, editorial portrait',
    lighting_hint: 'golden hour sidelight (3200K-3800K), dramatic rim light along profile, teal-shifted shadows, urban reflected light fill',
    texture_hint: 'visible denim weave, leather grain, jewelry metallic details, natural skin with freckles and pores, wind-caught hair strands',
    mood: 'aspirational, effortless, editorial, authentic, magnetic',
  },
  commerce: {
    label: 'Mon Commerce',
    context: 'small business photo, storefront, local shop, boutique owner portrait, workspace',
    lighting_hint: 'mixed ambient: warm Edison bulbs (2200K) plus natural window light, cozy contrast, practical existing light sources visible',
    texture_hint: 'shop displays, product arrangements, signage detail, counter surface, apron fabric, vintage decor patina, exposed brick',
    mood: 'welcoming, genuine, passionate, local character, pride',
  },
  evenement: {
    label: 'Événement & Promo',
    context: 'event photography, promotional photo, celebration, opening, party scene',
    lighting_hint: 'dynamic mixed lighting: neon or colored accents, spotlight beams, ambient venue lighting, creative color temperature mix',
    texture_hint: 'confetti detail, balloon surface sheen, banner fabric, champagne bubbles, decorative elements, crowd motion blur in background',
    mood: 'festive, energetic, celebratory, exciting, memorable',
  },
  tropical: {
    label: 'Tropical & Caraïbes',
    context: 'Caribbean lifestyle, tropical paradise, beach scene, Guadeloupe, Antilles, island life',
    lighting_hint: 'intense tropical sunlight (5500K-6000K), dappled shade through palm fronds, ocean light reflections, vivid golden hour with saturated sky',
    texture_hint: 'palm bark detail, sand grain texture, ocean water transparency, tropical flower petals, weathered wood, colorful Creole architecture paint',
    mood: 'paradise, relaxed, vibrant, authentic Caribbean, joyful',
  },
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT GEMINI — PHOTOGRAPHE HYPERRÉALISTE
// ═══════════════════════════════════════════════════════════════

function buildSystemPrompt(
  category: string,
  format: string,
  numVariants: number,
): string {
  const cat = PHOTO_CATEGORIES[category] || PHOTO_CATEGORIES.lifestyle

  return `Tu es un DIRECTEUR DE LA PHOTOGRAPHIE senior, spécialisé en photographie hyperréaliste commerciale. Tu as 20 ans d'expérience chez Annie Leibovitz Studio et maintenant tu crées des images IA indiscernables de vraies photos.

═══ EXPERTISE TECHNIQUE ═══

Tu maîtrises parfaitement :

1. ÉCLAIRAGE PHYSIQUE
- Spécification des sources (key, fill, rim, practical, ambient)
- Températures Kelvin précises (2200K Edison → 6500K daylight)
- Qualité des ombres (hard/soft, direction, falloff)
- Ratios d'éclairage (ex: key:fill 3:1 pour du portrait dramatique)

2. TEXTURES NATURELLES (ce qui sépare une photo IA d'une vraie)
- Peau : pores visibles, brillance naturelle zone-T, imperfections subtiles, freckles, grain de beauté
- Tissus : weave du denim, fibres du coton, reflets du satin, plis naturels
- Matériaux : grain du bois, veines du marbre, reflets métalliques, transparence du verre
- Environnement : poussière dans les rayons de lumière, condensation, patine, usure naturelle

3. RÉGLAGES CAMÉRA
- Focale : 85mm portrait (compression flatteuse) | 35mm environnemental | 50mm polyvalent | 24mm architectural
- Ouverture : f/1.4-2.8 bokeh crémeux | f/4-5.6 netteté modérée | f/8-11 tout net
- Profondeur de champ naturelle avec transition douce
- Bokeh de qualité : points lumineux circulaires, transitions crémeuses

4. COLOR GRADING
- Split toning : highlights chauds ambrés + shadows bleu-ardoise froids
- Noirs relevés (lifted blacks, jamais de noir pur)
- Grain de film subtil (ISO 200-400 equivalent)
- LUT style : teal/orange pour lifestyle, warm neutral pour food, clean bright pour produit

5. COMPOSITION
- Règle des tiers, lignes directrices, cadrage naturel
- Espace négatif intentionnel
- Profondeur par plans (premier plan, sujet, arrière-plan)
- Point de vue engageant (pas de face statique sauf portrait corporate)

═══ CATÉGORIE : ${cat.label.toUpperCase()} ═══
Contexte : ${cat.context}
Éclairage type : ${cat.lighting_hint}
Textures clés : ${cat.texture_hint}
Ambiance : ${cat.mood}

═══ FORMAT DE SORTIE ═══
Format image : ${format}

═══ ANTI-PATTERNS CRITIQUES — CE QUI TRAHIT UNE IMAGE IA ═══
- Peau lisse plastique sans pores → TOUJOURS spécifier "natural skin texture with visible pores"
- Yeux morts sans reflet de lumière → TOUJOURS spécifier "catchlights in eyes, natural eye moisture"
- Mains déformées → TOUJOURS spécifier "anatomically correct hands with natural finger proportions"
- Éclairage plat sans direction → TOUJOURS spécifier la direction et qualité de lumière
- Bokeh artificiel → TOUJOURS spécifier "natural lens bokeh with smooth circular highlights"
- Couleurs oversaturées → TOUJOURS spécifier "natural color palette, realistic saturation"
- Sourire figé → TOUJOURS spécifier l'expression naturelle spécifique

═══ TA MISSION ═══

Génère un JSON avec ${numVariants} prompt(s) photo hyperréaliste(s) en anglais (100-180 mots chacun) pour fal.ai Flux.

${numVariants === 4 ? `Les 4 prompts doivent être RADICALEMENT DIFFÉRENTS entre eux :
- Angles de prise de vue différents (face, profil, plongée, contre-plongée, 3/4)
- Éclairages différents (golden hour, lumière de fenêtre, néon, clair-obscur)
- Ambiances différentes (intime, dynamique, dramatique, joyeuse)
- Compositions différentes (serré, plan moyen, environnemental, détail)` : ''}

CHAQUE PROMPT doit obligatoirement contenir :
1. "Ultra photorealistic photograph," en début
2. Description du sujet et de l'action
3. Spécification d'éclairage avec température Kelvin et direction
4. Réglages caméra (focale, ouverture)
5. Textures naturelles spécifiques (peau, tissus, matériaux)
6. Color grading (split toning, contraste, blacks)
7. Finir par le negative prompt : "natural skin texture with visible pores, no AI artifacts, no plastic skin, no over-smoothing, no oversaturated colors, no uncanny valley, no dead eyes, no deformed hands, photographic realism"

IMPORTANT : Réponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"photos":[{"variant":1,"prompt":"..."}${numVariants === 4 ? ',{"variant":2,"prompt":"..."},{"variant":3,"prompt":"..."},{"variant":4,"prompt":"..."}' : ''}]}`
}

async function generatePhotoPrompts(
  category: string,
  description: string,
  format: string,
  numVariants: number,
  advancedFields?: {
    subject?: string
    action?: string
    location?: string
    lighting?: string
    photoStyle?: string
    details?: string
    ambiance?: string
  },
): Promise<{ photos: Array<{ variant: number; prompt: string }> }> {
  const systemPrompt = buildSystemPrompt(category, format, numVariants)

  const advancedContext = advancedFields
    ? `\n\nDétails avancés fournis par le client :
${advancedFields.subject ? `- Sujet : "${advancedFields.subject}"` : ''}
${advancedFields.action ? `- Action : "${advancedFields.action}"` : ''}
${advancedFields.location ? `- Lieu : "${advancedFields.location}"` : ''}
${advancedFields.lighting ? `- Éclairage souhaité : "${advancedFields.lighting}"` : ''}
${advancedFields.photoStyle ? `- Style photo : "${advancedFields.photoStyle}"` : ''}
${advancedFields.details ? `- Détails/textures : "${advancedFields.details}"` : ''}
${advancedFields.ambiance ? `- Ambiance : "${advancedFields.ambiance}"` : ''}`.replace(/\n\n+/g, '\n')
    : ''

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
          {
            role: 'user',
            content: [{
              type: 'text',
              text: `Crée ${numVariants} prompt(s) photo hyperréaliste(s) pour la catégorie "${PHOTO_CATEGORIES[category]?.label || category}".

Description du client : "${description}"${advancedContext}

Sois ULTRA-SPÉCIFIQUE sur l'éclairage, les textures et les réglages caméra. Chaque détail technique compte pour obtenir une photo indiscernable d'une vraie.`,
            }],
          },
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
    return JSON.parse(cleanContent)
  } catch (error) {
    console.error('Gemini photo error:', error)

    // Fallback : prompt artisanal basé sur la catégorie
    const cat = PHOTO_CATEGORIES[category] || PHOTO_CATEGORIES.lifestyle
    const basePrompt = `Ultra photorealistic photograph, ${description}, ${cat.context}, ${cat.lighting_hint}, shot on 85mm lens at f/2.8, shallow depth of field with creamy bokeh, ${cat.texture_hint}, ${cat.mood} atmosphere, warm highlights with cool teal shadows split toning, lifted blacks, subtle film grain, natural skin texture with visible pores, no AI artifacts, no plastic skin, no over-smoothing, no oversaturated colors, no uncanny valley, no dead eyes, no deformed hands, photographic realism`

    const photos = Array.from({ length: numVariants }, (_, i) => ({
      variant: i + 1,
      prompt: basePrompt,
    }))

    return { photos }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { category, description, format, quality, variants, advancedFields } = await req.json()

    if (!category || !description || !format || !quality || !variants) {
      return NextResponse.json(
        { error: 'category, description, format, quality et variants sont requis' },
        { status: 400 }
      )
    }

    const numVariants = variants === 4 ? 4 : 1
    const creditsCost = PRICING[quality]?.[numVariants]
    if (!creditsCost) {
      return NextResponse.json({ error: 'Combinaison qualité/variantes invalide' }, { status: 400 })
    }

    // Client admin (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData || creditData.balance < creditsCost) {
      return NextResponse.json(
        { error: `Crédits insuffisants. ${creditsCost} crédits requis.` },
        { status: 402 }
      )
    }

    // Déduire les crédits
    await adminSupabase
      .from('credits')
      .update({
        balance: creditData.balance - creditsCost,
        lifetime_spent: (creditData.lifetime_spent || 0) + creditsCost,
      })
      .eq('profile_id', user.id)

    await adminSupabase
      .from('credit_transactions')
      .insert({
        profile_id: user.id,
        amount: -creditsCost,
        type: 'spend',
        description: `SparkHub Studio Photo - ${quality === '4k_pro' ? '4K Pro' : 'Standard'} (${numVariants} photo${numVariants > 1 ? 's' : ''})`
      })

    // Gemini génère les prompts hyperréalistes
    const geminiResult = await generatePhotoPrompts(
      category,
      description,
      format,
      numVariants,
      advancedFields,
    )

    console.log('Gemini generated', geminiResult.photos.length, 'photo prompts')

    // Soumettre N jobs fal.ai en parallèle (mode queue)
    const falModel = FAL_MODELS[quality] || FAL_MODELS.standard
    const imageSize = IMAGE_SIZES[format] || IMAGE_SIZES.square

    const falJobs = await Promise.allSettled(
      geminiResult.photos.map(async (photo) => {
        const submitResponse = await fetch(`https://queue.fal.run/${falModel}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: photo.prompt,
            image_size: imageSize,
            num_images: 1,
            enable_safety_checker: false,
          }),
        })

        if (!submitResponse.ok) {
          const errText = await submitResponse.text()
          throw new Error(`fal.ai (${submitResponse.status}): ${errText}`)
        }

        const submitData = await submitResponse.json()
        return {
          variant: photo.variant,
          prompt: photo.prompt,
          status_url: submitData.status_url || null,
          response_url: submitData.response_url || null,
        }
      })
    )

    // Construire la réponse
    const photos = falJobs.map((result, index) => {
      const variant = geminiResult.photos[index].variant
      if (result.status === 'fulfilled') {
        return {
          variant,
          prompt: result.value.prompt,
          status_url: result.value.status_url,
          response_url: result.value.response_url,
          error: null,
        }
      }
      return {
        variant,
        prompt: geminiResult.photos[index].prompt,
        status_url: null,
        response_url: null,
        error: result.reason?.message || 'Erreur fal.ai',
      }
    })

    return NextResponse.json({
      success: true,
      result: {
        photos,
        credits_used: creditsCost,
        credits_remaining: creditData.balance - creditsCost,
      }
    })
  } catch (error) {
    console.error('Erreur Studio Photo:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
