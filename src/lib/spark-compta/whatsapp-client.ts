/**
 * Spark Compta — Client WhatsApp Cloud API (Meta)
 *
 * Wrapper minimal pour envoyer des messages via l'API WhatsApp Cloud de Meta.
 * Utilise les variables d'environnement déjà configurées pour Cobeone :
 *   - WHATSAPP_ACCESS_TOKEN
 *   - WHATSAPP_PHONE_NUMBER_ID
 *
 * Doc officielle : https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

const GRAPH_API_VERSION = 'v21.0'

interface SendTextMessageInput {
  /** Numéro destinataire au format E.164 sans + (ex: "590691270919") */
  to: string
  /** Texte à envoyer (max 4096 caractères) */
  body: string
  /** Optionnel : désactiver l'aperçu des URLs */
  preview_url?: boolean
}

interface SendMessageResult {
  success: boolean
  message_id?: string
  error?: string
}

/**
 * Envoie un message texte via WhatsApp Cloud API.
 *
 * @example
 *   await sendWhatsAppTextMessage({
 *     to: "590691270919",
 *     body: "⛽ Carburant enregistrée. 60,00 €, essence Shell Petit-Bourg."
 *   })
 */
export async function sendWhatsAppTextMessage(
  input: SendTextMessageInput
): Promise<SendMessageResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    return {
      success: false,
      error: 'WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquants',
    }
  }

  // Normaliser le numéro : enlever + et espaces
  const to = input.to.replace(/[\s\+\-\(\)]/g, '')

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: input.preview_url ?? false,
          body: input.body,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Meta API ${response.status}: ${errorText.slice(0, 400)}`,
      }
    }

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ============================================================================
// Parser du payload entrant de Meta
// ============================================================================

interface IncomingWhatsAppMessage {
  /** Numéro expéditeur au format E.164 sans + */
  from: string
  /** Type du message */
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'other'
  /** Texte du message (si type === 'text') */
  text?: string
  /** Media ID (si type image/audio/etc.) */
  media_id?: string
  /** ID du message côté Meta (pour éviter les doublons) */
  message_id: string
  /** Timestamp Unix */
  timestamp: number
}

/**
 * Parse le payload JSON reçu de Meta lors d'un webhook.
 * Retourne un tableau de messages (Meta peut envoyer plusieurs messages en
 * une seule requête). Retourne un tableau vide si ce n'est pas un message.
 *
 * Structure du payload Meta :
 * {
 *   object: "whatsapp_business_account",
 *   entry: [{
 *     id: "...",
 *     changes: [{
 *       value: {
 *         messaging_product: "whatsapp",
 *         metadata: { display_phone_number, phone_number_id },
 *         contacts: [{ profile: { name }, wa_id }],
 *         messages: [{ from, id, timestamp, type, text: { body } }]
 *       },
 *       field: "messages"
 *     }]
 *   }]
 * }
 */
export function parseIncomingWebhookPayload(
  payload: unknown
): IncomingWhatsAppMessage[] {
  const messages: IncomingWhatsAppMessage[] = []

  if (!payload || typeof payload !== 'object') return messages

  const entries = (payload as { entry?: unknown[] }).entry
  if (!Array.isArray(entries)) return messages

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const changes = (entry as { changes?: unknown[] }).changes
    if (!Array.isArray(changes)) continue

    for (const change of changes) {
      if (!change || typeof change !== 'object') continue
      const value = (change as { value?: unknown }).value
      if (!value || typeof value !== 'object') continue

      const rawMessages = (value as { messages?: unknown[] }).messages
      if (!Array.isArray(rawMessages)) continue

      for (const msg of rawMessages) {
        if (!msg || typeof msg !== 'object') continue
        const m = msg as {
          from?: string
          id?: string
          timestamp?: string
          type?: string
          text?: { body?: string }
          image?: { id?: string }
          audio?: { id?: string }
        }

        if (!m.from || !m.id || !m.type) continue

        const parsed: IncomingWhatsAppMessage = {
          from: m.from,
          type:
            m.type === 'text' ||
            m.type === 'image' ||
            m.type === 'audio' ||
            m.type === 'video' ||
            m.type === 'document'
              ? m.type
              : 'other',
          message_id: m.id,
          timestamp: m.timestamp ? parseInt(m.timestamp, 10) : Date.now() / 1000,
        }

        if (m.type === 'text' && m.text?.body) {
          parsed.text = m.text.body
        } else if (m.type === 'image' && m.image?.id) {
          parsed.media_id = m.image.id
        } else if (m.type === 'audio' && m.audio?.id) {
          parsed.media_id = m.audio.id
        }

        messages.push(parsed)
      }
    }
  }

  return messages
}

// ============================================================================
// Helpers numéro de téléphone
// ============================================================================

/**
 * Normalise un numéro de téléphone pour la comparaison.
 * Enlève tous les caractères non-digits et retourne les 9 derniers chiffres
 * (suffisant pour identifier un numéro français/DOM sans se soucier du
 * préfixe international).
 *
 * @example
 *   normalizePhone("0690 27 09 19") → "690270919"
 *   normalizePhone("+590 690 27 09 19") → "690270919"
 *   normalizePhone("590690270919") → "690270919"
 */
export function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '')
  // Garder les 9 derniers chiffres (numéro national sans préfixe pays/département)
  return digitsOnly.slice(-9)
}
