import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTextMessage, sendListMessage, markAsRead } from '@/lib/whatsapp'
import { generateAIResponse, buildWelcomeMessage } from '@/lib/whatsapp-ai'
import type { Commerce, CommerceItem, CommerceFaq, WhatsAppMessage } from '@/types/database'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET

/**
 * Verify Meta webhook HMAC signature
 */
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!WHATSAPP_APP_SECRET) {
    console.warn('[Webhook] WHATSAPP_APP_SECRET not configured — skipping HMAC verification')
    return true
  }
  if (!signatureHeader) return false

  const expectedSignature = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`),
    Buffer.from(signatureHeader)
  )
}

// ============================================
// GET — Vérification webhook Meta
// ============================================
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Webhook] Vérification réussie')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ============================================
// POST — Réception des messages WhatsApp
// ============================================
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Verify Meta HMAC signature
    const signature = request.headers.get('x-hub-signature-256')
    if (!verifyMetaSignature(rawBody, signature)) {
      console.error('[Webhook] Invalid HMAC signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const body = JSON.parse(rawBody)

    // Vérifier que c'est un message WhatsApp
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.[0]) {
      // Pas de message (peut être un statut de livraison)
      return NextResponse.json({ status: 'ok' })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]
    const clientPhone = message.from
    const clientName = contact?.profile?.name || null
    const messageId = message.id

    // Marquer comme lu
    markAsRead(messageId).catch(() => {})

    // Extraire le contenu du message
    let messageText = ''
    let selectedCommerceId: string | null = null

    if (message.type === 'text') {
      messageText = message.text.body
    } else if (message.type === 'interactive') {
      if (message.interactive.type === 'list_reply') {
        // Le client a sélectionné un commerce dans la liste
        selectedCommerceId = message.interactive.list_reply.id
        messageText = message.interactive.list_reply.title
      } else if (message.interactive.type === 'button_reply') {
        messageText = message.interactive.button_reply.title
        selectedCommerceId = message.interactive.button_reply.id
      }
    } else {
      // Type non supporté (image, audio, etc.)
      await sendTextMessage(
        clientPhone,
        "Désolé, je ne comprends que les messages texte pour l'instant. Tape ton message !"
      )
      return NextResponse.json({ status: 'ok' })
    }

    const supabase = await createAdminClient()

    // Vérifier si le client demande le menu principal
    const isMenuRequest = ['menu', 'accueil', 'liste', 'commerces', 'bonjour', 'salut', 'hello', 'hi'].includes(
      messageText.toLowerCase().trim()
    )

    // Chercher une conversation active pour ce client
    const { data: activeConversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('client_phone', clientPhone)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    // Si le client demande le menu ou n'a pas de conversation active, proposer la liste
    if (isMenuRequest || (!activeConversation && !selectedCommerceId)) {
      // Fermer la conversation précédente si elle existe
      if (activeConversation) {
        await supabase
          .from('whatsapp_conversations')
          .update({ status: 'closed' })
          .eq('id', activeConversation.id)
      }

      await sendCommerceList(supabase, clientPhone, clientName)
      return NextResponse.json({ status: 'ok' })
    }

    // Si le client a sélectionné un commerce
    if (selectedCommerceId && selectedCommerceId.startsWith('commerce_')) {
      const commerceId = selectedCommerceId.replace('commerce_', '')

      // Fermer l'ancienne conversation
      if (activeConversation) {
        await supabase
          .from('whatsapp_conversations')
          .update({ status: 'closed' })
          .eq('id', activeConversation.id)
      }

      // Créer une nouvelle conversation liée au commerce
      const { data: newConversation } = await supabase
        .from('whatsapp_conversations')
        .insert({
          commerce_id: commerceId,
          client_phone: clientPhone,
          client_name: clientName,
          messages: [],
          status: 'active',
        })
        .select()
        .single()

      // Charger le commerce et envoyer un message de bienvenue
      const { data: commerce } = await supabase
        .from('commerces')
        .select('*')
        .eq('id', commerceId)
        .single()

      if (commerce) {
        const welcomeMsg = `Tu parles maintenant avec l'assistant de *${commerce.nom}* !

Pose-moi tes questions sur le menu, les horaires, ou fais une réservation.

Tape "menu" pour revenir à la liste des commerces.`

        await sendTextMessage(clientPhone, welcomeMsg)

        // Sauvegarder le message bot
        if (newConversation) {
          await saveMessage(supabase, newConversation.id, 'bot', welcomeMsg)
        }
      }

      return NextResponse.json({ status: 'ok' })
    }

    // Si on a une conversation active avec un commerce, utiliser l'IA
    if (activeConversation?.commerce_id) {
      await handleAIConversation(
        supabase,
        activeConversation,
        clientPhone,
        clientName,
        messageText
      )
      return NextResponse.json({ status: 'ok' })
    }

    // Fallback : recherche de commerce par nom
    if (messageText && !selectedCommerceId) {
      const { data: matchedCommerces } = await supabase
        .from('commerces')
        .select('id, nom')
        .eq('is_active', true)
        .ilike('nom', `%${messageText}%`)
        .limit(5)

      if (matchedCommerces && matchedCommerces.length === 1) {
        // Match exact, créer la conversation
        const commerce = matchedCommerces[0]
        const { data: newConversation } = await supabase
          .from('whatsapp_conversations')
          .insert({
            commerce_id: commerce.id,
            client_phone: clientPhone,
            client_name: clientName,
            messages: [],
            status: 'active',
          })
          .select()
          .single()

        const welcomeMsg = `Tu parles maintenant avec l'assistant de *${commerce.nom}* !

Pose-moi tes questions sur le menu, les horaires, ou fais une réservation.

Tape "menu" pour revenir à la liste des commerces.`

        await sendTextMessage(clientPhone, welcomeMsg)
        if (newConversation) {
          await saveMessage(supabase, newConversation.id, 'bot', welcomeMsg)
        }
      } else if (matchedCommerces && matchedCommerces.length > 1) {
        // Plusieurs résultats, proposer la liste
        await sendListMessage(
          clientPhone,
          `J'ai trouvé ${matchedCommerces.length} commerces :`,
          'Choisir',
          [{
            title: 'Résultats',
            rows: matchedCommerces.map((c) => ({
              id: `commerce_${c.id}`,
              title: c.nom.slice(0, 24),
            })),
          }]
        )
      } else {
        // Aucun résultat, proposer la liste complète
        await sendCommerceList(supabase, clientPhone, clientName)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ status: 'ok' })
  }
}

// ============================================
// Helpers
// ============================================

/**
 * Envoyer la liste des commerces actifs
 */
async function sendCommerceList(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  clientPhone: string,
  clientName: string | null
) {
  const { data: commerces } = await supabase
    .from('commerces')
    .select('id, nom, type, description')
    .eq('is_active', true)
    .order('nom')

  if (!commerces || commerces.length === 0) {
    await sendTextMessage(
      clientPhone,
      "Bienvenue sur Cobeone ! Aucun commerce n'est encore disponible. Revenez bientôt !"
    )
    return
  }

  const typeEmojis: Record<string, string> = {
    restaurant: '🍽️',
    artisan: '🔧',
    beaute: '💇',
    commerce: '🛍️',
  }

  const greeting = clientName ? `Salut ${clientName} ! ` : ''
  const welcomeText = `${greeting}${buildWelcomeMessage()}`

  if (commerces.length <= 10) {
    await sendListMessage(
      clientPhone,
      welcomeText,
      'Voir les commerces',
      [{
        title: 'Commerces disponibles',
        rows: commerces.map((c) => ({
          id: `commerce_${c.id}`,
          title: `${typeEmojis[c.type] || ''} ${c.nom}`.slice(0, 24),
          description: c.description?.slice(0, 72) || undefined,
        })),
      }]
    )
  } else {
    // Plus de 10, séparer par type
    const sections = Object.entries(typeEmojis)
      .map(([type, emoji]) => {
        const typeCommerces = commerces.filter((c) => c.type === type)
        if (typeCommerces.length === 0) return null
        return {
          title: `${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}s`,
          rows: typeCommerces.slice(0, 10).map((c) => ({
            id: `commerce_${c.id}`,
            title: c.nom.slice(0, 24),
            description: c.description?.slice(0, 72) || undefined,
          })),
        }
      })
      .filter(Boolean) as { title: string; rows: { id: string; title: string; description?: string }[] }[]

    await sendListMessage(clientPhone, welcomeText, 'Voir les commerces', sections)
  }
}

/**
 * Gérer une conversation IA avec un commerce
 */
async function handleAIConversation(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  conversation: { id: string; commerce_id: string; messages: WhatsAppMessage[] },
  clientPhone: string,
  clientName: string | null,
  messageText: string
) {
  // Charger le commerce, ses items et sa FAQ
  const [{ data: commerce }, { data: items }, { data: faq }] = await Promise.all([
    supabase.from('commerces').select('*').eq('id', conversation.commerce_id).single(),
    supabase.from('commerce_items').select('*').eq('commerce_id', conversation.commerce_id).order('ordre'),
    supabase.from('commerce_faq').select('*').eq('commerce_id', conversation.commerce_id),
  ])

  if (!commerce) {
    await sendTextMessage(clientPhone, "Ce commerce n'est plus disponible. Tape 'menu' pour voir les autres.")
    return
  }

  // Sauvegarder le message client
  await saveMessage(supabase, conversation.id, 'client', messageText)

  // Générer la réponse IA
  const aiResponse = await generateAIResponse(
    commerce as Commerce,
    (items || []) as CommerceItem[],
    (faq || []) as CommerceFaq[],
    conversation.messages || [],
    messageText
  )

  // Si c'est une réservation complète, la sauvegarder
  if (
    aiResponse.intent === 'reservation' &&
    aiResponse.reservationData?.date &&
    aiResponse.reservationData?.heure
  ) {
    await supabase.from('reservations').insert({
      commerce_id: conversation.commerce_id,
      client_phone: clientPhone,
      client_name: aiResponse.reservationData.nom || clientName,
      date: aiResponse.reservationData.date,
      heure: aiResponse.reservationData.heure,
      nombre_personnes: aiResponse.reservationData.nombre_personnes || null,
      status: 'pending',
    })
  }

  // Envoyer la réponse
  await sendTextMessage(clientPhone, aiResponse.reply)

  // Sauvegarder la réponse bot
  await saveMessage(supabase, conversation.id, 'bot', aiResponse.reply)
}

/**
 * Sauvegarder un message dans la conversation
 */
async function saveMessage(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  conversationId: string,
  role: 'client' | 'bot',
  content: string
) {
  // Charger les messages actuels
  const { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('messages')
    .eq('id', conversationId)
    .single()

  const messages = (conv?.messages as WhatsAppMessage[]) || []
  messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  })

  // Garder max 50 messages par conversation
  const trimmed = messages.slice(-50)

  await supabase
    .from('whatsapp_conversations')
    .update({ messages: trimmed })
    .eq('id', conversationId)
}
