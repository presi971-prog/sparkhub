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

    const { business_name, business_type, slogan, services, address, theme, hero_prompt, is_update } = await req.json()

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

      // 2. Image de couverture : Gemini optimise le prompt → fal.ai genere
      generateHeroImage(siteTheme.aiPrompt, business_name, business_type, hero_prompt, siteTheme.id),
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

async function optimizeImagePrompt(
  userDescription: string,
  businessType: string,
  themeId: string,
): Promise<string> {
  const systemPrompt = `Tu es un DIRECTEUR ARTISTIQUE et PHOTOGRAPHE PROFESSIONNEL specialise dans les visuels commerciaux pour sites web.

Ton client est un commercant en Guadeloupe (Antilles francaises) qui te decrit en quelques mots l'image qu'il veut pour la banniere de son site web. Toi, avec ton oeil de pro, tu dois :

1. COMPRENDRE SA VISION — Qu'est-ce qu'il veut vraiment montrer ? Quelle emotion ? Quel message ?
2. COMPOSER LA SCENE — Cadrage, angle de vue, premier plan / arriere-plan, profondeur de champ, regle des tiers
3. DIRIGER LA LUMIERE — Golden hour, lumiere naturelle laterale, contre-jour, eclairage chaud, reflets...
4. CHOISIR LES DETAILS — Textures, couleurs dominantes, elements de decor, accessoires qui racontent une histoire
5. CREER L'ATMOSPHERE — L'emotion que le visiteur du site doit ressentir en voyant cette image

FORMAT DE SORTIE :
- Ecris UNIQUEMENT le prompt en anglais, rien d'autre. Pas de guillemets, pas d'explication.
- 2 a 5 phrases descriptives, riches en details visuels.

STYLE OBLIGATOIRE :
- Photographie REALISTE haut de gamme (editorial, commercial, lifestyle)
- Mots-cles a integrer naturellement : "shot on Canon EOS R5", "85mm lens", "shallow depth of field", "natural light", "editorial photography", "ultra-realistic"
- Format paysage 16:9, adapte pour une banniere web pleine largeur

CONTEXTE GUADELOUPE :
- La population est majoritairement afro-caribbeenne. Toute personne representee doit etre noire / afro-antillaise, avec des traits caribbeens.
- Si le client demande des gens : preciser "Black Caribbean person/people", "dark brown skin", "Afro-Caribbean features"
- Meme sans precision du client : les personnages sont antillais par defaut
- Integrer des elements caribbeens quand pertinent : vegetation tropicale, couleurs vives, architecture creole, lumiere des tropiques

REGLES ABSOLUES :
- RESPECTER chaque detail demande par le client (apparence, vetements, nombre de personnes, objets, ambiance). Ne rien ignorer.
- JAMAIS de texte, lettres, mots, logos, enseignes lisibles dans l'image → toujours ajouter "no text, no words, no letters, no logos, no signage, no watermark"
- JAMAIS d'illustration, dessin, cartoon, 3D render → toujours realiste photo

Theme visuel du site : ${themeId}`

  const userPrompt = `Type de commerce : ${businessType || 'commerce local'}
Description de l'utilisateur : ${userDescription}`

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
  heroPrompt?: string,
  themeId?: string,
): Promise<string | null> {
  let prompt: string

  if (heroPrompt && heroPrompt.trim().length > 5) {
    // Etape 1 : Gemini optimise la description du pro en prompt technique anglais
    const optimizedPrompt = await optimizeImagePrompt(
      heroPrompt.trim(),
      businessType,
      themeId || 'tropical_creole',
    )

    if (optimizedPrompt) {
      prompt = optimizedPrompt
    } else {
      // Fallback si Gemini echoue
      prompt = `Professional realistic DSLR photograph for a ${businessType || 'local business'} website: ${heroPrompt.trim()}. Caribbean Guadeloupe, natural lighting, vivid colors, no text no letters no words no logos`
    }
  } else {
    // Pas de description du pro → prompt generique du theme
    prompt = `${themePrompt}, realistic professional DSLR photograph, natural lighting, for a ${businessType || 'local business'} in Caribbean Guadeloupe`
  }

  // Etape 2 : fal.ai flux/dev genere l'image (meilleure qualite que schnell)
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
