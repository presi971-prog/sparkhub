/**
 * SparkScan — recherche web complémentaire pour candidats (méthode B V2).
 *
 * Pourquoi : la méthode B basée sur Google Maps est aveugle aux acteurs
 * digital-first qui n'ont pas optimisé leur fiche Google My Business sur les
 * mots-clés sectoriels. Ex : Suity / Arthenxia / LR-Assist sont de vrais
 * concurrents IA en Guadeloupe mais invisibles sur GMaps.
 *
 * Solution : interroger Perplexity sonar (avec web search réel) sur les
 * mêmes catégories sectorielles que celles passées à Apify Maps. Récupérer
 * les domaines cités, les transformer en candidats à passer au qualifier.
 *
 * Coût : ~$0.01-0.02 par scan (4 requêtes Perplexity à ~$0.003 chacune).
 */

import { retryable } from './retry'

const PERPLEXITY_API = 'https://api.perplexity.ai/chat/completions'
const PERPLEXITY_MODEL = 'sonar'
const PERPLEXITY_TIMEOUT_MS = 30_000
const PERPLEXITY_PRICE_PER_M = 1
const MAX_QUERIES = 8 // toutes les catégories sectorielles pour couverture max
const MAX_DOMAINS_PER_QUERY = 12

export interface WebCandidate {
  /** Nom commercial deviné depuis l'URL ou le contenu Perplexity. */
  name: string
  /** URL d'origine (sans path, normalisée https://). */
  website: string
  /** Domaine sans www, lowercase, pour dédup. */
  domain: string
}

export interface WebSearchResult {
  candidates: WebCandidate[]
  cost: number
  /** Nombre de requêtes Perplexity effectuées. */
  queriesCount: number
}

/**
 * Domaines à exclure systématiquement : ce sont des plateformes/agrégateurs,
 * annuaires, médias, sites gouvernementaux — pas des concurrents commerciaux
 * du site cible.
 */
export const DOMAIN_BLOCKLIST = new Set([
  // Encyclopédies / médias sociaux
  'wikipedia.org',
  'fr.wikipedia.org',
  'en.wikipedia.org',
  'youtube.com',
  'www.youtube.com',
  'facebook.com',
  'www.facebook.com',
  'instagram.com',
  'www.instagram.com',
  'linkedin.com',
  'www.linkedin.com',
  'twitter.com',
  'x.com',
  'reddit.com',
  'quora.com',
  'medium.com',
  'github.com',
  'google.com',
  'maps.google.com',
  'goo.gl',
  // Médias
  'forbes.com',
  'lemonde.fr',
  'lefigaro.fr',
  'liberation.fr',
  'francetvinfo.fr',
  'la1ere.francetvinfo.fr',
  'la1ere.francetvinfo.com',
  'karibinfo.com',
  'rci.fm',
  'francetv.fr',
  // Annuaires entreprises
  'pagesjaunes.fr',
  'societe.com',
  'pappers.fr',
  'kompass.com',
  'fr.kompass.com',
  'companieshouse.gov.uk',
  'opencorporates.com',
  'data.gouv.fr',
  'infogreffe.fr',
  'manageo.fr',
  'verif.com',
  'b-reputation.com',
  // Plateformes tech génériques
  'apple.com',
  'microsoft.com',
  // Sites organismes publics / institutionnels
  'francenum.gouv.fr',
  'cgss-guadeloupe.fr',
  'cgss.fr',
  'urssaf.fr',
  'service-public.fr',
  'impots.gouv.fr',
  'pole-emploi.fr',
  'bpifrance.fr',
  'cci.fr',
  'guadeloupe.cci.fr',
  'cma-guadeloupe.fr',
  'cma-france.fr',
  'cm-guadeloupe.fr',
  'regionguadeloupe.fr',
  'iedom.fr',
  'insee.fr',
])

/**
 * Patterns de domaine à exclure : si le domaine matche un de ces patterns,
 * il est rejeté. Plus flexible que la liste exacte (couvre tous les sous-domaines).
 */
export function isInstitutionalDomain(domain: string): boolean {
  // Tout site gouvernemental (gouv.fr, gov.fr)
  if (/\.gouv\.[a-z]{2,}$/.test(domain)) return true
  // Annuaires explicites (annuaire.xxx, annuaires.xxx, *.guadeloupe-numerique.fr type)
  if (/^annuaire[s]?\./.test(domain)) return true
  if (/^pages-?jaunes\./.test(domain)) return true
  // Sous-domaines journalistiques
  if (/\.francetv\./.test(domain)) return true
  return false
}

/**
 * Cherche des candidats concurrents via Perplexity sur les catégories
 * sectorielles. Retourne des candidats dédupliqués par domaine.
 */
export async function findWebCandidates(
  searchCategories: string[],
  zone: string,
  targetDomain: string,
  langue: string = 'fr',
): Promise<WebSearchResult> {
  if (searchCategories.length === 0) {
    return { candidates: [], cost: 0, queriesCount: 0 }
  }

  // Garder les MAX_QUERIES premières catégories (les autres = redondance)
  const queries = searchCategories.slice(0, MAX_QUERIES)
  const langInstr = langue === 'fr' ? 'en français' : `in ${langue}`

  console.log(`[WebSearch] START ${queries.length} requêtes Perplexity sur "${zone}"`)

  const promises = queries.map((cat) => {
    const prompt = `Quelles sont les entreprises, sociétés ou prestataires (sites web officiels) qui proposent "${cat}" en ${zone} ? Liste-les avec leur site web. Réponds ${langInstr}, sois exhaustif, ne te limite pas aux plus connues. N'invente rien : ne cite que des entreprises réellement existantes avec un site officiel.`
    return askPerplexityForCandidates(prompt).catch((err) => {
      console.warn(
        `[WebSearch] erreur sur "${cat}" : ${err instanceof Error ? err.message : err}`,
      )
      return { citations: [], cost: 0 }
    })
  })

  const results = await Promise.all(promises)

  // Fusionner les citations + dédup par domaine
  const byDomain = new Map<string, WebCandidate>()
  let totalCost = 0
  let queriesCount = 0

  results.forEach((r, i) => {
    if (!r) return
    queriesCount += 1
    totalCost += r.cost
    const urls = r.citations.slice(0, MAX_DOMAINS_PER_QUERY)
    urls.forEach((rawUrl: string) => {
      const candidate = urlToCandidate(rawUrl)
      if (!candidate) return
      // Skip blocklist (plateformes / médias / annuaires / institutions)
      if (DOMAIN_BLOCKLIST.has(candidate.domain)) return
      if (isInstitutionalDomain(candidate.domain)) return
      // Skip le target lui-même
      if (candidate.domain === targetDomain.toLowerCase().replace(/^www\./, '')) return
      // Dédup
      if (byDomain.has(candidate.domain)) return
      byDomain.set(candidate.domain, candidate)
    })
    console.log(
      `[WebSearch] query ${i + 1} : ${urls.length} citations → ${byDomain.size} candidats uniques cumulés`,
    )
  })

  const candidates = Array.from(byDomain.values())
  console.log(
    `[WebSearch] DONE total candidats=${candidates.length} cost=$${totalCost.toFixed(4)}`,
  )

  return { candidates, cost: totalCost, queriesCount }
}

/**
 * Une requête Perplexity. Renvoie les citations (URLs sourcées).
 */
async function askPerplexityForCandidates(prompt: string): Promise<{
  citations: string[]
  cost: number
}> {
  return retryable(() => askPerplexityOnce(prompt), 'WebSearch-Perplexity')
}

async function askPerplexityOnce(prompt: string): Promise<{
  citations: string[]
  cost: number
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY env var requise')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(PERPLEXITY_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Perplexity fetch failed: ${msg}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Perplexity HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const body = (await res.json()) as {
    choices: { message: { content: string } }[]
    citations?: string[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const citations = body.citations ?? []
  const cost =
    ((body.usage?.prompt_tokens ?? 0) + (body.usage?.completion_tokens ?? 0)) /
    1_000_000 *
    PERPLEXITY_PRICE_PER_M
  return { citations, cost }
}

/**
 * Transforme une URL brute Perplexity en WebCandidate :
 *   - normalise scheme + hostname
 *   - extrait domaine sans www
 *   - extrait nom commercial deviné depuis le domaine (ex: "Suity Agency" depuis suity.agency)
 * Retourne null si l'URL est invalide ou si c'est un sous-domaine de plateforme.
 */
export function urlToCandidate(rawUrl: string): WebCandidate | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  let url: URL
  try {
    url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
  } catch {
    return null
  }
  const hostname = url.hostname.toLowerCase()
  const domain = hostname.replace(/^www\./, '')
  // Filtre : exclure les IP, les domaines vides
  if (!domain || domain.length < 4 || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) return null
  // Filtre : exclure les sous-domaines de plateformes (ex: linkedin.com/company/X)
  const tldParts = domain.split('.')
  if (tldParts.length >= 2) {
    const root = tldParts.slice(-2).join('.')
    if (DOMAIN_BLOCKLIST.has(root)) return null
  }
  // Filtre : patterns institutionnels (gouv.fr, annuaire.*, etc.)
  if (isInstitutionalDomain(domain)) return null

  // Nom commercial deviné : on prend la partie principale du domaine en
  // capitalisant. "suity.agency" → "Suity", "digital-code-growth.com" → "Digital Code Growth"
  const firstPart = domain.split('.')[0]
  const name = firstPart
    .split(/[-_]+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim()

  return {
    name: name || domain,
    website: `${url.protocol}//${hostname}`,
    domain,
  }
}
