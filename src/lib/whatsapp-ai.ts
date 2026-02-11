import type { Commerce, CommerceItem, CommerceFaq, WhatsAppMessage } from '@/types/database'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

interface AIResponse {
  reply: string
  intent: 'info' | 'reservation' | 'commande' | 'transfert' | 'general'
  reservationData?: {
    date?: string
    heure?: string
    nombre_personnes?: number
    nom?: string
  }
}

/**
 * Génère le system prompt pour un commerce donné
 */
function buildSystemPrompt(
  commerce: Commerce,
  items: CommerceItem[],
  faq: CommerceFaq[]
): string {
  const typeLabels: Record<string, string> = {
    restaurant: 'restaurant',
    artisan: 'artisan',
    beaute: 'salon de beauté',
    commerce: 'commerce',
  }

  const typeLabel = typeLabels[commerce.type] || 'commerce'

  // Construire le menu/services
  let menuSection = ''
  if (items.length > 0) {
    const categories = new Map<string, CommerceItem[]>()
    for (const item of items) {
      const cat = item.categorie
      if (!categories.has(cat)) categories.set(cat, [])
      categories.get(cat)!.push(item)
    }

    menuSection = '\n\nMenu / Services :\n'
    for (const [cat, catItems] of categories) {
      menuSection += `\n${cat} :\n`
      for (const item of catItems.sort((a, b) => a.ordre - b.ordre)) {
        const prix = item.prix ? ` - ${item.prix}€` : ''
        const desc = item.description ? ` (${item.description})` : ''
        menuSection += `- ${item.nom}${prix}${desc}\n`
      }
    }
  }

  // Construire les horaires
  let horairesSection = ''
  if (commerce.horaires && Object.keys(commerce.horaires).length > 0) {
    horairesSection = '\n\nHoraires :\n'
    for (const [jour, heures] of Object.entries(commerce.horaires)) {
      horairesSection += `- ${jour} : ${heures}\n`
    }
  }

  // Construire la FAQ
  let faqSection = ''
  if (faq.length > 0) {
    faqSection = '\n\nQuestions fréquentes :\n'
    for (const f of faq) {
      faqSection += `Q: ${f.question}\nR: ${f.reponse}\n\n`
    }
  }

  return `Tu es l'assistant WhatsApp de "${commerce.nom}", ${typeLabel}${commerce.adresse ? ` à ${commerce.adresse}` : ''}.
${commerce.description || ''}
${horairesSection}${menuSection}${faqSection}
Règles :
- Réponds en français. Si le client écrit en créole guadeloupéen, réponds en créole.
- Sois chaleureux, professionnel et concis.
- Si le client veut réserver, demande : date, heure${commerce.type === 'restaurant' ? ', nombre de personnes' : ''} et nom.
- Quand tu as toutes les infos de réservation, confirme-les et dis que la réservation est enregistrée.
- Si tu ne sais pas quelque chose, dis-le honnêtement et propose de contacter le commerce${commerce.telephone ? ` au ${commerce.telephone}` : ''}.
- Ne jamais inventer de plats, services ou prix qui ne sont pas dans la liste ci-dessus.
- Réponds de manière concise (max 300 caractères quand c'est possible).`
}

/**
 * Appelle GPT-4o mini pour générer une réponse
 */
export async function generateAIResponse(
  commerce: Commerce,
  items: CommerceItem[],
  faq: CommerceFaq[],
  conversationHistory: WhatsAppMessage[],
  userMessage: string
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(commerce, items, faq)

  // Construire l'historique (derniers 10 messages max pour limiter les tokens)
  const recentHistory = conversationHistory.slice(-10)
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...recentHistory.map((msg) => ({
      role: msg.role === 'client' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'whatsapp_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              reply: { type: 'string', description: 'La réponse à envoyer au client' },
              intent: {
                type: 'string',
                enum: ['info', 'reservation', 'commande', 'transfert', 'general'],
                description: "L'intention détectée du message",
              },
              reservationData: {
                type: ['object', 'null'],
                properties: {
                  date: { type: ['string', 'null'] },
                  heure: { type: ['string', 'null'] },
                  nombre_personnes: { type: ['number', 'null'] },
                  nom: { type: ['string', 'null'] },
                },
                required: ['date', 'heure', 'nombre_personnes', 'nom'],
                additionalProperties: false,
              },
            },
            required: ['reply', 'intent', 'reservationData'],
            additionalProperties: false,
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('[OpenAI API Error]', error)
    return {
      reply: "Désolé, j'ai un petit souci technique. Réessaie dans quelques instants !",
      intent: 'general',
    }
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content

  try {
    return JSON.parse(content) as AIResponse
  } catch {
    return {
      reply: content || "Désolé, je n'ai pas compris. Peux-tu reformuler ?",
      intent: 'general',
    }
  }
}

/**
 * Génère un message d'accueil avec la liste des commerces
 */
export function buildWelcomeMessage(): string {
  return `Bienvenue sur Cobeone ! Je suis l'assistant WhatsApp de vos commerces favoris en Guadeloupe.

Tapez le nom d'un commerce ou choisissez dans la liste pour commencer.

Envoyez "menu" à tout moment pour revenir à la liste des commerces.`
}
