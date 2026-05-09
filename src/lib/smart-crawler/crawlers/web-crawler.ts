// Smart Crawler — Website crawler
//
// Le formulaire opt-in DCG AI propose un seul champ "site web OU page Facebook
// OU Instagram". Du coup on reçoit ici aussi bien des URLs de sites classiques
// que des URLs de réseaux sociaux. On gère les deux :
//
// 1. Si l'URL est sociale (Facebook, Instagram, LinkedIn) → directement Microlink,
//    parce que Jina est bloqué par la page de login de ces plateformes.
// 2. Si l'URL est un site web → on tente Jina d'abord. Si Jina renvoie une
//    page de login (cas où le site a un mur de connexion) ou un contenu trop
//    court, on retombe sur Microlink qui scrape les meta tags.

import { fetchWithJina } from './jina-reader'
import { fetchWithMicrolink, isLoginPageContent } from './microlink'
import { crawlFacebook } from './facebook-crawler'
import { crawlInstagram } from './instagram-crawler'
import type { CrawlResult } from '../types'

const MAX_CHARS = 8000

function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/i.test(url)
}
function isInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url)
}

export async function crawlWebsite(url?: string, contactId?: string): Promise<CrawlResult> {
  // Filtrer les URLs vides ou invalides (GHL envoie "https://" quand le champ est vide)
  if (!url || url.trim() === '' || url.trim() === 'https://' || url.trim() === 'http://') {
    return { source: 'website', url: '', content: '', success: false }
  }

  // Normaliser l'URL
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`

  // Cas 1a : URL Facebook → router vers crawlFacebook (Apify FB Pages, qui a
  // logo + cover photo + adresse + email + téléphone, et persiste les images).
  if (isFacebookUrl(normalizedUrl)) {
    console.log(`[crawlWebsite] URL Facebook → routée vers crawlFacebook (Apify)`)
    const fbResult = await crawlFacebook(normalizedUrl, contactId)
    return { ...fbResult, source: 'website' as const }
  }

  // Cas 1b : URL Instagram → router vers crawlInstagram (Apify IG, qui a
  // bio + photo profil + posts récents, et persiste les images).
  if (isInstagramUrl(normalizedUrl)) {
    console.log(`[crawlWebsite] URL Instagram → routée vers crawlInstagram (Apify)`)
    const igResult = await crawlInstagram(normalizedUrl, contactId)
    return { ...igResult, source: 'website' as const }
  }

  // Cas 2 : URL classique → Jina d'abord, fallback Microlink si nécessaire.
  try {
    const jinaContent = await fetchWithJina(normalizedUrl)

    // Jina a réussi avec un vrai contenu → on garde
    if (jinaContent && jinaContent.length >= 50 && !isLoginPageContent(jinaContent)) {
      return {
        source: 'website',
        url: normalizedUrl,
        content: jinaContent.slice(0, MAX_CHARS),
        success: true,
      }
    }

    // Jina a échoué ou est tombé sur une page de login → on tente Microlink
    console.warn(`[crawlWebsite] Jina insuffisant pour ${normalizedUrl} (${jinaContent?.length || 0} chars), fallback Microlink`)
    const microContent = await fetchWithMicrolink(normalizedUrl)
    if (microContent && microContent.length >= 30) {
      return {
        source: 'website',
        url: normalizedUrl,
        content: microContent.slice(0, MAX_CHARS),
        success: true,
      }
    }

    return {
      source: 'website',
      url: normalizedUrl,
      content: '',
      success: false,
      error: 'Jina et Microlink ont tous deux échoué',
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
