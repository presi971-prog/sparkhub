// Smart Crawler — Jina Reader wrapper
// Convertit n'importe quelle URL publique en Markdown propre

import { BROWSER_USER_AGENT } from './browser-headers'

const JINA_TIMEOUT = 15_000 // 15 secondes

/**
 * Lit une URL via Jina Reader et retourne le contenu en Markdown.
 * Jina gère le JavaScript (SPA, React...) et retourne du texte propre.
 * Free tier : 1000 req/mois. Avec API key : 10 000 req/mois.
 */
export async function fetchWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`
  const apiKey = process.env.JINA_API_KEY

  // User-Agent navigateur OBLIGATOIRE : sans lui, Cloudflare (devant r.jina.ai)
  // renvoie 403 "browser_signature_banned" et le crawl échoue à 100 %.
  const headers: Record<string, string> = {
    'Accept': 'text/markdown',
    'X-Return-Format': 'markdown',
    'User-Agent': BROWSER_USER_AGENT,
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), JINA_TIMEOUT)

  try {
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      console.warn(`[Jina] ${response.status} pour ${url}`)
      return ''
    }

    const text = await response.text()
    return text || ''
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Jina] Timeout (${JINA_TIMEOUT}ms) pour ${url}`)
    } else {
      console.warn(`[Jina] Erreur pour ${url}:`, error)
    }
    return ''
  } finally {
    clearTimeout(timeout)
  }
}
