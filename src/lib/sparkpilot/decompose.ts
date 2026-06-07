/**
 * SparkPilot — décomposition d'un rapport SparkScan en plan d'action.
 *
 * Pipeline :
 *   1. Charge le scan SparkScan correspondant (zone, input_url, synthesis…)
 *   2. Extrait les 3 priorités stratégiques de la synthèse
 *   3. Demande à Claude de produire 3-4 tâches concrètes par priorité
 *   4. Insère le plan + les tâches en base
 *   5. Logge un événement plan_created dans sparkpilot_activity
 *   6. Retourne l'identifiant du plan créé
 *
 * Coût Claude estimé : 1 appel Sonnet 4.6, ~$0.02-0.04 par décomposition.
 */

import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

import { callClaudeJson } from '@/lib/sparkscan/claude'
import {
  loadPlaybook,
  PLAYBOOK_CATEGORIES,
  PLAYBOOK_VERSION,
  type PlaybookCategory,
} from './playbooks'
import type {
  PriorityMetadata,
  SparkpilotTask,
  SparkpilotTaskMetadata,
} from './types'

/**
 * Structure d'une priorité telle que renvoyée par SparkScan
 * (cf. src/lib/sparkscan/synthesizer.ts : SynthesisPriority).
 */
interface SparkScanPriority {
  competitor_key?: string
  competitor_label?: string
  lever?: string
  lever_reason?: string
  tactical_action?: string
  estimated_gain?: string
  estimated_cost?: string
  kpi_30j?: string
  who_does_it?: string
}

interface SparkScanSynthesis {
  executive_summary?: string
  market_overview?: string
  top3_priorities?: SparkScanPriority[]
}

interface SparkScanRow {
  id: string
  user_id: string
  input_url: string
  zone: string
  synthesis: SparkScanSynthesis | null
}

/**
 * Format que doit retourner Claude : pour chaque priorité, 3 à 4 tâches.
 * Claude doit citer la catégorie du playbook (parmi les 5) et le framework
 * éprouvé qui inspire chaque tâche.
 */
interface ClaudeTasksOutput {
  plan: {
    priorities: Array<{
      index: 1 | 2 | 3
      title: string
      reason: string
      /** Catégorie du playbook retenue (ex : "Contenu de fond"). */
      playbook_category: string
      tasks: Array<{
        title: string
        description: string
        /** Framework cité (ex : "Pillar+Cluster", "StoryBrand", "GEO"). */
        framework_used: string
        estimated_duration_minutes: number
        /** Offset en jours depuis aujourd'hui (1..90). */
        due_in_days: number
      }>
    }>
  }
}

/** Format normalisé après nettoyage, utilisé en interne pour l'insert. */
interface NormalizedPriority {
  index: 1 | 2 | 3
  title: string
  reason: string
  playbook_category: string
  tasks: Array<{
    title: string
    description: string
    framework_used: string
    estimated_duration_minutes: number
    due_in_days: number
  }>
}

const MIN_TASKS_PER_PRIORITY = 3
const MAX_TASKS_PER_PRIORITY = 4

export interface DecomposeResult {
  planId: string
  tasksInserted: number
  costUsd: number
}

/**
 * Décompose un rapport SparkScan en plan SparkPilot.
 *
 * @param scanId  Identifiant du scan SparkScan à décomposer.
 * @param supabase Client Supabase déjà authentifié (server client).
 * @param userId  Identifiant de l'utilisateur courant (auth.users.id).
 */
export async function decomposeReportToTasks(
  scanId: string,
  supabase: SupabaseClient,
  userId: string,
): Promise<DecomposeResult> {
  // 1. Charge le scan
  const { data: scanData, error: scanError } = await supabase
    .from('sparkscan_scans')
    .select('id, user_id, input_url, zone, synthesis')
    .eq('id', scanId)
    .eq('user_id', userId)
    .maybeSingle<SparkScanRow>()

  if (scanError) {
    throw new Error(`Scan introuvable : ${scanError.message}`)
  }
  if (!scanData) {
    throw new Error('Scan introuvable ou non autorisé')
  }

  const top3 = scanData.synthesis?.top3_priorities ?? []
  if (top3.length === 0) {
    throw new Error(
      "Le rapport SparkScan n'a pas encore de priorités stratégiques. Lance d'abord une analyse complète.",
    )
  }

  // 2. Charge le playbook (source de vérité unique des stratégies éprouvées)
  const playbook = await loadPlaybook()
  console.info(
    `[SparkPilot] Playbook chargé : ${PLAYBOOK_VERSION} (${playbook.length} chars)`,
  )

  // 3. Construit le prompt et appelle Claude
  console.info(
    `[SparkPilot] Décomposition Claude lancée pour scan ${scanId}, priorités: ${top3.length}`,
  )
  const prompt = buildPrompt(scanData, top3, playbook)
  const claudeResult = await callClaudeJson<ClaudeTasksOutput>({
    prompt,
    maxTokens: 4500,
    label: 'sparkpilot-decompose',
  })

  const priorities = sanitizeClaudeOutput(
    claudeResult.json?.plan?.priorities,
    top3,
  )
  if (priorities.length === 0) {
    throw new Error("La décomposition n'a produit aucune tâche utilisable.")
  }

  // Détection R0 "pas inventer" : si Claude a tagué une priorité comme hors playbook
  const pivotNeeded = priorities.filter(
    (p) => p.playbook_category === 'PIVOT_NEEDED',
  )
  if (pivotNeeded.length > 0) {
    console.info(
      `[SparkPilot] PIVOT_NEEDED détecté sur ${pivotNeeded.length} priorité(s) — aucune catégorie du playbook ne colle. À adresser en V1.5.`,
    )
  }

  // 4. Insère le plan
  const title = buildPlanTitle(scanData)
  // On ré-attache à chaque priorité ses données stratégiques RÉELLES calculées
  // par SparkScan (qui fait, coût €, gain €, indicateur 30j, levier, action,
  // concurrent visé). top3 est ordonné par priorité → on matche par index.
  const prioritiesMetadata: PriorityMetadata[] = priorities.map((p) => {
    const scanP = top3[p.index - 1] ?? {}
    const clean = (v: unknown) => {
      const s = typeof v === 'string' ? v.trim() : ''
      return s.length > 0 ? s.slice(0, 280) : undefined
    }
    return {
      index: p.index,
      title: p.title,
      reason: p.reason,
      playbook_category: p.playbook_category,
      competitor_label: clean(scanP.competitor_label),
      lever: clean(scanP.lever),
      lever_reason: clean(scanP.lever_reason),
      tactical_action: clean(scanP.tactical_action),
      estimated_gain: clean(scanP.estimated_gain),
      estimated_cost: clean(scanP.estimated_cost),
      kpi_30j: clean(scanP.kpi_30j),
      who_does_it: clean(scanP.who_does_it),
    }
  })

  const { data: insertedPlan, error: planInsertError } = await supabase
    .from('sparkpilot_plans')
    .insert({
      user_id: userId,
      scan_id: scanId,
      title,
      status: 'active',
      metadata: {
        priorities: prioritiesMetadata,
        scan: {
          input_url: scanData.input_url,
          zone: scanData.zone,
        },
        playbook_version: PLAYBOOK_VERSION,
      },
    })
    .select('id')
    .single<{ id: string }>()

  if (planInsertError || !insertedPlan) {
    throw new Error(
      `Création du plan échouée : ${planInsertError?.message ?? 'inconnue'}`,
    )
  }

  const planId = insertedPlan.id

  // 5. Insère les tâches (toutes en une fois)
  const today = new Date()
  const tasksToInsert = priorities.flatMap((priority, prioIdx) =>
    priority.tasks.map((task, taskIdx) => {
      const taskMetadata: SparkpilotTaskMetadata = {
        framework_used: task.framework_used,
        playbook_category: priority.playbook_category,
        playbook_version: PLAYBOOK_VERSION,
      }
      return {
        plan_id: planId,
        priority_index: priority.index,
        title: task.title,
        description: task.description,
        due_date: offsetDate(today, task.due_in_days),
        estimated_duration_minutes: task.estimated_duration_minutes,
        status: 'todo' as const,
        order_index: prioIdx * 100 + taskIdx,
        metadata: taskMetadata,
      }
    }),
  )

  const { error: tasksInsertError, count: insertedCount } = await supabase
    .from('sparkpilot_tasks')
    .insert(tasksToInsert, { count: 'exact' })

  if (tasksInsertError) {
    // Rollback best-effort : supprime le plan créé pour ne pas laisser d'orphelin.
    await supabase.from('sparkpilot_plans').delete().eq('id', planId)
    throw new Error(
      `Insertion des tâches échouée : ${tasksInsertError.message}`,
    )
  }

  const tasksInserted = insertedCount ?? tasksToInsert.length

  const frameworksUsed = Array.from(
    new Set(
      priorities.flatMap((p) => p.tasks.map((t) => t.framework_used)),
    ),
  )
  console.info(
    `[SparkPilot] Tâches générées : ${tasksInserted}, frameworks utilisés: [${frameworksUsed.join(', ')}]`,
  )

  // 6. Logge le journal de bord (best-effort, on n'échoue pas si ça plante)
  try {
    await supabase.from('sparkpilot_activity').insert({
      user_id: userId,
      plan_id: planId,
      task_id: null,
      event_type: 'plan_created',
      payload: {
        scan_id: scanId,
        title,
        tasks_count: tasksInserted,
        priorities_count: priorities.length,
      },
    })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { feature: 'sparkpilot', step: 'activity-log' },
      extra: { planId, scanId },
    })
  }

  return {
    planId,
    tasksInserted,
    costUsd: claudeResult.costUsd,
  }
}

/**
 * Construit le titre par défaut d'un plan : "Plan {entreprise} — {mois année}".
 * On dérive l'entreprise du domaine du scan (ex : dcg-ai.com → dcg-ai).
 */
function buildPlanTitle(scan: SparkScanRow): string {
  let company = scan.input_url
  try {
    const host = new URL(
      scan.input_url.startsWith('http')
        ? scan.input_url
        : `https://${scan.input_url}`,
    ).hostname
    company = host.replace(/^www\./, '').split('.')[0]
  } catch {
    // si l'URL est cassée, on garde input_url tel quel
  }

  const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
  const period = monthFormatter.format(new Date())
  // Capitalise la 1ère lettre du mois pour cohérence avec les mockups ("Mai 2026").
  const niceCompany = company.charAt(0).toUpperCase() + company.slice(1)
  const nicePeriod = period.charAt(0).toUpperCase() + period.slice(1)
  return `Plan ${niceCompany} — ${nicePeriod}`
}

/**
 * Construit le prompt Claude (system + user en un seul user message car
 * callClaudeJson n'expose pas encore le rôle system).
 *
 * Le prompt :
 *  1. Charge le playbook V1 complet en contexte (source de vérité unique)
 *  2. Donne le résumé du site + les 3 priorités SparkScan
 *  3. Force Claude à mapper chaque priorité à une catégorie du playbook
 *  4. Force la citation du framework éprouvé sur chaque tâche
 *  5. Demande un JSON strict { plan: { priorities: [...] } }
 *
 * R0 absolues injectées dans le prompt :
 *  - Pas inventer : si aucune catégorie ne colle → playbook_category = "PIVOT_NEEDED"
 *  - Langage simple : titres lisibles par un artisan / restaurateur / dentiste GP
 *  - Ancrage Guadeloupe : WhatsApp > SMS, marché restreint, contexte tropical
 */
function buildPrompt(
  scan: SparkScanRow,
  top3: SparkScanPriority[],
  playbook: string,
): string {
  const prioritiesBlock = top3
    .slice(0, 3)
    .map((p, i) => {
      const lines = [
        `Priorité ${i + 1} : ${p.competitor_label ?? p.competitor_key ?? `Priorité ${i + 1}`}`,
        p.lever ? `Levier : ${p.lever}` : '',
        p.lever_reason ? `Pourquoi : ${p.lever_reason}` : '',
        p.tactical_action ? `Action stratégique : ${p.tactical_action}` : '',
        p.kpi_30j ? `Indicateur à 30j : ${p.kpi_30j}` : '',
        p.who_does_it ? `Qui pilote : ${p.who_does_it}` : '',
      ].filter(Boolean)
      return lines.join('\n')
    })
    .join('\n\n')

  const allowedCategories = PLAYBOOK_CATEGORIES.map((c) => `"${c}"`).join(', ')

  const systemBlock = `[ROLE]
Tu es le moteur de décomposition de SparkPilot, un copilote opérationnel
pour des patrons de TPE en Guadeloupe (artisans, restaurateurs, dentistes,
ostéopathes, commerçants). Tu reçois 3 priorités stratégiques issues d'un
audit SparkScan. Ton job : pour CHAQUE priorité, identifier la catégorie du
playbook ci-dessous qui s'applique, puis adapter 3 à 4 tâches type du
playbook au contexte précis du site analysé.

[R0 ABSOLUES — NE PAS DÉROGER]

R0 #1 — NE PAS INVENTER
Tu DOIS choisir parmi ces 5 catégories EXACTES (orthographe stricte) :
${allowedCategories}.
Si AUCUNE catégorie ne colle vraiment à une priorité, mets
playbook_category = "PIVOT_NEEDED" et explique en 1 phrase dans "reason".
Ne crée JAMAIS une catégorie qui n'est pas dans cette liste.

R0 #2 — LANGAGE SIMPLE, ZÉRO JARGON
Les titres et descriptions des tâches doivent être lisibles par un
artisan ou un restaurateur en Guadeloupe (pas par un dev ou un growth
hacker). Verbes d'action concrets ("Rédiger", "Publier", "Filmer",
"Appeler", "Mettre en ligne"). Une seule action par tâche.
- BIEN : "Rédiger la FAQ : Combien coûte une agence IA en Guadeloupe ?"
- MAL  : "Implement long-tail keyword optimization strategy"
- MAL  : "Optimiser le tunnel de conversion via A/B test multivarié"

R0 #3 — ANCRAGE GUADELOUPE
- Cible TPE/PME en Guadeloupe (marché ~400 000 habitants, restreint)
- WhatsApp Business est PRIORITAIRE sur le SMS (SMS bloqués depuis
  numéros français vers les opérateurs GP)
- Tenir compte du décalage GMT-4 (5-6h avec Paris)
- Contexte tropical, marché de proximité, prox géographique forte

R0 #4 — ADAPTER, PAS COPIER
Tu n'as PAS le droit de copier-coller bêtement les titres du playbook.
Chaque tâche doit être adaptée au nom de l'entreprise, à son URL, à sa
zone et au contenu spécifique de la priorité SparkScan. Exemple :
- Tâche playbook : "Rédiger 1 page FAQ par question (200-400 mots)"
- Tâche adaptée : "Rédiger la FAQ DCG AI : Comment l'IA remplace une
  secrétaire en Guadeloupe ?"

R0 #5 — CITER LE FRAMEWORK
Chaque tâche DOIT mentionner dans framework_used un framework issu du
playbook (GEO, E-E-A-T, StoryBrand, AIDA, Pillar+Cluster, Skyscraper,
Hook-Story-CTA, Andromeda, PAS, CBO Meta, etc.). Pas de framework inventé.

[PLAYBOOK V1 — SOURCE DE VÉRITÉ UNIQUE]

${playbook}

[FIN DU PLAYBOOK]`

  const userBlock = `[CONTEXTE DU SITE ANALYSÉ]
- URL : ${scan.input_url}
- Zone : ${scan.zone}

[LES 3 PRIORITÉS SPARKSCAN À DÉCOMPOSER]

${prioritiesBlock}

[CONSIGNES DE GÉNÉRATION]

Pour CHAQUE priorité :
1. Identifie la catégorie du playbook qui colle le mieux (5 catégories
   autorisées, voir R0 #1).
2. Choisis 3 à 4 tâches type du playbook correspondant.
3. ADAPTE chaque tâche au contexte précis (nom entreprise dérivé de
   ${scan.input_url}, zone ${scan.zone}, levier de la priorité).
4. Cite le framework utilisé (GEO, StoryBrand, Pillar+Cluster, etc.).
5. Estime une durée réaliste : 15 = très court, 60 = 1h, 240 = 4h,
   480 = 1 journée complète.
6. Échelonne les échéances : 1ère tâche J+3 à J+7, puis J+10, J+14,
   J+21, jusqu'à J+90 max pour les tâches lourdes (article pillar 3000
   mots, série de Reels, etc.).

[FORMAT DE RETOUR — JSON STRICT, RIEN D'AUTRE]

Réponds UNIQUEMENT avec ce JSON (pas de markdown, pas de \`\`\`json) :

{
  "plan": {
    "priorities": [
      {
        "index": 1,
        "title": "Titre court de la priorité (max 6 mots)",
        "reason": "Une phrase qui rappelle pourquoi cette priorité compte pour ce site",
        "playbook_category": "Visibilité IA",
        "tasks": [
          {
            "title": "Verbe + objet concret adapté au contexte",
            "description": "1 à 2 phrases qui expliquent le quoi et le pourquoi, adaptées au site analysé",
            "framework_used": "GEO",
            "estimated_duration_minutes": 60,
            "due_in_days": 3
          }
        ]
      }
    ]
  }
}

Tu dois produire exactement ${top3.length} priorités, chacune avec
${MIN_TASKS_PER_PRIORITY} à ${MAX_TASKS_PER_PRIORITY} tâches.`

  return `${systemBlock}\n\n${userBlock}`.trim()
}

/**
 * Nettoie la sortie Claude : clamp les indexes, durées et nombres de tâches.
 * Si Claude renvoie n'importe quoi, on évite de planter — on filtre poliment.
 *
 * Garantit aussi :
 *  - `playbook_category` est soit dans PLAYBOOK_CATEGORIES, soit "PIVOT_NEEDED"
 *  - `framework_used` n'est jamais vide (fallback "Non spécifié")
 */
function sanitizeClaudeOutput(
  raw: ClaudeTasksOutput['plan']['priorities'] | undefined,
  fallbackPriorities: SparkScanPriority[],
): NormalizedPriority[] {
  if (!Array.isArray(raw)) return []

  return raw
    .slice(0, 3)
    .map((p, idx) => {
      const safeIndex = ([1, 2, 3].includes(p.index) ? p.index : idx + 1) as
        | 1
        | 2
        | 3
      const fallback = fallbackPriorities[safeIndex - 1]
      const tasks = Array.isArray(p.tasks)
        ? p.tasks
            .slice(0, MAX_TASKS_PER_PRIORITY)
            .filter(
              (t) =>
                typeof t?.title === 'string' &&
                t.title.trim().length > 0,
            )
            .map((t) => ({
              title: t.title.trim().slice(0, 200),
              description: (t.description ?? '').toString().trim().slice(0, 500),
              framework_used: normalizeFramework(t.framework_used),
              estimated_duration_minutes: clampPositiveInt(
                t.estimated_duration_minutes,
                15,
                480,
                60,
              ),
              due_in_days: clampPositiveInt(t.due_in_days, 1, 90, 7),
            }))
        : []
      return {
        index: safeIndex,
        title: (p.title ?? fallback?.competitor_label ?? `Priorité ${safeIndex}`)
          .toString()
          .trim()
          .slice(0, 100),
        reason: (p.reason ?? fallback?.lever_reason ?? '')
          .toString()
          .trim()
          .slice(0, 300),
        playbook_category: normalizeCategory(p.playbook_category),
        tasks,
      }
    })
    .filter((p) => p.tasks.length > 0)
}

/**
 * Normalise la catégorie renvoyée par Claude :
 * - si dans PLAYBOOK_CATEGORIES (match exact ou insensible accents), on garde
 * - si "PIVOT_NEEDED" (cas R0 #1), on garde tel quel
 * - sinon "PIVOT_NEEDED" par défaut (sécurité R0 pas-inventer)
 */
function normalizeCategory(raw: unknown): PlaybookCategory | 'PIVOT_NEEDED' {
  if (typeof raw !== 'string') return 'PIVOT_NEEDED'
  const trimmed = raw.trim()
  if (trimmed === 'PIVOT_NEEDED') return 'PIVOT_NEEDED'
  const exact = PLAYBOOK_CATEGORIES.find((c) => c === trimmed)
  if (exact) return exact
  // Match insensible (Claude pourrait varier les accents ou la casse)
  const loose = PLAYBOOK_CATEGORIES.find(
    (c) => c.toLowerCase().normalize() === trimmed.toLowerCase().normalize(),
  )
  return loose ?? 'PIVOT_NEEDED'
}

/** Garantit que framework_used n'est jamais vide ni absurde. */
function normalizeFramework(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) return 'Non spécifié'
  return raw.trim().slice(0, 80)
}

/** Clampe une valeur numérique entre min et max, fallback si invalide. */
function clampPositiveInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value), 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Calcule une date "today + n jours" au format YYYY-MM-DD. */
function offsetDate(reference: Date, days: number): string {
  const d = new Date(reference)
  d.setDate(d.getDate() + days)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Helper côté UI : compte les tâches par état pour afficher des KPIs. */
export function summarizeTasks(tasks: SparkpilotTask[]): {
  total: number
  done: number
  todo: number
  inProgress: number
  blocked: number
  overdue: number
  completionPercent: number
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const stats = {
    total: tasks.length,
    done: 0,
    todo: 0,
    inProgress: 0,
    blocked: 0,
    overdue: 0,
    completionPercent: 0,
  }
  for (const t of tasks) {
    if (t.status === 'done') stats.done += 1
    else if (t.status === 'in_progress') stats.inProgress += 1
    else if (t.status === 'blocked') stats.blocked += 1
    else stats.todo += 1

    if (t.status !== 'done' && t.due_date) {
      const due = new Date(`${t.due_date}T00:00:00`)
      if (due.getTime() < today.getTime()) stats.overdue += 1
    }
  }
  stats.completionPercent =
    stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)
  return stats
}
