import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl est requis' }, { status: 400 })
    }

    const systemPrompt = `Tu es un OCR intelligent specialise dans les menus de restaurants et snacks.

Analyse cette photo de menu et extrais TOUS les plats avec leurs noms, prix et categories.

REGLES :
- Extrais chaque plat avec son nom exact tel qu'ecrit sur le menu
- Extrais le prix (nombre uniquement, sans symbole euro)
- Regroupe les plats par categorie (Entrees, Plats, Desserts, Boissons, etc.)
- Si une categorie n'est pas explicite, devine-la logiquement
- Si le prix n'est pas visible pour un plat, mets null
- Si une description est visible, inclus-la

Reponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"categories": [{"name": "Nom de la categorie", "items": [{"name": "Nom du plat", "price": 12.50, "description": "description si visible ou null"}]}]}`

    const response = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: [{ type: 'text', text: systemPrompt }] },
          { role: 'user', content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Analyse cette photo de menu et extrais tous les plats au format JSON.' },
          ] },
        ],
        stream: false,
        include_thoughts: false,
      }),
    })

    if (!response.ok) {
      console.error('Gemini OCR error:', response.status, await response.text())
      return NextResponse.json({ error: 'Erreur lors de l\'analyse de la photo' }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleanContent)
    } catch {
      console.error('JSON parse error from Gemini OCR:', cleanContent)
      return NextResponse.json({ error: 'Erreur de lecture du menu. Reessayez ou saisissez manuellement.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories: parsed.categories || [],
    })
  } catch (error) {
    console.error('Menu extract error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
