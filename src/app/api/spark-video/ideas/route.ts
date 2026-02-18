import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''
const SERPER_API_KEY = process.env.SERPER_API_KEY || ''
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || ''

// ═══════════════════════════════════════════════════════════════
// Coûts par niveau
// ═══════════════════════════════════════════════════════════════

const LEVEL_CREDITS: Record<string, number> = {
  basique: 0,
  tendances: 2,
  viral: 3,
  expert: 5,
}

// ═══════════════════════════════════════════════════════════════
// Thèmes Business — descriptions détaillées pour Gemini
// ═══════════════════════════════════════════════════════════════

const BUSINESS_THEME_DETAILS: Record<string, string> = {
  promo_offre: 'Vidéo promotionnelle pour une offre spéciale, réduction, menu du jour, happy hour. Le but : donner envie de venir MAINTENANT.',
  avant_apres: 'Transformation avant/après spectaculaire. Montrer le résultat impressionnant d\'une prestation (coupe de cheveux, rénovation, nettoyage, plat brut → plat fini).',
  produit_star: 'Mettre en scène LE produit ou LA prestation phare du commerce. Le filmer comme une pub de luxe.',
  visite: 'Faire découvrir l\'ambiance et le lieu. Donner envie de pousser la porte. Montrer les détails qui rendent l\'endroit unique.',
  equipe: 'Présenter les visages derrière le commerce. Humaniser, créer du lien. Chaque membre de l\'équipe en action.',
  coulisses: 'Montrer ce que le client ne voit jamais : la préparation, la fabrication, les coulisses. Process satisfying.',
  tuto_conseil: 'Partager un savoir-faire : recette rapide, astuce beauté, conseil mécanique. Positionner le commerce comme expert.',
  evenement: 'Créer du buzz pour une ouverture, un anniversaire, un événement spécial. Donner envie de venir.',
  temoignage: 'Mise en scène visuelle d\'un client satisfait. Avant l\'achat → utilisation → satisfaction. Social proof.',
  saisonnier: 'Contenu adapté à la saison : Noël, Carnaval, Fête des mères, rentrée, été. Surfer sur le calendrier.',
}

// ═══════════════════════════════════════════════════════════════
// Thèmes Général — descriptions (l'existant)
// ═══════════════════════════════════════════════════════════════

const GENERAL_THEME_DETAILS: Record<string, string> = {
  promo_commerce: 'Vidéos promotionnelles pour commerces locaux (restaurants, salons, boutiques, garages, etc.) aux Antilles/Guadeloupe.',
  drole_animaux: 'Vidéos drôles mettant en scène des animaux dans des situations comiques du quotidien.',
  storytelling: 'Mini-histoires visuelles captivantes avec un début, un développement et une chute.',
  tutoriel: 'Tutoriels visuels étape par étape (cuisine, bricolage, beauté, sport, etc.).',
  nature_voyage: 'Scènes de nature spectaculaire, paysages paradisiaques, voyages de rêve.',
  motivation: 'Vidéos motivantes et inspirantes. Progression, transformation, dépassement de soi.',
  tendance: 'Formats tendance TikTok/Reels du moment : satisfying, ASMR visuel, transitions magiques.',
  libre: 'N\'importe quel sujet créatif et original. Sois surprenant, décalé, inventif.',
}

// ═══════════════════════════════════════════════════════════════
// Labels des types de commerce pour les requêtes de recherche
// ═══════════════════════════════════════════════════════════════

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  restaurant: 'restaurant food truck traiteur cuisine',
  coiffure: 'salon coiffure barbier hair',
  beaute: 'institut beauté esthétique beauty salon spa',
  garage: 'garage mécanique auto car repair',
  boutique: 'boutique vêtements mode fashion shop',
  artisan: 'artisan BTP construction rénovation',
  service: 'service à domicile nettoyage jardinage',
  autre: 'commerce local business',
}

// ═══════════════════════════════════════════════════════════════
// Recherche Tavily
// ═══════════════════════════════════════════════════════════════

async function searchTavily(query: string): Promise<string> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TAVILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      include_answer: true,
      search_depth: 'basic',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Tavily error (${res.status}): ${err}`)
  }

  const data = await res.json()

  // Construire un résumé pour Gemini
  let summary = ''
  if (data.answer) {
    summary += `RÉSUMÉ IA : ${data.answer}\n\n`
  }
  if (data.results?.length) {
    summary += 'SOURCES :\n'
    for (const r of data.results) {
      summary += `- ${r.title}: ${r.content?.slice(0, 200) || ''}\n`
    }
  }
  return summary
}

// ═══════════════════════════════════════════════════════════════
// Recherche Serper (Google + YouTube)
// ═══════════════════════════════════════════════════════════════

async function searchSerper(query: string): Promise<string> {
  // Recherche Google + Vidéos en parallèle
  const [googleRes, videosRes] = await Promise.all([
    fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 5 }),
    }),
    fetch('https://google.serper.dev/videos', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: `${query} viral video`, num: 5 }),
    }),
  ])

  let summary = ''

  if (googleRes.ok) {
    const googleData = await googleRes.json()
    if (googleData.organic?.length) {
      summary += 'RÉSULTATS GOOGLE :\n'
      for (const r of googleData.organic.slice(0, 5)) {
        summary += `- ${r.title}: ${r.snippet || ''}\n`
      }
      summary += '\n'
    }
    if (googleData.answerBox) {
      summary += `FEATURED SNIPPET : ${googleData.answerBox.answer || googleData.answerBox.snippet || ''}\n\n`
    }
  }

  if (videosRes.ok) {
    const videosData = await videosRes.json()
    if (videosData.videos?.length) {
      summary += 'VIDÉOS YOUTUBE TRENDING :\n'
      for (const v of videosData.videos.slice(0, 5)) {
        summary += `- "${v.title}" (${v.channel || 'inconnu'}) — ${v.duration || ''}\n`
      }
    }
  }

  if (!summary) throw new Error('Aucun résultat Serper')
  return summary
}

// ═══════════════════════════════════════════════════════════════
// Recherche Perplexity (analyse IA approfondie)
// ═══════════════════════════════════════════════════════════════

async function searchPerplexity(query: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
      search_recency_filter: 'month',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Perplexity error (${res.status}): ${err}`)
  }

  const data = await res.json()
  let summary = data.choices?.[0]?.message?.content || ''

  // Ajouter les citations si disponibles
  if (data.citations?.length) {
    summary += '\n\nSOURCES :\n'
    for (const url of data.citations.slice(0, 5)) {
      summary += `- ${url}\n`
    }
  }

  return summary
}

// ═══════════════════════════════════════════════════════════════
// Construire la requête de recherche selon le contexte
// ═══════════════════════════════════════════════════════════════

function buildSearchQuery(
  category: string,
  theme: string,
  businessType: string | null,
  businessSpecialty: string | null,
): string {
  const themeLabel = category === 'business'
    ? BUSINESS_THEME_DETAILS[theme]?.split('.')[0] || theme
    : GENERAL_THEME_DETAILS[theme]?.split('.')[0] || theme

  const businessLabel = businessType
    ? BUSINESS_TYPE_LABELS[businessType] || businessType
    : ''

  const specialtyPart = businessSpecialty ? ` ${businessSpecialty}` : ''

  if (category === 'business') {
    return `trending TikTok Reels video ideas 2026 ${businessLabel}${specialtyPart} ${themeLabel} ASMR satisfying viral short video`
  }
  return `trending TikTok Reels video ideas 2026 ${themeLabel} viral short video`
}

function buildPerplexityQuery(
  category: string,
  theme: string,
  businessType: string | null,
  businessSpecialty: string | null,
): string {
  const themeLabel = category === 'business'
    ? BUSINESS_THEME_DETAILS[theme]?.split('.')[0] || theme
    : GENERAL_THEME_DETAILS[theme]?.split('.')[0] || theme

  const businessLabel = businessType
    ? BUSINESS_TYPE_LABELS[businessType]?.split(' ').slice(0, 2).join(' ') || businessType
    : ''

  const specialtyPart = businessSpecialty ? ` spécialisé en "${businessSpecialty}"` : ''

  if (category === 'business') {
    return `Quels formats de vidéos courtes (TikTok, Reels, Shorts) fonctionnent le mieux en 2026 pour un ${businessLabel}${specialtyPart} ? Focus sur le thème "${themeLabel}". Donne les tendances actuelles avec exemples concrets de vidéos virales, hooks efficaces, et styles populaires (ASMR, drone, before/after, POV, satisfying, etc.). Inclus des chiffres si possible (vues, engagement).`
  }
  return `Quels sont les formats de vidéos courtes (TikTok, Reels) les plus viraux en 2026 pour le thème "${themeLabel}" ? Donne des exemples concrets de vidéos qui ont cartonné, avec les hooks et styles utilisés.`
}

// ═══════════════════════════════════════════════════════════════
// ROUTE POST — Générer des idées
// ═══════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { category, theme, level, businessType, businessSpecialty } = await req.json()

    // Validation
    if (!category || !theme || !level) {
      return NextResponse.json(
        { error: 'category, theme et level sont requis' },
        { status: 400 }
      )
    }

    if (!['business', 'general'].includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }

    const creditsCost = LEVEL_CREDITS[level]
    if (creditsCost === undefined) {
      return NextResponse.json({ error: 'Niveau invalide' }, { status: 400 })
    }

    // Vérifier que le thème existe
    const themeDetails = category === 'business'
      ? BUSINESS_THEME_DETAILS[theme]
      : GENERAL_THEME_DETAILS[theme]

    if (!themeDetails) {
      return NextResponse.json({ error: 'Thématique invalide' }, { status: 400 })
    }

    // Vérifier les clés API pour les niveaux payants
    if (level === 'tendances' && !TAVILY_API_KEY) {
      return NextResponse.json({ error: 'Niveau Tendances non disponible (clé API manquante)' }, { status: 400 })
    }
    if (level === 'viral' && !SERPER_API_KEY) {
      return NextResponse.json({ error: 'Niveau Viral non disponible (clé API manquante)' }, { status: 400 })
    }
    if (level === 'expert' && !PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'Niveau Expert non disponible (clé API manquante)' }, { status: 400 })
    }

    // 2. Admin client
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Vérifier les crédits
    const { data: creditData } = await adminSupabase
      .from('credits')
      .select('balance, lifetime_spent')
      .eq('profile_id', user.id)
      .single()

    if (!creditData) {
      return NextResponse.json({ error: 'Profil crédits introuvable.' }, { status: 402 })
    }

    if (creditsCost > 0 && creditData.balance < creditsCost) {
      return NextResponse.json(
        { error: `${creditsCost} crédit${creditsCost > 1 ? 's' : ''} requis.` },
        { status: 402 }
      )
    }

    // 4. Déduire les crédits (sauf si gratuit)
    if (creditsCost > 0) {
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
          description: `Spark Vidéo - Inspire-moi (${level})`,
        })
    }

    // 5. Recherche web (si niveau > basique)
    let searchContext = ''

    if (level !== 'basique') {
      try {
        if (level === 'tendances') {
          const query = buildSearchQuery(category, theme, businessType || null, businessSpecialty || null)
          searchContext = await searchTavily(query)
        } else if (level === 'viral') {
          const query = buildSearchQuery(category, theme, businessType || null, businessSpecialty || null)
          searchContext = await searchSerper(query)
        } else if (level === 'expert') {
          const query = buildPerplexityQuery(category, theme, businessType || null, businessSpecialty || null)
          searchContext = await searchPerplexity(query)
        }
      } catch (searchError) {
        console.error(`Search error (${level}):`, searchError)
        // On continue sans résultats de recherche (fallback vers basique)
        searchContext = '[Recherche web indisponible — génération basée sur les connaissances IA uniquement]'
      }
    }

    // 6. Construire le prompt Gemini
    const businessContext = category === 'business' && businessType
      ? `\n\nCOMMERCE DU CLIENT :\n- Type : ${BUSINESS_TYPE_LABELS[businessType] || businessType}\n${businessSpecialty ? `- Spécialité : ${businessSpecialty}\n` : ''}- Localisation : Guadeloupe (Antilles françaises)\n\nTu DOIS personnaliser chaque idée pour CE commerce spécifique. Pas de générique.`
      : ''

    const searchSection = searchContext
      ? `\n\n═══ TENDANCES RÉELLES (résultats de recherche web) ═══\n${searchContext}\n\nTu DOIS t'inspirer de ces tendances réelles pour tes propositions. Cite les formats, styles ou vidéos trouvés.`
      : ''

    const systemPrompt = `Tu es un expert en stratégie de contenu vidéo court pour TikTok et Instagram Reels.

Notre système IA crée des images fixes, les anime en clips de 5 secondes, ajoute de la musique et assemble le tout. Ce ne sont PAS de vraies vidéos filmées — ce sont des images animées.

THÉMATIQUE DEMANDÉE : ${themeDetails}${businessContext}${searchSection}

═══ RÈGLES POUR LES IDÉES ═══

- Scènes visuelles claires, pas de dialogue ni de texte à l'écran
- Un sujet concret identique tout au long (même personnage/animal/objet)
- Progression narrative : début accrocheur, développement, fin satisfaisante
- Mouvements simples par scène (une action par image animée)
- Éviter : concepts abstraits, foules, mouvements rapides impossibles à animer

═══ POUR CHAQUE IDÉE, INCLURE ═══

1. **title** : Titre court et accrocheur (max 60 caractères)
2. **description** : Description concrète et visuelle en 2-3 phrases. Décris ce qu'on VOIT.
3. **style** : Le style vidéo (ex: "ASMR food", "Before/After", "Drone cinématique", "Process satisfying", "POV", "Timelapse", etc.)
4. **hook** : La première scène qui arrête le scroll (ce qu'on voit dans les 2 premières secondes)

═══ FORMAT DE RÉPONSE ═══

UNIQUEMENT du JSON valide, sans markdown, sans backticks :
{"ideas":[{"title":"...","description":"...","style":"...","hook":"..."}]}`

    const response = await fetch('https://api.kie.ai/gemini-3-pro/v1/chat/completions', {
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
              text: `Génère 5 idées de vidéo courte. Sois CONCRET, CRÉATIF et SPÉCIFIQUE. Chaque idée doit être unique et réalisable avec notre système d'images animées.`,
            }],
          },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini ideas error:', response.status, errText)
      if (creditsCost > 0) await refundCredits(adminSupabase, user.id, creditData.balance, creditData.lifetime_spent)
      return NextResponse.json(
        { error: `Erreur Gemini (${response.status})` },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Vérifier erreur KIE
    if (data.code && data.code !== 200) {
      console.error('KIE API error:', data.code, data.msg)
      if (creditsCost > 0) await refundCredits(adminSupabase, user.id, creditData.balance, creditData.lifetime_spent)
      const isMaintenance = data.msg?.includes('maintained')
      return NextResponse.json(
        { error: isMaintenance ? 'Le serveur IA est en maintenance. Réessaie dans quelques minutes.' : `Erreur API IA : ${data.msg || 'Erreur inconnue'}` },
        { status: 503 }
      )
    }

    // Extraire le contenu
    let content = ''
    if (data.choices?.[0]?.message?.content) {
      content = typeof data.choices[0].message.content === 'string'
        ? data.choices[0].message.content
        : JSON.stringify(data.choices[0].message.content)
    } else if (data.content) {
      content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content)
    } else if (data.text) {
      content = data.text
    } else if (data.response) {
      content = typeof data.response === 'string' ? data.response : JSON.stringify(data.response)
    }

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Parser les idées enrichies
    let ideas: Array<{ title: string; description: string; style: string; hook: string }> = []
    try {
      const parsed = JSON.parse(cleanContent)
      const rawIdeas = parsed.ideas || []
      ideas = rawIdeas.map((idea: Record<string, string>) => ({
        title: idea.title || 'Idée vidéo',
        description: idea.description || '',
        style: idea.style || '',
        hook: idea.hook || '',
      }))
    } catch {
      // Fallback : essayer de découper en lignes
      const lines = cleanContent.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 5)
      ideas = lines.map((line: string) => ({
        title: line.slice(0, 60),
        description: line,
        style: '',
        hook: '',
      }))
    }

    // Rembourser si aucune idée
    if (ideas.length === 0) {
      if (creditsCost > 0) await refundCredits(adminSupabase, user.id, creditData.balance, creditData.lifetime_spent)
      return NextResponse.json({
        success: false,
        ideas: [],
        error: 'Aucune idée générée. Réessaie.',
        credits_remaining: creditData.balance,
      })
    }

    return NextResponse.json({
      success: true,
      ideas,
      level,
      credits_remaining: creditData.balance - creditsCost,
    })
  } catch (error) {
    console.error('Spark Video ideas error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// Utilitaire remboursement
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function refundCredits(adminSupabase: any, userId: string, originalBalance: number, originalSpent: number) {
  await adminSupabase
    .from('credits')
    .update({ balance: originalBalance, lifetime_spent: originalSpent })
    .eq('profile_id', userId)
}

// ═══════════════════════════════════════════════════════════════
// ROUTE GET — Vérifier disponibilité des moteurs
// ═══════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    engines: {
      basique: true,
      tendances: !!TAVILY_API_KEY,
      viral: !!SERPER_API_KEY,
      expert: !!PERPLEXITY_API_KEY,
    },
  })
}
