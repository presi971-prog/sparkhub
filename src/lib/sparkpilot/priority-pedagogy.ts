/**
 * SparkPilot — pédagogie des priorités.
 *
 * Helper qui transforme une `playbook_category` (stockée dans
 * `metadata.priorities[].playbook_category` côté plan, voir types.ts +
 * playbooks/index.ts) en deux blocs lisibles pour le user TPE/PME GP :
 *
 *   1) "Stratégie globale" : 2-3 phrases qui expliquent POURQUOI cette
 *      priorité est la bonne et COMMENT elle va concrètement aider.
 *   2) "Indicateurs de succès" : 2-3 signaux observables, dérivés de la
 *      section "Signaux de succès" du playbook v1.0.
 *
 * R0 absolues respectées :
 *   - Langage simple, zéro jargon non traduit.
 *   - Exemples ancrés Guadeloupe.
 *   - Fallback honnête si la catégorie est inconnue (pas d'invention).
 *   - Server-safe (pas de dépendance navigateur).
 */

import { PLAYBOOK_CATEGORIES, type PlaybookCategory } from './playbooks'

/**
 * Mapping `playbook_category` → bloc "Stratégie globale".
 *
 * Source : la directive produit du 30/05/2026 (R0 pédagogie SparkPilot).
 * Chaque texte fait 2-3 phrases, sans jargon, avec un ancrage usage
 * concret pour un artisan / restaurateur / professionnel guadeloupéen.
 */
const STRATEGY_BY_CATEGORY: Record<PlaybookCategory, string> = {
  'Visibilité IA':
    "Tes futurs clients posent leurs questions à ChatGPT et Perplexity avant d'appeler. Si tu ne réponds pas à leurs questions sur ton site, tu n'existes pas pour eux. Cette priorité te rend visible là où les concurrents ne sont pas.",
  "Conversion site / page d'accueil":
    "Avant d'attirer plus de visiteurs, on s'assure que ceux qui viennent déjà se transforment en clients. Petits ajustements sur ta page d'accueil = gros impact sur les RDV signés.",
  'Contenu de fond':
    'Google récompense les sites qui couvrent un sujet à fond. En écrivant 5-10 articles cohérents, tu deviens LA référence locale sur ton métier. Trafic gratuit qui dure des années.',
  'Présence sociale':
    'Tes prospects guadeloupéens sont sur Facebook, Instagram, LinkedIn. Apparaître régulièrement avec du contenu utile = ils pensent à toi quand ils ont un besoin.',
  'Acquisition payante':
    'Pour scaler vite, la pub Meta ou Google permet de toucher des centaines de prospects ciblés. Bien faite, elle ramène plus que ce qu\'elle coûte.',
}

/**
 * Mapping `playbook_category` → bloc "Indicateurs de succès".
 *
 * Source : section "Signaux de succès" du playbook v1.0
 * (playbook-strategies-v1.md). Les signaux sont des observables chiffrés
 * ou actionnables, jamais des promesses vagues.
 */
const SUCCESS_SIGNALS_BY_CATEGORY: Record<PlaybookCategory, string> = {
  'Visibilité IA':
    'Tu apparais quand tu testes manuellement tes questions cibles dans Perplexity ou ChatGPT (test toutes les 2 semaines). Croissance organique de visites sur tes pages FAQ.',
  "Conversion site / page d'accueil":
    'Taux de conversion landing → contact qui monte. Temps moyen passé sur la home qui augmente. Diminution du taux de rebond mobile.',
  'Contenu de fond':
    'Position Google qui monte sur les mots-clés ciblés. Trafic organique mensuel qui croît mois après mois. Backlinks naturels qui arrivent.',
  'Présence sociale':
    'Croissance abonnés > 5% par mois. Engagement rate > 3% (likes + commentaires / abonnés). Messages privés entrants qui qualifient → leads.',
  'Acquisition payante':
    "CPM stable ou en baisse. CTR > 1.5% (Meta GP) ou > 3% (Google Search). Coût par lead qualifié sous ton seuil défini.",
}

/**
 * Fallback honnête : on n'invente pas de stratégie si on ne reconnait
 * pas la catégorie (R0 "ne jamais inventer").
 */
const STRATEGY_FALLBACK =
  'Stratégie en cours de cadrage. Ouvre la liste des tâches pour voir les actions concrètes proposées par SparkPilot pour cette priorité.'

const SUCCESS_SIGNALS_FALLBACK =
  'Pas encore d\'indicateurs prédéfinis pour cette catégorie. Surveille la complétion des tâches et l\'impact sur tes propres KPIs (visites, contacts, RDV signés) semaine après semaine.'

/**
 * Vérifie si une chaîne arbitraire correspond à une catégorie connue
 * du playbook.
 */
function isKnownCategory(value: string | undefined): value is PlaybookCategory {
  if (!value) return false
  return (PLAYBOOK_CATEGORIES as readonly string[]).includes(value)
}

/**
 * Retourne le bloc "Stratégie globale" pour une catégorie de playbook.
 *
 * @param category Catégorie déclarée par Claude au moment de la
 *   décomposition (stockée dans `metadata.priorities[].playbook_category`).
 *   Peut être absente ou inconnue → fallback honnête.
 */
export function getStrategyForCategory(category: string | undefined): string {
  if (isKnownCategory(category)) {
    return STRATEGY_BY_CATEGORY[category]
  }
  return STRATEGY_FALLBACK
}

/**
 * Retourne le bloc "Indicateurs de succès" pour une catégorie de playbook.
 *
 * @param category Catégorie déclarée par Claude au moment de la
 *   décomposition. Peut être absente ou inconnue → fallback honnête.
 */
export function getSuccessSignalsForCategory(
  category: string | undefined,
): string {
  if (isKnownCategory(category)) {
    return SUCCESS_SIGNALS_BY_CATEGORY[category]
  }
  return SUCCESS_SIGNALS_FALLBACK
}
