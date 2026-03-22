// Smart Crawler — Website crawler

import { fetchWithJina } from './jina-reader'
import type { CrawlResult } from '../types'

const MAX_CHARS = 8000

export async function crawlWebsite(url?: string): Promise<CrawlResult> {
  // Filtrer les URLs vides ou invalides (GHL envoie "https://" quand le champ est vide)
  if (!url || url.trim() === '' || url.trim() === 'https://' || url.trim() === 'http://') {
    return { source: 'website', url: '', content: '', success: false }
  }

  // Normaliser l'URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const content = await fetchWithJina(normalizedUrl)

    if (!content || content.length < 50) {
      return { source: 'website', url: normalizedUrl, content: '', success: false, error: 'Contenu trop court ou vide' }
    }

    return {
      source: 'website',
      url: normalizedUrl,
      content: content.slice(0, MAX_CHARS),
      success: true,
    }
  } catch (error) {
    return {
      source: 'website',
      url: normalizedUrl,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}
