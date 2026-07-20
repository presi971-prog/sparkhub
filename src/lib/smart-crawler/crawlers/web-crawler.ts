// Smart Crawler — Website crawler
//
// Le formulaire opt-in DCG AI propose un seul champ "site web OU page Facebook
// OU Instagram". Du coup on reçoit ici aussi bien des URLs de sites classiques
// que des URLs de réseaux sociaux. On gère les deux :
//
// 1. Si l'URL est sociale (Facebook, Instagram, LinkedIn) → directement Microlink,
//    parce que Jina est bloqué par la page de login de ces plateformes.
// 2. Si l'URL est un site web → on tente Jina, puis le HTML brut direct si son
//    contenu est insuffisant, et enfin Microlink pour récupérer les meta tags.

import { fetchWithJina } from './jina-reader'
import { fetchRawHtml } from './raw-html'
import { fetchWithMicrolink, isLoginPageContent } from './microlink'
import { crawlFacebook } from './facebook-crawler'
import { crawlInstagram } from './instagram-crawler'
import { crawlLinkedin } from './linkedin-crawler'
import type { CrawlResult } from '../types'

const MAX_CHARS = 8000

function isFacebookUrl(url: string): boolean {
  return /facebook\.com|fb\.com|fb\.me/i.test(url)
}
function isInstagramUrl(url: string): boolean {
  return /instagram\.com/i.test(url)
}
function isLinkedinUrl(url: string): boolean {
  return /linkedin\.com|lnkd\.in/i.test(url)
}

/**
 * Détecte si la valeur reçue dans le champ "site web" est en réalité une
 * adresse email (contact@domaine.fr) — le formulaire opt-in ne valide pas
 * le champ, on reçoit parfois n'importe quoi.
 */
function isEmailAddress(url: string): boolean {
  // On retire un éventuel préfixe http(s):// puis on regarde la partie
  // avant le premier "/", "?" ou "#" : si elle contient un "@", c'est un email.
  const withoutProtocol = url.replace(/^https?:\/\//i, '')
  const host = withoutProtocol.split(/[/?#]/)[0]
  return host.includes('@')
}

/**
 * Détecte un domaine social "nu" sans slug de page (facebook.com,
 * www.instagram.com/...) : inutilisable, il n'y a aucune page à crawler.
 */
function isBareSocialDomain(url: string): boolean {
  return /^(?:https?:\/\/)?(?:(?:www|m|web)\.)?(?:facebook\.com|fb\.com|fb\.me|instagram\.com|linkedin\.com|lnkd\.in)\/?$/i.test(url.trim())
}

export async function crawlWebsite(url?: string, contactId?: string): Promise<CrawlResult> {
  // Filtrer les URLs vides ou invalides (GHL envoie "https://" quand le champ est vide)
  if (!url || url.trim() === '' || url.trim() === 'https://' || url.trim() === 'http://') {
    return { source: 'website', url: '', content: '', success: false }
  }

  // Garde d'entrée : le champ "site web" du formulaire reçoit parfois un email
  // ou un domaine social nu (facebook.com sans page). Aucun crawl possible →
  // on sort proprement sans consommer de quota.
  const trimmedUrl = url.trim()
  if (isEmailAddress(trimmedUrl) || isBareSocialDomain(trimmedUrl)) {
    console.warn(`[crawlWebsite] Entrée invalide (email ou domaine social nu) : ${trimmedUrl}`)
    return {
      source: 'website',
      url: trimmedUrl,
      content: '',
      success: false,
      error: 'URL invalide : adresse email ou domaine social sans page',
    }
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

  // Cas 1c : URL LinkedIn → router vers crawlLinkedin (Apify harvestapi/linkedin-company,
  // qui a name + description + secteur + logo + banner + persiste les images).
  if (isLinkedinUrl(normalizedUrl)) {
    console.log(`[crawlWebsite] URL LinkedIn → routée vers crawlLinkedin (Apify)`)
    const liResult = await crawlLinkedin(normalizedUrl, contactId)
    return { ...liResult, source: 'website' as const }
  }

  // Cas 2 : URL classique → Jina d'abord, puis HTML brut direct, puis Microlink.
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

    // Jina a échoué → fallback GRATUIT : fetch direct du HTML + nettoyage.
    // (Pas de rendu JS, mais suffisant pour la plupart des sites vitrines.)
    console.warn(`[crawlWebsite] Jina insuffisant pour ${normalizedUrl} (${jinaContent?.length || 0} chars), fallback HTML brut`)
    const rawContent = await fetchRawHtml(normalizedUrl)
    if (rawContent && rawContent.length >= 200 && !isLoginPageContent(rawContent)) {
      return {
        source: 'website',
        url: normalizedUrl,
        content: rawContent.slice(0, MAX_CHARS),
        success: true,
      }
    }

    // HTML brut insuffisant aussi → dernier filet : Microlink (meta tags).
    console.warn(`[crawlWebsite] HTML brut insuffisant pour ${normalizedUrl} (${rawContent?.length || 0} chars), fallback Microlink`)
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
      error: 'Jina, HTML brut et Microlink ont tous échoué',
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
