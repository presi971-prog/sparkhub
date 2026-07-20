// Smart Crawler — Fallback HTML brut
//
// Quand Jina échoue, ce filet gratuit tente avant Microlink un fetch direct du
// HTML puis un nettoyage par regex. Il ne rend pas le JavaScript.

import { BROWSER_USER_AGENT } from './browser-headers'

const RAW_HTML_TIMEOUT = 10_000 // 10 secondes
const MAX_HTML_BYTES = 500_000  // on ne nettoie que les 500 premiers Ko de HTML

/**
 * Récupère directement le HTML d'une URL et retourne son texte nettoyé.
 */
export async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RAW_HTML_TIMEOUT)

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    })

    if (!response.ok) {
      console.warn(`[RawHtml] ${response.status} pour ${url}`)
      return ''
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType && !/html|xml/i.test(contentType)) {
      console.warn(`[RawHtml] Content-Type non HTML (${contentType}) pour ${url}`)
      return ''
    }

    const html = (await response.text()).slice(0, MAX_HTML_BYTES)
    return stripHtml(html)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[RawHtml] Timeout (${RAW_HTML_TIMEOUT}ms) pour ${url}`)
    } else {
      console.warn(`[RawHtml] Erreur pour ${url}:`, error)
    }
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Convertit du HTML en texte lisible sans dépendance externe.
 */
export function stripHtml(html: string): string {
  const decodeEntities = (value: string): string => value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/(?:&#39;|&apos;)/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_match, codePoint: string) => decodeCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, codePoint: string) => decodeCodePoint(parseInt(codePoint, 16)))
    .replace(/&amp;/gi, '&')

  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
  const description = decodeEntities((
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1]
    || ''
  )).trim()

  const body = decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[\s\S]*$/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<style[\s\S]*$/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br|header|footer|nav)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  let result = ''
  if (title) result += `# ${title}\n`
  if (description) result += `${description}\n\n`
  result += body
  return result
}

function decodeCodePoint(codePoint: number): string {
  if (codePoint < 0 || codePoint > 0x10FFFF || (codePoint >= 0xD800 && codePoint <= 0xDFFF)) return ''
  return String.fromCodePoint(codePoint)
}
