/**
 * Bloc affiché quand une liste est vide (mes-creations, dashboard sans run).
 * Aligné sur le style atelier (papier blanc, ombre douce, accent émeraude).
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-[#E4E7E2] bg-white p-10 text-center shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
      <p
        className="text-[22px] leading-tight text-[#0F1115]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        {title}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5E626C]">
        {description}
      </p>
      {action ? <div className="mt-5 inline-flex">{action}</div> : null}
    </div>
  )
}
