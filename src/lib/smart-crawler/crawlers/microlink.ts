// Smart Crawler — Microlink Meta API wrapper
//
// CONTEXTE
// Jina Reader (notre crawler par défaut) est BLOQUÉ par Facebook, Instagram et
// LinkedIn — ces plateformes refusent les requêtes non authentifiées et renvoient
// soit la page de login, soit une 401/403.
//
// Microlink contourne ces blocages côté serveur (en navigateur headless avec
// cookies anonymes, fallback sur la Graph API quand utile). Pour notre besoin
// (extraire les infos publiques d'une page sociale), Microlink suffit largement.
//
// FREE TIER : 50 req/jour par IP. Pour plus, ajouter MICROLINK_API_KEY dans les
// env vars et la passer en header `x-api-key`.
//
// FORMAT RETOURNÉ
// Microlink renvoie un objet { title, description, image, publisher, ... }.
// On le convertit en markdown plat compatible avec le reste du pipeline (qui
// attend du texte brut comme ce que renvoie Jina).

const MICROLINK_TIMEOUT = 15_000

interface MicrolinkResponse {
  status: 'success' | 'fail'
  data?: {
    title?: string
    description?: string
    publisher?: string
    author?: string
    lang?: string
    url?: string
    image?: { url?: string } | string
    logo?: { url?: string } | string
  }
}

/**
 * Lit une URL via Microlink (meta scraping côté serveur, contourne FB/IG/LI).
 * Retourne du markdown plat (title + description + publisher) compatible
 * avec le pipeline d'extraction Claude.
 */
export async function fetchWithMicrolink(url: string): Promise<string> {
  const apiKey = process.env.MICROLINK_API_KEY
  const microUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true`

  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MICROLINK_TIMEOUT)

  try {
    const response = await fetch(microUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[Microlink] ${response.status} pour ${url}`)
      return ''
    }

    const json = (await response.json()) as MicrolinkResponse
    if (json.status !== 'success' || !json.data) {
      return ''
    }

    const d = json.data
    const lines: string[] = []
    if (d.title) lines.push(`# ${d.title}`)
    if (d.publisher) lines.push(`**Source :** ${d.publisher}`)
    if (d.author) lines.push(`**Auteur :** ${d.author}`)
    if (d.url) lines.push(`**URL :** ${d.url}`)
    if (d.description) lines.push('', d.description)
    return lines.join('\n').trim()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Microlink] Timeout (${MICROLINK_TIMEOUT}ms) pour ${url}`)
    } else {
      console.warn(`[Microlink] Erreur pour ${url}:`, error)
    }
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Détecte si une URL est une page de réseau social que Jina ne peut pas lire
 * sans authentification (Facebook, Instagram, LinkedIn principalement).
 */
export function isSocialUrl(url: string): boolean {
  return /(?:^|\/\/)(?:(?:www|m|web)\.)?(?:facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in)/i.test(url)
}

/**
 * Détecte si le contenu retourné par Jina est en réalité une page de login
 * Facebook (et donc l'extraction a échoué silencieusement).
 */
export function isLoginPageContent(content: string): boolean {
  const lower = content.toLowerCase()
  return (
    lower.includes('log into facebook') ||
    lower.includes('log in to instagram') ||
    lower.includes('sign in to linkedin') ||
    (lower.includes('log into') && lower.length < 1500)
  )
}
