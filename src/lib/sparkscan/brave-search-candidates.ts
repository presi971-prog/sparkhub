/**
 * SparkScan — recherche web complémentaire via Brave Search Web API (méthode B V3).
 *
 * Pourquoi (Phase C étape 1) : Perplexity sonar et Apify Maps couvrent déjà
 * beaucoup de candidats, mais chacun a un angle mort :
 *   - Apify Maps rate les acteurs digital-first sans fiche GMB optimisée.
 *   - Perplexity peut halluciner / oublier des acteurs trop récents ou trop
 *     petits pour son index.
 * Brave Search (index web indépendant) sert de tiers de confirmation : il
 * complète la fusion en ajoutant les sites bien indexés en SEO classique.
 *
 * Doc officielle :
 *   - Endpoint : GET https://api.search.brave.com/res/v1/web/search
 *   - Header   : X-Subscription-Token: <key>
 *   - Params utiles : q, count (max 20), country, search_lang, safesearch
 *   - Réponse : body.web.results[] avec { title, url, description, age }
 *
 * Plan Free : ~1 req/sec, ~2000 req/mois. On exécute donc en séquentiel
 * avec un petit pacing pour éviter le rate-limit.
 *
 * Coût attendu : $0 dans le plan Free (1000-2000 req/mois). Au-delà,
 * fallback Search plan = $5 / 1000 req = ~$0.005 par requête.
 */

import { retryable } from './retry'
import {
  DOMAIN_BLOCKLIST,
  isInstitutionalDomain,
  urlToCandidate,
  type WebCandidate,
} from './web-search-candidates'

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search'
const BRAVE_TIMEOUT_MS = 15_000
const MAX_QUERIES = 8
const MAX_RESULTS_PER_QUERY = 20
const PACE_BETWEEN_QUERIES_MS = 1100 // > 1s pour rester sous la limite Free

export interface BraveSearchResult {
  candidates: WebCandidate[]
  cost: number
  queriesCount: number
}

/**
 * Cherche des candidats concurrents via Brave Search Web API.
 *
 * Stratégie : pour chaque catégorie sectorielle on émet une requête
 * "<cat> en <zone>" avec count=20. Les URLs des résultats web sont
 * passées au même `urlToCandidate` que Perplexity (même blocklist,
 * même normalisation, même dédup).
 */
export async function findBraveCandidates(
  searchCategories: string[],
  zone: string,
  targetDomain: string,
  langue: string = 'fr',
): Promise<BraveSearchResult> {
  if (searchCategories.length === 0) {
    return { candidates: [], cost: 0, queriesCount: 0 }
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) {
    console.warn('[BraveSearch] BRAVE_SEARCH_API_KEY absente — skip Brave')
    return { candidates: [], cost: 0, queriesCount: 0 }
  }

  const queries = searchCategories.slice(0, MAX_QUERIES)
  const langPrefix = langue === 'fr' ? 'en' : 'in'

  console.log(`[BraveSearch] START ${queries.length} requêtes Brave sur "${zone}"`)

  const byDomain = new Map<string, WebCandidate>()
  const targetNormalized = targetDomain.toLowerCase().replace(/^www\./, '')
  let totalCost = 0
  let queriesCount = 0

  for (let i = 0; i < queries.length; i++) {
    const cat = queries[i]
    const q = `${cat} ${langPrefix} ${zone}`
    try {
      const r = await retryable(
        () => callBraveOnce(q, apiKey, langue),
        'BraveSearch',
      )
      queriesCount += 1
      totalCost += r.cost
      let added = 0
      for (const result of r.results) {
        const candidate = urlToCandidate(result.url)
        if (!candidate) continue
        if (DOMAIN_BLOCKLIST.has(candidate.domain)) continue
        if (isInstitutionalDomain(candidate.domain)) continue
        if (candidate.domain === targetNormalized) continue
        if (byDomain.has(candidate.domain)) continue
        byDomain.set(candidate.domain, candidate)
        added += 1
      }
      console.log(
        `[BraveSearch] query ${i + 1}/${queries.length} "${cat}" : ${r.results.length} résultats → +${added} candidats (cumul ${byDomain.size})`,
      )
    } catch (err) {
      console.warn(
        `[BraveSearch] erreur sur "${cat}" : ${err instanceof Error ? err.message : err}`,
      )
    }
    // Pacing entre requêtes pour respecter le plan Free (1 req/sec).
    if (i < queries.length - 1) {
      await sleep(PACE_BETWEEN_QUERIES_MS)
    }
  }

  const candidates = Array.from(byDomain.values())
  console.log(
    `[BraveSearch] DONE total candidats=${candidates.length} cost=$${totalCost.toFixed(4)} (${queriesCount}/${queries.length} requêtes OK)`,
  )

  return { candidates, cost: totalCost, queriesCount }
}

interface BraveRawResult {
  title: string
  url: string
  description?: string
  age?: string
}

interface BraveResponse {
  web?: { results?: BraveRawResult[] }
}

/**
 * Une requête Brave Search Web API. Renvoie les URLs web.results[].url.
 * Le coût est zéro sur le plan Free ; on garde le champ pour homogénéité
 * future si on bascule sur le plan payant.
 */
async function callBraveOnce(
  query: string,
  apiKey: string,
  langue: string,
): Promise<{ results: BraveRawResult[]; cost: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BRAVE_TIMEOUT_MS)

  const params = new URLSearchParams({
    q: query,
    count: String(MAX_RESULTS_PER_QUERY),
    safesearch: 'moderate',
    search_lang: langue,
    country: 'FR',
  })

  let res: Response
  try {
    res = await fetch(`${BRAVE_API}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-Subscription-Token': apiKey,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Brave fetch failed: ${msg}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Brave HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const body = (await res.json()) as BraveResponse
  const results = body.web?.results ?? []
  return { results, cost: 0 }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
