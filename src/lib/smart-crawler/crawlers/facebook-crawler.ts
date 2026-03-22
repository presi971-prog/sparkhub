// Smart Crawler — Facebook public page crawler

import { fetchWithJina } from './jina-reader'
import type { CrawlResult } from '../types'

const MAX_CHARS = 6000

function isValidFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/i.test(url)
}

export async function crawlFacebook(url?: string): Promise<CrawlResult> {
  if (!url) {
    return { source: 'facebook', url: '', content: '', success: false }
  }

  if (!isValidFacebookUrl(url)) {
    return { source: 'facebook', url, content: '', success: false, error: 'URL Facebook invalide' }
  }

  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const content = await fetchWithJina(normalizedUrl)

    if (!content || content.length < 30) {
      return { source: 'facebook', url: normalizedUrl, content: '', success: false, error: 'Page Facebook vide ou inaccessible' }
    }

    return {
      source: 'facebook',
      url: normalizedUrl,
      content: content.slice(0, MAX_CHARS),
      success: true,
    }
  } catch (error) {
    return {
      source: 'facebook',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
