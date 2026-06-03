/**
 * SparkScan — helpers de fetch web partagés.
 *
 * Utilisés par enricher.ts (analyse des concurrents) ET young-site-analyzer.ts
 * (analyse du site cible) pour récupérer le contenu d'une home page + jusqu'à
 * 3 pages d'offre/services/produits trouvées via le menu de navigation.
 *
 * Conception business-agnostique : marche sur n'importe quel type d'entreprise
 * (IA, livraison, restauration, conseil, e-commerce, etc.) — les patterns d'URL
 * couvrent les conventions web FR + EN.
 */

const FETCH_TIMEOUT_MS = 8_000
const MAX_OFFER_PAGES = 3

/**
 * Patterns d'URL qui pointent vers une page d'offre / produit / service.
 * Une entreprise détaille rarement TOUTES ses offres sur sa home : il faut
 * aller chercher les sous-pages pour comprendre vraiment ce qu'elle vend.
 */
const OFFER_PATH_PATTERNS = [
  'services',
  'service',
  'produits',
  'produit',
  'products',
  'product',
  'offres',
  'offre',
  'offers',
  'offer',
  'solutions',
  'solution',
  'tarifs',
  'tarif',
  'pricing',
  'prices',
  'price',
  'plans',
  'plan',
  'menu',
  'carte',
  'catalogue',
  'catalog',
  'realisations',
  'realisation',
  'portfolio',
  'cases',
  'case-studies',
  'case-study',
  'expertise',
  'expertises',
  'metier',
  'metiers',
  'savoir-faire',
  'ce-que-nous-faisons',
  'what-we-do',
  'shop',
  'boutique',
  'store',
]

/**
 * Fetch d'une seule page, résilient (retourne null en cas d'erreur).
 * Timeout 8s, User-Agent identifiable, suit les redirections.
 */
export async function fetchPageSafe(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SparkScanBot/1.0; +https://sparkhub.digital-code-growth.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(timeout)
    return null
  }
}

/**
 * Extrait les URLs de pages d'offre/services depuis le HTML d'une home.
 * Parcourt les <a href="..."> du document, garde ceux qui restent sur le
 * même domaine ET dont le chemin matche un pattern d'offre. Renvoie
 * MAX_OFFER_PAGES URLs uniques au maximum.
 */
export function extractOfferLinks(html: string, baseUrl: string): string[] {
  let baseHostname: string
  try {
    baseHostname = new URL(baseUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return []
  }

  const found = new Set<string>()
  const re = /<a[^>]+href=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  let scanCount = 0
  const SCAN_LIMIT = 300

  while ((m = re.exec(html)) !== null && scanCount < SCAN_LIMIT) {
    scanCount += 1
    const href = m[1].trim()
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:')
    )
      continue
    let abs: URL
    try {
      abs = new URL(href, baseUrl)
    } catch {
      continue
    }
    if (abs.hostname.replace(/^www\./, '').toLowerCase() !== baseHostname) continue
    const path = abs.pathname.toLowerCase()
    if (path === '/' || path === '/home' || path === '/accueil') continue
    const matches = OFFER_PATH_PATTERNS.some(
      (p) => path.includes(`/${p}/`) || path.endsWith(`/${p}`) || path === `/${p}`,
    )
    if (!matches) continue
    const cleanUrl = `${abs.origin}${abs.pathname}`
    found.add(cleanUrl)
    if (found.size >= MAX_OFFER_PAGES * 2) break
  }
  return Array.from(found).slice(0, MAX_OFFER_PAGES)
}

/**
 * Helper de haut niveau : depuis une home page HTML, identifie les sous-pages
 * d'offre, les fetch en parallèle, et renvoie un array de fragments enrichis
 * (chacun préfixé par le path de la page pour lisibilité).
 *
 * Coût : 1-3 fetch en parallèle, ~1-3s.
 */
export async function fetchOfferPagesContent(
  homeHtml: string,
  baseUrl: string,
  extractor: (html: string) => string,
): Promise<string[]> {
  const offerUrls = extractOfferLinks(homeHtml, baseUrl)
  if (offerUrls.length === 0) return []

  const results = await Promise.allSettled(offerUrls.map((u) => fetchPageSafe(u)))
  const fragments: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      const content = extractor(r.value)
      if (content) {
        const path = new URL(offerUrls[i]).pathname
        fragments.push(`--- PAGE ${path} ---\n${content.slice(0, 1500)}`)
      }
    }
  })
  return fragments
}

// ============================================================
// MINI-CONTEXTE POUR LE QUALIFIER
// ============================================================
// Le qualifier décide direct/indirect/noise sur N candidats (30-40). On lui
// donne pour chacun un mini-résumé "ce que cette boîte semble vendre" tiré
// de son site (home + 1ère page d'offre détectée). Beaucoup plus précis que
// le simple domaine ou catégorie Google Maps.

export interface CandidateContext {
  /** URL utilisée pour le fetch (normalisée https://). */
  url: string
  /** Résumé ~500-800 chars : title + description + h1/h2 home + offre #1. */
  positioning: string
  /** True si une page d'offre a été trouvée et fetched avec succès. */
  hasOfferPages: boolean
}

/** Extraction minimaliste pour le mini-contexte : title + meta + h1+h2 only. */
function extractMinimalContext(html: string): string {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '').trim()
  const desc = (
    html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i,
    )?.[1] ??
    ''
  ).trim()
  const headings: string[] = []
  const re = /<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && headings.length < 8) {
    const t = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z#0-9]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (t) headings.push(t)
  }
  return [title, desc, headings.join(' | ')].filter(Boolean).join(' — ').slice(0, 1200)
}

/**
 * Fetch léger d'UN candidat : home + 1ère page d'offre détectée.
 * Retourne un mini-positionnement ~500-800 chars consommable par le qualifier.
 * Toujours résolu (jamais throw) — si erreur, retourne positioning vide.
 */
export async function fetchCandidateContext(
  url: string,
): Promise<CandidateContext> {
  const cleanUrl = url.startsWith('http') ? url : `https://${url}`
  const homeHtml = await fetchPageSafe(cleanUrl)
  if (!homeHtml) {
    return { url: cleanUrl, positioning: '', hasOfferPages: false }
  }
  const homeCtx = extractMinimalContext(homeHtml)
  const offerUrls = extractOfferLinks(homeHtml, cleanUrl)
  if (offerUrls.length === 0) {
    return { url: cleanUrl, positioning: homeCtx, hasOfferPages: false }
  }
  // Fetch UNE seule page offre pour rester rapide (la première = souvent /services)
  const offerHtml = await fetchPageSafe(offerUrls[0])
  if (!offerHtml) {
    return { url: cleanUrl, positioning: homeCtx, hasOfferPages: false }
  }
  const offerCtx = extractMinimalContext(offerHtml)
  const offerPath = new URL(offerUrls[0]).pathname
  const combined = `${homeCtx} || OFFRES (${offerPath}): ${offerCtx}`.slice(0, 1500)
  return { url: cleanUrl, positioning: combined, hasOfferPages: true }
}

/**
 * Batch parallèle : récupère le mini-contexte pour N candidats simultanément.
 * Résilient (Promise.allSettled). Coût ~5-10s pour 30 candidats.
 */
export async function fetchCandidatesContextBatch(
  urls: string[],
): Promise<Map<string, CandidateContext>> {
  const map = new Map<string, CandidateContext>()
  if (urls.length === 0) return map
  const results = await Promise.allSettled(
    urls.map((u) => fetchCandidateContext(u)),
  )
  results.forEach((r, i) => {
    const inputUrl = urls[i]
    if (r.status === 'fulfilled') {
      map.set(inputUrl, r.value)
    } else {
      map.set(inputUrl, {
        url: inputUrl,
        positioning: '',
        hasOfferPages: false,
      })
    }
  })
  return map
}
