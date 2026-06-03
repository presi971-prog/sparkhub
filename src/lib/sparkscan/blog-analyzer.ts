/**
 * SparkScan — analyseur de blog concurrent (axe #21 / V0.8).
 *
 * Pour un concurrent donné :
 *   1. Fetch sa home page.
 *   2. Cherche un lien vers son blog (/blog, /news, /actualites, /journal,
 *      /articles, /insights, /resources, /conseil…).
 *   3. Si trouvé : fetch le blog, extrait le texte brut.
 *   4. Appelle Claude pour synthétiser : fréquence, sujets dominants,
 *      longueur moyenne perçue, qualité éditoriale, exploitabilité.
 *
 * Coût par concurrent : ~$0.005 (2 fetches + 1 mini-Claude).
 */

import { callClaudeJson } from './claude'

const FETCH_TIMEOUT_MS = 8_000
const BODY_MAX_CHARS = 4000

const BLOG_PATH_PATTERNS = [
  '/blog',
  '/news',
  '/actualites',
  '/actualité',
  '/journal',
  '/articles',
  '/insights',
  '/resources',
  '/ressources',
  '/conseils',
  '/conseil',
  '/guides',
  '/magazine',
]

export interface BlogAnalysis {
  has_blog: boolean
  blog_url: string | null
  /** Fréquence de publication perçue : "active" / "irregulière" / "abandonnée" / "inconnue". */
  publication_frequency: string
  /** 3-5 sujets dominants détectés. */
  dominant_topics: string[]
  /** Longueur moyenne perçue : "court" / "moyen" / "long". */
  average_length: string
  /** Qualité éditoriale perçue : "experte" / "marketing" / "faible" / "inconnue". */
  editorial_quality: string
  /** Comment le client peut exploiter cette analyse pour gagner du terrain. */
  exploitable_gap: string
}

export interface BlogResult {
  key: string
  analysis: BlogAnalysis
  error?: string
  costUsd: number
}

export async function analyzeBlogs(
  competitors: Array<{ key: string; label: string; homeUrl: string | null }>,
): Promise<{ results: BlogResult[]; totalCost: number }> {
  if (competitors.length === 0) return { results: [], totalCost: 0 }

  console.log(`[BlogAnalyzer] START count=${competitors.length}`)
  const settled = await Promise.allSettled(
    competitors.map((c) => analyzeOneBlog(c.key, c.label, c.homeUrl)),
  )
  const results: BlogResult[] = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          key: competitors[i].key,
          analysis: emptyAnalysis(),
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          costUsd: 0,
        },
  )
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0)
  const withBlog = results.filter((r) => r.analysis.has_blog).length
  console.log(
    `[BlogAnalyzer] DONE found=${withBlog}/${competitors.length} totalCost=$${totalCost.toFixed(4)}`,
  )
  return { results, totalCost }
}

function emptyAnalysis(): BlogAnalysis {
  return {
    has_blog: false,
    blog_url: null,
    publication_frequency: 'inconnue',
    dominant_topics: [],
    average_length: 'inconnu',
    editorial_quality: 'inconnue',
    exploitable_gap: '',
  }
}

async function analyzeOneBlog(
  key: string,
  label: string,
  homeUrl: string | null,
): Promise<BlogResult> {
  if (!homeUrl) {
    return { key, analysis: emptyAnalysis(), costUsd: 0 }
  }

  // 1. Fetch home + find blog link
  let homeHtml = ''
  try {
    homeHtml = await safeFetch(homeUrl)
  } catch (err) {
    return {
      key,
      analysis: emptyAnalysis(),
      error: err instanceof Error ? err.message : String(err),
      costUsd: 0,
    }
  }
  const blogUrl = detectBlogUrl(homeUrl, homeHtml)
  if (!blogUrl) {
    return {
      key,
      analysis: { ...emptyAnalysis(), has_blog: false },
      costUsd: 0,
    }
  }

  // 2. Fetch blog page
  let blogHtml = ''
  try {
    blogHtml = await safeFetch(blogUrl)
  } catch (err) {
    return {
      key,
      analysis: { ...emptyAnalysis(), has_blog: true, blog_url: blogUrl },
      error: err instanceof Error ? err.message : String(err),
      costUsd: 0,
    }
  }

  // 3. Extract clean text
  const cleanText = extractCleanText(blogHtml).slice(0, BODY_MAX_CHARS)
  if (cleanText.length < 200) {
    return {
      key,
      analysis: { ...emptyAnalysis(), has_blog: true, blog_url: blogUrl },
      costUsd: 0,
    }
  }

  // 4. Ask Claude
  const prompt = buildBlogPrompt(label, blogUrl, cleanText)
  try {
    const { json, costUsd } = await callClaudeJson<BlogAnalysis>({
      prompt,
      maxTokens: 600,
      label: `blog:${label.slice(0, 20)}`,
    })
    return {
      key,
      analysis: {
        has_blog: true,
        blog_url: blogUrl,
        publication_frequency: String(json.publication_frequency ?? 'inconnue'),
        dominant_topics: Array.isArray(json.dominant_topics)
          ? json.dominant_topics.map(String).slice(0, 5)
          : [],
        average_length: String(json.average_length ?? 'inconnu'),
        editorial_quality: String(json.editorial_quality ?? 'inconnue'),
        exploitable_gap: String(json.exploitable_gap ?? ''),
      },
      costUsd,
    }
  } catch (err) {
    return {
      key,
      analysis: { ...emptyAnalysis(), has_blog: true, blog_url: blogUrl },
      error: err instanceof Error ? err.message : String(err),
      costUsd: 0,
    }
  }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function safeFetch(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SparkScanBot/1.0; +https://sparkhub.digital-code-growth.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

function detectBlogUrl(homeUrl: string, html: string): string | null {
  const base = new URL(homeUrl.startsWith('http') ? homeUrl : `https://${homeUrl}`)
  // Tous les hrefs présents dans la home
  const hrefRe = /href=["']([^"']+)["']/gi
  const candidates = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1]
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    try {
      const absolute = new URL(href, base).toString()
      const parsed = new URL(absolute)
      // Reste sur le même domaine
      if (parsed.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue
      const path = parsed.pathname.toLowerCase()
      for (const pattern of BLOG_PATH_PATTERNS) {
        if (path === pattern || path === pattern + '/' || path.startsWith(pattern + '/')) {
          candidates.add(absolute.replace(/\/+$/, ''))
          break
        }
      }
    } catch {
      /* ignore malformed */
    }
  }
  // Prendre le candidat le plus court (souvent la page index du blog)
  const sorted = [...candidates].sort((a, b) => a.length - b.length)
  return sorted[0] ?? null
}

function extractCleanText(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  return bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildBlogPrompt(
  competitorLabel: string,
  blogUrl: string,
  cleanText: string,
): string {
  return `Tu analyses la stratégie de contenu du blog d'un concurrent.

CONCURRENT : ${competitorLabel}
URL DU BLOG : ${blogUrl}
EXTRAIT TEXTE BRUT DE LA PAGE INDEX DU BLOG :
${cleanText}

Analyse cet extrait et déduis :

- publication_frequency : "active" (publications très régulières, semaine/mois), "irregulière" (publications espacées ou sporadiques), "abandonnée" (rien de récent visible), "inconnue"
- dominant_topics : 3 à 5 sujets dominants détectés (mots-clés courts en français)
- average_length : "court" (<500 mots typique), "moyen" (500-1500), "long" (1500+ mots), "inconnu"
- editorial_quality : "experte" (analyse de fond, sources, expertise visible), "marketing" (contenu promotionnel orienté conversion), "faible" (du remplissage SEO), "inconnue"
- exploitable_gap : 1 phrase qui dit COMMENT mon client peut exploiter cette stratégie de contenu (ex : "Le blog est abandonné, c'est l'occasion de capter ses requêtes longue traîne", "Le blog couvre X mais ignore Y, mon client peut publier sur Y")

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte avant/après :

{
  "publication_frequency": "...",
  "dominant_topics": ["...", "..."],
  "average_length": "...",
  "editorial_quality": "...",
  "exploitable_gap": "..."
}`
}
