import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!

// Extraction robuste du JSON depuis la reponse Gemini
function extractJSON(raw: string): unknown | null {
  // 1. Nettoyer markdown
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // 2. Essayer de parser directement
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue
  }

  // 3. Chercher le premier { ... } ou [ ... ] dans le texte
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      // continue
    }
  }

  // 4. Chercher un array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      // continue
    }
  }

  return null
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { imageUrl, menuText } = await req.json()

    if (!imageUrl && !menuText) {
      return NextResponse.json({ error: 'imageUrl ou menuText est requis' }, { status: 400 })
    }

    const systemPrompt = `Tu es un expert specialise dans les menus de restaurants et snacks.

${imageUrl ? 'Analyse cette photo de menu et extrais' : 'Analyse ce texte de menu et extrais'} TOUS les plats avec leurs noms, prix et categories.

REGLES :
- Extrais chaque plat avec son nom exact tel qu'ecrit
- Extrais le prix (nombre uniquement, sans symbole euro). Exemple : 12.50 et non "12,50 EUR"
- Regroupe les plats par categorie (Entrees, Plats, Desserts, Boissons, etc.)
- Si une categorie n'est pas explicite, devine-la logiquement
- Si le prix n'est pas visible pour un plat, mets null
- Si une description est visible, inclus-la sinon mets null

IMPORTANT : Reponds UNIQUEMENT avec le JSON, rien d'autre. Pas de texte avant, pas de texte apres, pas de markdown.

Format attendu :
{"categories": [{"name": "Nom de la categorie", "items": [{"name": "Nom du plat", "price": 12.50, "description": null}]}]}`

    // Mode image (OCR) ou mode texte (parsing)
    const userContent = imageUrl
      ? [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: 'Extrais tous les plats de cette photo. Reponds uniquement en JSON.' },
        ]
      : [
          { type: 'text', text: `Extrais tous les plats de ce texte. Reponds uniquement en JSON.\n\n${menuText}` },
        ]

    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
          { role: 'user', content: userContent },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini extract error:', response.status, errText)
      return NextResponse.json({ error: 'Erreur lors de l\'analyse du menu' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    console.log('Gemini extract raw response:', content.slice(0, 500))

    const parsed = extractJSON(content)

    if (!parsed || typeof parsed !== 'object') {
      console.error('JSON extract failed. Raw:', content)
      return NextResponse.json({ error: 'L\'IA n\'a pas reussi a lire le menu. Reessaie ou saisis manuellement.' }, { status: 500 })
    }

    // Accepter soit { categories: [...] } soit directement un array
    const categories = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).categories || []

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'Aucun plat detecte. Verifie ton texte ou ta photo.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Menu extract error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
