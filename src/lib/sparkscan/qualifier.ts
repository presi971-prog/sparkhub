/**
 * SparkScan — qualifier.
 *
 * Prend une liste de ~30 candidats bruts (sortis de DataForSEO ou Apify Maps)
 * et demande à Claude de juger chacun :
 *   - qualification : 'direct' | 'indirect' | 'noise'
 *   - relevance_score : 0-100 (impact business si on doit le battre)
 *   - reason : 1 phrase claire
 *
 * Retourne les candidats triés par score décroissant, filtre les noise.
 *
 * 1 SEUL appel Claude (batch) → coût ~$0.01-0.02 par scan.
 */

import { callClaudeJson } from './claude'

export type Qualification = 'direct' | 'indirect' | 'noise'

export interface CandidateInput {
  /** Identifiant stable utilisé pour rematcher après le passage Claude. */
  key: string
  /** Affichage humain (nom commercial, domaine, etc.). */
  label: string
  /** Sous-libellé (catégorie, adresse courte, secteur deviné…) optionnel. */
  hint?: string
  /**
   * Mini-positionnement extrait depuis le site du candidat (home + 1ère page
   * d'offre). Permet au qualifier de juger sur le VRAI contenu, pas seulement
   * sur le nom/catégorie. Crucial pour ne pas rater un concurrent direct comme
   * Digitallis (généraliste apparent + offre voicebot/chatbot sur /services).
   */
  context?: string
}

/**
 * Cadrage business renseigné par l'utilisateur avant le scan.
 * Sert à calibrer les recommandations selon ses vrais moyens et son horizon.
 */
export interface ClientContext {
  /** Objectif principal poursuivi par le client. */
  objective: 'acquisition' | 'fidelisation' | 'differenciation' | 'defense'
  /** Taille de l'équipe disponible. */
  team_size: 'solo' | '2-5' | '5+'
  /** Budget mensuel disponible en EUR pour des actions marketing/SEO/pub. */
  monthly_budget: 'under_500' | '500_2000' | '2000_plus'
  /** Horizon visé pour mesurer les résultats. */
  horizon: '30j' | '90j' | '6m'
}

export interface TargetContext {
  /** URL du site cible (raw input du user). */
  url: string
  /** Domaine extrait. */
  domain: string
  /** Titre extrait de la home (peut être vide). */
  title?: string
  /** Meta description (peut être vide). */
  description?: string
  /** Secteur deviné si on a déjà passé par young-site-analyzer (méthode B). */
  sector?: string
  /** Zone géographique cible. */
  zone: string
  /** Cadrage business du client (optionnel — sans, l'IA fait du générique). */
  clientContext?: ClientContext
}

export type Confidence = 'high' | 'medium' | 'low'

export interface QualifiedJudgment {
  key: string
  qualification: Qualification
  relevance_score: number
  reason: string
  /**
   * Degré de confiance du jugement :
   * - 'high'   : tous les critères clairement vérifiés dans le contenu fetched
   * - 'medium' : critères partiellement vérifiés ou contenu incomplet
   * - 'low'    : critères douteux, site mal lisible, ou source unique sans confirmation
   * Permet à l'UI d'afficher une étiquette "Fiable / À vérifier / Incertain".
   */
  confidence: Confidence
}

export interface QualifyResult {
  judgments: QualifiedJudgment[]
  costUsd: number
}

/**
 * Ask Claude to judge a batch of candidate competitors.
 * Filters out 'noise' and sorts the rest by relevance_score desc.
 *
 * Split en chunks de 15 candidats max pour éviter :
 *   - JSON tronqué (max_tokens 8192 atteint avec 30+ judgments)
 *   - undici timeout socket à 60s (gros prompt + gros output → 30-60s par appel)
 * Les chunks sont jugés EN PARALLÈLE (Promise.all). Résultats mergés.
 */
const QUALIFIER_CHUNK_SIZE = 15

export async function qualifyCandidates(
  target: TargetContext,
  candidates: CandidateInput[],
  langue: string = 'fr',
): Promise<QualifyResult> {
  if (candidates.length === 0) {
    return { judgments: [], costUsd: 0 }
  }

  const chunks: CandidateInput[][] = []
  for (let i = 0; i < candidates.length; i += QUALIFIER_CHUNK_SIZE) {
    chunks.push(candidates.slice(i, i + QUALIFIER_CHUNK_SIZE))
  }
  console.log(
    `[Qualifier] START target=${target.domain} candidates=${candidates.length} chunks=${chunks.length}×${QUALIFIER_CHUNK_SIZE}`,
  )

  // 1 appel Claude par chunk, EN PARALLÈLE
  const results = await Promise.all(
    chunks.map((chunk, idx) =>
      callClaudeJson<{ candidates: QualifiedJudgment[] }>({
        prompt: buildQualifyPrompt(target, chunk, langue),
        maxTokens: 4096,
        timeoutMs: 90_000,
        label: `qualifier:chunk${idx + 1}/${chunks.length}`,
      }),
    ),
  )

  // Merger les jugements de tous les chunks + normaliser la confidence
  // (Claude peut renvoyer une valeur hors enum, on retombe sur 'medium').
  const normalizeConfidence = (v: unknown): Confidence => {
    const s = String(v ?? '').toLowerCase()
    if (s === 'high') return 'high'
    if (s === 'low') return 'low'
    return 'medium'
  }
  const allJudgments: QualifiedJudgment[] = []
  let totalCost = 0
  for (const r of results) {
    const chunkJudgments = (r.json.candidates ?? [])
      .filter((j) => typeof j.key === 'string')
      .map((j) => ({
        ...j,
        confidence: normalizeConfidence(j.confidence),
      }))
    allJudgments.push(...chunkJudgments)
    totalCost += r.costUsd
  }

  // Log explicite des noise pour debug : permet de voir si des concurrents qu'on
  // attend en direct sont mal classés noise par Claude.
  const noiseList = allJudgments
    .filter((j) => j.qualification === 'noise')
    .map((j) => `${j.key} (score ${j.relevance_score})`)
  if (noiseList.length > 0) {
    console.log(`[Qualifier] NOISE classés (${noiseList.length}) : ${noiseList.join(', ')}`)
  }

  console.log(
    `[Qualifier] DONE judgments=${allJudgments.length} direct=${allJudgments.filter((j) => j.qualification === 'direct').length} indirect=${allJudgments.filter((j) => j.qualification === 'indirect').length} noise=${allJudgments.filter((j) => j.qualification === 'noise').length} cost=$${totalCost.toFixed(4)}`,
  )

  return { judgments: allJudgments, costUsd: totalCost }
}

function buildQualifyPrompt(
  target: TargetContext,
  candidates: CandidateInput[],
  langue: string,
): string {
  // Bloc candidats : chaque candidat sur plusieurs lignes pour intégrer son
  // mini-positionnement (extrait de son site). Si pas de contexte fetched,
  // fallback sur label + hint seul.
  const candidatesText = candidates
    .map((c, i) => {
      const header = `${i + 1}. key="${c.key}" — ${c.label}${c.hint ? ` (${c.hint})` : ''}`
      if (c.context && c.context.trim().length > 0) {
        return `${header}\n   Site : ${c.context.slice(0, 1200)}`
      }
      return header
    })
    .join('\n\n')

  return `Tu es analyste concurrentiel. Tu juges si chaque candidat est un VRAI concurrent commercial du site cible, ou juste du bruit (réseau social, encyclopédie, agrégateur).

SITE CIBLE :
- URL : ${target.url}
- Domaine : ${target.domain}
- Titre : ${target.title || '(inconnu)'}
- Description : ${target.description || '(inconnue)'}
- Secteur deviné : ${target.sector || '(non analysé)'}
- Zone : ${target.zone}

CANDIDATS À JUGER (issus de DataForSEO ou Google Maps) :
${candidatesText}

Pour chacun, attribue :
- qualification : "direct" (vend la même chose ou rend le même service), "indirect" (concerne le même besoin client mais autrement), "noise" (PAS un concurrent commercial : YouTube, Wikipedia, Facebook, Instagram, Reddit, Google, agrégateur d'avis, comparateur géant, blog d'actualité généraliste, etc.)
- relevance_score : entier 0-100 (impact business si on devait battre ce concurrent ; 0 = aucun, 100 = concurrent #1 vital)
- reason : 1 phrase max en ${langue === 'fr' ? 'français' : langue} expliquant ton jugement
- confidence : ton degré de certitude sur ce jugement, parmi :
    • "high"   : tu vois CLAIREMENT dans le contenu du site les éléments qui justifient la qualification (zone géo explicite + métier exact pour direct, ou critères clairement absents pour indirect/noise)
    • "medium" : un ou plusieurs critères sont seulement partiellement vérifiés (ex : pas de mention claire de la zone, ou métier voisin mais pas identique, ou contenu fetched incomplet)
    • "low"    : tu juges sur peu d'éléments (champ "Site :" vide ou très court, doute sur l'existence réelle de l'entreprise, contenu illisible) — l'humain doit vérifier manuellement

Règles strictes :
- LIS ATTENTIVEMENT le champ "Site :" de chaque candidat s'il est fourni. Il contient le VRAI positionnement (extrait de leur home + page d'offres). N'utilise pas seulement le nom de domaine ou la catégorie Google Maps.

VÉRIFICATIONS OBLIGATOIRES POUR CLASSER UN CANDIDAT EN "direct" (réunir LES DEUX) :

  ① ANCRAGE GÉOGRAPHIQUE EXPLICITE — le contenu du site du candidat doit mentionner clairement la zone du site cible (ex : "${target.zone}", département "971", "Antilles", "Caraïbe" pour la Guadeloupe). Une plateforme SaaS nationale ou internationale qui n'a AUCUNE mention de la zone cible ne peut PAS être "direct" même si son métier est similaire — c'est "indirect" (ou "noise" si vraiment pas pertinent géographiquement).

  ② ALIGNEMENT MÉTIER EXACT — le candidat doit vendre PRÉCISÉMENT le même type de service que le site cible (sur le même angle d'attaque), pas un service voisin. Exemples :
    • Site cible vend chatbot/voicebot → un acteur qui fait "prospection B2B par IA" est INDIRECT (acquisition vs service client), pas direct.
    • Site cible vend agents IA → un acteur qui fait "consulting + intégration custom" est INDIRECT (conseil vs produit), pas direct.
    • Site cible vend du SaaS → un acteur qui fait du développement sur-mesure est INDIRECT.

- Si l'un des deux critères ci-dessus n'est PAS vérifié dans le contenu fetched → "indirect", PAS "direct", même si le score business reste élevé.
- Un candidat qui apparaît "généraliste" par son nom mais qui propose EXPLICITEMENT le même service que le site cible ET avec ancrage géographique vérifié est CONCURRENT DIRECT.
- À l'inverse, un candidat qui semble proche par son nom mais dont le site montre une activité totalement différente est "noise" ou "indirect", pas "direct".
- Sois SÉVÈRE sur "noise". Wikipedia/YouTube/réseaux sociaux/Reddit/Quora sont noise SAUF si le site cible est EXACTEMENT du même type.
- Garde le reason court ET DOCUMENTÉ : précise pourquoi tu classes ainsi (ex : "Direct : voicebot+chatbot explicites + mention Guadeloupe sur /services", "Indirect : prospection B2B IA, pas chatbot — service différent malgré le mot IA", "Indirect : SaaS national, aucune mention Antilles dans le contenu").

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte avant/après :
{
  "candidates": [
    { "key": "...", "qualification": "direct|indirect|noise", "relevance_score": 0-100, "reason": "...", "confidence": "high|medium|low" }
  ]
}

Inclus TOUS les candidats reçus, dans n'importe quel ordre.`
}

/**
 * Helper: re-attach the judgments to the original candidates and return
 * the top N non-noise sorted by relevance_score desc.
 */
export type SelectedCompetitor<T> = T & {
  qualification: 'direct' | 'indirect'
  relevance_score: number
  reason: string
  confidence: Confidence
}

export function selectTopCompetitors<T extends { qualifierKey: string }>(
  candidatesWithKey: T[],
  judgments: QualifiedJudgment[],
  topN: number = 10,
): SelectedCompetitor<T>[] {
  const byKey = new Map(judgments.map((j) => [j.key, j]))
  const enriched: SelectedCompetitor<T>[] = []
  for (const c of candidatesWithKey) {
    const j = byKey.get(c.qualifierKey)
    if (!j) continue
    if (j.qualification === 'noise') continue
    enriched.push({
      ...c,
      qualification: j.qualification,
      relevance_score: j.relevance_score,
      reason: j.reason,
      confidence: j.confidence,
    })
  }
  enriched.sort((a, b) => b.relevance_score - a.relevance_score)
  return enriched.slice(0, topN)
}
