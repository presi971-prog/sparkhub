/**
 * Carte synthèse d'un run SparkExecute, utilisée dans :
 *   - le dashboard ("À valider en priorité")
 *   - la page "Mes créations"
 *
 * Server Component pur : pas d'interaction (les actions sont dans la page détail).
 * Click sur la carte → page détail du run.
 */

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { SparkexecuteRun } from '@/lib/sparkexecute/types'
import { PermanentDeleteButton } from './permanent-delete-button'
import { RunStatusPill } from './run-status-pill'
import { RunTypeBadge } from './run-type-badge'

interface RunCardProps {
  run: SparkexecuteRun
  /** Source affichée en pied (ex : "SparkPilot · Priorité 1"). Optionnel. */
  sourceLabel?: string
}

export function RunCard({ run, sourceLabel }: RunCardProps) {
  const title = extractTitle(run)
  const subtitle = extractSubtitle(run)

  return (
    <div className="relative">
      {run.status === 'archived' ? (
        <PermanentDeleteButton runId={run.id} />
      ) : null}
      <Link
        href={`/sparkexecute/runs/${run.id}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-[#E4E7E2] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-14px_rgba(15,17,21,0.22)]"
      >
      {run.type === 'visual' && run.output.image_url ? (
        // Aperçu visuel : on affiche l'image générée. Le bouton "Valider" reste accessible en pied.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={run.output.image_url}
          alt={run.output.alt_text ?? title}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
      ) : null}

      <div className="flex-1 px-5 pb-4 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <RunTypeBadge type={run.type} />
          <span className="font-mono text-[10px] uppercase text-[#5E626C]">
            {formatRelative(run.created_at)}
          </span>
        </div>
        <h3
          className="mb-2 text-[19px] leading-snug text-[#0F1115] transition group-hover:text-[#064E3B]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs leading-relaxed text-[#5E626C]">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-[#E4E7E2] bg-[#F7F5EF]/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <RunStatusPill status={run.status} />
          {sourceLabel ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
              {sourceLabel}
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-[#064E3B]">
          Ouvrir <ChevronRight className="h-4 w-4" />
        </span>
      </div>
      </Link>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

/** Le "titre" affiché = sujet du brief. Fallback sur l'id si tout est vide. */
function extractTitle(run: SparkexecuteRun): string {
  const sujet = run.input_brief?.sujet?.trim()
  if (sujet) return sujet
  return `Run ${run.id.slice(0, 8)}`
}

/** Sous-titre : framework + stat type-dépendante (nb mots, nb caractères…). */
function extractSubtitle(run: SparkexecuteRun): string | null {
  const parts: string[] = []
  if (run.framework_used) {
    parts.push(`Méthode ${run.framework_used}`)
  }
  const meta = run.output?.metadata ?? {}
  if (typeof meta.word_count === 'number' && meta.word_count > 0) {
    parts.push(`${meta.word_count} mots`)
  }
  if (typeof meta.character_count === 'number' && meta.character_count > 0) {
    parts.push(`${meta.character_count} caractères`)
  }
  if (run.type === 'visual' && run.output.image_url) {
    parts.push('1080 × 1080')
  }
  if (parts.length === 0) return null
  return parts.join(' · ')
}

/** "il y a 2j", "il y a 5h", "à l'instant" — pour les badges de date. */
function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = diffMs / (1000 * 60 * 60)
  if (diffH < 1) return "à l'instant"
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`
  const days = Math.round(diffH / 24)
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}
