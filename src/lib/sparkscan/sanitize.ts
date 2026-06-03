/**
 * SparkScan — sanitization globale du payload final.
 *
 * Cause racine du bug "Empty or invalid json" (Supabase) et des crashs UI :
 * certaines APIs (Apify, Claude) retournent ou propagent des surrogates UTF-16
 * orphelins (un emoji 4-bytes coupé en deux par un slice ou un truncate).
 * Quand on les met dans JSON.stringify(), le résultat est techniquement valide
 * en JS mais REFUSÉ par PostgREST (jsonb strict) et par certains navigateurs.
 *
 * Ce helper parcourt récursivement un objet/array et nettoie chaque string en
 * supprimant uniquement les surrogates orphelins (les paires valides emoji
 * sont conservées). Sûr sur null/undefined/number/boolean (no-op).
 */

const ORPHAN_SURROGATE_RE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

export function sanitizeString(s: string): string {
  return s.replace(ORPHAN_SURROGATE_RE, '')
}

/**
 * Récursif : strings nettoyées, objets et tableaux traversés en place
 * via une nouvelle structure (immutable). Préserve les types primitifs.
 */
export function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeString(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => deepSanitize(v)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepSanitize(v)
    }
    return out as unknown as T
  }
  return value
}
