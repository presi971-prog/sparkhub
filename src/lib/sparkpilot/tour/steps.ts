/**
 * Étapes du tutoriel interactif SparkPilot — 4 séquences (une par écran).
 *
 * Chaque séquence est consommée par Driver.js dans le composant client
 * <SparkPilotTour />. Les sélecteurs CSS pointent sur des attributs
 * `data-tour="<id>"` posés dans les pages SparkPilot. Si un sélecteur ne
 * matche pas (élément absent — ex : "Importer un rapport" sur mobile),
 * Driver.js skippe l'étape automatiquement.
 *
 * R0 langage simple : tutoiement, max 25 mots par étape, vocabulaire TPE/PME.
 */

import type { DriveStep } from 'driver.js'

/** Les 4 clés alignées avec la table `sparkpilot_tour_progress` et l'API. */
export type TourKey = 'dashboard' | 'plan' | 'calendrier' | 'frameworks'

/**
 * Détecte la clé de tour à jouer pour un pathname donné.
 *
 * - `/sparkpilot`                       → dashboard
 * - `/sparkpilot/plans/<id>`            → plan
 * - `/sparkpilot/plans`                 → (pas de tour : page liste, rare)
 * - `/sparkpilot/calendrier`            → calendrier
 * - `/sparkpilot/frameworks`            → frameworks
 *
 * Retourne `null` quand on est sur une page sans tour défini.
 */
export function detectTourKeyFromPathname(pathname: string): TourKey | null {
  if (pathname === '/sparkpilot' || pathname === '/sparkpilot/') {
    return 'dashboard'
  }
  if (/^\/sparkpilot\/plans\/[^/]+\/?$/.test(pathname)) {
    return 'plan'
  }
  if (pathname.startsWith('/sparkpilot/calendrier')) {
    return 'calendrier'
  }
  if (pathname.startsWith('/sparkpilot/frameworks')) {
    return 'frameworks'
  }
  return null
}

/**
 * Étapes du tour Dashboard — premier écran après login.
 * Objectif : montrer en 1 minute "où je suis et que faire maintenant".
 */
const DASHBOARD_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Bienvenue dans SparkPilot',
      description:
        'Je vais te montrer comment ça marche en 1 minute. Tu pourras relancer ce tour à tout moment avec le bouton « ? » en bas à droite.',
    },
  },
  {
    element: '[data-tour="dashboard-kpis"]',
    popover: {
      title: 'Tes 4 indicateurs clés',
      description:
        'Ce qu’il te reste à faire cette semaine, ce qui est en retard, où tu en es, et ta prochaine échéance.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-today"]',
    popover: {
      title: 'Aujourd’hui & demain',
      description:
        'Tes tâches concrètes à attaquer en priorité. Coche-les au fur et à mesure que tu avances.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="dashboard-progress"]',
    popover: {
      title: 'Progression de ton plan',
      description:
        'Suis ton avancement par priorité. Si une priorité bloque, tu le verras tout de suite ici.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="header-import"]',
    popover: {
      title: 'Créer un nouveau plan',
      description:
        'Pour démarrer un nouveau plan à partir d’un rapport SparkScan, c’est ici.',
      side: 'bottom',
      align: 'end',
    },
  },
]

/**
 * Étapes du tour Plan détail — l'écran où l'user passe le plus de temps.
 */
const PLAN_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Ton plan d’action complet',
      description:
        'Tout ce que SparkPilot a déduit de tes 3 priorités SparkScan, prêt à exécuter.',
    },
  },
  {
    element: '[data-tour="plan-priorities"]',
    popover: {
      title: 'Tes 3 priorités stratégiques',
      description:
        'Trois grands chantiers. Chacun contient plusieurs tâches concrètes à dérouler dans l’ordre.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="plan-strategy"]',
    popover: {
      title: 'Pourquoi cette priorité',
      description:
        'Pour chaque priorité, je t’explique pourquoi c’est important et comment ça va t’aider concrètement.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="plan-tasks"]',
    popover: {
      title: 'Tes tâches semaine par semaine',
      description:
        'Clique pour cocher quand c’est fait. Re-clique pour décocher si tu t’es trompé.',
      side: 'top',
      align: 'start',
    },
  },
  {
    // Pas de data-tour direct ici : on cible la première bulle "Pourquoi cette
    // tâche ?" (rendue par <TaskCard />) dans la section plan-tasks via une
    // fonction. Évite de modifier TaskCard juste pour le tour, et trouve
    // toujours le premier exemple visible à l'écran.
    element: () => {
      const root = document.querySelector('[data-tour="plan-tasks"]')
      // Le bloc pédagogique de TaskCard a la classe utilitaire bg-indigo-50/40.
      // C'est le wrapper qui contient "Pourquoi cette tâche ?".
      const found = root?.querySelector<HTMLElement>('.bg-indigo-50\\/40')
      // Fallback en cascade : found > plan-tasks section > body
      // (Driver.js ne tolère pas un retour null/undefined ici).
      return found ?? (root as Element) ?? document.body
    },
    popover: {
      title: 'Pourquoi cette tâche',
      description:
        'Sur chaque tâche, je t’explique le pourquoi, à quoi t’attendre, et la méthode utilisée.',
      side: 'right',
      align: 'start',
    },
  },
  {
    element: '[data-tour="header-calendar"]',
    popover: {
      title: 'Vue calendrier',
      description:
        'Pour voir tes tâches étalées dans le temps, va sur le Calendrier.',
      side: 'bottom',
      align: 'center',
    },
  },
]

/**
 * Étapes du tour Calendrier — la vue temporelle.
 */
const CALENDRIER_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Tes tâches dans le temps',
      description:
        'Voici toutes tes tâches positionnées sur le mois, pour visualiser ta charge.',
    },
  },
  {
    element: '[data-tour="calendar-grid"]',
    popover: {
      title: 'Grille du mois',
      description:
        'Chaque tâche apparaît à sa date prévue. Les couleurs t’indiquent la priorité parente.',
      side: 'top',
      align: 'center',
    },
  },
  {
    element: '[data-tour="calendar-nav"]',
    popover: {
      title: 'Naviguer entre les mois',
      description:
        'Utilise ces flèches pour voir les semaines précédentes ou suivantes.',
      side: 'bottom',
      align: 'end',
    },
  },
]

/**
 * Étapes du tour Glossaire frameworks — la bibliothèque pédagogique.
 */
const FRAMEWORKS_STEPS: DriveStep[] = [
  {
    popover: {
      title: 'Les méthodes utilisées',
      description:
        'Toutes les stratégies que SparkPilot applique, expliquées simplement, avec des exemples ancrés en Guadeloupe.',
    },
  },
  {
    element: '[data-tour="frameworks-toc"]',
    popover: {
      title: 'Sommaire',
      description:
        'Clique sur la méthode qui t’intéresse pour la comprendre en 2 minutes.',
      side: 'bottom',
      align: 'start',
    },
  },
]

/**
 * Map clé → séquence d'étapes. Utilisée par <SparkPilotTour />.
 */
export const TOUR_STEPS: Record<TourKey, DriveStep[]> = {
  dashboard: DASHBOARD_STEPS,
  plan: PLAN_STEPS,
  calendrier: CALENDRIER_STEPS,
  frameworks: FRAMEWORKS_STEPS,
}
