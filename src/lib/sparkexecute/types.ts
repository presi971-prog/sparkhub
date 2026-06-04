/**
 * SparkExecute — types partagés (front + back).
 *
 * Miroir de la table sparkexecute_runs (cf. migration 052).
 * Pas de génération auto (le repo n'utilise pas encore `supabase gen types`
 * pour ces tables), donc on tient les types à jour à la main.
 */

/**
 * Les 10 types de livrables que SparkExecute sait produire.
 *
 * V1 = 3 types réellement implémentés côté générateur :
 *   - article_seo
 *   - post_linkedin
 *   - visual
 *
 * Les 7 autres types sont valides côté base (acceptés par la contrainte CHECK
 * de la migration 052) mais leur générateur arrive en V1.1.
 */
export type RunType =
  | 'article_seo'
  | 'article_long'
  | 'article_court'
  | 'faq'
  | 'post_linkedin'
  | 'post_instagram'
  | 'hooks_pub'
  | 'visual'
  | 'carousel'
  | 'video'
  | 'page_accueil'
  | 'schema_markup'

/**
 * États successifs d'un run :
 *   generating → draft → validated → published
 *                     ↘ archived
 *                     ↘ failed
 *
 * Transitions autorisées :
 *   - generating → draft         (succès de la génération)
 *   - generating → failed        (échec de la génération)
 *   - draft      → validated     (user a relu et validé)
 *   - draft      → archived      (user a mis à la corbeille)
 *   - validated  → published     (user a publié, V1 = juste flag)
 *   - validated  → archived
 *   - published  → archived
 *   - failed     → generating    (relance via "Refaire")
 */
export type RunStatus =
  | 'generating'
  | 'draft'
  | 'validated'
  | 'published'
  | 'archived'
  | 'failed'

/**
 * Brief d'entrée d'un run. C'est ce que l'utilisateur (ou l'orchestrateur,
 * en l'absence d'input manuel) fournit aux générateurs.
 *
 * Tous les champs sont optionnels SAUF `sujet` : sans sujet on ne peut rien
 * générer de pertinent. Les générateurs appliquent des défauts raisonnables
 * pour les champs absents (ex : ton = "professionnel mais accessible").
 */
export interface RunInputBrief {
  /** Sujet du livrable (ex : "L'IA pour les restaurants en Guadeloupe"). */
  sujet: string

  /** Audience visée (ex : "Restaurateurs TPE en Guadeloupe"). Optionnel. */
  audience?: string

  /**
   * Ton désiré. Valeurs libres mais on conseille :
   * "professionnel", "chaleureux", "punchy", "expert", "pédagogique".
   */
  ton?: string

  /** Liste de mots-clés à intégrer naturellement (SEO). Optionnel. */
  mots_cles?: string[]

  /**
   * Longueur souhaitée en mots. Le générateur clampe entre min/max
   * du type (ex : article_seo = 800..2000 mots).
   */
  longueur_souhaitee?: number

  /**
   * Si fourni, force ce framework au lieu de celui par défaut du type.
   * Utilisé par la route /redo pour proposer une variante "autre framework".
   */
  framework_override?: string

  /**
   * Variant pour la régénération (POST /redo) :
   *   shorter  : version plus courte
   *   punchier : ton plus direct, accroches plus tape-à-l'œil
   *   pro      : ton plus institutionnel
   *   casual   : ton plus détendu (tutoiement, "tu" plus présent)
   */
  variant?: 'shorter' | 'punchier' | 'pro' | 'casual'

  /**
   * Format d'image souhaité pour les livrables qui produisent un visuel
   * (`visual`, `post_instagram`, et par extension `post_linkedin`).
   *
   * Si absent :
   *   - `post_instagram` → défaut 4:5 (Portrait, performance feed Instagram).
   *   - autres types     → défaut 1:1 (Carré, universel LinkedIn / général).
   *
   * Valeurs autorisées :
   *   - '1:1' : carré 1080×1080 — universel, LinkedIn, profil…
   *   - '4:5' : portrait 1080×1350 — Instagram feed.
   */
  aspect_ratio?: '1:1' | '4:5'
}

/**
 * Livrable produit par un générateur, stocké dans sparkexecute_runs.output.
 *
 * `content` est TOUJOURS présent (texte plat / markdown / HTML selon le type).
 * Les autres champs dépendent du type (ex : visual remplit image_url).
 */
export interface RunOutput {
  /**
   * Contenu textuel principal.
   *   - article_seo / article_long / article_court / faq → Markdown
   *   - post_linkedin / hooks_pub → texte plat avec sauts de ligne
   *   - post_instagram → texte plat (caption)
   *   - visual → chaîne vide (le livrable est l'image, voir image_url)
   *   - page_accueil → Markdown structuré (sections)
   *   - schema_markup → JSON-LD brut (chaîne JSON)
   */
  content: string

  /** URL publique de l'image générée (visual, image d'accompagnement post…). */
  image_url?: string

  /** URL publique de la vidéo générée (.mp4 ré-hébergée), pour le type 'video'. */
  video_url?: string

  /** Texte alternatif accessibilité pour l'image. */
  alt_text?: string

  /** Hashtags suggérés (utile pour posts Instagram / LinkedIn). */
  hashtags?: string[]

  /**
   * Légende qui accompagne une image (visual seul, généré post-coup via
   * POST /api/sparkexecute/runs/[id]/add-legend). Texte plat 80-150 mots
   * avec 5-7 hashtags inclus, prêt à coller sur Instagram / LinkedIn.
   */
  legend?: string

  /**
   * Message d'erreur soft quand l'image d'un pack (post_linkedin / post_instagram)
   * n'a pas pu être générée. Le texte reste utilisable, on signale juste à l'user
   * qu'il peut compléter l'image manuellement.
   */
  image_error?: string

  /**
   * Bag pour metadata spécifique au type :
   *   - word_count, h2_count, schema_jsonld (article_seo)
   *   - character_count, hook_first_line, image_prompt (post_linkedin / post_instagram)
   *   - kie_request_id, generated_width, generated_height (visual)
   *   - error (si la génération a échoué partiellement, ex : visual fallback)
   */
  metadata?: Record<string, unknown>
}

/**
 * Miroir TS de la table sparkexecute_runs.
 * Toutes les dates sont en ISO 8601 (string).
 */
export interface SparkexecuteRun {
  /** Identifiant unique du run. */
  id: string
  /** Propriétaire du run. */
  user_id: string
  /** Tâche SparkPilot d'origine, null si run créé "à la main". */
  task_id: string | null
  /** Type de livrable demandé (cf. RunType). */
  type: RunType
  /** Framework utilisé (ex : "Pillar+Cluster"). Null tant que pas de génération. */
  framework_used: string | null
  /** Brief d'entrée fourni par l'user / hérité de la tâche. */
  input_brief: RunInputBrief
  /** Livrable produit. Vide tant que status = 'generating'. */
  output: RunOutput
  /** État courant du run. */
  status: RunStatus
  /** Coût en USD (Claude + Nano Banana cumulés). */
  cost_usd: number
  /** Tokens d'entrée consommés (Claude). */
  tokens_input: number
  /** Tokens de sortie produits (Claude). */
  tokens_output: number
  /** Message d'erreur si status = 'failed'. */
  error_message: string | null
  /** Bag jsonb additionnel. */
  metadata: Record<string, unknown>
  /** Date de création (ISO 8601). */
  created_at: string
  /** Date à laquelle l'user a validé le brouillon (null sinon). */
  validated_at: string | null
  /** Date de publication (null sinon). */
  published_at: string | null
  /** Date de dernière modification (auto via trigger). */
  updated_at: string
}

/** Compteur quotidien d'usage (cf. table sparkexecute_usage). */
export interface SparkexecuteUsage {
  user_id: string
  /** Date au format YYYY-MM-DD. */
  day: string
  runs_count: number
  cost_usd: number
  updated_at: string
}

/**
 * Plateformes de publication supportées par SparkExecute (cf. migration 053).
 *
 * V1.1 = 5 plateformes réellement implémentées :
 *   - ghl_blog
 *   - linkedin
 *   - instagram
 *   - facebook
 *   - google_business
 *
 * V1.2 ajoutera : youtube, tiktok, threads.
 */
export type PublishPlatform =
  | 'ghl_blog'
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'google_business'
  | 'youtube'
  | 'tiktok'
  | 'threads'

/** Sous-ensemble des plateformes "Social Planner" GHL (tout sauf ghl_blog). */
export type SocialPlatform = Exclude<PublishPlatform, 'ghl_blog'>

/** États successifs d'une publication. */
export type PublicationStatus =
  | 'pending'
  | 'published'
  | 'scheduled'
  | 'failed'

/**
 * Miroir TS de la table sparkexecute_publications.
 * Toutes les dates sont en ISO 8601 (string).
 */
export interface SparkexecutePublication {
  id: string
  run_id: string
  user_id: string
  platform: PublishPlatform
  external_id: string | null
  external_url: string | null
  status: PublicationStatus
  scheduled_at: string | null
  published_at: string | null
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
}
