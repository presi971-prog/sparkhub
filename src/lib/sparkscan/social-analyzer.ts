/**
 * SparkScan — analyseur stratégique des réseaux sociaux.
 *
 * Pour chaque concurrent ayant de la data RS (Facebook + Instagram récupérée par
 * social-media.ts), on demande à Claude une synthèse actionnable :
 *
 *   - frequency       : fréquence de publication observée (active/régulière/faible/inactive)
 *   - dominant_content : type de contenu dominant (1 phrase)
 *   - engagement      : niveau d'engagement (fort/moyen/faible)
 *   - opportunity     : 1 phrase exploitable par le site cible
 *
 * Coût estimé par concurrent : ~$0.005 (~600 in / 200 out).
 * Pour 6 concurrents avec data RS : ~$0.03.
 *
 * Tous les concurrents sont analysés EN PARALLÈLE via Promise.allSettled.
 */

import { callClaudeJson } from './claude'
import type { SocialMediaData } from './social-media'

export interface SocialAnalysis {
  /** Fréquence de publication observée. */
  frequency: 'active' | 'régulière' | 'faible' | 'inactive' | 'inconnue'
  /** 1 phrase : type de contenu dominant (ex : "promotions hebdo + 1 reel/mois"). */
  dominant_content: string
  /** Niveau d'engagement (ratio likes/comments vs followers). */
  engagement: 'fort' | 'moyen' | 'faible' | 'inconnu'
  /** 1 phrase actionnable : comment le site cible peut exploiter une faiblesse RS. */
  opportunity: string
}

export interface SocialAnalysisInput {
  /** Identifiant stable du concurrent (clé qualifier). */
  key: string
  /** Nom commercial du concurrent. */
  name: string
  /** Data RS récoltée par social-media.ts. */
  data: SocialMediaData
}

export interface SocialAnalysisOutput {
  byKey: Record<string, SocialAnalysis>
  totalCost: number
}

/**
 * Analyse en parallèle les RS de plusieurs concurrents. Skip ceux qui n'ont
 * ni Facebook ni Instagram dans leur data.
 */
export async function analyzeSocialBatch(
  inputs: SocialAnalysisInput[],
  langue: string = 'fr',
): Promise<SocialAnalysisOutput> {
  const withData = inputs.filter((i) => i.data.facebook || i.data.instagram)
  if (withData.length === 0) {
    console.log('[SocialAnalyzer] SKIP (aucun concurrent avec data RS)')
    return { byKey: {}, totalCost: 0 }
  }

  console.log(`[SocialAnalyzer] START count=${withData.length}`)
  const settled = await Promise.allSettled(
    withData.map((i) => analyzeOne(i, langue)),
  )

  const byKey: Record<string, SocialAnalysis> = {}
  let totalCost = 0

  settled.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      byKey[withData[idx].key] = r.value.analysis
      totalCost += r.value.costUsd
    } else {
      console.warn(
        `[SocialAnalyzer] ${withData[idx].name} failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
      )
    }
  })

  console.log(
    `[SocialAnalyzer] DONE ok=${Object.keys(byKey).length}/${withData.length} cost=$${totalCost.toFixed(4)}`,
  )

  return { byKey, totalCost }
}

async function analyzeOne(
  input: SocialAnalysisInput,
  langue: string,
): Promise<{ analysis: SocialAnalysis; costUsd: number }> {
  const prompt = buildPrompt(input, langue)
  const { json, costUsd } = await callClaudeJson<SocialAnalysis>({
    prompt,
    maxTokens: 512,
    label: `social-analyzer:${input.name.slice(0, 25)}`,
  })

  return {
    analysis: {
      frequency: normalizeFrequency(json.frequency),
      dominant_content: String(json.dominant_content ?? '').slice(0, 300),
      engagement: normalizeEngagement(json.engagement),
      opportunity: String(json.opportunity ?? '').slice(0, 300),
    },
    costUsd,
  }
}

function normalizeFrequency(v: unknown): SocialAnalysis['frequency'] {
  const s = String(v ?? '').toLowerCase()
  if (s.includes('active')) return 'active'
  if (s.includes('régulière') || s.includes('reguliere') || s.includes('regular'))
    return 'régulière'
  if (s.includes('faible') || s.includes('low')) return 'faible'
  if (s.includes('inactive')) return 'inactive'
  return 'inconnue'
}

function normalizeEngagement(v: unknown): SocialAnalysis['engagement'] {
  const s = String(v ?? '').toLowerCase()
  if (s.includes('fort') || s.includes('high') || s.includes('élevé')) return 'fort'
  if (s.includes('moyen') || s.includes('medium')) return 'moyen'
  if (s.includes('faible') || s.includes('low')) return 'faible'
  return 'inconnu'
}

function buildPrompt(input: SocialAnalysisInput, langue: string): string {
  const langInstr =
    langue === 'fr'
      ? 'en français'
      : langue === 'en'
        ? 'in English'
        : langue === 'es'
          ? 'en español'
          : `en ${langue}`

  const fbSection = input.data.facebook ? buildFacebookSection(input.data.facebook) : ''
  const igSection = input.data.instagram ? buildInstagramSection(input.data.instagram) : ''

  return `Tu analyses la présence Réseaux Sociaux d'un concurrent pour identifier comment le site cible peut le dépasser.

CONCURRENT : ${input.name}

${fbSection}
${igSection}

Produis ${langInstr} une analyse stratégique courte et actionnable :

- frequency : un seul mot parmi "active" (3+ posts/sem), "régulière" (1-3/sem), "faible" (<1/sem), "inactive" (aucun post récent), ou "inconnue" si pas de date dispo.
- dominant_content : 1 phrase courte (max 25 mots) qui décrit le TYPE de contenu dominant (ex : "Promotions hebdo + photos produits" / "Reels lifestyle 1x/sem" / "Posts informatifs B2B sans visuels").
- engagement : "fort", "moyen", "faible" ou "inconnu" — basé sur le ratio (likes + commentaires) / followers des posts visibles.
- opportunity : 1 phrase ACTIONNABLE (max 30 mots) qui dit comment le site cible peut exploiter une faiblesse RS de ce concurrent. Si la présence RS est trop solide pour être attaquée frontalement, dis-le honnêtement et propose une voie de différenciation.

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte autour :
{
  "frequency": "...",
  "dominant_content": "...",
  "engagement": "...",
  "opportunity": "..."
}`
}

function buildFacebookSection(fb: NonNullable<SocialMediaData['facebook']>): string {
  const lines: string[] = ['📘 FACEBOOK :']
  if (fb.name) lines.push(`- Page : ${fb.name}`)
  if (fb.followers !== null) lines.push(`- Followers : ${fb.followers.toLocaleString('fr-FR')}`)
  if (fb.likes !== null) lines.push(`- Likes : ${fb.likes.toLocaleString('fr-FR')}`)
  if (fb.category) lines.push(`- Catégorie : ${fb.category}`)
  if (fb.description) lines.push(`- Description : ${fb.description}`)
  if (fb.posts.length > 0) {
    lines.push(`- ${fb.posts.length} posts récents :`)
    fb.posts.forEach((p, i) => {
      const stats = [
        p.likes !== null ? `${p.likes} likes` : null,
        p.comments !== null ? `${p.comments} comm.` : null,
        p.shares !== null ? `${p.shares} partages` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      const date = p.date ? ` (${p.date.slice(0, 10)})` : ''
      lines.push(`  ${i + 1}.${date} ${p.text.slice(0, 200)}${stats ? ` — ${stats}` : ''}`)
    })
  } else {
    lines.push('- Aucun post récent visible.')
  }
  return lines.join('\n')
}

function buildInstagramSection(ig: NonNullable<SocialMediaData['instagram']>): string {
  const lines: string[] = ['📷 INSTAGRAM :']
  if (ig.username) lines.push(`- @${ig.username}${ig.verified ? ' ✓' : ''}`)
  if (ig.fullName) lines.push(`- Nom : ${ig.fullName}`)
  if (ig.followers !== null) lines.push(`- Followers : ${ig.followers.toLocaleString('fr-FR')}`)
  if (ig.following !== null) lines.push(`- Following : ${ig.following.toLocaleString('fr-FR')}`)
  if (ig.postsCount !== null) lines.push(`- Posts total : ${ig.postsCount.toLocaleString('fr-FR')}`)
  if (ig.biography) lines.push(`- Bio : ${ig.biography}`)
  if (ig.posts.length > 0) {
    lines.push(`- ${ig.posts.length} posts récents :`)
    ig.posts.forEach((p, i) => {
      const stats = [
        p.likes !== null ? `${p.likes} likes` : null,
        p.comments !== null ? `${p.comments} comm.` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      const date = p.date ? ` (${p.date.slice(0, 10)})` : ''
      lines.push(`  ${i + 1}.${date} ${p.caption.slice(0, 200)}${stats ? ` — ${stats}` : ''}`)
    })
  } else {
    lines.push('- Aucun post récent visible.')
  }
  return lines.join('\n')
}
