/**
 * SparkScan — client Apify Google Maps Scraper (méthode B, sites jeunes).
 *
 * Actor : compass~crawler-google-places
 * Endpoint sync : POST /v2/acts/compass~crawler-google-places/run-sync-get-dataset-items
 * Tarif : $2.10 / 1000 places (Apify Starter $29/mois inclut un crédit mensuel).
 * Doc : https://apify.com/compass/crawler-google-places/api
 */

import { retryable } from './retry'
import { runApifyActorAsync } from './apify-async'

const ACTOR_ID = 'compass~crawler-google-places'
const PRICE_PER_1000_PLACES_USD = 2.1
// Plafond global de l'attente côté code (poll inclus).
const APIFY_MAX_WAIT_MS = 600_000 // 10 min

function apifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN env var requise')
  return token
}

interface RawApifyPlace {
  title?: string
  address?: string
  street?: string
  city?: string
  neighborhood?: string
  countryCode?: string
  website?: string
  phone?: string
  phoneUnformatted?: string
  totalScore?: number
  reviewsCount?: number
  categoryName?: string
  categories?: string[]
  location?: { lat?: number; lng?: number }
  url?: string
  placeId?: string
  searchString?: string
  searchPageUrl?: string
  permanentlyClosed?: boolean
  temporarilyClosed?: boolean
}

export interface MapsPlace {
  placeId: string | null
  name: string
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  reviews: number | null
  category: string | null
  lat: number | null
  lng: number | null
  googleUrl: string | null
  /** Requête(s) qui ont fait remonter ce place (pour scoring). */
  matchedQueries: string[]
  /** Position moyenne dans les SERP des requêtes matchées (1 = top). */
  avgPosition: number | null
  /** Nombre de fois où le place est apparu (= force de pertinence). */
  occurrences: number
  /**
   * Source de découverte : 'gmaps' (fiche Google Maps trouvée via Apify) ou
   * 'web' (acteur trouvé via Perplexity Web Search, sans fiche GMaps).
   * Méthode B V2 : on fusionne les 2 sources avant le qualifier.
   * Défaut 'gmaps' pour les places venant directement d'Apify.
   */
  source?: 'gmaps' | 'web'
}

/**
 * Run the Apify Google Maps actor synchronously with multiple search queries.
 * Consolidates results across queries : deduplicates by placeId (fallback name+address),
 * tracks how many queries returned each place and their average rank.
 *
 * @param queries    Search strings (e.g. ["ostéopathe Guadeloupe", "kiné Pointe-à-Pitre"]).
 * @param locationQuery  Free-form location for Google Maps (e.g. "Guadeloupe, France").
 * @param maxPerQuery   Max places returned per search string.
 * @param language       Google Maps interface language ("fr", "en", "es").
 */
export async function searchGoogleMaps(
  queries: string[],
  locationQuery: string,
  maxPerQuery: number = 20,
  language: string = 'fr',
): Promise<{ places: MapsPlace[]; cost: number; rawCount: number }> {
  if (queries.length === 0) {
    return { places: [], cost: 0, rawCount: 0 }
  }

  const input = {
    searchStringsArray: queries,
    locationQuery,
    maxCrawledPlacesPerSearch: maxPerQuery,
    language,
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
  }

  console.log(
    `[Apify] START ${ACTOR_ID} queries=${queries.length} location="${locationQuery}" maxPerQuery=${maxPerQuery}`,
  )

  // RETRY : 1 retry après 2s en cas d'erreur transitoire (fetch failed, 5xx).
  // Mode ASYNC : POST run → poll status → GET dataset. Évite les sockets longs
  // qui timeout côté undici (UND_ERR_SOCKET ~60s).
  const raw = await retryable(
    () =>
      runApifyActorAsync<RawApifyPlace>(ACTOR_ID, input, {
        maxWaitMs: APIFY_MAX_WAIT_MS,
        label: 'Apify-Maps',
      }),
    'Apify-Maps',
  )
  console.log(`[Apify] RAW items=${raw.length}`)

  const consolidated = consolidatePlaces(raw)
  const cost = (raw.length / 1000) * PRICE_PER_1000_PLACES_USD

  console.log(
    `[Apify] CONSOLIDATED unique_places=${consolidated.length} cost=$${cost.toFixed(4)}`,
  )

  return { places: consolidated, cost, rawCount: raw.length }
}

/**
 * Dedupe + score places returned across multiple queries.
 * Same place returned by multiple queries = stronger competitor signal.
 */
function consolidatePlaces(raw: RawApifyPlace[]): MapsPlace[] {
  const map = new Map<
    string,
    { place: MapsPlace; positions: number[] }
  >()

  raw.forEach((p, idxInBatch) => {
    if (p.permanentlyClosed || p.temporarilyClosed) return
    if (!p.title) return

    const key =
      p.placeId ??
      `${p.title.toLowerCase()}|${(p.address ?? '').toLowerCase()}`

    const position = idxInBatch + 1
    const existing = map.get(key)

    if (existing) {
      if (p.searchString && !existing.place.matchedQueries.includes(p.searchString)) {
        existing.place.matchedQueries.push(p.searchString)
      }
      existing.place.occurrences += 1
      existing.positions.push(position)
    } else {
      map.set(key, {
        place: {
          placeId: p.placeId ?? null,
          name: p.title,
          address: p.address ?? null,
          phone: p.phone ?? p.phoneUnformatted ?? null,
          website: p.website ?? null,
          rating: p.totalScore ?? null,
          reviews: p.reviewsCount ?? null,
          category: p.categoryName ?? p.categories?.[0] ?? null,
          lat: p.location?.lat ?? null,
          lng: p.location?.lng ?? null,
          googleUrl: p.url ?? null,
          matchedQueries: p.searchString ? [p.searchString] : [],
          avgPosition: null,
          occurrences: 1,
        },
        positions: [position],
      })
    }
  })

  return Array.from(map.values())
    .map(({ place, positions }) => ({
      ...place,
      avgPosition:
        positions.reduce((a, b) => a + b, 0) / positions.length,
    }))
    .sort((a, b) => {
      // Tri : 1. plus d'occurrences = plus pertinent, 2. meilleure position moyenne
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences
      return (a.avgPosition ?? 999) - (b.avgPosition ?? 999)
    })
}
