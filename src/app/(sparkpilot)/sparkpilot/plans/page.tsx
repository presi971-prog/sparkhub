/**
 * Liste de tous les plans SparkPilot de l'utilisateur.
 *
 * Server Component qui affiche : titre, statut, nombre de tâches, % avancement.
 */

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import type { SparkpilotPlan, SparkpilotTask } from '@/lib/sparkpilot/types'
import { EmptyState } from '@/components/sparkpilot/empty-state'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  active: 'En cours',
  archived: 'Archivé',
  completed: 'Terminé',
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-[#EEF0FF] text-[#2E2A78]',
  archived: 'bg-[#F3F2EC] text-[#5E626C]',
  completed: 'bg-[#EAF1EC] text-[#3E6B4A]',
}

export default async function SparkPilotPlansPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: planRows } = await supabase
    .from('sparkpilot_plans')
    .select('id, user_id, scan_id, title, status, metadata, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const plans = (planRows ?? []) as SparkpilotPlan[]

  // Stats par plan en un seul appel : on récupère toutes les tasks puis on agrège.
  const planIds = plans.map((p) => p.id)
  let tasksByPlan = new Map<string, SparkpilotTask[]>()
  if (planIds.length > 0) {
    const { data: tasksRows } = await supabase
      .from('sparkpilot_tasks')
      .select(
        'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
      )
      .in('plan_id', planIds)
    tasksByPlan = groupBy((tasksRows ?? []) as SparkpilotTask[], (t) => t.plan_id)
  }

  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-12">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">Mes plans</span>
      </nav>

      <header className="mb-8">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
          Tes plans d&apos;action
        </div>
        <h1
          className="mt-2 text-[40px] leading-tight tracking-tight sm:text-[48px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Tous tes <span className="italic text-[#2E2A78]">plans</span>
        </h1>
        <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[#5E626C]">
          Chaque plan est issu d&apos;un rapport SparkScan. Ouvre-en un pour
          retrouver ses tâches, le journal, le calendrier.
        </p>
      </header>

      {plans.length === 0 ? (
        <EmptyState
          title="Aucun plan pour le moment"
          description="Lance d'abord une analyse SparkScan, on s'occupe de transformer ton rapport en plan d'action concret."
          action={
            <Link
              href="/sparkscan"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F1115] px-4 text-[13.5px] font-medium text-[#F7F5EF] transition hover:bg-[#22252C]"
            >
              Aller sur SparkScan
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const tasks = tasksByPlan.get(plan.id) ?? []
            const done = tasks.filter((t) => t.status === 'done').length
            const total = tasks.length
            const percent = total === 0 ? 0 : Math.round((done / total) * 100)
            return (
              <li key={plan.id}>
                <Link
                  href={`/sparkpilot/plans/${plan.id}`}
                  className="block h-full overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_rgba(15,17,21,0.18),0_2px_6px_rgba(15,17,21,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      className="text-[22px] leading-tight"
                      style={{
                        fontFamily:
                          'var(--font-instrument-serif), Georgia, serif',
                      }}
                    >
                      {plan.title}
                    </h2>
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] ${
                        STATUS_COLOR[plan.status] ?? 'bg-[#F3F2EC] text-[#5E626C]'
                      }`}
                    >
                      {STATUS_LABEL[plan.status] ?? plan.status}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5E626C]">
                    Créé le {formatShortDate(plan.created_at)}
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div
                        className="text-[28px] leading-none tabular-nums"
                        style={{
                          fontFamily:
                            'var(--font-instrument-serif), Georgia, serif',
                        }}
                      >
                        {percent}
                        <span className="text-[16px] text-[#A8ACB5]">%</span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-[#5E626C]">
                        {done} sur {total} tâches
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#A8ACB5]" />
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F7F5EF]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#4F46E5]/60"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function groupBy<T, K>(arr: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of arr) {
    const k = key(item)
    const existing = map.get(k)
    if (existing) existing.push(item)
    else map.set(k, [item])
  }
  return map
}
