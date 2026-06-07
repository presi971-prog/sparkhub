/**
 * Mes créations — liste filtrable de tous les runs SparkExecute de l'user.
 *
 * Filtres via query params :
 *   ?status=draft        → uniquement les brouillons
 *   ?type=article_seo    → uniquement les articles SEO
 *
 * V1 : grid de cartes (RunCard). Pas de drag/sort, pas de pagination.
 * V1.1 : pagination + sélection multiple + actions batch.
 */

import { ArrowRight, Filter } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/sparkexecute/empty-state'
import { RunCard } from '@/components/sparkexecute/run-card'
import { createClient } from '@/lib/supabase/server'
import { RUN_TYPE_LABEL, RUN_TYPE_ORDER } from '@/lib/sparkexecute/type-mapping'
import type {
  RunStatus,
  RunType,
  SparkexecuteRun,
} from '@/lib/sparkexecute/types'

export const dynamic = 'force-dynamic'

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

const STATUS_FILTERS: { value: RunStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'draft', label: 'Brouillons' },
  { value: 'validated', label: 'Validés' },
  { value: 'published', label: 'Publiés' },
  { value: 'failed', label: 'À refaire' },
  { value: 'archived', label: 'Archivés' },
]

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string }>
}

export default async function MesCreationsPage({ searchParams }: PageProps) {
  const { status, type } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let query = supabase
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (type) {
    query = query.eq('type', type)
  }

  const { data: runsRows } = await query
  const runs = (runsRows ?? []) as SparkexecuteRun[]

  return (
    <div className="relative mx-auto max-w-[1280px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-10">
      {/* Header */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#10B981]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          Atelier · Mes créations
        </div>
        <h1
          className="mb-2 text-[34px] leading-[1.05] text-[#0F1115] sm:text-[44px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Toutes tes créations
        </h1>
        <p className="max-w-2xl text-[15px] text-[#5E626C]">
          {runs.length === 0
            ? 'Tu n\'as pas encore créé de livrable. Lance ta première création depuis le tableau de bord ou une tâche SparkPilot.'
            : `${runs.length} livrable${runs.length > 1 ? 's' : ''} au total. Filtre par statut ou type pour t'y retrouver.`}
        </p>
      </section>

      {/* Filtres */}
      <section className="mb-8 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          <Filter className="h-3 w-3" /> Statut
        </span>
        {STATUS_FILTERS.map((f) => {
          const isActive =
            (f.value === 'all' && !status) || status === f.value
          const href = buildFilterHref({
            status: f.value === 'all' ? undefined : f.value,
            type,
          })
          return (
            <Link
              key={f.value}
              href={href}
              className={
                isActive
                  ? 'rounded-md border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#064E3B]'
                  : 'rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5E626C] transition hover:bg-[#F7F5EF]'
              }
            >
              {f.label}
            </Link>
          )
        })}
      </section>

      <section className="mb-8 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          <Filter className="h-3 w-3" /> Type
        </span>
        <Link
          href={buildFilterHref({ status, type: undefined })}
          className={
            !type
              ? 'rounded-md border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#064E3B]'
              : 'rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5E626C] transition hover:bg-[#F7F5EF]'
          }
        >
          Tous
        </Link>
        {RUN_TYPE_ORDER.map((t) => {
          const isActive = type === t
          return (
            <Link
              key={t}
              href={buildFilterHref({ status, type: t })}
              className={
                isActive
                  ? 'rounded-md border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#064E3B]'
                  : 'rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#5E626C] transition hover:bg-[#F7F5EF]'
              }
            >
              {RUN_TYPE_LABEL[t]}
            </Link>
          )
        })}
      </section>

      {/* Liste */}
      {runs.length === 0 ? (
        <EmptyState
          title="Aucune création"
          description="Essaie un autre filtre ou lance ta première création."
          action={
            <Link
              href="/sparkexecute/nouveau"
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-[13.5px] font-medium text-white"
              style={{
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              }}
            >
              Créer un livrable
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Construit l'URL avec les query params filtrés (omet les valeurs absentes).
 */
function buildFilterHref(params: {
  status?: string
  type?: RunType | string
}): string {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.type) search.set('type', params.type)
  const qs = search.toString()
  return qs ? `/sparkexecute/mes-creations?${qs}` : '/sparkexecute/mes-creations'
}
