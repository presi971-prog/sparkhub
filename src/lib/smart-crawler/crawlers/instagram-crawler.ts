// Smart Crawler — Instagram public profile crawler

import { fetchWithJina } from './jina-reader'
import type { CrawlResult } from '../types'

const MAX_CHARS = 4000

function isValidInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url)
}

export async function crawlInstagram(url?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'instagram', url: '', content: '', success: false }
  }

  if (!isValidInstagramUrl(url)) {
    return { source: 'instagram', url, content: '', success: false, error: 'URL Instagram invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const content = await fetchWithJina(normalizedUrl)

    if (!content || content.length < 30) {
      return { source: 'instagram', url: normalizedUrl, content: '', success: false, error: 'Profil Instagram vide ou privé' }
    }

    return {
      source: 'instagram',
      url: normalizedUrl,
      content: content.slice(0, MAX_CHARS),
      success: true,
    }
  } catch (error) {
    return {
      source: 'instagram',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
