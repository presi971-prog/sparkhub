import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const CREDITS_COST = 1

// ═══════════════════════════════════════════════════════════════
// Thématiques pour le générateur d'idées
// ═══════════════════════════════════════════════════════════════

const THEME_DETAILS: Record<string, string> = {
  promo_commerce: `Vidéos promotionnelles pour commerces locaux (restaurants, salons, boutiques, garages, etc.) aux Antilles/Guadeloupe. L'idée doit mettre en valeur l'activité de manière spectaculaire et donner envie de venir.`,
  drole_animaux: `Vidéos drôles mettant en scène des animaux (chats, chiens, perroquets, tortues, etc.) dans des situations comiques du quotidien. Les animaux font des choses humaines de manière mignonne et hilarante.`,
  storytelling: `Mini-histoires visuelles captivantes avec un début, un développement et une chute. Peut être émouvant, surprenant ou inspirant. Le spectateur doit être accroché dès la première scène.`,
  tutoriel: `Tutoriels visuels étape par étape (cuisine, bricolage, beauté, sport, etc.). Chaque scène montre une étape claire et satisfaisante. Le résultat final doit être impressionnant.`,
  nature_voyage: `Scènes de nature spectaculaire, paysages paradisiaques, voyages de rêve. Ambiance cinématique, lumières incroyables. Donne envie de partir immédiatement.`,
  motivation: `Vidéos motivantes et inspirantes. Progression, transformation, dépassement de soi. Énergie positive, musique épique. Le spectateur se sent prêt à conquérir le monde.`,
  tendance: `Formats tendance TikTok/Reels du moment : satisfying, ASMR visuel, transitions magiques, before/after spectaculaires, POV drôles. Ce qui fait des millions de vues.`,
  libre: `N'importe quel sujet créatif et original. Sois surprenant, décalé, inventif. Le but est de proposer quelque chose que personne n'a vu.`,
}

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { theme } = await req.json()

    if (!theme || !THEME_DETAILS[theme]) {
      return NextResponse.json(
        { error: 'Thématique invalide' },
        { status: 400 }
      )
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

    if (!creditData || creditData.balance < CREDITS_COST) {
      return NextResponse.json(
        { error: `1 crédit requis pour générer des idées.` },
        { status: 402 }
      )
    }

    // 4. Déduire 1 crédit
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
        description: 'Spark Vidéo - Générateur d\'idées',
      })

    // 5. Gemini génère les idées
    const systemPrompt = `Tu es un CRÉATEUR DE CONTENU VIRAL expert TikTok/Instagram Reels. Tu génères des idées de vidéos courtes qui fonctionnent.

COMMENT ÇA FONCTIONNE : L'IA crée des images fixes, les anime en clips de 5 secondes, ajoute de la musique et assemble le tout. Pas de vraies vidéos filmées.

═══ FORMATS VIRAUX ÉPROUVÉS (inspire-toi de ces patterns qui font des MILLIONS de vues) ═══

FORMAT 1 — "LE PERSONNAGE INATTENDU"
Un animal ou un personnage improbable qui fait une activité humaine complexe avec un sérieux absolu.
Pourquoi ça marche : le contraste absurde + la cohérence créent l'humour. Ex : "Un chat chef étoilé qui prépare des sushis avec une précision chirurgicale", "Un golden retriever en costume qui passe un entretien d'embauche".
Hook : la première image doit montrer le personnage EN PLEINE ACTION (pas en train de se préparer).

FORMAT 2 — "LA TRANSFORMATION SPECTACULAIRE"
Un processus avant/après où chaque étape est visuellement satisfaisante.
Pourquoi ça marche : le cerveau ADORE voir une transformation progressive. Ex : "Une épave de voiture qui se transforme en bolide étincelant étape par étape", "Un terrain vague qui devient un jardin paradisiaque".
Hook : montrer le résultat FINAL en premier, puis remonter au début.

FORMAT 3 — "LE PROCESSUS SATISFAISANT"
Une activité montrée étape par étape avec des détails hyper-visuels (textures, lumières, gestes précis).
Pourquoi ça marche : c'est addictif, les gens regardent jusqu'au bout. Ex : "Fabrication artisanale de chocolat de A à Z", "Construction d'une cabane dans les arbres".
Hook : la scène la plus impressionnante du processus EN GROS PLAN.

FORMAT 4 — "LE QUOTIDIEN DEVENU ÉPIQUE"
Une scène banale rendue cinématique avec un éclairage, un cadrage et une mise en scène de film hollywoodien.
Pourquoi ça marche : le décalage crée l'émotion. Ex : "Grand-mère qui cuisine un colombo filmé comme un thriller", "Un livreur qui traverse la ville filmé comme Mission Impossible".
Hook : le grand angle cinématique qui pose l'ambiance immédiatement.

FORMAT 5 — "LE MINI-DOCUMENTAIRE NATURE"
Des scènes de nature/animaux sauvages avec une qualité National Geographic.
Pourquoi ça marche : beauté pure + curiosité. Ex : "La journée d'une tortue en Guadeloupe, du lever au coucher du soleil", "La transformation d'une chenille en papillon en forêt tropicale".
Hook : le plan le plus époustouflant visuellement (macro, lumière dorée).

FORMAT 6 — "LE CONTRASTE VISUEL"
Deux mondes opposés dans la même vidéo (petit/grand, ancien/moderne, calme/chaos, pauvre/riche).
Pourquoi ça marche : la tension visuelle maintient l'attention. Ex : "Minuscule fourmi qui construit vs bulldozer géant", "Cuisine de rue modeste vs restaurant 3 étoiles, même plat".
Hook : les deux extrêmes côte à côte dès la première scène.

═══ CONTRAINTES TECHNIQUES ═══

Tes idées doivent :
- Avoir des SCÈNES VISUELLES CLAIRES (pas de dialogue, pas de texte)
- Un SUJET CONCRET identique tout au long (même personnage/animal/objet)
- Une PROGRESSION narrative (début → développement → fin satisfaisante)
- Des MOUVEMENTS SIMPLES par scène (une action, pas des cascades)

Ce qui NE marche PAS avec notre système :
- Concepts abstraits (l'amour, le temps)
- Foules ou scènes avec beaucoup de personnages
- Mouvements rapides, cascades, action complexe
- Idées qui nécessitent du texte ou du dialogue

═══ THÉMATIQUE DEMANDÉE ═══
${THEME_DETAILS[theme]}

═══ TA MISSION ═══

Génère 5 idées de vidéo basées sur les FORMATS VIRAUX ci-dessus. Chaque idée doit :
- Utiliser un des formats éprouvés (ou combiner 2 formats)
- Être décrite en 2-3 phrases concrètes et visuelles
- Avoir un HOOK clair (quelle est la première image qui arrête le scroll ?)
- Être faisable avec notre système (images fixes → animation)
- Donner immédiatement envie de cliquer sur "Générer"

FORMAT JSON UNIQUEMENT, sans markdown :
{"ideas":["idée 1 ici","idée 2 ici","idée 3 ici","idée 4 ici","idée 5 ici"]}`

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
              text: `Génère 5 idées de vidéo pour la thématique "${theme}". Sois CRÉATIF et PRÉCIS. Chaque idée doit donner immédiatement envie de créer la vidéo.`,
            }],
          },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      console.error('Gemini ideas error:', response.status)
      // Rembourser en cas d'erreur
      await adminSupabase
        .from('credits')
        .update({ balance: creditData.balance })
        .eq('profile_id', user.id)

      return NextResponse.json(
        { error: 'Erreur lors de la génération d\'idées' },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('Gemini raw response keys:', Object.keys(data))
    console.log('Gemini raw content:', JSON.stringify(data).slice(0, 500))

    const content = data.choices?.[0]?.message?.content || ''
    console.log('Extracted content:', content.slice(0, 300))

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    console.log('Clean content:', cleanContent.slice(0, 300))

    let ideas: string[]
    try {
      const parsed = JSON.parse(cleanContent)
      ideas = parsed.ideas || []
    } catch {
      // Fallback : essayer de parser ligne par ligne
      ideas = cleanContent.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 5)
    }

    console.log('Final ideas count:', ideas.length)

    return NextResponse.json({
      success: true,
      ideas,
      credits_remaining: creditData.balance - CREDITS_COST,
      _debug: { contentLength: content.length, ideasCount: ideas.length, rawContent: content.slice(0, 200) },
    })
  } catch (error) {
    console.error('Spark Video ideas error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
