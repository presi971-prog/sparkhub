const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

interface WhatsAppButton {
  id: string
  title: string
}

interface WhatsAppListRow {
  id: string
  title: string
  description?: string
}

interface WhatsAppSection {
  title: string
  rows: WhatsAppListRow[]
}

async function callWhatsAppAPI(endpoint: string, body: object) {
  const res = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error('[WhatsApp API Error]', error)
    throw new Error(`WhatsApp API error: ${res.status}`)
  }

  return res.json()
}

/**
 * Envoyer un message texte simple
 */
export async function sendTextMessage(to: string, text: string) {
  return callWhatsAppAPI('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  })
}

/**
 * Envoyer des boutons cliquables (max 3)
 */
export async function sendReplyButtons(
  to: string,
  text: string,
  buttons: WhatsAppButton[]
) {
  return callWhatsAppAPI('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.slice(0, 20) },
        })),
      },
    },
  })
}

/**
 * Envoyer une liste déroulante (pour menu, choix de commerce, etc.)
 */
export async function sendListMessage(
  to: string,
  text: string,
  buttonText: string,
  sections: WhatsAppSection[]
) {
  return callWhatsAppAPI('messages', {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((section) => ({
          title: section.title.slice(0, 24),
          rows: section.rows.map((row) => ({
            id: row.id.slice(0, 200),
            title: row.title.slice(0, 24),
            description: row.description?.slice(0, 72),
          })),
        })),
      },
    },
  })
}

/**
 * Marquer un message comme lu (coches bleues)
 */
export async function markAsRead(messageId: string) {
  return callWhatsAppAPI('messages', {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  })
}
