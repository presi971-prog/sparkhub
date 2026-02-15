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
  subject: {
    personnes: 'des personnes',
    commerce: 'un lieu commercial',
    produits: 'des produits/plats',
    paysage: 'un paysage',
    ambiance: 'une ambiance/emotion',
  },
  people_count: { '1': 'une seule personne', '2-3': '2 ou 3 personnes', groupe: 'un groupe de personnes' },
  people_age: { enfants: 'enfants', jeunes: 'jeunes (18-30 ans)', adultes: 'adultes (30-50 ans)', seniors: 'seniors (50+)', mix: 'ages melanges' },
  people_origin: { antillaise: 'antillaise/caribbeenne', africaine: 'africaine', europeenne: 'europeenne', asiatique: 'asiatique', mixte: 'origines mixtes' },
  people_action: { sourient: 'qui sourient et posent', mangent: 'en train de manger/boire', travaillent: 'en train de travailler', discutent: 'en train de discuter', dansent: 'en train de danser/faire la fete', cuisinent: 'en train de cuisiner' },
  people_clothing: { decontracte: 'tenue decontractee', elegant: 'tenue elegante/chic', professionnel: 'tenue professionnelle/uniforme', traditionnel: 'tenue traditionnelle' },
  commerce_view: { devanture: 'la devanture/facade', interieur: "l'interieur/la salle", comptoir: 'le comptoir/bar', cuisine: 'la cuisine/atelier', terrasse: 'la terrasse' },
  product_type: { plats_creoles: 'plats creoles', patisseries: 'patisseries/desserts', boissons: 'boissons/cocktails', fruits: 'fruits tropicaux', cosmetiques: 'cosmetiques/soins', artisanat: 'artisanat/bijoux', vetements: 'vetements/mode' },
  product_presentation: { gros_plan: 'en gros plan (focus produit)', table_dressee: 'sur une table dressee', etalage: 'en etalage/vitrine', en_preparation: 'en preparation', dans_les_mains: 'tenus dans les mains' },
  landscape_type: { plage: 'plage/bord de mer', montagne: 'montagne/volcan', foret: 'foret tropicale', ville: 'ville/rue', campagne: 'campagne/champs', port: 'port/marina' },
  ambiance: { chaleureuse: 'chaleureuse et familiale', festive: 'festive et coloree', zen: 'zen et apaisante', luxe: 'chic et raffinee', dynamique: 'dynamique et energique', romantique: 'romantique et douce' },
  lumiere: { matin: 'lumiere du matin', apres_midi: 'plein soleil', golden_hour: 'coucher de soleil (golden hour)', nuit: 'nuit/neons', tamisee: 'lumiere tamisee/intime' },
  couleurs: { chauds: 'tons chauds (rouge, orange, jaune)', froids: 'tons froids (bleu, vert)', vifs: 'couleurs vives et eclatantes', pastels: 'couleurs pastels et douces', naturels: 'couleurs naturelles (bois, terre, vert)', sombres: 'couleurs sombres et contrastees' },
  lieu: { interieur: 'en interieur', terrasse: 'sur une terrasse', plage: 'a la plage', rue: 'dans une rue animee', marche: 'dans un marche', nature: 'en pleine nature/vegetation' },
  elements: { vegetation: 'vegetation tropicale', fleurs: 'fleurs', fruits: 'fruits tropicaux', mer: 'mer/ocean', architecture: 'architecture creole', bougies: 'bougies/lumieres', musique: 'instruments/musique', drapeaux: 'couleurs locales' },
}

function buildStructuredDescription(config: Record<string, unknown>): string {
  if (!config || !config.subject) return ''

  const parts: string[] = []

  // Sujet principal
  parts.push(`Sujet principal : ${HERO_LABELS.subject[config.subject as string] || config.subject}`)

  // Champs conditionnels selon le sujet
  if (config.subject === 'personnes') {
    if (config.people_count) parts.push(`Nombre : ${HERO_LABELS.people_count[config.people_count as string] || config.people_count}`)
    if (config.people_age) parts.push(`Age : ${HERO_LABELS.people_age[config.people_age as string] || config.people_age}`)
    if (config.people_origin) parts.push(`Apparence : ${HERO_LABELS.people_origin[config.people_origin as string] || config.people_origin}`)
    if (config.people_action) parts.push(`Action : ${HERO_LABELS.people_action[config.people_action as string] || config.people_action}`)
    if (config.people_clothing) parts.push(`Vetements : ${HERO_LABELS.people_clothing[config.people_clothing as string] || config.people_clothing}`)
  }
  if (config.subject === 'commerce' && config.commerce_view) {
    parts.push(`Vue : ${HERO_LABELS.commerce_view[config.commerce_view as string] || config.commerce_view}`)
  }
  if (config.subject === 'produits') {
    if (config.product_type) parts.push(`Type : ${HERO_LABELS.product_type[config.product_type as string] || config.product_type}`)
    if (config.product_presentation) parts.push(`Presentation : ${HERO_LABELS.product_presentation[config.product_presentation as string] || config.product_presentation}`)
  }
  if (config.subject === 'paysage' && config.landscape_type) {
    parts.push(`Paysage : ${HERO_LABELS.landscape_type[config.landscape_type as string] || config.landscape_type}`)
  }

  // Champs universels
  if (config.ambiance) parts.push(`Ambiance : ${HERO_LABELS.ambiance[config.ambiance as string] || config.ambiance}`)
  if (config.lumiere) parts.push(`Lumiere : ${HERO_LABELS.lumiere[config.lumiere as string] || config.lumiere}`)
  if (config.couleurs) parts.push(`Couleurs : ${HERO_LABELS.couleurs[config.couleurs as string] || config.couleurs}`)
  if (config.lieu) parts.push(`Lieu : ${HERO_LABELS.lieu[config.lieu as string] || config.lieu}`)
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
  const systemPrompt = `Tu es un DIRECTEUR ARTISTIQUE et PHOTOGRAPHE PROFESSIONNEL specialise dans les visuels commerciaux pour sites web.

Tu recois une FICHE TECHNIQUE structuree (sujet, personnes, ambiance, lumiere, couleurs, etc.) qui decrit exactement ce que le client veut voir sur sa banniere de site web. Ton role est de transformer cette fiche en un prompt de generation d'image PARFAIT.

METHODE :
1. LIS CHAQUE LIGNE de la fiche — chaque information doit se retrouver dans le prompt final
2. COMPOSE la scene — cadrage, angle de vue, profondeur de champ, premier plan et arriere-plan
3. DIRIGE la lumiere — selon ce qui est demande (golden hour, nuit, matin, etc.)
4. ENRICHIS avec des details photographiques professionnels qui subliment la demande

FORMAT DE SORTIE :
- Ecris UNIQUEMENT le prompt en anglais, rien d'autre. Pas de guillemets, pas d'explication, pas de "Here is..."
- 3 a 5 phrases descriptives, riches en details visuels

STYLE OBLIGATOIRE :
- Photographie REALISTE haut de gamme — shot on Canon EOS R5, 35mm wide-angle lens for landscapes or 85mm for portraits
- Integrer : "ultra-realistic, editorial photography, shallow depth of field, high resolution, 8K"
- Format paysage 16:9, banniere web pleine largeur

CONTEXTE GUADELOUPE (Caraibes francaises) :
- Les personnes demandees sont afro-caribbeennes par defaut : "Black Caribbean", "dark brown skin", "Afro-Caribbean features"
- Si l'apparence est precisee dans la fiche, RESPECTER exactement ce qui est demande
- Vegetation tropicale, lumiere des Caraibes, couleurs vibrantes

REGLES ABSOLUES :
- CHAQUE element de la fiche doit etre dans le prompt — ne rien oublier, ne rien filtrer
- Toujours terminer par : "no text, no words, no letters, no logos, no signage, no watermark"
- JAMAIS d'illustration, dessin, cartoon, 3D → 100% photorealiste

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
