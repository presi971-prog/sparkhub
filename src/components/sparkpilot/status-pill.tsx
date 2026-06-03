/**
 * Pastille d'état d'une tâche : à faire / en cours / faite / bloquée / en retard.
 * Le mockup distingue les couleurs : gris neutre / miel / vert / rouge.
 */

import type { TaskStatus } from '@/lib/sparkpilot/types'

interface StatusPillProps {
  status: TaskStatus
  /** Si true, l'échéance est dépassée — on bascule sur "en retard" rouge. */
  isOverdue?: boolean
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  blocked: 'Bloquée',
  done: 'Faite',
}

const STATUS_CLASSES: Record<TaskStatus, string> = {
  todo: 'bg-[#F3F2EC] text-[#22252C] border border-[#E9E5D9]',
  in_progress: 'bg-[#FFF6EA] text-[#A37312] border border-[#F5E2B6]',
  blocked: 'bg-[#FDECE5] text-[#A1432D] border border-[#F2C8B5]',
  done: 'bg-[#EAF1EC] text-[#3E6B4A] border border-[#C8DDC9]',
}

const OVERDUE_CLASS =
  'bg-[#FDECE5] text-[#A1432D] border border-[#F2C8B5]'

export function StatusPill({ status, isOverdue = false }: StatusPillProps) {
  if (isOverdue && status !== 'done') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9.5px] uppercase leading-tight tracking-[0.14em] ${OVERDUE_CLASS}`}
      >
        En retard
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9.5px] uppercase leading-tight tracking-[0.14em] ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
