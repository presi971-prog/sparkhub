/**
 * Pastille de statut d'un run SparkExecute.
 * Couleurs alignées palette atelier (vert validé/publié, miel brouillon, ember failed).
 */

import type { RunStatus } from '@/lib/sparkexecute/types'
import { STATUS_CLASSES, STATUS_LABEL } from './palette'

interface RunStatusPillProps {
  status: RunStatus
}

export function RunStatusPill({ status }: RunStatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9.5px] uppercase leading-tight tracking-[0.14em] ${STATUS_CLASSES[status]}`}
    >
      {status === 'generating' ? (
        <span className="relative mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#A37312]">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#A37312] opacity-60" />
        </span>
      ) : null}
      {STATUS_LABEL[status]}
    </span>
  )
}
