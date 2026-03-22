// Smart Crawler — LinkedIn public profile crawler (best-effort)
// LinkedIn bloque souvent les scrapers — dégradation gracieuse

import { fetchWithJina } from './jina-reader'
import type { CrawlResult } from '../types'

const MAX_CHARS = 4000

function isValidLinkedinUrl(url: string): boolean {
  return /linkedin\.com/i.test(url)
}

export async function crawlLinkedin(url?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'linkedin', url: '', content: '', success: false }
  }

  if (!isValidLinkedinUrl(url)) {
    return { source: 'linkedin', url, content: '', success: false, error: 'URL LinkedIn invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const content = await fetchWithJina(normalizedUrl)

    if (!content || content.length < 30) {
      return { source: 'linkedin', url: normalizedUrl, content: '', success: false, error: 'Profil LinkedIn inaccessible (anti-scraping)' }
    }

    return {
      source: 'linkedin',
      url: normalizedUrl,
      content: content.slice(0, MAX_CHARS),
      success: true,
    }
  } catch (error) {
    return {
      source: 'linkedin',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
