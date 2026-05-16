// Smart Crawler — AI Extraction via Claude API
// Extrait les données business structurées + analyse visuelle des images

import type { CrawlResult, ExtractedData, DemoMode, BrandColors } from './types'
import { isSocialUrl } from './crawlers/microlink'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `Tu es un expert en analyse de données commerciales. Tu reçois le contenu crawlé de plusieurs sources (site web, Facebook, Instagram, LinkedIn) pour UNE MÊME entreprise.

Ton travail : extraire et synthétiser les informations clés de cette entreprise.

RÈGLES :
- Combine les infos de TOUTES les sources disponibles. Si une info manque sur le site mais est sur Facebook, utilise Facebook.
- Si une source est vide ou a échoué, ignore-la.
- Réponds TOUJOURS en FRANÇAIS.
- Si tu ne trouves pas une info, mets une chaîne vide "".
- Pour businessName, extrait le nom commercial réel de l'entreprise tel qu'affiché publiquement (ex: "Boulangerie Lefèvre", "Cabinet Dupont & Associés", "TranspoQuickD"). C'est une info CRITIQUE — fais le maximum pour la trouver. Sources possibles, par ordre de priorité :
  1. Site web : balise <title>, og:site_name, en-tête, logo, mentions légales, footer
  2. Facebook : nom de la page (en haut), section "À propos"
  3. Instagram : nom du compte affiché (pas le @handle), bio
  4. LinkedIn : nom de l'organisation
  Si tu trouves plusieurs variantes (ex: "TranspoQuickD" et "TQD Transport"), garde la version la plus complète et la plus utilisée.
  Pas de slogan ni de tagline (genre "le transport rapide en Guadeloupe"). Si VRAIMENT introuvable après avoir cherché partout, mets "".
- Pour les horaires, utilise le format : "Lun-Ven : 9h-17h, Sam : 10h-14h" etc.
- Pour la FAQ, génère 5-8 questions/réponses pertinentes basées sur ce que tu sais du business.
- Pour le secteur, utilise un terme français (Restaurant, Salon de coiffure, Garage auto, Boulangerie, Cabinet d'avocats, etc.)
- Pour les services, liste les principaux services/produits séparés par des virgules, en français.
- Pour les zones de service, identifie les zones géographiques (ville, région).
- Pour hasChat, vérifie si le site web contient un widget de chat en ligne (exemples : Tidio, Zendesk, Intercom, Drift, LiveChat, Crisp, HubSpot Chat, Tawk.to, ou tout autre widget de chat/messagerie intégré). Cherche des indices comme : balises script de chat, boutons flottants de chat, iframes de chat, mentions de "live chat", "chat with us", "chattez avec nous". Retourne true UNIQUEMENT si tu trouves des preuves concrètes d'un chat intégré. En cas de doute, retourne false.

Réponds UNIQUEMENT avec du JSON valide suivant ce schéma exact :
{
  "businessName": "Nom commercial de l'entreprise",
  "description": "Description de l'entreprise en 2-3 phrases",
  "industry": "Catégorie du secteur",
  "services": "Liste des principaux services séparés par des virgules",
  "serviceAreas": "Zones géographiques desservies",
  "hours": "Horaires d'ouverture",
  "faq": "Q: question ?\\nR: réponse\\n\\nQ: question ?\\nR: réponse",
  "hasChat": false
}

IMPORTANT — FORMAT DE SORTIE STRICT :
- Ta réponse DOIT commencer par "{" et finir par "}".
- AUCUN texte avant le "{" (pas de "Voici le résultat", pas de "Bien sûr").
- AUCUN texte après le "}" (pas de "J'espère que ça aide", pas de "N'hésitez pas").
- AUCUN bloc de code Markdown autour (pas de \`\`\`json).
- Juste le JSON brut. Rien d'autre.`

const COLOR_ANALYSIS_PROMPT = `Analyse cette image (logo, photo de profil ou cover d'une entreprise).

Génère une PALETTE WEB COHÉRENTE de 5 couleurs en HEX, prête à utiliser pour un site vitrine premium :

- "primary"    : couleur principale de la marque (boutons, accents forts, headings)
- "secondary"  : couleur de fond secondaire des sections (légèrement plus sombre/claire que background)
- "accent"     : couleur d'accent pour highlights/dividers (souvent une teinte chaude ou contrastée)
- "background" : couleur de fond principale du site. Si la marque évoque le luxe/sérieux → fond sombre (#0E1330 type). Sinon → fond clair (#FFFFFF / beige). Choisis selon l'image.
- "text"       : couleur du texte principal. DOIT avoir un contraste fort avec background (clair sur fond sombre, sombre sur fond clair). Vérifie WCAG AA.

CONTRAINTES :
- Toutes les couleurs DOIVENT être harmonieuses entre elles (palette cohérente, pas de couleurs aléatoires).
- Si l'image n'a pas assez d'info pour déduire les couleurs (icône générique, photo unie), génère quand même une palette pro qui correspond à l'ambiance de l'image.

Réponds UNIQUEMENT avec un JSON, AUCUN texte avant ou après :
{
  "primary":    "#hex",
  "secondary":  "#hex",
  "accent":     "#hex",
  "background": "#hex",
  "text":       "#hex"
}`

function buildUserPrompt(results: CrawlResult[], companyName?: string): string {
  const sections = results.map((r) => {
    const label = r.source.toUpperCase()
    return `=== ${label} (${r.url}) ===\n${r.content}`
  })

  const name = companyName ? ` "${companyName}"` : ''

  return `Voici les données crawlées pour l'entreprise${name} :\n\n${sections.join('\n\n')}\n\nExtrais les informations structurées.`
}

/**
 * Extrait les URLs des images depuis le contenu crawlé (markdown).
 * Cherche les images Facebook (scontent), Instagram, et les URLs classiques.
 */
export function extractImageUrls(crawlResults: CrawlResult[]): string[] {
  const imageUrls: string[] = []
  const seen = new Set<string>()

  for (const result of crawlResults) {
    if (!result.success) continue

    // Chercher les URLs d'images dans le markdown
    const imgRegex = /https?:\/\/[^\s)"\]]+\.(?:jpg|jpeg|png|webp)[^\s)"\]]*/gi
    const scontentRegex = /https?:\/\/scontent[^\s)"\]]+/gi

    const matches = [
      ...(result.content.match(imgRegex) || []),
      ...(result.content.match(scontentRegex) || []),
    ]

    for (const url of matches) {
      // Nettoyer l'URL
      const cleanUrl = url.replace(/[)\]"]+$/, '')
      // Dédupliquer par nom de fichier
      const fileName = cleanUrl.split('/').pop()?.split('?')[0] || ''
      if (!seen.has(fileName) && cleanUrl.length > 30) {
        seen.add(fileName)
        imageUrls.push(cleanUrl)
      }
    }
  }

  // Retourner max 5 images uniques
  return imageUrls.slice(0, 5)
}

/**
 * Télécharge une image et la convertit en base64.
 */
async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const mediaType = contentType.split(';')[0].trim()

    return { base64, mediaType }
  } catch {
    return null
  }
}

/**
 * Extrait le premier objet JSON équilibré d'un texte (du premier `{` jusqu'au
 * `}` qui referme l'objet, en respectant les strings et les caractères échappés).
 *
 * Plus robuste que `text.match(/\{[\s\S]*\}/)` qui est glouton et capture
 * du premier `{` au DERNIER `}` du texte — ce qui plante si Claude ajoute
 * du texte avec accolades après le JSON (ex: "j'espère que { ça aide }").
 *
 * @returns la chaîne JSON brute, ou null si pas d'objet équilibré trouvé.
 */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = start; i < text.length; i++) {
    const c = text[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (inString) {
      if (c === '\\') {
        escapeNext = true
      } else if (c === '"') {
        inString = false
      }
      continue
    }

    if (c === '"') {
      inString = true
      continue
    }

    if (c === '{') {
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0) {
        return text.slice(start, i + 1)
      }
    }
  }

  return null
}

/**
 * Wrapper fetch pour l'API Claude avec retry sur 429/5xx + erreurs réseau.
 * Backoff exponentiel : 1s, 2s, 4s...
 *
 * - Succès (2xx) ou 4xx (sauf 429) → retour immédiat
 * - 429 (rate-limit) ou 5xx (transient) → retry jusqu'à maxAttempts
 * - Erreur réseau → retry jusqu'à maxAttempts
 *
 * RAISON : Claude renvoie souvent 529 ("overloaded") aux pics d'usage. Sans retry,
 * on jette le contact (markContactAsCrawlerFailed) pour rien — alors qu'un retry
 * 1-2 secondes plus tard aurait réussi.
 */
async function fetchClaudeWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 2,
): Promise<Response> {
  let lastNetworkError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init)
      // 2xx OK, ou 4xx autre que 429 (vraie erreur de notre côté, retry inutile)
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        if (attempt > 1) {
          console.log(`[SmartCrawler] Claude API OK après ${attempt} tentatives`)
        }
        return response
      }
      // 429 ou 5xx → transient, on retry si on a encore des tentatives
      const bodySnippet = await response.text().catch(() => '')
      console.warn(`[SmartCrawler] Claude API attempt ${attempt}/${maxAttempts}: HTTP ${response.status} ${bodySnippet.slice(0, 200)}`)
      if (attempt === maxAttempts) {
        // Plus de tentatives → on retourne la response telle quelle pour que l'appelant
        // gère l'erreur normalement (via response.ok === false).
        return new Response(bodySnippet, { status: response.status, statusText: response.statusText })
      }
    } catch (e) {
      lastNetworkError = e
      console.warn(`[SmartCrawler] Claude API attempt ${attempt}/${maxAttempts} network error:`, e)
      if (attempt === maxAttempts) {
        throw e
      }
    }
    // Backoff exponentiel : 1s, 2s, 4s...
    const delayMs = 1000 * Math.pow(2, attempt - 1)
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
  }
  // Théoriquement inatteignable (la boucle return ou throw avant) — garde-fou TS
  throw lastNetworkError || new Error('[SmartCrawler] Claude API: unreachable')
}

/**
 * Analyse les couleurs dominantes d'une image via Claude Vision.
 * Télécharge l'image d'abord (Facebook bloque Claude via robots.txt).
 */
function isValidHex(s: unknown): s is string {
  return typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s.trim())
}

async function analyzeImageColors(imageUrl: string): Promise<BrandColors | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const imageData = await downloadImageAsBase64(imageUrl)
  if (!imageData) {
    console.warn('[SmartCrawler] Impossible de télécharger l\'image pour analyse couleurs')
    return null
  }

  try {
    // Analyse couleurs : aussi via retry helper (cas 529 fréquents).
    // Si toujours en échec après retries → on retourne null, le mini-site utilise
    // sa palette de fallback (pas critique).
    const response = await fetchClaudeWithRetry(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageData.mediaType, data: imageData.base64 } },
            { type: 'text', text: COLOR_ANALYSIS_PROMPT },
          ],
        }],
      }),
    })

    if (!response.ok) {
      console.warn(`[SmartCrawler] Analyse couleurs échouée après retries: ${response.status}`)
      return null
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const jsonStr = extractFirstJsonObject(text)
    if (!jsonStr) return null

    const raw = JSON.parse(jsonStr)
    const colors: BrandColors = {
      primary:    isValidHex(raw.primary)    ? raw.primary.trim()    : '',
      secondary:  isValidHex(raw.secondary)  ? raw.secondary.trim()  : '',
      accent:     isValidHex(raw.accent)     ? raw.accent.trim()     : '',
      background: isValidHex(raw.background) ? raw.background.trim() : '',
      text:       isValidHex(raw.text)       ? raw.text.trim()       : '',
    }

    // Si aucune clé valide → null (le mini-site utilisera son fallback complet)
    const validCount = Object.values(colors).filter(Boolean).length
    if (validCount === 0) return null

    // Sinon retourne ce qu'on a — clés vides seront remplies par le fallback côté mini-site
    console.log(`[SmartCrawler] Palette détectée (${validCount}/5):`, colors)
    return colors
  } catch (error) {
    console.warn('[SmartCrawler] Erreur analyse couleurs:', error)
    return null
  }
}

/**
 * Envoie le contenu crawlé à Claude pour extraction structurée.
 * Analyse aussi les images pour les couleurs de la marque.
 */
export async function extractBusinessData(
  crawlResults: CrawlResult[],
  companyName?: string
): Promise<ExtractedData> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('[SmartCrawler] ANTHROPIC_API_KEY manquante')
  }

  const successfulResults = crawlResults.filter((r) => r.success && r.content.length > 0)

  if (successfulResults.length === 0) {
    throw new Error('[SmartCrawler] Aucun contenu à analyser')
  }

  // Extraire les images du contenu crawlé
  const imageUrls = extractImageUrls(successfulResults)
  console.log(`[SmartCrawler] ${imageUrls.length} images trouvées`)

  // Lancer l'extraction texte ET l'analyse couleurs en parallèle
  const userPrompt = buildUserPrompt(successfulResults, companyName)

  const [textResponse, brandColors] = await Promise.all([
    // Extraction texte (avec retry 2x sur 429/5xx via fetchClaudeWithRetry)
    fetchClaudeWithRetry(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    }),
    // Analyse couleurs (première image = logo/profil)
    imageUrls.length > 0 ? analyzeImageColors(imageUrls[0]) : Promise.resolve(null as BrandColors | null),
  ])

  if (!textResponse.ok) {
    const errText = await textResponse.text()
    throw new Error(`[SmartCrawler] Claude API ${textResponse.status}: ${errText}`)
  }

  const data = await textResponse.json()
  const content = data.content?.[0]?.text || ''

  // Parser le JSON avec un parser robuste (s'arrête au premier objet équilibré,
  // résiste aux accolades dans des phrases qui suivraient le JSON).
  const jsonStr = extractFirstJsonObject(content)
  if (!jsonStr) {
    console.error('[SmartCrawler] Claude n\'a pas retourné de JSON:', content)
    throw new Error('[SmartCrawler] Extraction IA: pas de JSON valide')
  }

  try {
    const parsed = JSON.parse(jsonStr)
    console.log(`[SmartCrawler] Couleurs marque: ${brandColors ? 'détectées' : 'non détectées'}`)
    return {
      businessName: parsed.businessName || '',
      description: parsed.description || '',
      industry: parsed.industry || '',
      services: parsed.services || '',
      serviceAreas: parsed.serviceAreas || '',
      hours: parsed.hours || '',
      faq: parsed.faq || '',
      hasChat: parsed.hasChat === true,
      brandColors: brandColors,
      logoUrl: imageUrls[0] || '',
      // Si on a une 2e image distincte (cas Instagram avec posts récents,
      // ou site web avec galerie), on l'utilise en bannière hero — meilleur
      // effet "wouaa c'est ma photo" qu'un logo carré.
      // Sinon on retombe sur la 1re image (cas FB qui ne renvoie qu'un logo).
      heroImageUrl: imageUrls[1] || imageUrls[0] || '',
      imageUrls: imageUrls.slice(1),
    }
  } catch {
    console.error('[SmartCrawler] JSON invalide:', jsonStr)
    throw new Error('[SmartCrawler] Extraction IA: JSON malformé')
  }
}

/**
 * Détermine le mode de démo : avec site existant ou sans site (mini-site à générer).
 *
 * RÈGLE :
 * - Pas d'URL → mini-site (without_site).
 * - URL = page de réseau social (FB / IG / LI) → mini-site (without_site).
 *   Raison : on NE doit JAMAIS afficher la page Facebook brute du prospect dans
 *   l'iframe de démo (mauvaise expérience, FB demande login, design impersonnel).
 *   Le mini-site DCG AI est plus pro et reflète l'identité du prospect.
 * - URL = vrai site web → with_site (screenshot du site).
 */
export function detectDemoMode(website?: string): DemoMode {
  if (!website || website.trim().length === 0) {
    return 'without_site'
  }
  if (isSocialUrl(website)) {
    return 'without_site'
  }
  return 'with_site'
}
