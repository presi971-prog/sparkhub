/**
 * Palette SparkPilot — couleurs et classes Tailwind partagées.
 *
 * On utilise des valeurs hex en arbitraires Tailwind (ex : `bg-[#EEF0FF]`)
 * pour éviter d'ajouter la palette custom à `tailwind.config.ts` (le repo
 * cobeone-pro utilise Tailwind 4 sans config explicite des couleurs SparkPilot).
 *
 * Source : mockups V1 dans claude-projets/sparkpilot/mockups/v1/.
 */

export type PriorityIndex = 1 | 2 | 3

export const PRIORITY_DOT_CLASS: Record<PriorityIndex, string> = {
  1: 'bg-[#4F46E5]', // indigo
  2: 'bg-[#C7991F]', // honey
  3: 'bg-[#3E6B4A]', // moss
}

export const PRIORITY_BG_CLASS: Record<PriorityIndex, string> = {
  1: 'bg-[#EEF0FF]',
  2: 'bg-[#FFF4E0]',
  3: 'bg-[#EAF1EC]',
}

export const PRIORITY_TEXT_CLASS: Record<PriorityIndex, string> = {
  1: 'text-[#2E2A78]',
  2: 'text-[#A37312]',
  3: 'text-[#3E6B4A]',
}

export const PRIORITY_BAR_CLASS: Record<PriorityIndex, string> = {
  1: 'bg-[#4F46E5]',
  2: 'bg-[#C7991F]',
  3: 'bg-[#3E6B4A]',
}

/**
 * Étiquette par défaut d'une priorité quand on n'a pas le titre métier.
 * (Sert de fallback dans le calendrier ou les KPIs si metadata est vide.)
 */
export const PRIORITY_FALLBACK_LABEL: Record<PriorityIndex, string> = {
  1: 'Priorité 1',
  2: 'Priorité 2',
  3: 'Priorité 3',
}
