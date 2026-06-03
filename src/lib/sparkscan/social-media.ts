/**
 * SparkScan — client Apify pour les réseaux sociaux Facebook + Instagram.
 *
 * Pour chaque concurrent ayant une URL FB/IG (extraite par enricher.ts), on
 * appelle 3 actors Apify en parallèle :
 *
 *   - apify/instagram-scraper         → profil + 5 derniers posts en 1 call
 *                                       ($1.50 / 1000 résultats)
 *   - apify/facebook-pages-scraper    → infos page FB (followers, likes, contact)
 *                                       ($6.60 / 1000 pages = $0.0066/page)
 *   - apify/facebook-posts-scraper    → 5 derniers posts FB
 *                                       ($2.00 / 1000 posts = $0.002/post)
 *
 * Sources tarifs (lus le 27/05/2026) :
 *   - https://apify.com/apify/instagram-scraper
 *   - https://apify.com/apify/facebook-pages-scraper
 *   - https://apify.com/apify/facebook-posts-scraper
 *
 * Stratégie : tous les actors sont call EN PARALLÈLE via Promise.allSettled.
 * Si un actor saturé/timeout, on continue avec les autres et on log un warning.
 */

import { retryable } from './retry'
import { runApifyActorAsync } from './apify-async'

const APIFY_MAX_WAIT_MS = 300_000 // 5 min max par actor RS
const POSTS_PER_COMPETITOR = 5

const ACTOR_IG = 'apify~instagram-scraper'
const ACTOR_FB_PAGE = 'apify~facebook-pages-scraper'
const ACTOR_FB_POSTS = 'apify~facebook-posts-scraper'

const PRICE_IG_RESULT_USD = 0.0015
const PRICE_FB_PAGE_USD = 0.0066
const PRICE_FB_POST_USD = 0.002

function apifyToken(): string {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN env var requise')
  return token
}

/**
 * Retire les surrogates UTF-16 orphelins (high sans low, low sans high) qui
 * cassent la sérialisation JSON envoyée à Claude API ("no low surrogate in
 * string") et l'UPDATE Supabase ("Empty or invalid json"). Conserve les paires
 * surrogates valides (emojis multi-codepoints).
 */
function safeStr(s: string | null | undefined, max = 500): string {
  if (!s) return ''
  return s
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .slice(0, max)
}

/**
 * Cast safe en number. Apify renvoie parfois les nombres en string (ex: rating
 * "4.5", followers "1.2K"). On les normalise pour éviter les plantages côté UI
 * (.toFixed, .toLocaleString) et garantir le typage `number | null` strict.
 */
function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    // "1.2K" → 1200 ; "1.5M" → 1500000 ; "4,5" → 4.5
    const cleaned = v.trim().replace(/,/g, '.')
    const mK = cleaned.match(/^([\d.]+)\s*[Kk]$/)
    if (mK) return Math.round(parseFloat(mK[1]) * 1000)
    const mM = cleaned.match(/^([\d.]+)\s*[Mm]$/)
    if (mM) return Math.round(parseFloat(mM[1]) * 1_000_000)
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

// --- Types ---

export interface SocialInput {
  /** Identifiant stable du concurrent (clé qualifier). */
  key: string
  /** URL Facebook (https://www.facebook.com/handle) ou null. */
  facebook: string | null
  /** URL Instagram (https://www.instagram.com/handle/) ou null. */
  instagram: string | null
}

export interface FacebookPost {
  text: string
  url: string | null
  date: string | null
  likes: number | null
  comments: number | null
  shares: number | null
}

export interface FacebookPageData {
  url: string
  name: string | null
  followers: number | null
  likes: number | null
  rating: number | null
  description: string | null
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  posts: FacebookPost[]
}

export interface InstagramPost {
  caption: string
  url: string | null
  date: string | null
  likes: number | null
  comments: number | null
  imageUrl: string | null
}

export interface InstagramData {
  url: string
  username: string | null
  fullName: string | null
  biography: string | null
  followers: number | null
  following: number | null
  verified: boolean | null
  postsCount: number | null
  posts: InstagramPost[]
}

export interface SocialMediaData {
  facebook: FacebookPageData | null
  instagram: InstagramData | null
}

export interface FetchSocialOutput {
  /** Map key (clé du concurrent) → data RS récoltée. */
  byKey: Record<string, SocialMediaData>
  /** Coût total Apify USD. */
  cost: number
  /** Warnings non-fatals (Apify saturé, page introuvable, etc.). */
  warnings: string[]
}

// --- Helper Apify générique ---

async function callApifyActor<T = unknown>(
  actorSlug: string,
  input: object,
): Promise<T[]> {
  // Mode ASYNC obligatoire (cf. apify-async.ts) — sinon undici timeout à 60s.
  return retryable(
    () =>
      runApifyActorAsync<T>(actorSlug, input, {
        maxWaitMs: APIFY_MAX_WAIT_MS,
        label: `social/${actorSlug.split('~').pop() ?? actorSlug}`,
      }),
    `Apify-${actorSlug}`,
  )
}

// --- Instagram (1 call → profil + 5 posts) ---

interface RawInstagramItem {
  username?: string
  fullName?: string
  biography?: string
  followersCount?: number
  followsCount?: number
  verified?: boolean
  postsCount?: number
  url?: string
  latestPosts?: Array<{
    caption?: string
    url?: string
    timestamp?: string
    likesCount?: number
    commentsCount?: number
    displayUrl?: string
  }>
  // Format alternatif quand resultsType=posts : items individuels
  caption?: string
  timestamp?: string
  likesCount?: number
  commentsCount?: number
  displayUrl?: string
}

/** Extrait le username (lowercase) d'une URL Instagram. */
function igHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([^/?#]+)/i)
  return m ? m[1].toLowerCase().replace(/\/+$/, '') : null
}

/** Extrait le handle (lowercase) d'une URL Facebook. */
function fbHandle(url: string): string | null {
  const m = url.match(/facebook\.com\/([^/?#]+)/i)
  return m ? m[1].toLowerCase().replace(/\/+$/, '') : null
}

/**
 * Récupère tous les profils Instagram en UN SEUL run Apify.
 * Retourne une Map (URL d'entrée → data). Profils non trouvés = absents.
 */
async function fetchInstagramBatch(
  urls: string[],
): Promise<Map<string, InstagramData>> {
  const map = new Map<string, InstagramData>()
  if (urls.length === 0) return map

  const raw = await callApifyActor<RawInstagramItem>(ACTOR_IG, {
    directUrls: urls,
    resultsType: 'details',
    resultsLimit: POSTS_PER_COMPETITOR,
    addParentData: false,
  })

  // Construire un index handle → URL d'entrée pour le matching.
  const urlByHandle = new Map<string, string>()
  for (const u of urls) {
    const h = igHandle(u)
    if (h) urlByHandle.set(h, u)
  }

  for (const profile of raw) {
    if (!profile.username) continue
    const matchUrl = urlByHandle.get(profile.username.toLowerCase())
    if (!matchUrl) continue
    const posts: InstagramPost[] = (profile.latestPosts ?? [])
      .slice(0, POSTS_PER_COMPETITOR)
      .map((p) => ({
        caption: safeStr(p.caption),
        url: p.url ?? null,
        date: p.timestamp ?? null,
        likes: toNum(p.likesCount),
        comments: toNum(p.commentsCount),
        imageUrl: p.displayUrl ?? null,
      }))
    map.set(matchUrl, {
      url: matchUrl,
      username: safeStr(profile.username, 100) || null,
      fullName: safeStr(profile.fullName, 200) || null,
      biography: safeStr(profile.biography) || null,
      followers: toNum(profile.followersCount),
      following: toNum(profile.followsCount),
      verified: profile.verified ?? null,
      postsCount: toNum(profile.postsCount),
      posts,
    })
  }
  return map
}

// --- Facebook Page (1 call → infos page) ---

interface RawFacebookPageItem {
  pageName?: string
  title?: string
  /** URL canonique de la page (présent sur les pages trouvées). */
  pageUrl?: string
  /** URL d'origine envoyée à l'actor (présent sur les pages trouvées). */
  facebookUrl?: string
  /** Présent uniquement sur les items d'erreur (404, page introuvable). */
  url?: string
  followers?: number
  likes?: number
  rating?: number
  intro?: string
  about?: string
  pageDescription?: string
  email?: string
  phone?: string
  website?: string
  categories?: string[]
}

/**
 * Récupère toutes les pages FB en UN SEUL run Apify.
 * Match par handle (https://www.facebook.com/HANDLE).
 */
async function fetchFacebookPagesBatch(
  urls: string[],
): Promise<Map<string, Partial<FacebookPageData>>> {
  const map = new Map<string, Partial<FacebookPageData>>()
  if (urls.length === 0) return map

  const raw = await callApifyActor<RawFacebookPageItem>(ACTOR_FB_PAGE, {
    startUrls: urls.map((url) => ({ url })),
  })

  const urlByHandle = new Map<string, string>()
  for (const u of urls) {
    const h = fbHandle(u)
    if (h) urlByHandle.set(h, u)
  }

  for (const p of raw) {
    // pageUrl/facebookUrl sur les pages trouvées, url sur les erreurs.
    const itemUrl = p.pageUrl ?? p.facebookUrl ?? p.url ?? ''
    const h = fbHandle(itemUrl)
    const matchUrl = h ? urlByHandle.get(h) : undefined
    if (!matchUrl) continue
    map.set(matchUrl, {
      url: matchUrl,
      name: safeStr(p.pageName ?? p.title, 200) || null,
      followers: toNum(p.followers),
      likes: toNum(p.likes),
      rating: toNum(p.rating),
      description: safeStr(p.intro ?? p.about ?? p.pageDescription) || null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      website: p.website ?? null,
      category: safeStr(p.categories?.[0], 100) || null,
    })
  }
  return map
}

// --- Facebook Posts (1 call → 5 derniers posts) ---

interface RawFacebookPostItem {
  text?: string
  /** URL du post. */
  url?: string
  /** URL d'origine envoyée à l'actor — champ DÉDIÉ au matching. */
  inputUrl?: string
  /** URL canonique de la page d'origine. */
  facebookUrl?: string
  pageUrl?: string
  pageName?: string
  time?: string
  timestamp?: string
  likes?: number
  comments?: number
  shares?: number
  user?: { profileUrl?: string }
}

/**
 * Récupère tous les posts FB en UN SEUL run Apify.
 * Match chaque post à sa page d'origine par handle.
 * Limite à POSTS_PER_COMPETITOR posts par page (slice après groupage).
 */
async function fetchFacebookPostsBatch(
  urls: string[],
): Promise<Map<string, FacebookPost[]>> {
  const map = new Map<string, FacebookPost[]>()
  if (urls.length === 0) return map

  // Demander assez de posts pour couvrir TOUTES les pages d'entrée.
  // resultsLimit peut être global ; on prend une marge généreuse.
  const totalLimit = urls.length * POSTS_PER_COMPETITOR

  const raw = await callApifyActor<RawFacebookPostItem>(ACTOR_FB_POSTS, {
    startUrls: urls.map((url) => ({ url })),
    resultsLimit: totalLimit,
  })

  const urlByHandle = new Map<string, string>()
  for (const u of urls) {
    const h = fbHandle(u)
    if (h) urlByHandle.set(h, u)
  }

  // Grouper les posts par URL d'entrée.
  // inputUrl est le champ DÉDIÉ par Apify pour retrouver l'URL envoyée.
  const postsByUrl = new Map<string, FacebookPost[]>()
  for (const p of raw) {
    const srcUrl =
      p.inputUrl ?? p.facebookUrl ?? p.pageUrl ?? p.user?.profileUrl ?? p.url ?? ''
    const h = fbHandle(srcUrl)
    const matchUrl = h ? urlByHandle.get(h) : undefined
    if (!matchUrl) continue
    const post: FacebookPost = {
      text: safeStr(p.text),
      url: p.url ?? null,
      date: p.time ?? p.timestamp ?? null,
      likes: toNum(p.likes),
      comments: toNum(p.comments),
      shares: toNum(p.shares),
    }
    if (!postsByUrl.has(matchUrl)) postsByUrl.set(matchUrl, [])
    postsByUrl.get(matchUrl)!.push(post)
  }

  // Limiter à POSTS_PER_COMPETITOR par page
  for (const [url, posts] of postsByUrl) {
    map.set(url, posts.slice(0, POSTS_PER_COMPETITOR))
  }
  return map
}

// --- Fonction de haut niveau ---

/**
 * Récupère les données Facebook + Instagram pour une liste de concurrents.
 *
 * Mode BATCH : un seul run Apify par actor (3 runs au total au lieu de N×3).
 * Évite la saturation du quota mémoire Apify Starter (32 GB simultané) et
 * réduit le temps total. Tous les concurrents sans FB/IG sont ignorés.
 *
 * Coût estimé pour 8 concurrents avec FB+IG :
 *   - IG : 8 profils × $1.5/1k + ~40 posts × $1.5/1k = ~$0.07
 *   - FB pages : 8 × $0.0066 = ~$0.05
 *   - FB posts : ~40 × $0.002 = ~$0.08
 *   - Total : ~$0.20
 */
export async function fetchSocialMedia(
  competitors: SocialInput[],
): Promise<FetchSocialOutput> {
  const withSocial = competitors.filter((c) => c.facebook || c.instagram)
  console.log(
    `[Social] START total=${competitors.length} withSocial=${withSocial.length}`,
  )

  if (withSocial.length === 0) {
    return { byKey: {}, cost: 0, warnings: [] }
  }

  // Collecte les URLs uniques par réseau (en gardant le lien avec les keys)
  const igUrls = [...new Set(withSocial.map((c) => c.instagram).filter(Boolean) as string[])]
  const fbUrls = [...new Set(withSocial.map((c) => c.facebook).filter(Boolean) as string[])]

  const warnings: string[] = []
  let igMap = new Map<string, InstagramData>()
  let fbPagesMap = new Map<string, Partial<FacebookPageData>>()
  let fbPostsMap = new Map<string, FacebookPost[]>()

  // 3 runs Apify en parallèle
  await Promise.allSettled([
    (async () => {
      if (igUrls.length === 0) return
      try {
        igMap = await fetchInstagramBatch(igUrls)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        warnings.push(`Instagram batch non récupéré (${igUrls.length} profils) : ${msg.slice(0, 200)}`)
      }
    })(),
    (async () => {
      if (fbUrls.length === 0) return
      try {
        fbPagesMap = await fetchFacebookPagesBatch(fbUrls)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        warnings.push(`Facebook pages batch non récupéré (${fbUrls.length} pages) : ${msg.slice(0, 200)}`)
      }
    })(),
    (async () => {
      if (fbUrls.length === 0) return
      try {
        fbPostsMap = await fetchFacebookPostsBatch(fbUrls)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        warnings.push(`Facebook posts batch non récupéré (${fbUrls.length} pages) : ${msg.slice(0, 200)}`)
      }
    })(),
  ])

  // Calculer le coût réel à partir de ce qui a été récupéré
  let totalCost = 0
  totalCost += igMap.size * (1 + POSTS_PER_COMPETITOR) * PRICE_IG_RESULT_USD
  totalCost += fbPagesMap.size * PRICE_FB_PAGE_USD
  for (const posts of fbPostsMap.values()) {
    totalCost += posts.length * PRICE_FB_POST_USD
  }

  // Reconstruction par key concurrent
  const byKey: Record<string, SocialMediaData> = {}
  for (const c of withSocial) {
    const instagram = c.instagram ? (igMap.get(c.instagram) ?? null) : null
    const fbPage = c.facebook ? (fbPagesMap.get(c.facebook) ?? null) : null
    const fbPosts = c.facebook ? (fbPostsMap.get(c.facebook) ?? []) : []

    let facebook: FacebookPageData | null = null
    if (c.facebook && (fbPage || fbPosts.length > 0)) {
      facebook = {
        url: c.facebook,
        name: fbPage?.name ?? null,
        followers: fbPage?.followers ?? null,
        likes: fbPage?.likes ?? null,
        rating: fbPage?.rating ?? null,
        description: fbPage?.description ?? null,
        email: fbPage?.email ?? null,
        phone: fbPage?.phone ?? null,
        website: fbPage?.website ?? null,
        category: fbPage?.category ?? null,
        posts: fbPosts,
      }
    }

    if (instagram || facebook) {
      byKey[c.key] = { facebook, instagram }
    }

    // Warnings ciblés par concurrent quand on a un input mais aucune data
    if (c.instagram && !instagram) {
      warnings.push(`Instagram ${c.instagram} non trouvé dans le batch`)
    }
    if (c.facebook && !facebook) {
      warnings.push(`Facebook ${c.facebook} non trouvé dans le batch`)
    }
  }

  console.log(
    `[Social] DONE fb=${fbPagesMap.size}/${fbUrls.length} ig=${igMap.size}/${igUrls.length} cost=$${totalCost.toFixed(4)} warnings=${warnings.length}`,
  )

  return { byKey, cost: totalCost, warnings }
}
