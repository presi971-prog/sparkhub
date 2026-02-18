import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const KIE_API_KEY = process.env.KIE_API_KEY!
const CREDITS_COST = 3

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const { categories, restaurantInfo } = await req.json()

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ error: 'categories est requis' }, { status: 400 })
    }

    // Client admin direct (bypass RLS)
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
        description: 'Menu / Carte - Generation descriptions IA'
      })

    // Preparer les items qui ont besoin de descriptions
    const itemsForAI = categories.flatMap((cat: { name: string; items: { name: string; price: number | null; description?: string | null }[] }) =>
      cat.items
        .filter((item) => !item.description || item.description.trim() === '')
        .map((item) => ({ category: cat.name, name: item.name, price: item.price }))
    )

    let enrichedCategories = categories

    if (itemsForAI.length > 0) {
      const restaurantContext = restaurantInfo?.name
        ? `Le restaurant s'appelle "${restaurantInfo.name}".${restaurantInfo.slogan ? ` Slogan : "${restaurantInfo.slogan}".` : ''}`
        : ''

      const systemPrompt = `Tu es un expert en menu de restaurant en Guadeloupe (Antilles francaises).

${restaurantContext}

Pour chaque plat ci-dessous qui n'a PAS de description, ecris une description courte (1-2 lignes max) qui donne envie de commander. Ton chaleureux, references locales quand possible (epices, ingredients antillais, ambiance creole).

Reponds UNIQUEMENT au format JSON suivant, sans markdown, sans backticks :
{"descriptions": [{"category": "nom categorie", "name": "nom plat", "description": "ta description appetissante"}]}`

      const userPrompt = `Voici les plats qui ont besoin d'une description :\n${JSON.stringify(itemsForAI, null, 2)}`

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
              { role: 'user', content: [{ type: 'text', text: userPrompt }] },
            ],
            stream: false,
            include_thoughts: false,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content || ''
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          const parsed = JSON.parse(cleanContent)
          const descriptions = parsed.descriptions || []

          // Enrichir les categories avec les descriptions generees
          enrichedCategories = categories.map((cat: { name: string; items: { name: string; price: number | null; description?: string | null }[] }) => ({
            ...cat,
            items: cat.items.map((item) => {
              if (item.description && item.description.trim() !== '') return item
              const match = descriptions.find(
                (d: { category: string; name: string; description: string }) =>
                  d.name === item.name && d.category === cat.name
              )
              return match ? { ...item, description: match.description } : item
            }),
          }))
        } else {
          console.error('Gemini generate error:', response.status, await response.text())
        }
      } catch (error) {
        console.error('AI description error:', error)
      }
    }

    return NextResponse.json({
      success: true,
      categories: enrichedCategories,
      credits_remaining: creditData.balance - CREDITS_COST,
    })
  } catch (error) {
    console.error('Menu generate error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
