/**
 * SparkScan — analyseur sémantique de sites jeunes (méthode B).
 *
 * Étapes :
 *  1. Fetch la page d'accueil (HTML brut).
 *  2. Extrait title + meta description + h1/h2/h3 + texte body (~3000 chars).
 *  3. Appelle Claude sonnet-4-6 avec un prompt structuré JSON.
 *  4. Retourne { business_name, sector, services[], location_text, search_categories[] }
 *     où search_categories = 8 requêtes Google Maps qu'un client local taperait.
 *
 * Modèle : claude-sonnet-4-6 (rapide, économique, suffit largement pour cette tâche).
 */

import { fetchOfferPagesContent } from './web-fetch'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
// Pricing officiel Sonnet 4.6 (au 25/05/2026, à reverifier si évolution) :
//  $3 / 1M input tokens, $15 / 1M output tokens.
const PRICE_INPUT_PER_M = 3
const PRICE_OUTPUT_PER_M = 15

const FETCH_TIMEOUT_MS = 15_000
const CLAUDE_TIMEOUT_MS = 60_000

export interface SiteAnalysis {
  business_name: string
  sector: string
  services: string[]
  location_text: string | null
  /** 8 requêtes Google Maps qu'un client local taperait pour trouver ce type d'entreprise dans la zone. */
  search_categories: string[]
  /** Notes libres du modèle si jamais elles aident le debug. */
  notes?: string
}

export async function analyzeYoungSite(
  url: string,
  zone: string,
  niveauZone: string,
  langue: string,
): Promise<{ analysis: SiteAnalysis; cost: number }> {
  console.log(`[YoungSite] START url=${url} zone=${zone}`)

  // 1. Fetch HTML home page
  const html = await fetchHomepage(url)

  // 2. Extract clean signal from home
  const signal = extractSignal(html)

  // 3. Enrichir le body avec jusqu'à 3 pages d'offre/services/produits.
  //    Crucial pour comprendre vraiment ce que vend le site (la home n'affiche
  //    qu'une vitrine, les vraies offres sont sur les sous-pages).
  const fullUrl = url.startsWith('http') ? url : `https://${url}`
  const offerFragments = await fetchOfferPagesContent(html, fullUrl, (h) => {
    const s = extractSignal(h)
    // Concatène titre + descr + body pour chaque page d'offre
    return [s.title, s.description, s.body].filter(Boolean).join(' — ')
  })
  if (offerFragments.length > 0) {
    signal.body = `${signal.body}\n\n${offerFragments.join('\n\n')}`
    console.log(
      `[YoungSite] enriched with ${offerFragments.length} offer pages (body_len now ${signal.body.length})`,
    )
  }

  console.log(
    `[YoungSite] EXTRACTED title="${signal.title.slice(0, 80)}" body_len=${signal.body.length}`,
  )

  // 4. Ask Claude
  const { analysis, cost } = await askClaudeForCategories(
    url,
    signal,
    zone,
    niveauZone,
    langue,
  )
  console.log(
    `[YoungSite] ANALYZED business="${analysis.business_name}" sector="${analysis.sector}" categories=${analysis.search_categories.length} cost=$${cost.toFixed(4)}`,
  )

  return { analysis, cost }
}

// ------------------------------------------------------------
// Fetch homepage with timeout + UA
// ------------------------------------------------------------

async function fetchHomepage(url: string): Promise<string> {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(fullUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SparkScanBot/1.0; +https://sparkhub.digital-code-growth.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} sur ${fullUrl}`)
    }
    return await res.text()
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Fetch ${fullUrl} échoué : ${msg}`)
  }
}

// ------------------------------------------------------------
// Extract title + meta + headings + body text (no DOM lib, regex direct)
// ------------------------------------------------------------

interface Signal {
  title: string
  description: string
  headings: string[]
  body: string
}

function extractSignal(html: string): Signal {
  // Title : <title> puis fallback og:title puis twitter:title
  const title =
    match(html, /<title[^>]*>([^<]+)<\/title>/i) ||
    match(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    match(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    match(html, /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)

  // Description : meta description puis fallback og:description / twitter:description
  const description =
    match(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    match(html, /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i) ||
    match(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    match(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
    match(html, /<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)

  const headings: string[] = []
  const headingRe = /<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(html)) !== null && headings.length < 30) {
    const text = stripTags(m[2]).trim()
    if (text) headings.push(text)
  }

  // Texte body : retire scripts/styles puis tags
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  let bodyText = stripTags(
    bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()

  // FALLBACK SPA : si bodyText très court (site React/Vue avec <div id="root"></div>),
  // on tente de pêcher du contexte dans le JSON-LD structured data (org schema, etc.).
  if (bodyText.length < 300) {
    const jsonLd = extractJsonLd(html)
    if (jsonLd) {
      bodyText = (bodyText + ' ' + jsonLd).trim()
      console.log(`[YoungSite] SPA détecté — fallback JSON-LD utilisé (+${jsonLd.length} chars)`)
    }
  }
  bodyText = bodyText.slice(0, 3000)

  return { title, description, headings, body: bodyText }
}

/**
 * Extrait le texte utile (name + description + sameAs) des blocs JSON-LD
 * <script type="application/ld+json">. Source de contexte robuste pour les SPA.
 */
function extractJsonLd(html: string): string {
  const blocks: string[] = []
  const re = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        const parts: string[] = []
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>
          if (typeof obj.name === 'string') parts.push(obj.name)
          if (typeof obj.description === 'string') parts.push(obj.description)
          if (typeof obj.slogan === 'string') parts.push(obj.slogan)
          if (Array.isArray(obj.sameAs)) parts.push(`Sites liés : ${obj.sameAs.filter((x) => typeof x === 'string').join(', ')}`)
          if (typeof obj['@type'] === 'string') parts.push(`Type : ${obj['@type']}`)
        }
        if (parts.length > 0) blocks.push(parts.join('. '))
      }
    } catch {
      /* JSON-LD malformé, on ignore */
    }
  }
  return blocks.join(' || ')
}

function match(html: string, re: RegExp): string {
  const m = html.match(re)
  return m ? m[1].trim() : ''
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
}

// ------------------------------------------------------------
// Call Claude API
// ------------------------------------------------------------

async function askClaudeForCategories(
  url: string,
  signal: Signal,
  zone: string,
  niveauZone: string,
  langue: string,
): Promise<{ analysis: SiteAnalysis; cost: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY env var requise')

  const prompt = buildPrompt(url, signal, zone, niveauZone, langue)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Claude fetch failed: ${msg}`)
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude HTTP ${res.status}: ${text.slice(0, 300)}`)
  }

  const json = (await res.json()) as {
    content: { type: string; text: string }[]
    usage: { input_tokens: number; output_tokens: number }
  }

  const textBlock = json.content.find((c) => c.type === 'text')?.text ?? ''
  const analysis = parseClaudeResponse(textBlock)

  const cost =
    (json.usage.input_tokens / 1_000_000) * PRICE_INPUT_PER_M +
    (json.usage.output_tokens / 1_000_000) * PRICE_OUTPUT_PER_M

  return { analysis, cost }
}

function buildPrompt(
  url: string,
  signal: Signal,
  zone: string,
  niveauZone: string,
  langue: string,
): string {
  return `Tu es un expert en recherche concurrentielle locale.

J'analyse l'entreprise dont le site est : ${url}
Sa zone géographique cible : ${zone} (niveau : ${niveauZone})
Langue du rapport : ${langue}

Voici les informations extraites de sa page d'accueil :

TITRE : ${signal.title || '(vide)'}
META DESCRIPTION : ${signal.description || '(vide)'}
TITRES H1/H2/H3 : ${signal.headings.slice(0, 15).join(' | ') || '(aucun)'}
TEXTE PAGE (extrait) : ${signal.body || '(vide)'}

À partir de ces signaux, identifie :
1. Le nom de l'entreprise (business_name)
2. Son secteur d'activité principal (sector, 2-5 mots)
3. Ses services principaux (services, 3-6 items courts)
4. Sa localisation si présente dans le texte (location_text, ou null)
5. Une liste de 8 requêtes Google Maps qu'un client local taperait pour trouver ce TYPE d'entreprise dans ${zone} (search_categories).

Règles importantes pour search_categories :
- Chaque requête doit inclure le service + la zone (ex : "ostéopathe Pointe-à-Pitre", "plombier Guadeloupe", "agence web Baie-Mahault")
- Varie les angles : services différents, synonymes, intentions client différentes
- Reste sur le MÊME secteur que ce site (on cherche ses concurrents, pas tous les commerces locaux)
- Adapte les villes/communes à ${zone}
- 8 requêtes max, pas moins

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte avant ou après, avec ce format strict :

{
  "business_name": "...",
  "sector": "...",
  "services": ["...", "...", "..."],
  "location_text": "..." | null,
  "search_categories": ["...", "...", "...", "...", "...", "...", "...", "..."]
}`
}

function parseClaudeResponse(text: string): SiteAnalysis {
  // Tolère réponse entourée de ```json ... ``` au cas où
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(
      `Claude n'a pas renvoyé du JSON valide : ${(err as Error).message}. Reçu : ${text.slice(0, 200)}`,
    )
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Réponse Claude vide ou invalide')
  }
  const p = parsed as Partial<SiteAnalysis> & Record<string, unknown>
  if (!p.business_name || !Array.isArray(p.search_categories)) {
    throw new Error(
      `Réponse Claude incomplète : business_name=${p.business_name} categories=${p.search_categories}`,
    )
  }
  return {
    business_name: String(p.business_name),
    sector: String(p.sector ?? ''),
    services: Array.isArray(p.services) ? p.services.map(String) : [],
    location_text:
      p.location_text === null || p.location_text === undefined
        ? null
        : String(p.location_text),
    search_categories: p.search_categories.map(String).slice(0, 8),
    notes: typeof p.notes === 'string' ? p.notes : undefined,
  }
}
