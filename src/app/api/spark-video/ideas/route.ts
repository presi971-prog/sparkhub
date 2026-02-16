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

    // 5. Gemini génère les idées (prompt simplifié)
    const themeDesc = THEME_DETAILS[theme]

    const systemPrompt = `Tu es un expert en creation de videos courtes virales pour TikTok et Instagram Reels.

Notre systeme IA cree des images fixes, les anime en clips de 5 secondes, ajoute de la musique et assemble le tout. Ce ne sont pas de vraies videos filmees.

Regles pour les idees :
- Scenes visuelles claires, pas de dialogue ni de texte
- Un sujet concret identique tout au long (meme personnage/animal/objet)
- Progression narrative : debut, developpement, fin satisfaisante
- Mouvements simples par scene (une action, pas de cascades)
- Eviter : concepts abstraits, foules, mouvements rapides

Formats qui marchent bien :
1. Personnage inattendu (animal qui fait une activite humaine)
2. Transformation spectaculaire (avant/apres satisfaisant)
3. Processus etape par etape (fabrication, construction)
4. Quotidien filme comme un film hollywoodien
5. Mini-documentaire nature (qualite National Geographic)
6. Contraste visuel (deux mondes opposes)

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{"ideas":["idee 1","idee 2","idee 3","idee 4","idee 5"]}`

    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Thematique : ${themeDesc}\n\nGenere 5 idees de video courte pour cette thematique. Chaque idee doit etre decrite en 2-3 phrases concretes et visuelles. Reponds en JSON.`,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini ideas error:', response.status, errText)
      // Rembourser en cas d'erreur
      await adminSupabase
        .from('credits')
        .update({ balance: creditData.balance })
        .eq('profile_id', user.id)

      return NextResponse.json(
        { error: `Erreur Gemini (${response.status})` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const rawJson = JSON.stringify(data).slice(0, 1000)

    // Vérifier erreur KIE (retourne 200 avec erreur dans le body)
    if (data.code && data.code !== 200) {
      console.error('KIE API error:', data.code, data.msg)
      await adminSupabase
        .from('credits')
        .update({ balance: creditData.balance })
        .eq('profile_id', user.id)

      return NextResponse.json(
        { error: `Erreur API IA : ${data.msg || 'Accès refusé'}. Vérifie ta clé KIE.` },
        { status: 500 }
      )
    }

    // Extraire le contenu - essayer plusieurs chemins
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

    let ideas: string[]
    try {
      const parsed = JSON.parse(cleanContent)
      ideas = parsed.ideas || []
    } catch {
      ideas = cleanContent.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 5)
    }

    // Rembourser si aucune idée générée
    if (ideas.length === 0) {
      await adminSupabase
        .from('credits')
        .update({ balance: creditData.balance })
        .eq('profile_id', user.id)

      return NextResponse.json({
        success: false,
        ideas: [],
        error: 'Aucune idée générée. Réessaie.',
        credits_remaining: creditData.balance,
        _debug: { rawKeys: Object.keys(data), rawJson, contentLength: content.length },
      })
    }

    return NextResponse.json({
      success: true,
      ideas,
      credits_remaining: creditData.balance - CREDITS_COST,
    })
  } catch (error) {
    console.error('Spark Video ideas error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
