import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!

// Extraction robuste du JSON depuis la reponse Gemini
function extractJSON(raw: string): unknown | null {
  // 1. Nettoyer markdown
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // 2. Essayer de parser directement
  try {
    return JSON.parse(cleaned)
  } catch {
    // continue
  }

  // 3. Chercher le premier { ... } dans le texte
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

// Fallback : parser le texte brut ligne par ligne
function parseTextFallback(text: string): { name: string; items: { name: string; price: number | null; description: null }[] }[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const categories: { name: string; items: { name: string; price: number | null; description: null }[] }[] = []
  let current: { name: string; items: { name: string; price: number | null; description: null }[] } | null = null

  // Regex pour detecter un prix dans une ligne (6€, 12.50€, 14,50 EUR, 8 euros, etc.)
  const priceRegex = /(\d+[.,]?\d*)\s*(?:€|EUR|euros?)?$/i

  for (const line of lines) {
    const priceMatch = line.match(priceRegex)

    if (!priceMatch) {
      // Pas de prix → c'est probablement un titre de categorie
      if (current && current.items.length > 0) {
        categories.push(current)
      }
      current = { name: line, items: [] }
    } else {
      // Prix detecte → c'est un plat
      const price = parseFloat(priceMatch[1].replace(',', '.'))
      const name = line.replace(priceRegex, '').replace(/[-–—:.\s]+$/, '').trim()

      if (!current) {
        current = { name: 'Menu', items: [] }
      }
      if (name) {
        current.items.push({ name, price: isNaN(price) ? null : price, description: null })
      }
    }
  }

  // Ajouter la derniere categorie
  if (current && current.items.length > 0) {
    categories.push(current)
  }

  return categories
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

    let geminiError: string | null = null
    let categories: unknown[] = []

    try {
      const response = await fetch('https://api.kie.ai/gemini-3-pro/v1/chat/completions', {
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
        geminiError = `API ${response.status}: ${errText.slice(0, 200)}`
        console.error('Gemini extract error:', geminiError)
      } else {
        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        console.log('Gemini extract raw (200 chars):', content.slice(0, 200))

        const parsed = extractJSON(content)

        if (parsed && typeof parsed === 'object') {
          categories = Array.isArray(parsed)
            ? parsed
            : ((parsed as Record<string, unknown>).categories as unknown[]) || []
        } else {
          geminiError = `JSON parse failed. Raw: ${content.slice(0, 300)}`
          console.error(geminiError)
        }
      }
    } catch (err) {
      geminiError = `Fetch error: ${err instanceof Error ? err.message : String(err)}`
      console.error(geminiError)
    }

    // Fallback : si Gemini a echoue et qu'on a du texte, parser manuellement
    if ((!Array.isArray(categories) || categories.length === 0) && menuText) {
      console.log('Gemini failed, trying text fallback parser')
      categories = parseTextFallback(menuText)

      if (categories.length > 0) {
        return NextResponse.json({
          success: true,
          categories,
          _fallback: true,
        })
      }
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({
        error: 'Aucun plat detecte. Verifie ton texte ou ta photo.',
        _debug: geminiError,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Menu extract error:', error)
    return NextResponse.json({
      error: 'Erreur interne du serveur',
      _debug: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
