// Smart Crawler — Facebook public page crawler (via Apify)
//
// CONTEXTE
// --------
// Jina Reader est BLOQUÉ par Facebook (renvoie page de login).
// Microlink fonctionne mais retourne uniquement l'image OG + meta tags
// — pas la cover photo distincte ni les infos détaillées.
//
// Solution : Apify actor `apify/facebook-pages-scraper` qui retourne :
// - title, intro (description), category, address, email, phone, website
// - profilePictureUrl (logo carré)
// - coverPhotoUrl (vraie photo de couverture paysage → hero parfait)
// - alternativeSocialMedia (URL Instagram du même business)
//
// Coût : $6.60 / 1000 pages (plan Apify Starter de Thierry).
//
// CONFIG : env var APIFY_TOKEN requise.

import type { CrawlResult } from '../types'
import { persistImage } from '../storage'

const APIFY_ACTOR = 'apify~facebook-pages-scraper'
const APIFY_TIMEOUT = 90_000
const MAX_CHARS = 4000

interface ApifyFacebookPage {
  title?: string
  intro?: string
  pageName?: string
  pageUrl?: string
  category?: string
  categories?: string[]
  address?: string
  email?: string
  phone?: string
  whatsapp_number?: string
  wa_number?: string
  website?: string
  websites?: string[]
  alternativeSocialMedia?: string
  likes?: number
  followers?: number
  profilePictureUrl?: string
  coverPhotoUrl?: string
  rating?: string
  error?: string
}

function isValidFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/i.test(url)
}

export async function crawlFacebook(url?: string, contactId?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'facebook', url: '', content: '', success: false }
  }

  if (!isValidFacebookUrl(url)) {
    return { source: 'facebook', url, content: '', success: false, error: 'URL Facebook invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    console.warn('[crawlFacebook] APIFY_TOKEN manquant')
    return { source: 'facebook', url: normalizedUrl, content: '', success: false, error: 'APIFY_TOKEN missing' }
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
        body: JSON.stringify({
          startUrls: [{ url: normalizedUrl }],
        }),
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!response.ok) {
      return {
        source: 'facebook',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Apify HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as ApifyFacebookPage[]
    const page = data[0]

    if (!page || page.error) {
      return {
        source: 'facebook',
        url: normalizedUrl,
        content: '',
        success: false,
        error: page?.error || 'Page Facebook introuvable',
      }
    }

    const rawLogoUrl = page.profilePictureUrl || ''
    const rawHeroUrl = page.coverPhotoUrl || ''

    // Persiste les images sur Supabase Storage (URLs FB CDN expirent comme Insta)
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

    // Construire le markdown compatible avec extractImageUrls et extractBusinessData
    const lines: string[] = []
    if (page.title) lines.push(`# ${page.title}`)
    if (page.category || page.categories?.[0]) {
      lines.push(`**Catégorie :** ${page.category || page.categories?.[0]}`)
    }
    if (typeof page.followers === 'number') lines.push(`**Abonnés :** ${page.followers.toLocaleString('fr-FR')}`)
    if (typeof page.likes === 'number') lines.push(`**Likes :** ${page.likes.toLocaleString('fr-FR')}`)
    if (page.address) lines.push(`**Adresse :** ${page.address}`)
    if (page.email) lines.push(`**Email :** ${page.email}`)
    if (page.phone || page.whatsapp_number || page.wa_number) {
      lines.push(`**Téléphone :** ${page.phone || page.whatsapp_number || page.wa_number}`)
    }
    if (page.website) lines.push(`**Site web :** ${page.website}`)
    if (page.alternativeSocialMedia) lines.push(`**Autre réseau :** ${page.alternativeSocialMedia}`)
    if (page.intro) lines.push('', page.intro)

    // Logo en 1er → devient logoUrl (imageUrls[0])
    if (logoUrl) lines.push('', `![logo](${logoUrl})`)
    // Hero en 2e → devient heroImageUrl (imageUrls[1])
    if (heroUrl && heroUrl !== logoUrl) lines.push('', `![cover](${heroUrl})`)

    const content = lines.join('\n').slice(0, MAX_CHARS)

    if (content.length < 30) {
      return {
        source: 'facebook',
        url: normalizedUrl,
        content: '',
        success: false,
        error: 'Page Facebook trop pauvre',
      }
    }

    console.log(`[crawlFacebook] Apify OK pour ${page.pageName || normalizedUrl}: logo=${!!logoUrl}, cover=${!!heroUrl}`)

    return {
      source: 'facebook',
      url: normalizedUrl,
      content,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        source: 'facebook',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Timeout Apify (${APIFY_TIMEOUT}ms)`,
      }
    }
    return {
      source: 'facebook',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
