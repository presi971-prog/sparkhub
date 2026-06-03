/**
 * Petit badge coloré qui indique de quelle priorité stratégique vient une tâche.
 * Priorité 1 = indigo, 2 = honey (orangé), 3 = moss (vert).
 * Repris fidèlement des mockups V1 (classes .pri / .pri-1 / .pri-2 / .pri-3).
 */

import type { PriorityIndex } from './palette'
import { PRIORITY_BG_CLASS, PRIORITY_DOT_CLASS, PRIORITY_TEXT_CLASS } from './palette'

interface PriorityBadgeProps {
  index: PriorityIndex
  /** Texte court à afficher (ex : "Visibilité IA"). */
  label: string
}

export function PriorityBadge({ index, label }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.14em] ${PRIORITY_BG_CLASS[index]} ${PRIORITY_TEXT_CLASS[index]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT_CLASS[index]}`} />
      {label}
    </span>
  )
}
