// Smart Crawler — Instagram public profile crawler (via Apify)
//
// CONTEXTE
// --------
// Jina Reader est BLOQUÉ par Instagram (renvoie la page de login).
// Microlink ne marche pas non plus côté Instagram (il récupère juste
// l'image OG générique d'Instagram, pas les infos du compte).
//
// Solution : Apify actor `apify/instagram-profile-scraper` qui fait du
// scraping authentifié et renvoie un JSON propre avec :
// - fullName, biography, externalUrl
// - profilePicUrl (HD) — utilisé comme logo
// - latestPosts[].displayUrl — première utilisée comme hero image (vraie photo
//   paysage/portrait, beaucoup mieux qu'un logo carré)
// - businessCategoryName, isBusinessAccount
//
// Coût : $1.60 / 1000 profils (plan Apify Starter de Thierry).
//
// CONFIG : env var APIFY_TOKEN requise (token API Apify).

import type { CrawlResult } from '../types'
import { persistImage } from '../storage'

const APIFY_ACTOR = 'apify~instagram-profile-scraper'
const APIFY_TIMEOUT = 90_000 // Apify peut prendre du temps (15-60s)
const MAX_CHARS = 4000

interface ApifyInstagramProfile {
  username?: string
  fullName?: string
  biography?: string
  externalUrl?: string
  followersCount?: number
  isBusinessAccount?: boolean
  businessCategoryName?: string | null
  verified?: boolean
  profilePicUrl?: string
  profilePicUrlHD?: string
  postsCount?: number
  latestPosts?: Array<{
    displayUrl?: string
    caption?: string | null
    type?: string
    images?: Array<{ url?: string }>
  }>
  error?: string
}

function isValidInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url)
}

function extractUsername(url: string): string {
  // Match /username ou /username/ (sans /p/, /reel/, etc.)
  const match = url.match(/instagram\.com\/([^/?#]+)/i)
  if (!match) return ''
  const u = match[1].trim()
  // Filtrer les paths spéciaux qui ne sont pas des usernames
  if (['p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts'].includes(u.toLowerCase())) return ''
  return u
}

export async function crawlInstagram(url?: string, contactId?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'instagram', url: '', content: '', success: false }
  }

  if (!isValidInstagramUrl(url)) {
    return { source: 'instagram', url, content: '', success: false, error: 'URL Instagram invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  const username = extractUsername(normalizedUrl)

  if (!username) {
    return { source: 'instagram', url: normalizedUrl, content: '', success: false, error: 'Username Instagram introuvable dans URL' }
  }

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    console.warn('[crawlInstagram] APIFY_TOKEN manquant')
    return { source: 'instagram', url: normalizedUrl, content: '', success: false, error: 'APIFY_TOKEN missing' }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), APIFY_TIMEOUT)

    const response = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apifyToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usernames: [username] }),
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!response.ok) {
      return {
        source: 'instagram',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Apify HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as ApifyInstagramProfile[]
    const profile = data[0]

    if (!profile || profile.error) {
      return {
        source: 'instagram',
        url: normalizedUrl,
        content: '',
        success: false,
        error: profile?.error || 'Profil Instagram introuvable',
      }
    }

    // Image principale (logo) : photo de profil HD
    const rawLogoUrl = profile.profilePicUrlHD || profile.profilePicUrl || ''

    // Image hero (vraie photo paysage/portrait) : 1er post si dispo
    let rawHeroUrl = ''
    if (profile.latestPosts && profile.latestPosts.length > 0) {
      const first = profile.latestPosts[0]
      rawHeroUrl = first.displayUrl || first.images?.[0]?.url || ''
    }

    // CDN Instagram signe ses URLs avec expiration courte (quelques heures
    // → 403 ensuite). On télécharge les images et on les ré-héberge sur
    // Supabase Storage pour avoir des URLs permanentes. Si contactId est
    // absent, on garde les URLs Insta brutes (pourront expirer).
    let logoUrl = rawLogoUrl
    let heroUrl = rawHeroUrl
    if (contactId) {
      const [persistedLogo, persistedHero] = await Promise.all([
        rawLogoUrl ? persistImage(rawLogoUrl, contactId, 'logo') : Promise.resolve(null),
        rawHeroUrl && rawHeroUrl !== rawLogoUrl
          ? persistImage(rawHeroUrl, contactId, 'hero')
          : Promise.resolve(null),
      ])
      logoUrl = persistedLogo || rawLogoUrl
      heroUrl = persistedHero || rawHeroUrl
    }

    // Construire le markdown compatible avec le pipeline (extractImageUrls
    // chope les URLs avec regex, extractBusinessData lit le texte).
    const lines: string[] = []
    if (profile.fullName) lines.push(`# ${profile.fullName}`)
    if (profile.username) lines.push(`**@${profile.username}** sur Instagram`)
    if (profile.verified) lines.push('✓ Compte vérifié')
    if (profile.isBusinessAccount) lines.push('Compte professionnel')
    if (profile.businessCategoryName) lines.push(`**Catégorie :** ${profile.businessCategoryName}`)
    if (typeof profile.followersCount === 'number') lines.push(`**Abonnés :** ${profile.followersCount.toLocaleString('fr-FR')}`)
    if (profile.biography) lines.push('', profile.biography)
    if (profile.externalUrl) lines.push('', `**Site web :** ${profile.externalUrl}`)

    // IMPORTANT : la 1re image du markdown devient logoUrl côté ai-extractor
    // (extractImageUrls ordre d'apparition). On met donc le logo EN PREMIER.
    if (logoUrl) lines.push('', `![logo](${logoUrl})`)
    // Hero ensuite (devient imageUrls[1]) — utilisé en bannière si dispo et
    // différent de logoUrl côté ai-extractor.
    if (heroUrl && heroUrl !== logoUrl) lines.push('', `![photo](${heroUrl})`)

    // Ajouter les autres posts (alimente imageUrls[2..])
    if (profile.latestPosts && profile.latestPosts.length > 1) {
      for (const post of profile.latestPosts.slice(1, 4)) {
        const imgUrl = post.displayUrl || post.images?.[0]?.url
        if (imgUrl && imgUrl !== logoUrl && imgUrl !== heroUrl) {
          lines.push(`![photo](${imgUrl})`)
        }
      }
    }

    const content = lines.join('\n').slice(0, MAX_CHARS)

    if (content.length < 30) {
      return {
        source: 'instagram',
        url: normalizedUrl,
        content: '',
        success: false,
        error: 'Profil Instagram trop pauvre (pas de bio, posts, photo)',
      }
    }

    console.log(`[crawlInstagram] Apify OK pour @${username}: logo=${!!logoUrl}, hero=${!!heroUrl}, posts=${profile.latestPosts?.length || 0}`)

    return {
      source: 'instagram',
      url: normalizedUrl,
      content,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        source: 'instagram',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Timeout Apify (${APIFY_TIMEOUT}ms)`,
      }
    }
    return {
      source: 'instagram',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
