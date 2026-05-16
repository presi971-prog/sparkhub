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
    // Récupérer l'URL de l'image principale (logo / cover photo) — utile pour
    // l'analyse couleurs côté ai-extractor (extractImageUrls regex match les
    // URLs d'images dans le contenu markdown).
    const imageUrl =
      typeof d.image === 'string'
        ? d.image
        : d.image?.url || (typeof d.logo === 'string' ? d.logo : d.logo?.url) || ''

    const lines: string[] = []
    if (d.title) lines.push(`# ${d.title}`)
    if (d.publisher) lines.push(`**Source :** ${d.publisher}`)
    if (d.author) lines.push(`**Auteur :** ${d.author}`)
    if (d.url) lines.push(`**URL :** ${d.url}`)
    // Image en markdown — détectable par extractImageUrls (regex .jpg|.png|... ou scontent).
    if (imageUrl) lines.push('', `![image](${imageUrl})`)
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
 * (donc l'extraction n'a rien de réel sur l'entreprise).
 *
 * 3 patterns, du plus précis au plus général :
 *
 * 1. Slogan spécifique d'un grand réseau social (très peu de faux positifs).
 * 2. Phrase explicite d'invitation à se connecter (typique des walls de login).
 * 3. Contenu TRÈS court qui COMMENCE par "log in"/"sign in" ET contient
 *    un mot-clé typique de formulaire (password / mot de passe).
 *
 * Avant ce fix, on déclenchait sur tout contenu < 1500 chars contenant
 * "log into" — ce qui matchait des sites légitimes courts (petite boulangerie
 * avec un footer "log into your account" → faux positif).
 */
export function isLoginPageContent(content: string): boolean {
  const lower = content.toLowerCase().trim()

  // Pattern 1 : slogans spécifiques des réseaux sociaux (très précis)
  if (
    lower.includes('log into facebook') ||
    lower.includes('log in to facebook') ||
    lower.includes('log in to instagram') ||
    lower.includes('sign in to linkedin') ||
    lower.includes('log in to twitter') ||
    lower.includes('sign in to x')
  ) {
    return true
  }

  // Pattern 2 : phrases explicites d'invitation à se connecter
  //             (peu probable dans le contenu d'un vrai site vitrine)
  if (
    /you must (log|sign) in to (continue|view|see|access)/.test(lower) ||
    /please (log|sign) in to (continue|view|see|access)/.test(lower) ||
    /vous devez vous connecter pour/.test(lower)
  ) {
    return true
  }

  // Pattern 3 : contenu TRÈS court qui COMMENCE par "log in" / "sign in"
  //             ET contient un mot-clé typique de formulaire de login
  if (lower.length < 800) {
    const startsWithLogin =
      lower.startsWith('log in') ||
      lower.startsWith('sign in') ||
      lower.startsWith('login') ||
      lower.startsWith('connexion')
    const hasPasswordIndicator =
      lower.includes('password') ||
      lower.includes('mot de passe')
    if (startsWithLogin && hasPasswordIndicator) {
      return true
    }
  }

  return false
}
