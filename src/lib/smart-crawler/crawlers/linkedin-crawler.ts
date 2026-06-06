// Smart Crawler — LinkedIn Company page crawler (via Apify)
//
// CONTEXTE
// --------
// Jina + Microlink sont bloqués par LinkedIn (page de login forcée).
// Solution : Apify actor `harvestapi/linkedin-company` qui scrape la page
// company via leur infra (no cookies, no session requise) et retourne :
// - name, description, website, industries
// - logo (image profil), banner / backgroundCover (image cover paysage)
// - employeeCount, locations, foundedOn
//
// Coût : $3 / 1000 entreprises (plan Apify Starter de Thierry).
//
// CONFIG : env var APIFY_TOKEN requise.

import type { CrawlResult } from '../types'
import { persistImage } from '../storage'

const APIFY_ACTOR = 'harvestapi~linkedin-company'
const APIFY_TIMEOUT = 90_000
const MAX_CHARS = 4000

interface ApifyLinkedinIndustry {
  id?: string
  name?: string
  title?: string
  hierarchy?: string
}
interface ApifyLinkedinLogo {
  url?: string
  width?: number
  height?: number
}
interface ApifyLinkedinCompany {
  id?: string
  universalName?: string
  linkedinUrl?: string
  name?: string
  description?: string
  tagline?: string
  website?: string
  industries?: Array<ApifyLinkedinIndustry | string>
  industry?: string
  logo?: string | { url?: string }
  logoUrl?: string
  logos?: ApifyLinkedinLogo[]
  banner?: string | { url?: string }
  bannerUrl?: string
  backgroundCover?: string | { url?: string }
  backgroundCovers?: ApifyLinkedinLogo[]
  employeeCount?: number
  followerCount?: number
  followers?: number
  locations?: Array<{ city?: string; country?: string; line1?: string; line2?: string; geographicArea?: string; postalCode?: string }>
  headquarters?: { city?: string; country?: string; line1?: string }
  foundedOn?: { year?: number } | number | null
  specialities?: string[] // Note : Apify utilise "specialities" (orthographe UK), pas "specialties"
  specialties?: string[]
  error?: string
}

function isValidLinkedinUrl(url: string): boolean {
  return /linkedin\.com/i.test(url)
}

function getImageUrl(field: string | { url?: string } | undefined): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field.url || ''
}

export async function crawlLinkedin(url?: string, contactId?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'linkedin', url: '', content: '', success: false }
  }

  if (!isValidLinkedinUrl(url)) {
    return { source: 'linkedin', url, content: '', success: false, error: 'URL LinkedIn invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  const apifyToken = process.env.APIFY_TOKEN
  if (!apifyToken) {
    console.warn('[crawlLinkedin] APIFY_TOKEN manquant')
    return { source: 'linkedin', url: normalizedUrl, content: '', success: false, error: 'APIFY_TOKEN missing' }
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
          companies: [normalizedUrl],
        }),
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!response.ok) {
      return {
        source: 'linkedin',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Apify HTTP ${response.status}`,
      }
    }

    const data = (await response.json()) as ApifyLinkedinCompany[]
    const company = data[0]

    if (!company || company.error) {
      return {
        source: 'linkedin',
        url: normalizedUrl,
        content: '',
        success: false,
        error: company?.error || 'Page LinkedIn introuvable',
      }
    }

    // Logo : champ logo (string ou objet) OU 1re entrée de logos[]
    const rawLogoUrl =
      getImageUrl(company.logo) ||
      company.logoUrl ||
      company.logos?.[0]?.url ||
      ''
    // Hero : banner / backgroundCover (souvent absent — LinkedIn ne renvoie
    // pas toujours la cover company). Si absent, le mini-site retombe sur
    // imageUrls[0] = logo.
    const rawHeroUrl =
      getImageUrl(company.banner) ||
      company.bannerUrl ||
      getImageUrl(company.backgroundCover) ||
      company.backgroundCovers?.[0]?.url ||
      ''

    // Persiste les images sur Supabase Storage (URLs LinkedIn CDN expirent aussi)
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
    if (company.name) lines.push(`# ${company.name}`)
    if (company.tagline) lines.push(`*${company.tagline}*`)
    if (company.industries?.length) {
      // industries peut être array de strings OU array d'objects {name, title, ...}
      const industryNames = company.industries
        .map((ind) => (typeof ind === 'string' ? ind : ind.name || ind.title || ''))
        .filter(Boolean)
      if (industryNames.length) lines.push(`**Secteur :** ${industryNames.join(', ')}`)
    } else if (company.industry) {
      lines.push(`**Secteur :** ${company.industry}`)
    }
    if (typeof company.employeeCount === 'number') {
      lines.push(`**Employés :** ${company.employeeCount.toLocaleString('fr-FR')}`)
    }
    const followers = company.followerCount ?? company.followers
    if (typeof followers === 'number') {
      lines.push(`**Abonnés LinkedIn :** ${followers.toLocaleString('fr-FR')}`)
    }
    if (company.website) lines.push(`**Site web :** ${company.website}`)
    if (company.headquarters) {
      const hq = [company.headquarters.line1, company.headquarters.city, company.headquarters.country]
        .filter(Boolean)
        .join(', ')
      if (hq) lines.push(`**Siège :** ${hq}`)
    } else if (company.locations?.[0]) {
      const loc = company.locations[0]
      const locStr = [loc.line1, loc.city, loc.country].filter(Boolean).join(', ')
      if (locStr) lines.push(`**Localisation :** ${locStr}`)
    }
    const foundedYear = typeof company.foundedOn === 'number' ? company.foundedOn : company.foundedOn?.year
    if (foundedYear) lines.push(`**Fondée en :** ${foundedYear}`)
    const specialities = company.specialities ?? company.specialties
    if (specialities?.length) lines.push(`**Spécialités :** ${specialities.slice(0, 5).join(', ')}`)
    if (company.description) lines.push('', company.description)

    if (logoUrl) lines.push('', `![logo](${logoUrl})`)
    if (heroUrl && heroUrl !== logoUrl) lines.push('', `![banner](${heroUrl})`)

    const content = lines.join('\n').slice(0, MAX_CHARS)

    if (content.length < 30) {
      return {
        source: 'linkedin',
        url: normalizedUrl,
        content: '',
        success: false,
        error: 'Page LinkedIn trop pauvre',
      }
    }

    console.log(`[crawlLinkedin] Apify OK pour ${company.name || normalizedUrl}: logo=${!!logoUrl}, banner=${!!heroUrl}`)

    return {
      source: 'linkedin',
      url: normalizedUrl,
      content,
      success: true,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        source: 'linkedin',
        url: normalizedUrl,
        content: '',
        success: false,
        error: `Timeout Apify (${APIFY_TIMEOUT}ms)`,
      }
    }
    return {
      source: 'linkedin',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
