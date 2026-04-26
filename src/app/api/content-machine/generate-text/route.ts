import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { askClaude } from '@/lib/content-machine/anthropic'

type ContentType = 'post_image' | 'carousel' | 'video'

interface GenerateTextRequest {
  brandSlug: string
  contentType: ContentType
  theme: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSystemPrompt(brand: any, contentType: ContentType): string {
  const colors = brand.colors || {}
  const base = `Tu es un expert en creation de contenu pour les reseaux sociaux, specialise dans le marche de la Guadeloupe et des Antilles francaises.
Tu travailles pour la marque "${brand.name}".

IDENTITE DE LA MARQUE :
- Ton : ${brand.tone || 'Professionnel et engageant'}
- Cible : ${brand.target_audience || 'Professionnels en Guadeloupe'}
- Arguments cles : ${(brand.key_arguments || []).join(', ')}
- Regles a respecter : ${brand.rules || 'Aucune regle speciale'}
- Couleurs de la marque : ${colors.primary || '#000'} (principale), ${colors.secondary || '#FFF'} (secondaire)

REGLES ABSOLUES :
- Ecris TOUJOURS en francais
- Le contexte est la Guadeloupe, les Antilles, les Caraibes — utilise des references locales naturellement (pas force)
- Adapte le ton exactement a la marque (tutoiement ou vouvoiement selon ce qui est indique)
- Utilise des emojis avec moderation (2-3 max par post)
- Ne mets JAMAIS de lien, d'URL, de numero de telephone ou de slogan dans le texte du post
- Les hashtags doivent etre pertinents et en francais (3-5 max), avec au moins 1 hashtag Guadeloupe
- Reponds UNIQUEMENT en JSON valide, sans markdown ni backticks

REGLES POUR LES PROMPTS D'IMAGE :
- Les prompts d'image sont en ANGLAIS (les modeles de generation d'image fonctionnent mieux en anglais)
- Chaque prompt doit mentionner : le contexte tropical/caribeen/Guadeloupe, les couleurs de la marque en hex, le format carre 1080x1080
- NE PAS mentionner de logo ni de texte dans les prompts d'image (le logo sera ajoute en post-production)
- Style : visuel marketing professionnel, lumineux, moderne, photorealiste
- JAMAIS de texte ecrit sur l'image, JAMAIS de logo, JAMAIS de watermark
- Inclure des personnes locales (peau metissee/noire) quand pertinent`

  if (contentType === 'post_image') {
    return `${base}

FORMAT DE REPONSE (JSON) :
{
  "text": "Le texte du post pour les reseaux sociaux, en francais, avec le ton de la marque",
  "imagePrompts": ["A detailed prompt in ENGLISH for image generation. Describe : main subject, tropical Caribbean/Guadeloupe setting, brand colors (${colors.primary}, ${colors.secondary}), professional marketing photo style, square 1080x1080 format, warm lighting, diverse Caribbean people. Do NOT include text or logos in the image."]
}`
  }

  if (contentType === 'carousel') {
    return `${base}

Tu dois creer un carousel (4 a 6 slides).
Chaque slide a un titre court, un texte explicatif, et un prompt d'image.
Les slides doivent avoir une coherence visuelle entre elles (meme palette, meme style).

FORMAT DE REPONSE (JSON) :
{
  "text": "Le texte d'accroche du post (visible avant le carousel), en francais",
  "slides": [
    {
      "title": "Titre court de la slide (4-6 mots max)",
      "text": "Texte explicatif de la slide (2-3 phrases max)",
      "imagePrompt": "Prompt in ENGLISH for this slide image. Same color palette (${colors.primary}, ${colors.secondary}), consistent style across all slides, square format, Caribbean setting. No text in image."
    }
  ],
  "imagePrompts": ["prompt slide 1", "prompt slide 2", "..."]
}`
  }

  // video
  return `${base}

Tu dois creer un script video court (15-30 secondes, format carre 1080x1080).
Le script contient des scenes avec voix-off en francais et descriptions visuelles.

FORMAT DE REPONSE (JSON) :
{
  "text": "Le texte d'accroche du post accompagnant la video, en francais",
  "videoScript": {
    "title": "Titre de la video",
    "duration": "15-30s",
    "scenes": [
      {
        "sceneNumber": 1,
        "duration": "5-10s",
        "voiceover": "Texte de la voix off en francais pour cette scene",
        "visualDescription": "Description detaillee de ce qu'on voit : decor caribeen, personnes locales, couleurs de la marque",
        "imagePrompt": "Prompt in ENGLISH for the visual. Tropical Guadeloupe setting, brand colors ${colors.primary} and ${colors.secondary}, cinematic/marketing pro style, square format. No text in image."
      }
    ]
  },
  "imagePrompts": ["prompt scene 1", "prompt scene 2", "..."]
}`
}

export async function POST(req: Request) {
  try {
    const body: GenerateTextRequest = await req.json()
    const { brandSlug, contentType, theme } = body

    if (!brandSlug || !contentType || !theme) {
      return NextResponse.json(
        { error: 'brandSlug, contentType et theme sont requis' },
        { status: 400 }
      )
    }

    if (!['post_image', 'carousel', 'video'].includes(contentType)) {
      return NextResponse.json(
        { error: 'contentType invalide. Valeurs acceptees : post_image, carousel, video' },
        { status: 400 }
      )
    }

    // Charger les infos de la marque
    const supabase = createAdminSupabase()
    const { data: brand, error: brandError } = await supabase
      .from('cm_brands')
      .select('*')
      .eq('slug', brandSlug)
      .single()

    if (brandError || !brand) {
      return NextResponse.json(
        { error: `Marque "${brandSlug}" non trouvee` },
        { status: 404 }
      )
    }

    const systemPrompt = buildSystemPrompt(brand, contentType)
    const userMessage = `Cree du contenu de type "${contentType}" sur le theme suivant : "${theme}"`

    const rawResponse = await askClaude(systemPrompt, userMessage, 3000)

    // Parser la reponse JSON
    let parsed
    try {
      // Nettoyer d'eventuels backticks markdown
      const cleaned = rawResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Erreur de parsing de la reponse IA', raw: rawResponse },
        { status: 500 }
      )
    }

    return NextResponse.json({
      text: parsed.text,
      imagePrompts: parsed.imagePrompts || [],
      slides: parsed.slides || undefined,
      videoScript: parsed.videoScript || undefined,
      brandSlug,
      contentType,
      theme,
    })
  } catch (error) {
    console.error('[content-machine/generate-text] Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
