/**
 * SparkScan — enricher.
 *
 * Pour chaque concurrent qualifié :
 *   1. Fetch la home page (best effort, timeout court).
 *   2. Extrait title + meta + body (~2000 chars).
 *   3. Demande à Claude :
 *       - positioning   : 1 phrase
 *       - strengths     : 3 forces
 *       - weaknesses    : 3 faiblesses exploitables
 *       - tactical_action : 1 action concrète à faire cette semaine pour grignoter
 *
 * Tous les concurrents sont enrichis EN PARALLÈLE (Promise.allSettled) pour
 * éviter qu'un site lent bloque les autres.
 *
 * Coût par concurrent : ~$0.012 (Claude sonnet 4.6 ~1500 in / 500 out).
 * Pour 10 concurrents : ~$0.12.
 */

import { callClaudeJson } from './claude'
import type { TargetContext } from './qualifier'

import { fetchPageSafe, fetchOfferPagesContent } from './web-fetch'

export interface EnrichInput {
  /** Identifiant stable (clé qualifier ou domain). */
  key: string
  /** Nom commercial / domaine affiché. */
  label: string
  /** URL home utilisée pour le fetch. Si vide → on saute le fetch. */
  url: string | null
  /** Catégorie / secteur (utile si l'IA n'a pas le contexte). */
  category?: string | null
}

export interface CompetitorEnrichment {
  positioning: string
  strengths: string[]
  weaknesses: string[]
  tactical_action: string
  /** Si le fetch a échoué, l'enrichissement repose uniquement sur le label. */
  source_quality: 'site_read' | 'name_only'
  /** URLs Facebook + Instagram extraites du HTML home (null si non trouvée). */
  social_links?: SocialLinks
}

export interface SocialLinks {
  facebook: string | null
  instagram: string | null
}

export interface EnrichResult {
  key: string
  enrichment: CompetitorEnrichment | null
  /** Message d'erreur si l'enrichissement entier a échoué. */
  error?: string
  costUsd: number
}

export async function enrichCompetitors(
  target: TargetContext,
  inputs: EnrichInput[],
  langue: string = 'fr',
): Promise<{ results: EnrichResult[]; totalCost: number }> {
  if (inputs.length === 0) return { results: [], totalCost: 0 }

  console.log(`[Enricher] START count=${inputs.length}`)
  const settled = await Promise.allSettled(
    inputs.map((input) => enrichOne(target, input, langue)),
  )
  const results: EnrichResult[] = settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          key: inputs[i].key,
          enrichment: null,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
          costUsd: 0,
        },
  )
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0)
  const okCount = results.filter((r) => r.enrichment).length
  console.log(
    `[Enricher] DONE ok=${okCount}/${inputs.length} totalCost=$${totalCost.toFixed(4)}`,
  )
  return { results, totalCost }
}

async function enrichOne(
  target: TargetContext,
  input: EnrichInput,
  langue: string,
): Promise<EnrichResult> {
  let homeSignal: string | null = null
  let socialLinks: SocialLinks = { facebook: null, instagram: null }
  let sourceQuality: 'site_read' | 'name_only' = 'name_only'

  if (input.url) {
    try {
      const fetched = await fetchHomeSignal(input.url)
      homeSignal = fetched.signal
      socialLinks = fetched.socialLinks
      sourceQuality = 'site_read'
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[Enricher] fetch ${input.url} failed: ${msg} → name-only`)
    }
  }

  const prompt = buildEnrichPrompt(target, input, homeSignal, langue)
  const { json, costUsd } = await callClaudeJson<CompetitorEnrichment>({
    prompt,
    maxTokens: 1024,
    label: `enricher:${input.label.slice(0, 30)}`,
  })

  return {
    key: input.key,
    enrichment: {
      positioning: String(json.positioning ?? ''),
      strengths: Array.isArray(json.strengths)
        ? json.strengths.map(String).slice(0, 3)
        : [],
      weaknesses: Array.isArray(json.weaknesses)
        ? json.weaknesses.map(String).slice(0, 3)
        : [],
      tactical_action: String(json.tactical_action ?? ''),
      source_quality: sourceQuality,
      social_links: socialLinks,
    },
    costUsd,
  }
}

/**
 * Récupère le contexte complet d'un concurrent : home page + jusqu'à 3 pages
 * d'offre/services/produits trouvées via le menu de navigation. Conçu pour
 * fonctionner sur n'importe quel business (IA, livraison, restauration, etc.).
 */
async function fetchHomeSignal(
  url: string,
): Promise<{ signal: string; socialLinks: SocialLinks }> {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`
  const homeHtml = await fetchPageSafe(fullUrl)
  if (!homeHtml) throw new Error(`HTTP error fetching ${fullUrl}`)

  // Extrait le domaine du concurrent pour filtrer les handles IG/FB :
  // un site peut contenir plusieurs liens réseaux sociaux (templates,
  // sponsors, footers d'agences) — on veut le handle de la VRAIE marque.
  let ownerDomain: string | null = null
  try {
    ownerDomain = new URL(fullUrl).hostname
  } catch {
    ownerDomain = null
  }

  const homeSignal = extractSignal(homeHtml)
  const socialLinks = extractSocialLinks(homeHtml, ownerDomain)

  // Fetch jusqu'à 3 pages d'offre identifiées via les liens nav de la home
  const offerFragments = await fetchOfferPagesContent(homeHtml, fullUrl, extractSignal)
  const fullSignal =
    offerFragments.length > 0
      ? `${homeSignal}\n\n${offerFragments.join('\n\n')}`
      : homeSignal
  if (offerFragments.length > 0) {
    console.log(`[Enricher] ${fullUrl} home + ${offerFragments.length} pages offres`)
  }

  return {
    signal: fullSignal,
    socialLinks,
  }
}

/**
 * Cherche les URLs Facebook et Instagram dans le HTML d'une page (footer/header
 * généralement). Récolte TOUS les handles candidats, puis garde celui qui
 * ressemble le plus au domaine du concurrent.
 *
 * Pourquoi : un site peut contenir plusieurs liens IG/FB (témoignages, "site
 * conçu par X", widgets externes, etc.). Prendre le premier provoque des
 * faux positifs (ex : Karaib IA → @agencevoxial parce que le template/footer
 * Voxial laissait traîner son IG). On veut le handle de la VRAIE marque.
 */
function extractSocialLinks(html: string, ownerDomain: string | null): SocialLinks {
  return {
    facebook: extractFacebookUrl(html, ownerDomain),
    instagram: extractInstagramUrl(html, ownerDomain),
  }
}

/**
 * Racine du domaine sans TLD pour la comparaison de similarité.
 * "karaib-ia.fr" → "karaib-ia" ; "www.suity.agency" → "suity"
 */
function rootFromDomain(domain: string | null): string | null {
  if (!domain) return null
  const clean = domain.toLowerCase().replace(/^www\./, '').replace(/\.[a-z]{2,}$/i, '')
  return clean.split('.')[0] || null
}

/**
 * Score de similarité entre un handle réseau social et la racine de domaine.
 * 1 = un est substring de l'autre (cas évident comme "suityagency" vs "suity").
 * Sinon : Jaccard sur les bigrams (couvre les variantes proches).
 * Retour entre 0 et 1.
 */
function handleSimilarity(handle: string, expected: string): number {
  const h = handle.toLowerCase().replace(/[._-]/g, '')
  const e = expected.toLowerCase().replace(/[._-]/g, '')
  if (h.length < 2 || e.length < 2) return 0
  if (h.includes(e) || e.includes(h)) return 1
  const A = new Set<string>()
  for (let i = 0; i < h.length - 1; i++) A.add(h.substring(i, i + 2))
  const B = new Set<string>()
  for (let i = 0; i < e.length - 1; i++) B.add(e.substring(i, i + 2))
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const x of A) if (B.has(x)) inter += 1
  return inter / (A.size + B.size - inter)
}

/**
 * Choisit le meilleur handle parmi les candidats par rapport au domaine
 * attendu. Si ownerDomain est null OU aucun candidat ne dépasse le seuil,
 * fallback sur le 1er candidat (comportement legacy).
 */
const HANDLE_MATCH_THRESHOLD = 0.5

function pickBestHandle(candidates: string[], ownerDomain: string | null): string | null {
  if (candidates.length === 0) return null
  const expected = rootFromDomain(ownerDomain)
  // Pas de domaine de référence (legacy) : on retombe sur le 1er handle, comportement
  // historique. On ne casse rien quand on appelle sans contexte.
  if (!expected) return candidates[0]
  // On scoure TOUS les candidats — même s'il n'y en a qu'un, on veut filtrer
  // un éventuel faux positif (cas Karaib IA : seul handle = @agencevoxial laissé
  // par le template Voxial, alors que Karaib IA n'a pas de compte IG).
  let best: { handle: string; score: number } | null = null
  for (const h of candidates) {
    const score = handleSimilarity(h, expected)
    if (!best || score > best.score) best = { handle: h, score }
  }
  if (!best) return null
  // Sous le seuil : on préfère renvoyer null qu'un faux positif visible dans le rapport.
  return best.score >= HANDLE_MATCH_THRESHOLD ? best.handle : null
}

const FB_BLOCKLIST = new Set([
  'sharer',
  'sharer.php',
  'dialog',
  'tr',
  'plugins',
  'embed',
  'events',
  'policies',
  'business',
  'help',
  'groups',
  'marketplace',
  'watch',
  'gaming',
  'reel',
  'login',
  'recover',
  'signup',
  'home.php',
  'pages',
  'people',
  'profile.php',
])

function extractFacebookUrl(html: string, ownerDomain: string | null): string | null {
  const re =
    /https?:\/\/(?:www\.|m\.)?facebook\.com\/([a-zA-Z0-9._-]+)(\/[^"'?#\s<>]*)?/gi
  const candidates: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const handle = m[1]
    if (FB_BLOCKLIST.has(handle.toLowerCase())) continue
    if (handle.length < 2) continue
    if (seen.has(handle.toLowerCase())) continue
    seen.add(handle.toLowerCase())
    candidates.push(handle)
  }
  const best = pickBestHandle(candidates, ownerDomain)
  return best ? `https://www.facebook.com/${best}` : null
}

const IG_BLOCKLIST = new Set([
  'accounts',
  'explore',
  'p',
  'reel',
  'reels',
  'tv',
  'stories',
  'embed',
  'about',
  'directory',
  'developer',
  'legal',
])

function extractInstagramUrl(html: string, ownerDomain: string | null): string | null {
  const re =
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)(\/[^"'?#\s<>]*)?/gi
  const candidates: string[] = []
  const seen = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const handle = m[1]
    if (IG_BLOCKLIST.has(handle.toLowerCase())) continue
    if (handle.length < 2) continue
    if (seen.has(handle.toLowerCase())) continue
    seen.add(handle.toLowerCase())
    candidates.push(handle)
  }
  const best = pickBestHandle(candidates, ownerDomain)
  return best ? `https://www.instagram.com/${best}/` : null
}

function extractSignal(html: string): string {
  const title = match(html, /<title[^>]*>([^<]+)<\/title>/i)
  const description =
    match(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
    match(html, /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
  const headings: string[] = []
  const headingRe = /<(h1|h2)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(html)) !== null && headings.length < 10) {
    const text = stripTags(m[2]).trim()
    if (text) headings.push(text)
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const bodyHtml = bodyMatch ? bodyMatch[1] : html
  const bodyText = stripTags(
    bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ''),
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
  return [
    title && `TITRE : ${title}`,
    description && `DESCRIPTION : ${description}`,
    headings.length && `H1/H2 : ${headings.join(' | ')}`,
    bodyText && `EXTRAIT : ${bodyText}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function match(html: string, re: RegExp): string {
  const m = html.match(re)
  return m ? m[1].trim() : ''
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ')
}

function buildEnrichPrompt(
  target: TargetContext,
  input: EnrichInput,
  homeSignal: string | null,
  langue: string,
): string {
  const langInstr =
    langue === 'fr'
      ? 'en français'
      : langue === 'en'
        ? 'in English'
        : langue === 'es'
          ? 'en español'
          : `en ${langue}`

  return `Tu analyses un concurrent du site cible pour aider mon client à le dépasser.

SITE CIBLE : ${target.domain}
- Titre : ${target.title || '(inconnu)'}
- Secteur : ${target.sector || '(non analysé)'}
- Zone : ${target.zone}

CONCURRENT À ANALYSER : ${input.label}
${input.category ? `Catégorie connue : ${input.category}` : ''}
${
  homeSignal
    ? `Page d'accueil du concurrent :\n${homeSignal}`
    : `(Pas de page d'accueil accessible — analyse à partir du nom uniquement.)`
}

Produis ${langInstr} :
- positioning : 1 phrase qui décrit comment ce concurrent se positionne face au site cible (ex : "Marketplace généraliste qui couvre tout le panier moyen du client cible avec une livraison rapide")
- strengths : 3 forces concrètes de CE concurrent (pas génériques)
- weaknesses : 3 faiblesses EXPLOITABLES par le site cible (concrètes : "Pas de boutique physique en Guadeloupe", "Mauvaise UX mobile", "Absence de programme fidélité")
- tactical_action : UNE action concrète et chiffrable que mon client peut faire DÈS CETTE SEMAINE pour grignoter des parts à ce concurrent (ex : "Publier 3 articles ciblés sur les requêtes 'X' où ce concurrent n'a pas de contenu")

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte autour :
{
  "positioning": "...",
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "tactical_action": "..."
}`
}
