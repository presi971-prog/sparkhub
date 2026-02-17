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

  return `Tu transformes une description de photo en prompt fal.ai Flux hyperréaliste.

Le client fournit : une description libre + des champs détaillés optionnels.
La catégorie "${cat.label}" est une indication pour tes réglages par défaut. Les choix du client remplacent les défauts.

TRADUCTION PHYSIQUE IMPORTANTE :
Quand le client dit "antillais", "guadeloupéen", "martiniquais", "créole" ou "caribéen", traduis en anglais avec des traits physiques PRÉCIS : "French West Indian from Guadeloupe, West African descent, dark brown to deep brown skin, broad nose, full lips, strong jawline, natural Afro-textured hair". Les teints varient (du brun moyen au brun très foncé) mais les traits sont toujours d'ascendance ouest-africaine. Ajoute dans le negative prompt : "not African American, not Hispanic, not Latino".

RÉGLAGES PAR DÉFAUT (catégorie "${cat.label}") :
- Éclairage : ${cat.lighting_hint}
- Textures : ${cat.texture_hint}
- Ambiance : ${cat.mood}

FORMAT IMAGE : ${format}

Pour chaque prompt (120-200 mots, anglais), suis ce framework en 7 étapes :
1. SUJET — qui, âge, morphologie, ethnie
2. ACTION — ce que fait la personne
3. ENVIRONNEMENT — lieu, matériaux, détails du décor
4. ÉCLAIRAGE — source + direction + température Kelvin + qualité des ombres
   Ex: "golden hour 3200K-3800K side light, rim light along profile, fill from reflected urban light"
5. STYLE PHOTO — type d'appareil et réglages
   Editorial: 85mm f/2.8, 1/250s, ISO 200-400
   Environnemental: 35mm f/4-5.6
   Smartphone: iPhone 26mm, natural depth of field
6. DÉTAILS/TEXTURES — ce qui fait la différence entre photo IA et vraie photo :
   Peau: "natural pore structure, subtle oil sheen on T-zone, visible skin variations"
   Tissus: "visible wool knit texture, denim weave detail, fabric compression"
   Matériaux: "rough concrete grain, weathered brick, oxidized metal, wood grain"
7. AMBIANCE — expression, langage corporel, atmosphère

COLOR GRADING obligatoire :
- Split toning: warm amber highlights + cool slate shadows
- Lifted blacks (jamais de noir pur)
- Grain de film subtil (ISO 200-400)
- Vignette naturelle optique subtile

NEGATIVE PROMPT obligatoire (fin de chaque prompt) :
"natural skin texture with visible pores | no AI artifacts | no plastic skin | no over-smoothing | no artificial skin smoothing | no oversaturated colors | no uncanny valley | no dead eyes | no deformed hands | no harsh flash lighting | no overexposed highlights | photographic realism"

${numVariants === 4 ? `Génère 4 prompts RADICALEMENT DIFFÉRENTS (angles, éclairages, cadrages, ambiances) mais qui décrivent tous la MÊME scène demandée par le client.` : 'Génère 1 prompt.'}

Réponds UNIQUEMENT en JSON, sans markdown :
{"photos":[{"variant":1,"prompt":"..."}${numVariants === 4 ? ',{"variant":2,"prompt":"..."},{"variant":3,"prompt":"..."},{"variant":4,"prompt":"..."}' : ''}]}`
}

// ═══════════════════════════════════════════════════════════════
// POST-TRAITEMENT : injection forcée des traits physiques
// Gemini est pas fiable, donc le code garantit le résultat
// ═══════════════════════════════════════════════════════════════

const ETHNICITY_KEYWORDS: Record<string, { detect: RegExp; inject: string; negative: string }> = {
  antillais: {
    detect: /antillais|antillaise|guadeloup|martiniq|créole|caribéen|caribéenne|west indian/i,
    inject: 'French West Indian from Guadeloupe, West African descent, dark brown to deep brown skin tone, broad nose, full lips, strong jawline, natural Afro-textured hair',
    negative: 'not African American, not Hispanic, not Latino, not Caucasian, not Asian',
  },
}

function enforcePhysicalTraits(prompt: string, userDescription: string): string {
  for (const entry of Object.values(ETHNICITY_KEYWORDS)) {
    if (entry.detect.test(userDescription)) {
      // Vérifier si les traits sont déjà dans le prompt
      if (/West African descent|French West Indian/i.test(prompt)) {
        // Déjà présent, juste ajouter le negative si absent
        if (!prompt.includes('not African American')) {
          prompt = prompt.replace(/photographic realism"?$/, `${entry.negative}, photographic realism`)
        }
        return prompt
      }
      // Injecter après "Ultra photorealistic photograph,"
      prompt = prompt.replace(
        /^(Ultra photorealistic photograph,?\s*)/i,
        `$1${entry.inject}, `
      )
      // Ajouter le negative prompt
      if (!prompt.includes('not African American')) {
        prompt = prompt.replace(/photographic realism"?$/, `${entry.negative}, photographic realism`)
      }
      return prompt
    }
  }
  return prompt
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

  // Assembler la description complète : texte libre + champs avancés
  const parts: string[] = [description]
  if (advancedFields?.subject) parts.push(`Sujet : ${advancedFields.subject}`)
  if (advancedFields?.action) parts.push(`Action : ${advancedFields.action}`)
  if (advancedFields?.location) parts.push(`Lieu : ${advancedFields.location}`)
  if (advancedFields?.lighting) parts.push(`Éclairage : ${advancedFields.lighting}`)
  if (advancedFields?.photoStyle) parts.push(`Style : ${advancedFields.photoStyle}`)
  if (advancedFields?.details) parts.push(`Détails : ${advancedFields.details}`)
  if (advancedFields?.ambiance) parts.push(`Ambiance : ${advancedFields.ambiance}`)
  const fullDescription = parts.join('\n')

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
              text: fullDescription,
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
    const result = JSON.parse(cleanContent) as { photos: Array<{ variant: number; prompt: string }> }

    // POST-TRAITEMENT : forcer les traits physiques dans chaque prompt
    result.photos = result.photos.map(photo => ({
      ...photo,
      prompt: enforcePhysicalTraits(photo.prompt, fullDescription),
    }))

    return result
  } catch (error) {
    console.error('Gemini photo error:', error)

    // Fallback : prompt direct avec la description du client + réglages techniques de la catégorie
    const cat = PHOTO_CATEGORIES[category] || PHOTO_CATEGORIES.lifestyle
    let basePrompt = `Ultra photorealistic photograph, ${fullDescription}, ${cat.lighting_hint}, shot on 50mm lens at f/4, shallow depth of field, ${cat.texture_hint}, ${cat.mood} atmosphere, natural skin texture with visible pores, catchlights in eyes, anatomically correct hands, warm highlights with cool teal shadows, lifted blacks, subtle film grain, no AI artifacts, no plastic skin, no over-smoothing, no oversaturated colors, no uncanny valley, photographic realism`

    // Forcer les traits physiques aussi dans le fallback
    basePrompt = enforcePhysicalTraits(basePrompt, fullDescription)

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
