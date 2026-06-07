'use client'

/**
 * Liste des publications déjà faites pour un run SparkExecute.
 *
 * - Au mount : appelle GET /api/sparkexecute/runs/[id]/publications
 * - Affiche : platform + statut + date + lien externe + bouton "Republier" si failed.
 * - Auto-refresh via le prop `refreshKey` (incrément quand le parent vient de
 *   publier).
 *
 * Microcopy R0 : pas de jargon, statuts en français clair.
 */

import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  PublishPlatform,
  SparkexecutePublication,
} from '@/lib/sparkexecute/types'

interface PublicationsListProps {
  runId: string
  /** Incrémenté par le parent pour forcer un refresh. */
  refreshKey?: number
  /** Appelé quand l'user clique "Republier" sur une ligne failed. */
  onRetry?: (platform: PublishPlatform) => void
}

const PLATFORM_LABEL: Record<PublishPlatform, string> = {
  ghl_blog: 'Blog DCG AI',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google Business',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  threads: 'Threads',
}

export function PublicationsList({
  runId,
  refreshKey = 0,
  onRetry,
}: PublicationsListProps) {
  const [publications, setPublications] = useState<SparkexecutePublication[] | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sparkexecute/runs/${runId}/publications`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { publications: SparkexecutePublication[] }
      setPublications(data.publications ?? [])
    } catch {
      setError('Impossible de lire les publications. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (loading && !publications) {
    return (
      <div className="rounded-xl border border-[#E4E7E2] bg-white p-5">
        <p className="inline-flex items-center gap-2 text-xs text-[#5E626C]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement des publications…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
        <p className="text-sm text-amber-900">{error}</p>
      </div>
    )
  }

  if (!publications || publications.length === 0) {
    return null
  }

  return (
    <section className="mt-6 rounded-xl border border-[#E4E7E2] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
      <header className="flex items-center justify-between border-b border-[#E4E7E2] px-5 py-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          Publications
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-xs text-[#5E626C] transition hover:text-[#0F1115]"
        >
          <RefreshCw className="h-3 w-3" /> Rafraîchir
        </button>
      </header>
      <ul className="divide-y divide-[#E4E7E2]">
        {publications.map((pub) => (
          <li
            key={pub.id}
            className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <StatusIcon status={pub.status} />
              <div>
                <p className="text-sm font-medium text-[#0F1115]">
                  {PLATFORM_LABEL[pub.platform] ?? pub.platform}
                </p>
                <p className="text-xs text-[#5E626C]">{formatStatusLine(pub)}</p>
                {pub.status === 'failed' && pub.error_message ? (
                  <p className="mt-0.5 text-xs text-[#A1432D]">{pub.error_message}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pub.external_url ? (
                <a
                  href={pub.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1115] transition hover:bg-[#F7F5EF]"
                >
                  Voir le post <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              {pub.status === 'failed' && onRetry ? (
                <button
                  type="button"
                  onClick={() => onRetry(pub.platform)}
                  className="inline-flex items-center gap-1 rounded-md bg-[#0F1115] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#22252C]"
                >
                  <RefreshCw className="h-3 w-3" /> Republier
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function StatusIcon({
  status,
}: {
  status: SparkexecutePublication['status']
}) {
  if (status === 'published') {
    return <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
  }
  if (status === 'scheduled') {
    return <Loader2 className="h-4 w-4 text-[#A37312]" />
  }
  if (status === 'pending') {
    return <Loader2 className="h-4 w-4 animate-spin text-[#5E626C]" />
  }
  return <XCircle className="h-4 w-4 text-[#A1432D]" />
}

function formatStatusLine(pub: SparkexecutePublication): string {
  if (pub.status === 'published' && pub.published_at) {
    return `Publié le ${formatDate(pub.published_at)}`
  }
  if (pub.status === 'scheduled' && pub.scheduled_at) {
    return `Programmé pour le ${formatDate(pub.scheduled_at)}`
  }
  if (pub.status === 'pending') {
    return 'En cours…'
  }
  if (pub.status === 'failed') {
    return `Échec le ${formatDate(pub.created_at)}`
  }
  return formatDate(pub.created_at)
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
