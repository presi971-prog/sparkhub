/**
 * SparkPilot — Garde-fou expert.
 *
 * Relit chaque priorité produite par SparkScan et la CONFRONTE à un référentiel
 * de stratégies PROUVÉES et SOURCÉES (referentiel-prouve-2026.md).
 *
 * R0 ABSOLUE ANTI-INVENTION (demandé explicitement par Thierry le 08/06/2026) :
 *   - L'expert juge UNIQUEMENT à partir du référentiel fourni.
 *   - S'il n'y a NI tactique prouvée NI anti-pattern qui s'applique → verdict
 *     'non_verifiable' : on dit "je ne sais pas", on n'invente JAMAIS de preuve,
 *     de chiffre ou de source.
 *
 * Le verdict est purement ADDITIF : si la review échoue (réseau, parsing…), la
 * génération du plan continue normalement sans avis (graceful degradation).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { callClaudeJson } from '@/lib/sparkscan/claude'
import type { ExpertReview } from './types'

/** Priorité telle que reçue de SparkScan (champs utiles à la critique). */
export interface PriorityToReview {
  index: 1 | 2 | 3
  title: string
  reason?: string
  lever?: string
  tactical_action?: string
  playbook_category?: string
}

const REFERENTIEL_FILE = path.join(
  process.cwd(),
  'src',
  'lib',
  'sparkpilot',
  'playbooks',
  'referentiel-prouve-2026.md',
)

let cachedReferentiel: string | null = null

async function loadReferentiel(): Promise<string> {
  if (cachedReferentiel !== null) return cachedReferentiel
  cachedReferentiel = await fs.readFile(REFERENTIEL_FILE, 'utf8')
  return cachedReferentiel
}

interface ClaudeReviewResponse {
  reviews: Array<{
    index: number
    verdict: string
    analyse?: string
    recommandation?: string
    source?: string
  }>
}

const VALID_VERDICTS: ExpertReview['verdict'][] = [
  'valide',
  'a_ajuster',
  'a_demonter',
  'non_verifiable',
]

function normalizeVerdict(v: unknown): ExpertReview['verdict'] {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s-]/g, '_')
  return (VALID_VERDICTS as string[]).includes(s)
    ? (s as ExpertReview['verdict'])
    : 'non_verifiable'
}

function clean(v: unknown, max = 400): string | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length > 0 ? s.slice(0, max) : undefined
}

/**
 * Critique les priorités de SparkScan à partir du référentiel prouvé.
 * Retourne un map index → ExpertReview. En cas d'échec, retourne {} (le plan
 * se génère quand même, sans avis expert).
 */
export async function reviewPriorities(
  priorities: PriorityToReview[],
): Promise<Record<number, ExpertReview>> {
  if (priorities.length === 0) return {}

  const referentiel = await loadReferentiel()

  const prioritiesText = priorities
    .map(
      (p) =>
        `Priorité ${p.index} : ${p.title}\n` +
        `  - Levier proposé : ${p.lever ?? '(non précisé)'}\n` +
        `  - Action proposée : ${p.tactical_action ?? '(non précisée)'}\n` +
        `  - Raison : ${p.reason ?? '(non précisée)'}`,
    )
    .join('\n\n')

  const prompt = `Tu es un consultant marketing senior, rigoureux et honnête. Tu dois donner un AVIS D'EXPERT ("garde-fou") sur des recommandations stratégiques produites par un outil d'analyse, pour une TPE / artisan / libéral local en Guadeloupe.

=== RÉFÉRENTIEL DE STRATÉGIES PROUVÉES (TA SEULE BASE DE JUGEMENT) ===
${referentiel}
=== FIN DU RÉFÉRENTIEL ===

=== RECOMMANDATIONS À ÉVALUER ===
${prioritiesText}
=== FIN ===

Pour CHAQUE priorité, donne un avis fondé UNIQUEMENT sur le référentiel ci-dessus :
- "verdict" :
   • "valide" = s'appuie sur une tactique [PROUVÉ] ou [TENDANCE] du référentiel.
   • "a_ajuster" = correcte mais améliorable par une tactique prouvée du référentiel.
   • "a_demonter" = correspond à un ANTI-PATTERN du référentiel (rare).
   • "non_verifiable" = le référentiel ne traite PAS ce sujet → tu ne te prononces pas.
- "analyse" : 1 à 2 phrases SIMPLES (zéro jargon, tutoiement), pourquoi ce verdict.
- "recommandation" : si "a_ajuster", la version prouvée à appliquer ; sinon "".
- "source" : le principe exact du référentiel invoqué (ex : "Régularité > volume (Buffer)") ; "" si non_verifiable.

RÈGLES ABSOLUES (NON NÉGOCIABLES) :
1. Juge UNIQUEMENT à partir du référentiel. N'utilise PAS tes connaissances générales.
2. Si le référentiel ne couvre pas le sujet → "non_verifiable". N'invente JAMAIS de preuve, de chiffre, de pourcentage ni de source.
3. Ne cite aucun chiffre qui n'est pas écrit dans le référentiel.
4. Français simple, pour un artisan (pas un marketeur).

Réponds en JSON STRICT, rien d'autre :
{"reviews":[{"index":1,"verdict":"...","analyse":"...","recommandation":"...","source":"..."}]}`

  const { json } = await callClaudeJson<ClaudeReviewResponse>({
    prompt,
    maxTokens: 1800,
    label: 'sparkpilot-expert-review',
  })

  const out: Record<number, ExpertReview> = {}
  for (const r of json?.reviews ?? []) {
    const idx = Number(r.index)
    if (![1, 2, 3].includes(idx)) continue
    out[idx] = {
      verdict: normalizeVerdict(r.verdict),
      analyse: clean(r.analyse) ?? 'Avis non disponible.',
      recommandation: clean(r.recommandation),
      source: clean(r.source, 160),
    }
  }
  return out
}
