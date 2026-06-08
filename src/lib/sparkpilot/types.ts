/**
 * SparkPilot — types partagés (front + back).
 *
 * Miroir des 3 tables créées dans la migration 048_sparkpilot_init.sql.
 * Pas de génération automatique (le repo n'utilise pas encore `supabase gen types`
 * pour les tables SparkPilot), donc on écrit les types à la main et on les garde
 * synchronisés avec la migration.
 */

/** Les 4 états possibles d'une tâche SparkPilot. */
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

/** Les 3 états possibles d'un plan SparkPilot. */
export type PlanStatus = 'active' | 'archived' | 'completed'

/**
 * Types d'événements écrits dans sparkpilot_activity.
 * Liste fermée pour rester lisible dans le journal de bord.
 */
export type ActivityEventType =
  | 'plan_created'
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_reopened'
  | 'task_deleted'

/** Un plan = un rapport SparkScan décomposé en plan d'action. */
export interface SparkpilotPlan {
  /** Identifiant unique du plan. */
  id: string
  /** Propriétaire du plan (auth.users.id). */
  user_id: string
  /** Scan SparkScan source. Peut devenir null si le scan est purgé. */
  scan_id: string | null
  /** Titre lisible affiché dans l'UI (ex : "Plan DCG AI — Mai 2026"). */
  title: string
  /** État courant : active / archived / completed. */
  status: PlanStatus
  /** Bag jsonb (entreprise, ville, snapshot des 3 priorités…). */
  metadata: Record<string, unknown>
  /** Date de création (ISO 8601). */
  created_at: string
}

/** Une tâche concrète à cocher, issue d'une priorité stratégique. */
export interface SparkpilotTask {
  /** Identifiant unique de la tâche. */
  id: string
  /** Plan auquel la tâche appartient. */
  plan_id: string
  /** 1, 2 ou 3 — indique la priorité stratégique source. */
  priority_index: 1 | 2 | 3
  /** Action courte avec un verbe (ex : "Rédiger la FAQ ..."). */
  title: string
  /** Contexte 1-2 phrases pour rappeler pourquoi cette tâche compte. */
  description: string | null
  /** Date d'échéance (YYYY-MM-DD), null si pas posée. */
  due_date: string | null
  /** Durée estimée en minutes pour aider à caler dans la journée. */
  estimated_duration_minutes: number | null
  /** État courant : todo / in_progress / blocked / done. */
  status: TaskStatus
  /** Date à laquelle la tâche a été terminée, null sinon. */
  completed_at: string | null
  /** Ordre manuel dans le plan (drag & drop futur). */
  order_index: number
  /** Bag jsonb (framework_used, playbook_category, playbook_version). */
  metadata: SparkpilotTaskMetadata
  /** Date de création (ISO 8601). */
  created_at: string
}

/** Une ligne du journal de bord (créations, complétions, reports). */
export interface SparkpilotActivity {
  /** Identifiant unique de l'événement. */
  id: string
  /** Auteur de l'événement. */
  user_id: string
  /** Plan concerné, null pour les events globaux user. */
  plan_id: string | null
  /** Tâche concernée, null pour les events de niveau plan. */
  task_id: string | null
  /** Type d'événement (plan_created, task_completed, etc.). */
  event_type: ActivityEventType | string
  /** Détails additionnels (avant/après, contexte). */
  payload: Record<string, unknown>
  /** Date de l'événement (ISO 8601). */
  created_at: string
}

/** Vue agrégée pratique : un plan avec ses tâches déjà chargées. */
export type PlanWithTasks = SparkpilotPlan & {
  tasks: SparkpilotTask[]
}

/**
 * Snapshot d'une priorité stratégique tel que stocké dans
 * sparkpilot_plans.metadata.priorities (extrait du rapport SparkScan au moment T).
 * On copie le snapshot pour rester lisible même si la synthèse SparkScan évolue.
 */
export interface PriorityMetadata {
  /** Index de la priorité (1, 2, 3). */
  index: 1 | 2 | 3
  /** Titre court (ex : "Visibilité dans les IA"). */
  title: string
  /** Pourquoi cette priorité a été retenue. */
  reason: string
  /** Catégorie du playbook retenue par Claude (ex : "Contenu de fond"). */
  playbook_category?: string
  // --- Données stratégiques RÉELLES héritées de SparkScan (synthesizer) ---
  // Avant elles étaient jetées, d'où des "orientations" génériques identiques
  // pour tous. On les snapshot ici pour les afficher telles que calculées.
  /** Concurrent visé par cette priorité (ex : "Beeliz"). */
  competitor_label?: string
  /** Levier stratégique : attaquer / copier / eviter / partenariat. */
  lever?: string
  /** Pourquoi ce levier précis (spécifique au client, pas générique). */
  lever_reason?: string
  /** Action concrète à mener, calculée pour ce client. */
  tactical_action?: string
  /** Gain attendu (€ si possible, sinon petit/moyen/gros). */
  estimated_gain?: string
  /** Coût estimé (€ + heures). */
  estimated_cost?: string
  /** Indicateur mesurable pour valider sous 30 jours. */
  kpi_30j?: string
  /** Qui fait : toi seul / toi + agence / délégation. */
  who_does_it?: string
  /** Avis de l'expert SparkPilot (garde-fou) sur cette priorité, voir [[ExpertReview]]. */
  expert_review?: ExpertReview
}

/**
 * Avis du "garde-fou expert" de SparkPilot sur une priorité de SparkScan.
 *
 * R0 ANTI-INVENTION : ce verdict est produit UNIQUEMENT à partir du référentiel
 * de stratégies prouvées (referentiel-prouve-2026.md). Si le référentiel ne
 * couvre pas le sujet → verdict 'non_verifiable' (jamais d'invention).
 */
export interface ExpertReview {
  /**
   * valide        = s'appuie sur une tactique prouvée
   * a_ajuster     = améliorable par une tactique prouvée du référentiel
   * a_demonter    = correspond à un anti-pattern prouvé (rare)
   * non_verifiable = non couvert par le référentiel → on ne se prononce pas
   */
  verdict: 'valide' | 'a_ajuster' | 'a_demonter' | 'non_verifiable'
  /** Analyse courte, ancrée dans le référentiel (pourquoi ce verdict). */
  analyse: string
  /** Si à ajuster : la version prouvée recommandée (sinon absent). */
  recommandation?: string
  /** Le principe/source du référentiel invoqué (ex : "Régularité > volume — Buffer"). */
  source?: string
}

/**
 * Métadonnées stockées dans sparkpilot_tasks.metadata (jsonb).
 *
 * Pas de colonnes dédiées en base — on garde la flexibilité du jsonb pour
 * pouvoir enrichir le playbook (V1.5, V2…) sans migration.
 *
 * Cf. playbooks/playbook-strategies-v1.md → section "Principe".
 */
export interface SparkpilotTaskMetadata {
  /** Framework cité par Claude (ex : "Pillar+Cluster", "StoryBrand", "GEO"). */
  framework_used?: string
  /** Catégorie du playbook (cf. PLAYBOOK_CATEGORIES dans playbooks/index.ts). */
  playbook_category?: string
  /** Version du playbook au moment de la génération (ex : "v1.0"). */
  playbook_version?: string
}
