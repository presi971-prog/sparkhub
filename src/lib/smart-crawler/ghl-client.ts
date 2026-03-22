// Smart Crawler — GHL API Client
// Lit et écrit les custom fields des contacts via PIT token

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

interface GHLUpdatePayload {
  customFields: Array<{ id: string; field_value: string }>
}

/**
 * Met à jour les custom fields d'un contact GHL.
 * Utilise le PIT (Private Integration Token) pour l'authentification.
 * Format : { id: "internalFieldId", field_value: "valeur" }
 */
export async function updateContactFields(
  contactId: string,
  pitToken: string,
  fields: Array<{ id: string; field_value: string }>
): Promise<boolean> {
  const url = `${GHL_API_BASE}/contacts/${contactId}`

  const body: GHLUpdatePayload = { customFields: fields }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pitToken}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[SmartCrawler] GHL PUT ${response.status}: ${errText}`)
      return false
    }

    console.log(`[SmartCrawler] GHL contact ${contactId} updated (${fields.length} fields)`)
    return true
  } catch (error) {
    console.error(`[SmartCrawler] GHL fetch error:`, error)
    return false
  }
}

/**
 * Récupère les infos d'un contact GHL (pour debug).
 */
export async function getContact(
  contactId: string,
  pitToken: string
): Promise<Record<string, unknown> | null> {
  const url = `${GHL_API_BASE}/contacts/${contactId}`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${pitToken}`,
        'Version': GHL_API_VERSION,
      },
    })

    if (!response.ok) {
      console.error(`[SmartCrawler] GHL GET ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.contact || data
  } catch (error) {
    console.error(`[SmartCrawler] GHL GET error:`, error)
    return null
  }
}
