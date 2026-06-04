/**
 * SparkExecute — mapping framework SparkPilot → type de livrable SparkExecute.
 *
 * Quand l'utilisateur clique "Faire avec SparkExecute" sur une tâche SparkPilot,
 * on doit deviner quel type de livrable produire à partir du framework cité
 * dans la tâche (cf. sparkpilot_tasks.metadata.framework_used).
 *
 * Règles (V1) :
 *   - GEO / E-E-A-T / Schema.org / Pillar+Cluster / Skyscraper / Topical Authority
 *       → article_seo  (FAQ si le titre tâche contient "FAQ")
 *   - StoryBrand / AIDA / Above-the-fold
 *       → page_accueil
 *   - Hook-Story-CTA
 *       → post_linkedin
 *   - Native format first
 *       → post_instagram  (ou visual si le titre parle d'image)
 *   - PAS / Andromeda / TOFU/MOFU/BOFU / CBO Meta
 *       → hooks_pub
 *
 * Si le framework n'est pas reconnu → fallback `article_seo` (le plus
 * utile à 90 % des cas).
 */

import type { RunType } from './types'

/** Famille de frameworks reconnus. Ajouter ici dès qu'on enrichit le playbook. */
const FRAMEWORK_PATTERNS: Array<{ pattern: RegExp; type: RunType }> = [
  // SEO long format
  { pattern: /\bgeo\b/i, type: 'article_seo' },
  { pattern: /e-?e-?a-?t/i, type: 'article_seo' },
  { pattern: /schema\.org|schema markup/i, type: 'article_seo' },
  { pattern: /pillar\s*\+?\s*cluster|pillar-cluster/i, type: 'article_seo' },
  { pattern: /skyscraper/i, type: 'article_seo' },
  { pattern: /topical authority/i, type: 'article_seo' },

  // Page d'accueil / landing
  { pattern: /storybrand|story\s*brand/i, type: 'page_accueil' },
  { pattern: /\baida\b/i, type: 'page_accueil' },
  { pattern: /above[\s-]?the[\s-]?fold/i, type: 'page_accueil' },

  // LinkedIn
  { pattern: /hook[\s-]?story[\s-]?cta/i, type: 'post_linkedin' },

  // Instagram
  { pattern: /native format first/i, type: 'post_instagram' },

  // Pub
  { pattern: /\bpas\b/i, type: 'hooks_pub' },
  { pattern: /andromeda/i, type: 'hooks_pub' },
  { pattern: /tofu|mofu|bofu/i, type: 'hooks_pub' },
  { pattern: /cbo meta|meta cbo|meta ads/i, type: 'hooks_pub' },
]

/**
 * Devine le type de livrable SparkExecute à partir du framework SparkPilot
 * et du titre de la tâche (utilisé comme indice secondaire).
 *
 * @param framework Framework cité dans sparkpilot_tasks.metadata.framework_used
 * @param taskTitle Titre de la tâche (sert d'indice si le framework n'est pas
 *                  reconnu, ex : "Rédiger la FAQ ..." → faq).
 */
export function deduceTypeFromFramework(
  framework: string | null | undefined,
  taskTitle?: string,
): RunType {
  const title = (taskTitle ?? '').toLowerCase()

  // Heuristique très forte : si le titre mentionne explicitement "faq", on force faq.
  if (/\bfaq\b/i.test(title)) {
    return 'faq'
  }

  // Heuristique forte : titre qui parle de carrousel (plusieurs slides) →
  // prime sur Instagram/LinkedIn car un carrousel a son propre générateur.
  if (/carr?ous?el/i.test(title)) {
    return 'carousel'
  }

  // Heuristique forte : titre qui parle de vidéo / reel → générateur vidéo
  // (prime sur "visual" qui attrape aussi "reel").
  if (/\bvid[ée]os?\b|\breels?\b|\bshorts?\b/i.test(title)) {
    return 'video'
  }

  // Heuristique forte : titre qui parle clairement d'une plateforme sociale.
  // LinkedIn d'abord (très spécifique), puis Instagram, puis Reel.
  if (/\blinkedin\b/i.test(title)) {
    return 'post_linkedin'
  }
  if (/\binstagram\b|\binsta\b/i.test(title)) {
    return 'post_instagram'
  }

  // Heuristique forte : titre qui parle d'accroches publicitaires / pub.
  if (/accroche|google ads|meta ads|facebook ads|publicit[eé] payante|campagne (?:pub|ads)/i.test(title)) {
    return 'hooks_pub'
  }

  // Heuristique forte : titre qui parle de page d'accueil / landing.
  if (/page d'?accueil|landing page|page de vente|home page/i.test(title)) {
    return 'page_accueil'
  }

  // Heuristique forte : titre qui parle de balisage / Schema.org.
  if (/schema|json-?ld|balisage/i.test(title)) {
    return 'schema_markup'
  }

  // Heuristique forte : si le titre parle de "visuel", "image", "story", "bannière"
  // → on bascule sur visual (utile quand le framework est générique).
  if (/visuel|image|stor(?:y|ies)|banni[èe]re|cover|thumbnail|reel\b/i.test(title)) {
    return 'visual'
  }

  // Heuristique : titre qui mentionne "post" sans plateforme explicite → LinkedIn par défaut.
  if (/\bpost\b/i.test(title)) {
    return 'post_linkedin'
  }

  // Heuristique : titre qui mentionne "article" → article SEO.
  if (/\barticle\b/i.test(title)) {
    return 'article_seo'
  }

  const fw = (framework ?? '').trim()
  if (!fw) return 'article_seo'

  for (const { pattern, type } of FRAMEWORK_PATTERNS) {
    if (pattern.test(fw)) return type
  }

  // Fallback : article SEO (le type le plus polyvalent).
  return 'article_seo'
}

/**
 * Libellé humain pour un type de livrable. Sert dans l'UI (badges, titres).
 */
export const RUN_TYPE_LABEL: Record<RunType, string> = {
  article_seo: 'Article SEO',
  article_long: 'Article long',
  article_court: 'Article court',
  faq: 'FAQ',
  post_linkedin: 'Post LinkedIn',
  post_instagram: 'Post Instagram',
  hooks_pub: 'Accroches pub',
  visual: 'Visuel',
  carousel: 'Carrousel',
  video: 'Vidéo',
  page_accueil: "Page d'accueil",
  schema_markup: 'Schema markup',
}

/**
 * Liste des types disponibles dans le builder "Nouveau livrable" (page nouveau/).
 * Garde l'ordre logique : contenu texte → réseaux → pub → visuel → page → schema.
 */
export const RUN_TYPE_ORDER: RunType[] = [
  'article_seo',
  'article_long',
  'article_court',
  'faq',
  'post_linkedin',
  'post_instagram',
  'carousel',
  'video',
  'hooks_pub',
  'visual',
  'page_accueil',
  'schema_markup',
]

/**
 * Marque les types réellement implémentés en V1.
 * Les autres sont visibles dans l'UI mais désactivés (badge "Bientôt").
 */
export const RUN_TYPE_AVAILABLE_V1: Record<RunType, boolean> = {
  article_seo: true,
  article_long: false,
  article_court: false,
  faq: false,
  post_linkedin: true,
  post_instagram: true,
  hooks_pub: false,
  visual: true,
  carousel: true,
  video: true,
  page_accueil: false,
  schema_markup: false,
}
