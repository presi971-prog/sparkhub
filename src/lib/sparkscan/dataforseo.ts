/**
 * SparkScan — client DataForSEO API.
 *
 * Endpoints utilisés en V0 :
 *  - POST /v3/dataforseo_labs/google/ranked_keywords/live (détection maturité site)
 *  - POST /v3/dataforseo_labs/google/competitors_domain/live (méthode A : concurrents)
 *
 * Auth : Basic Auth (login:password encodés base64).
 * Doc officielle : https://docs.dataforseo.com/v3/
 *
 * BUG CORRIGÉ 24/05/2026 :
 *  - Le payload est un **array direct** `[{...}]`, pas `{tasks: [{...}]}` (le wrapper provoquait "POST Data Is Invalid").
 *  - Les endpoints Labs n'acceptent que `location_code` (numérique), pas `location_name`.
 *    DataForSEO Labs ne supporte que des codes pays (pas de Guadeloupe → fallback France 2250).
 *  - Tarifs : Labs ~$0.01/tâche + $0.0001/item.
 */

const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'

function authHeader(): string {
  const basic = process.env.DATAFORSEO_BASIC_AUTH
  if (basic) return `Basic ${basic}`
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) {
    throw new Error(
      'DATAFORSEO_BASIC_AUTH ou DATAFORSEO_LOGIN+PASSWORD env var requis',
    )
  }
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

interface DataForSEOTask<T> {
  status_code: number
  status_message: string
  cost?: number
  result?: T[] | null
}

interface DataForSEOResponse<T> {
  status_code: number
  status_message: string
  tasks?: DataForSEOTask<T>[]
  cost?: number
}

/**
 * POST a Labs/SERP request. The body MUST be an array of task objects
 * (NOT wrapped in `{tasks:[...]}` which triggers 40503 "POST Data Is Invalid").
 *
 * Has a 20-second hard timeout to avoid silent hangs.
 */
async function dataforseoFetch<T>(
  path: string,
  tasks: object[],
): Promise<DataForSEOResponse<T>> {
  const url = `${DATAFORSEO_BASE}${path}`
  console.log(`[DataForSEO] FETCH ${url} payload=${JSON.stringify(tasks).slice(0, 200)}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => {
    console.error(`[DataForSEO] TIMEOUT after 20s on ${path}`)
    controller.abort()
  }, 20_000)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader(),
      },
      body: JSON.stringify(tasks),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[DataForSEO] FETCH FAILED on ${path}: ${msg}`)
    throw new Error(`DataForSEO fetch failed: ${msg}`)
  }
  clearTimeout(timeout)
  console.log(`[DataForSEO] RESPONSE ${res.status} ${res.statusText} on ${path}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DataForSEO HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  let json: DataForSEOResponse<T>
  try {
    json = (await res.json()) as DataForSEOResponse<T>
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[DataForSEO] JSON PARSE FAILED on ${path}: ${msg}`)
    throw new Error(`DataForSEO JSON parse failed: ${msg}`)
  }
  console.log(`[DataForSEO] PARSED global_status=${json.status_code} task_count=${json.tasks?.length} task[0]_status=${json.tasks?.[0]?.status_code}`)

  if (json.status_code !== 20000) {
    throw new Error(
      `DataForSEO API ${json.status_code}: ${json.status_message}`,
    )
  }
  // Check first task status too (API can return 20000 globally but task-level error)
  const firstTask = json.tasks?.[0]
  if (firstTask && firstTask.status_code !== 20000) {
    throw new Error(
      `DataForSEO task ${firstTask.status_code}: ${firstTask.status_message}`,
    )
  }
  return json
}

/**
 * Strip protocol + www to get bare domain (required by Labs endpoints).
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
  }
}

// ------------------------------------------------------------
// Zone → location_code mapping
// DataForSEO Labs ne supporte que des codes pays.
// Les régions/départements/villes ne sont pas reconnus à ce niveau.
// V0 : on fallback à France pour Guadeloupe/DOM-TOM/métropole.
// ------------------------------------------------------------

const ZONE_TO_LOCATION_CODE: Record<string, number> = {
  // France et territoires (DataForSEO Labs = niveau pays uniquement → tout → 2250)
  france: 2250,
  guadeloupe: 2250,
  martinique: 2250,
  guyane: 2250,
  'la reunion': 2250,
  reunion: 2250,
  mayotte: 2250,
  corse: 2250,
  // Belgique
  belgique: 2056,
  belgium: 2056,
  // Suisse
  suisse: 2756,
  switzerland: 2756,
  // Canada
  canada: 2124,
  quebec: 2124,
  // Afrique francophone
  maroc: 2504,
  morocco: 2504,
  algerie: 2012,
  algeria: 2012,
  tunisie: 2788,
  tunisia: 2788,
  senegal: 2686,
  'cote divoire': 2384,
  'cote d ivoire': 2384,
  // English markets
  'royaume-uni': 2826,
  'royaume uni': 2826,
  'united kingdom': 2826,
  uk: 2826,
  usa: 2840,
  'etats-unis': 2840,
  'etats unis': 2840,
  'united states': 2840,
  ireland: 2372,
  irlande: 2372,
  // Spanish markets
  espagne: 2724,
  spain: 2724,
  mexique: 2484,
  mexico: 2484,
  // Portuguese
  portugal: 2620,
  bresil: 2076,
  brasil: 2076,
  brazil: 2076,
}

/**
 * Map a free-form zone string to a DataForSEO location_code.
 * Falls back to France (2250) for unknown zones since this tool is FR-first.
 */
export function mapZoneToLocationCode(zone: string): number {
  const normalized = zone
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
  return ZONE_TO_LOCATION_CODE[normalized] ?? 2250
}

// ------------------------------------------------------------
// Endpoint 1 : Ranked Keywords (count for maturity detection)
// ------------------------------------------------------------

interface RankedKeywordsResult {
  total_count?: number
  items_count?: number
  metrics?: {
    organic?: { count?: number }
  }
}

/**
 * Count how many keywords this domain ranks for in Google's top 20.
 * Used to determine maturity : >=10 → 'mature', <10 → 'young'.
 */
export async function countRankedKeywordsTop20(
  domain: string,
  zone: string,
  languageCode: string,
): Promise<{ count: number; cost: number }> {
  const tasks = [
    {
      target: domain,
      location_code: mapZoneToLocationCode(zone),
      language_code: languageCode,
      filters: [
        ['ranked_serp_element.serp_item.rank_group', '<=', 20],
      ],
      limit: 1, // juste compter
    },
  ]
  const json = await dataforseoFetch<RankedKeywordsResult>(
    '/dataforseo_labs/google/ranked_keywords/live',
    tasks,
  )
  const task = json.tasks?.[0]
  const result = task?.result?.[0]
  const count =
    result?.total_count ?? result?.metrics?.organic?.count ?? 0
  return { count, cost: task?.cost ?? 0 }
}

// ------------------------------------------------------------
// Endpoint 1bis : Ranked Keywords (liste complète pour le rank tracking)
// ------------------------------------------------------------

interface RankedKeywordItemRaw {
  keyword_data?: {
    keyword?: string
    keyword_info?: { search_volume?: number }
  }
  ranked_serp_element?: {
    serp_item?: {
      rank_group?: number
      url?: string
    }
  }
}

export interface RankedKeyword {
  keyword: string
  /** Position Google (rank_group, 1 = première place). */
  position: number
  search_volume: number | null
  ranked_url: string | null
}

/**
 * List the keywords this domain ranks for in Google's top 20, with positions.
 * Same endpoint as countRankedKeywordsTop20 but items are read AND returned,
 * to be persisted in sparkscan_keywords (rank tracking scan après scan).
 */
export async function fetchRankedKeywordsTop20(
  domain: string,
  zone: string,
  languageCode: string,
  limit: number = 100,
): Promise<{ keywords: RankedKeyword[]; cost: number }> {
  const tasks = [
    {
      target: domain,
      location_code: mapZoneToLocationCode(zone),
      language_code: languageCode,
      filters: [
        ['ranked_serp_element.serp_item.rank_group', '<=', 20],
      ],
      order_by: ['ranked_serp_element.serp_item.rank_group,asc'],
      limit,
    },
  ]
  const json = await dataforseoFetch<{ items?: RankedKeywordItemRaw[] }>(
    '/dataforseo_labs/google/ranked_keywords/live',
    tasks,
  )
  const task = json.tasks?.[0]
  const items = task?.result?.[0]?.items ?? []
  const seen = new Set<string>()
  const keywords: RankedKeyword[] = []
  for (const it of items) {
    const keyword = it.keyword_data?.keyword?.trim()
    const position = it.ranked_serp_element?.serp_item?.rank_group
    if (!keyword || !position || seen.has(keyword)) continue
    seen.add(keyword)
    keywords.push({
      keyword,
      position,
      search_volume: it.keyword_data?.keyword_info?.search_volume ?? null,
      ranked_url: it.ranked_serp_element?.serp_item?.url ?? null,
    })
  }
  return { keywords, cost: task?.cost ?? 0 }
}

// ------------------------------------------------------------
// Endpoint 2 : Competitors Domain (method A)
// ------------------------------------------------------------

interface CompetitorRaw {
  domain: string
  avg_position?: number
  intersections?: number
  full_domain_metrics?: {
    organic?: { etv?: number; count?: number }
  }
  metrics?: {
    organic?: { etv?: number; count?: number }
  }
}

export interface Competitor {
  rank: number
  domain: string
  avg_position: number | null
  intersections: number
  estimated_traffic: number | null
  shared_keywords: number | null
}

/**
 * Find competitor domains sharing top keywords with the target.
 * Method A : DataForSEO Labs Competitors Domain.
 */
export async function findCompetitorsByDomain(
  domain: string,
  zone: string,
  languageCode: string,
  limit: number = 10,
): Promise<{ competitors: Competitor[]; cost: number }> {
  const tasks = [
    {
      target: domain,
      location_code: mapZoneToLocationCode(zone),
      language_code: languageCode,
      item_types: ['organic'],
      limit,
      order_by: ['metrics.organic.etv,desc'],
    },
  ]
  const json = await dataforseoFetch<{ items?: CompetitorRaw[] }>(
    '/dataforseo_labs/google/competitors_domain/live',
    tasks,
  )
  const task = json.tasks?.[0]
  const firstResult = task?.result?.[0]
  // DataForSEO Labs returns items either nested in result[0].items or directly in result[]
  const items: CompetitorRaw[] = Array.isArray(firstResult)
    ? (firstResult as CompetitorRaw[])
    : (firstResult?.items ?? [])
  const competitors: Competitor[] = items.map((it, i) => ({
    rank: i + 1,
    domain: it.domain,
    avg_position: it.avg_position ?? null,
    intersections: it.intersections ?? 0,
    estimated_traffic:
      it.full_domain_metrics?.organic?.etv ?? null,
    shared_keywords: it.metrics?.organic?.count ?? null,
  }))
  return { competitors, cost: task?.cost ?? 0 }
}
