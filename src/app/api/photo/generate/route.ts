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

  return `Tu es un DIRECTEUR DE LA PHOTOGRAPHIE senior, spécialisé en photographie hyperréaliste commerciale. Tu crées des images IA INDISCERNABLES de vraies photos.

═══ RÈGLE N°1 — ABSOLUE, NON NÉGOCIABLE ═══

LA DESCRIPTION DU CLIENT EST SACRÉE. Tu dois reproduire EXACTEMENT la scène décrite par le client : le sujet, l'action, le lieu, les objets, les vêtements, l'ambiance. NE SIMPLIFIE PAS. NE RÉDUIS PAS à un simple portrait. Si le client décrit "un homme dans son atelier qui tient sa boîte à outils", le prompt DOIT contenir l'homme, l'atelier ET la boîte à outils.

La catégorie sert UNIQUEMENT à choisir les réglages techniques (éclairage, caméra, textures). Elle NE DOIT JAMAIS remplacer ou réduire la description du client.

═══ RÉGLAGES TECHNIQUES (catégorie "${cat.label}") ═══
Éclairage recommandé : ${cat.lighting_hint}
Textures à privilégier : ${cat.texture_hint}
Ambiance par défaut : ${cat.mood}

═══ TON EXPERTISE TECHNIQUE ═══

Pour chaque prompt, tu ENRICHIS la description du client avec :

1. ÉCLAIRAGE PHYSIQUE — sources, températures Kelvin, direction, ombres
   Ex: "warm 3200K key light from large workshop window on the left, fill from overhead fluorescent tubes"

2. TEXTURES NATURELLES — ce qui rend la photo VRAIE
   Peau : pores visibles, brillance zone-T, imperfections
   Tissus : weave visible, plis, usure
   Matériaux : grain bois, métal patiné, poussière, rouille
   Environnement : poussière dans les rayons, condensation, patine

3. RÉGLAGES CAMÉRA — adaptés à la SCÈNE (pas juste "portrait")
   Plan large/environnemental : 35mm f/4-5.6 (tout le contexte visible)
   Plan moyen : 50mm f/2.8 (sujet + environnement)
   Portrait serré : 85mm f/1.8-2.8 (visage + bokeh)
   Choisis la focale QUI CORRESPOND à la scène décrite, pas toujours 85mm portrait !

4. COLOR GRADING — split toning, noirs relevés, grain film

═══ FORMAT DE SORTIE ═══
Format image : ${format}

═══ ANTI-PATTERNS — CE QUI TRAHIT UNE IMAGE IA ═══
TOUJOURS inclure dans le prompt :
- "natural skin texture with visible pores" (anti peau plastique)
- "catchlights in eyes" (anti yeux morts)
- "anatomically correct hands" (anti mains déformées)
- Direction de lumière précise (anti éclairage plat)
- "natural color palette" (anti oversaturation)

═══ TA MISSION ═══

Génère un JSON avec ${numVariants} prompt(s) en anglais (120-200 mots chacun) pour fal.ai Flux.

PROCESSUS OBLIGATOIRE pour chaque prompt :
1. LIRE la description du client et les champs avancés
2. INCLURE chaque élément mentionné (sujet, action, lieu, objets, vêtements)
3. AJOUTER les réglages techniques (éclairage Kelvin, focale adaptée à la scène, textures)
4. AJOUTER le color grading et negative prompt

${numVariants === 4 ? `Les 4 prompts doivent être RADICALEMENT DIFFÉRENTS entre eux :
- Angles : face, profil, 3/4, plongée, contre-plongée
- Éclairages : golden hour, lumière fenêtre, néon, clair-obscur
- Cadrages : serré visage, plan moyen, plan large environnemental, détail mains/objets
- Ambiances : intime, dynamique, dramatique, joyeuse
MAIS les 4 doivent TOUS inclure les éléments décrits par le client (sujet, lieu, objets).` : ''}

STRUCTURE de chaque prompt :
"Ultra photorealistic photograph, [DESCRIPTION COMPLÈTE DE LA SCÈNE DU CLIENT], [ÉCLAIRAGE avec Kelvin], [CAMÉRA focale + ouverture], [TEXTURES spécifiques], [COLOR GRADING], natural skin texture with visible pores, catchlights in eyes, anatomically correct hands, no AI artifacts, no plastic skin, no over-smoothing, no oversaturated colors, no uncanny valley, photographic realism"

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

  // Construire les détails avancés en texte clair
  const advancedParts: string[] = []
  if (advancedFields?.subject) advancedParts.push(`SUJET : ${advancedFields.subject}`)
  if (advancedFields?.action) advancedParts.push(`ACTION : ${advancedFields.action}`)
  if (advancedFields?.location) advancedParts.push(`LIEU : ${advancedFields.location}`)
  if (advancedFields?.lighting) advancedParts.push(`ÉCLAIRAGE : ${advancedFields.lighting}`)
  if (advancedFields?.photoStyle) advancedParts.push(`STYLE : ${advancedFields.photoStyle}`)
  if (advancedFields?.details) advancedParts.push(`DÉTAILS : ${advancedFields.details}`)
  if (advancedFields?.ambiance) advancedParts.push(`AMBIANCE : ${advancedFields.ambiance}`)

  const advancedBlock = advancedParts.length > 0
    ? `\n\nLE CLIENT A PRÉCISÉ CES DÉTAILS (à inclure OBLIGATOIREMENT dans le prompt) :\n${advancedParts.join('\n')}`
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
              text: `VOICI LA SCÈNE À PHOTOGRAPHIER (chaque élément doit apparaître dans le prompt) :

"${description}"${advancedBlock}

RAPPEL : reproduis FIDÈLEMENT cette scène. Ne la simplifie PAS en simple portrait. Inclus le sujet, l'action, le lieu, les objets mentionnés. Ajoute tes réglages techniques (Kelvin, focale adaptée, textures) PAR-DESSUS la description, sans la remplacer.`,
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
