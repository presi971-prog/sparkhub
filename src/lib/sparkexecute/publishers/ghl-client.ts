/**
 * Client HTTP centralisé pour les appels GHL (GoHighLevel) depuis SparkExecute.
 *
 * Pourquoi : on a 3+ publishers (ghl-blog, ghl-social, social-accounts) qui
 * tapent tous la même API REST avec les mêmes headers (Bearer PIT + Version
 * 2021-07-28). Au lieu de répéter le boilerplate fetch + gestion d'erreur,
 * on centralise.
 *
 * R0 sécurité : le PIT (Bearer token) n'est JAMAIS loggué, JAMAIS retourné
 * en réponse. On log seulement la méthode + endpoint + status code.
 *
 * Doc officielle GHL : https://marketplace.gohighlevel.com/docs/ghl/
 */

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

/**
 * Récupère le PIT côté serveur. Throw clairement si manquant : on préfère
 * un échec explicite à un 401 mystérieux retourné par GHL.
 */
function getPit(): string {
  const pit = process.env.GHL_DCGAI_PIT
  if (!pit || pit.length === 0) {
    throw new Error(
      "Variable d'environnement GHL_DCGAI_PIT manquante côté serveur. " +
        'Ajoute le PIT GHL DCG AI dans .env.local et redéploie.',
    )
  }
  return pit
}

/** Location ID GHL DCG AI (sub-account utilisé pour SparkExecute). */
export const GHL_DCGAI_LOCATION_ID =
  process.env.GHL_DCGAI_LOCATION_ID || '15W1kS8V6KqgTPhtzaPZ'

/**
 * Erreur enrichie : on garde le status code et la réponse texte brute pour
 * permettre aux publishers de réagir finement (ex : 401 → "connecte ton
 * compte", 429 → "réessaie dans 1 min").
 */
export class GhlApiError extends Error {
  status: number
  bodyText: string
  endpoint: string

  constructor(status: number, endpoint: string, bodyText: string, message?: string) {
    super(message ?? buildErrorMessage(status, endpoint))
    this.name = 'GhlApiError'
    this.status = status
    this.bodyText = bodyText
    this.endpoint = endpoint
  }
}

function buildErrorMessage(status: number, endpoint: string): string {
  // Messages user-friendly (microcopy R0 : langage simple).
  if (status === 401) {
    return 'Le compte GHL n\'est pas autorisé pour cette opération. Vérifie le PIT.'
  }
  if (status === 403) {
    return 'Ce compte GHL n\'a pas les droits pour cette action.'
  }
  if (status === 404) {
    return 'Ressource GHL introuvable. Vérifie l\'endpoint ou l\'ID demandé.'
  }
  if (status === 422) {
    return 'GHL a refusé les données envoyées. Vérifie le format du brouillon.'
  }
  if (status === 429) {
    return 'GHL est saturé. Attends une minute puis réessaie.'
  }
  if (status >= 500) {
    return 'GHL est temporairement indisponible. Réessaie dans un instant.'
  }
  return `Appel GHL ${endpoint} échoué (HTTP ${status}).`
}

/**
 * Wrapper fetch GHL avec auth + Version + JSON par défaut.
 *
 * @param endpoint  Chemin relatif (ex : '/blogs/posts') ou absolu.
 * @param options   Options fetch standards. Si `body` est un objet (et non
 *                  une string), il est sérialisé en JSON automatiquement.
 * @returns         Le JSON parsé de la réponse.
 * @throws          GhlApiError si la réponse n'est pas OK (4xx/5xx).
 */
export async function ghlFetch<T = unknown>(
  endpoint: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const pit = getPit()

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${GHL_API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${pit}`,
    Version: GHL_API_VERSION,
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  let body: BodyInit | undefined
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'string') {
      body = options.body
    } else {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json'
      body = JSON.stringify(options.body)
    }
  }

  const method = options.method ?? 'GET'
  // Log léger : méthode + endpoint relatif + (pas de header Auth bien sûr).
  const safeEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, '')
  console.info(`[GHL] ${method} ${safeEndpoint}`)

  const res = await fetch(url, {
    ...options,
    method,
    headers,
    body,
    // cache no-store : on ne veut JAMAIS de cache HTTP sur GHL (les data sont volatiles).
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.warn(
      `[GHL] ${method} ${safeEndpoint} → HTTP ${res.status}: ${text.slice(0, 200)}`,
    )
    throw new GhlApiError(res.status, safeEndpoint, text)
  }

  // Certaines routes GHL renvoient 204 No Content.
  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as T
  }

  // Fallback : on parse en JSON quand même si ça marche.
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

/** Indique si le PIT GHL est configuré (sans le révéler). */
export function isGhlPitConfigured(): boolean {
  return typeof process.env.GHL_DCGAI_PIT === 'string' && process.env.GHL_DCGAI_PIT.length > 0
}
