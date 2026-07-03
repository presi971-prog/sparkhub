/**
 * SparkPilot Chat — construction du system prompt enrichi.
 *
 * Le coach SparkPilot connaît :
 *   - L'utilisateur (nom, ville, métier déduit du profil)
 *   - La page courante (dashboard / plan / tâche / calendrier / glossaire)
 *   - Si une tâche est ouverte : son titre, sa description, son framework,
 *     sa priorité parente, sa date prévue, sa durée estimée
 *   - Si un plan est ouvert : son titre, ses 3 priorités, nombre de tâches
 *     faites / restantes, snapshot du rapport SparkScan source
 *   - Le playbook v2.0 complet (5 catégories × 16 frameworks éprouvés)
 *   - Le contexte Guadeloupe (WhatsApp prioritaire, marché restreint, etc.)
 *
 * R0 absolues injectées :
 *   - Langage simple, zéro jargon non traduit
 *   - Réponses courtes (3-5 phrases idéalement, max 10)
 *   - Toujours un exemple concret ancré Guadeloupe quand possible
 *   - Si on ne sait pas, on le dit — pas d'invention
 *   - Tutoiement obligatoire
 */

import { loadPlaybook, PLAYBOOK_VERSION } from '../playbooks'
import type { SparkpilotPlan, SparkpilotTask } from '../types'

/** Informations utilisateur dérivées du profil Supabase. */
export interface ChatUserProfile {
  /** Prénom affiché (ex: "Thierry"). Fallback "toi" si inconnu. */
  firstName?: string | null
  /** Nom complet (full_name dans profiles). */
  fullName?: string | null
  /** Métier déclaré (artisan, restaurateur, dentiste...). Optionnel. */
  metier?: string | null
  /** Ville en Guadeloupe (Pointe-à-Pitre, Le Gosier...). Optionnel. */
  ville?: string | null
  /** Entreprise (Cobeone, DCG AI, Karu Saveurs...). Optionnel. */
  company?: string | null
}

/** Page de contexte au moment de la question. */
export type ChatPageContext =
  | 'dashboard'
  | 'plan'
  | 'task'
  | 'calendrier'
  | 'frameworks'
  | 'unknown'

/** Stats agrégées d'un plan (utiles pour donner du contexte au coach). */
export interface PlanStats {
  totalTasks: number
  doneTasks: number
  todoTasks: number
  overdueTasks: number
}

/** Snapshot d'une priorité tel que stocké dans `plan.metadata.priorities`. */
interface PriorityMetadataLike {
  index: 1 | 2 | 3
  title: string
  reason?: string
  playbook_category?: string
}

export interface ChatBuildContext {
  user: ChatUserProfile
  page: ChatPageContext
  /** L'URL exacte de la page courante (debug + transparence prompt). */
  pageUrl?: string

  /** Si la page courante est un plan ou une tâche → on passe le plan parent. */
  plan?: SparkpilotPlan | null
  planStats?: PlanStats | null

  /** Si la page courante est une tâche → on passe la tâche ouverte. */
  task?: SparkpilotTask | null
  /** Libellé lisible de la priorité parente de la tâche ouverte. */
  taskPriorityLabel?: string | null
  /** Catégorie playbook de la priorité parente. */
  taskPriorityCategory?: string | null

  /** Snapshot succinct du rapport SparkScan source du plan (pour ancrage). */
  scanSnapshot?: {
    input_url?: string
    zone?: string
    executive_summary?: string
  } | null
}

/**
 * Construit le system prompt final passé à Claude.
 * Pure function — pas d'I/O hormis loadPlaybook() (qui cache après 1 lecture).
 */
export async function buildSystemPrompt(
  ctx: ChatBuildContext,
): Promise<string> {
  const playbook = await loadPlaybook()

  const userBlock = renderUserBlock(ctx.user)
  const pageBlock = renderPageBlock(ctx)
  const sparkscanBlock = renderSparkscanBlock(ctx.scanSnapshot)

  return [
    `Tu es le coach SparkPilot, copilote marketing 24/7 pour ${userBlock}.`,
    '',
    '[CONTEXTE PAGE]',
    pageBlock,
    sparkscanBlock ? `\n${sparkscanBlock}` : '',
    '',
    '[PLAYBOOK DE RÉFÉRENCE — source de vérité unique]',
    `Version : ${PLAYBOOK_VERSION}`,
    '',
    playbook,
    '',
    '[CONTEXTE GUADELOUPE — toujours en tête]',
    '- Marché ~400 000 habitants, dense et interconnecté (bouche-à-oreille fort).',
    '- WhatsApp Business est PRIORITAIRE : les SMS depuis numéros français',
    "  sont bloqués par les opérateurs guadeloupéens. Ne propose JAMAIS SMS.",
    '- Décalage GMT-4 (5 à 6h avec Paris selon DST). Pubs lancées le matin GP =',
    "  toute la journée européenne devant elles.",
    '- Climat tropical : références au temps, à la saison, aux fêtes locales',
    "  (Carnaval, Toussaint, fin d'année) crédibilisent le contenu.",
    '- Tutoiement total. Pas de "vous", pas de jargon parisien.',
    '',
    '[R0 ABSOLUES — NE PAS DÉROGER]',
    '',
    'R0 #1 — LANGAGE SIMPLE',
    "Réponds comme à un ami au bar. Phrases courtes (<20 mots). Pas de jargon",
    "sans traduction immédiate (\"SEO (référencement Google)\", \"CPM (coût pour",
    "1000 vues)\"). Cible : un patron de TPE non-tech.",
    '',
    'R0 #2 — RÉPONSES COURTES',
    "3 à 5 phrases idéalement, 10 maximum. Si la question mérite plus, propose",
    "de dérouler étape par étape. Pas de pavé indigeste.",
    '',
    'R0 #3 — EXEMPLES CONCRETS ANCRÉS GUADELOUPE',
    'Quand tu illustres, prends des exemples du quotidien GP : un dentiste à',
    'Pointe-à-Pitre, un restaurateur à Saint-François, un artisan à Basse-Terre.',
    'Cite WhatsApp, Facebook, Google Maps — pas Twitter ni TikTok pour pros.',
    '',
    'R0 #4 — JAMAIS INVENTER',
    "Si tu n'es pas sûr d'un chiffre, d'une procédure ou d'une référence, DIS-LE.",
    'Anti-patterns interdits : "probablement", "normalement", "en gros".',
    'Préfère : "Je ne suis pas certain sur ce chiffre, je te conseille de vérifier',
    'sur [source]" ou "On peut creuser ensemble, raconte-moi plus".',
    '',
    'R0 #5 — TUTOIEMENT OBLIGATOIRE',
    'Toujours "tu", jamais "vous". Ton chaleureux, sans excès.',
    '',
    'R0 #6 — RESTER DANS TON RÔLE',
    "Tu es coach marketing. Si on te demande autre chose (météo, code, philo,",
    'recette de poulet boucané), recadre poliment et propose de revenir au plan.',
    '',
    'R0 #7 — APPUI SUR LE PLAYBOOK',
    'Quand tu donnes une méthode, cite le framework correspondant du playbook',
    "(GEO, StoryBrand, Pillar+Cluster, Hook-Story-CTA...). N'invente pas de",
    'framework qui ne serait pas dans le playbook ci-dessus.',
  ]
    .filter((line) => line !== '')
    .join('\n')
    // Cleanup : si on a quand même rejoint des sauts de ligne consécutifs.
    .replace(/\n{3,}/g, '\n\n')
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers de rendu (purs, faciles à tester)
// ──────────────────────────────────────────────────────────────────────────

/** "Thierry, restaurateur à Le Gosier" / "toi, en Guadeloupe". */
function renderUserBlock(user: ChatUserProfile): string {
  const name = user.firstName?.trim() || user.fullName?.split(' ')[0]?.trim()
  const metier = user.metier?.trim()
  const ville = user.ville?.trim()

  if (name && metier && ville) {
    return `${name}, ${metier} à ${ville}`
  }
  if (name && metier) {
    return `${name}, ${metier} en Guadeloupe`
  }
  if (name && ville) {
    return `${name}, basé à ${ville} en Guadeloupe`
  }
  if (name) {
    return `${name}, en Guadeloupe`
  }
  return 'un patron de TPE/PME en Guadeloupe'
}

/** Décrit la page courante de l'utilisateur dans un bloc lisible par Claude. */
function renderPageBlock(ctx: ChatBuildContext): string {
  const lines: string[] = []

  // Description en clair de la page
  lines.push(`L'utilisateur est actuellement sur : ${describePage(ctx)}.`)

  if (ctx.pageUrl) {
    lines.push(`URL : ${ctx.pageUrl}`)
  }

  // Si une tâche est ouverte, on injecte tout le détail.
  if (ctx.task) {
    lines.push('')
    lines.push(
      `Il regarde la tâche "${ctx.task.title}" qui fait partie de la priorité ${ctx.task.priority_index}` +
        (ctx.taskPriorityLabel ? ` "${ctx.taskPriorityLabel}"` : '') +
        '.',
    )
    if (ctx.taskPriorityCategory) {
      lines.push(
        `Catégorie du playbook : ${ctx.taskPriorityCategory}.`,
      )
    }
    const framework = ctx.task.metadata?.framework_used
    if (framework) {
      lines.push(`Cette tâche s'appuie sur le framework : ${framework}.`)
    }
    if (ctx.task.description) {
      lines.push(`Description : ${ctx.task.description}`)
    }
    if (ctx.task.due_date) {
      lines.push(`Date prévue : ${ctx.task.due_date}.`)
    }
    if (ctx.task.estimated_duration_minutes) {
      lines.push(
        `Durée estimée : ${formatDuration(
          ctx.task.estimated_duration_minutes,
        )}.`,
      )
    }
    lines.push(`Statut courant : ${describeStatus(ctx.task.status)}.`)
  } else if (ctx.plan) {
    // Si seulement le plan est ouvert (pas de tâche spécifique).
    lines.push('')
    lines.push(`Il regarde le plan "${ctx.plan.title}".`)
    if (ctx.planStats) {
      lines.push(
        `Avancement : ${ctx.planStats.doneTasks} / ${ctx.planStats.totalTasks} tâches faites` +
          (ctx.planStats.overdueTasks > 0
            ? `, dont ${ctx.planStats.overdueTasks} en retard.`
            : '.'),
      )
    }
    const priorities = extractPriorities(ctx.plan)
    if (priorities.length > 0) {
      lines.push('Les 3 priorités stratégiques du plan :')
      for (const p of priorities) {
        lines.push(
          `  ${p.index}. ${p.title}` +
            (p.playbook_category ? ` (catégorie : ${p.playbook_category})` : ''),
        )
      }
    }
  }

  return lines.join('\n')
}

/** Phrase d'introduction de la page courante. */
function describePage(ctx: ChatBuildContext): string {
  switch (ctx.page) {
    case 'dashboard':
      return 'le tableau de bord SparkPilot (vue d\'ensemble de son plan)'
    case 'plan':
      return 'la page détail d\'un plan d\'action'
    case 'task':
      return 'la page détail d\'une tâche concrète'
    case 'calendrier':
      return 'la vue calendrier (toutes ses tâches étalées sur le mois)'
    case 'frameworks':
      return 'le glossaire des frameworks (bibliothèque pédagogique)'
    default:
      return 'une page de SparkPilot'
  }
}

/** Snapshot court du rapport SparkScan source, si dispo. */
function renderSparkscanBlock(
  snapshot: ChatBuildContext['scanSnapshot'],
): string {
  if (!snapshot) return ''
  const lines: string[] = ['[CONTEXTE SPARKSCAN — rapport source du plan]']
  if (snapshot.input_url) lines.push(`Site analysé : ${snapshot.input_url}`)
  if (snapshot.zone) lines.push(`Zone : ${snapshot.zone}`)
  if (snapshot.executive_summary) {
    // On garde max ~400 chars pour rester économe en tokens.
    const trimmed = snapshot.executive_summary.trim().slice(0, 400)
    lines.push(`Résumé exécutif : ${trimmed}${snapshot.executive_summary.length > 400 ? '…' : ''}`)
  }
  return lines.join('\n')
}

/** Extrait les 3 priorités depuis le metadata du plan, défensivement typé. */
function extractPriorities(plan: SparkpilotPlan): PriorityMetadataLike[] {
  const raw = (plan.metadata as { priorities?: unknown })?.priorities
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (p): p is PriorityMetadataLike =>
        typeof p === 'object' &&
        p !== null &&
        'index' in p &&
        'title' in p &&
        typeof (p as { title: unknown }).title === 'string',
    )
    .slice(0, 3)
}

/** Formate des minutes en chaîne lisible ("30 min", "2 h", "1 h 30"). */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m.toString().padStart(2, '0')}`
}

/** Traduit un statut technique en phrase lisible pour Claude. */
function describeStatus(status: SparkpilotTask['status']): string {
  switch (status) {
    case 'todo':
      return 'à faire (pas encore démarrée)'
    case 'in_progress':
      return 'démarrée (en cours)'
    case 'blocked':
      return 'bloquée'
    case 'done':
      return 'terminée'
    default:
      return status
  }
}
