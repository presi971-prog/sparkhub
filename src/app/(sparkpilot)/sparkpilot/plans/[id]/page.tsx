/**
 * Vue détail d'un plan SparkPilot — copie le mockup plan.html.
 *
 * Server Component qui charge le plan + ses tâches, regroupe :
 *   - bandeau "stitched" : titre, KPIs (avancement, faites, semaine, fin prévue)
 *   - 3 cartes priorités (avec pourcentage et pastilles colorées)
 *   - liste des tâches groupées par semaine
 */

import { ArrowRight, Calendar, Compass, Target, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { summarizeTasks } from '@/lib/sparkpilot/decompose'
import {
  getStrategyForCategory,
  getSuccessSignalsForCategory,
} from '@/lib/sparkpilot/priority-pedagogy'
import type {
  PriorityMetadata,
  SparkpilotPlan,
  SparkpilotTask,
} from '@/lib/sparkpilot/types'

import {
  PRIORITY_BAR_CLASS,
  PRIORITY_DOT_CLASS,
  PRIORITY_FALLBACK_LABEL,
  type PriorityIndex,
} from '@/components/sparkpilot/palette'
import { TaskCard } from '@/components/sparkpilot/task-card'
import { EmptyState } from '@/components/sparkpilot/empty-state'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SparkPilotPlanDetailPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: planRow } = await supabase
    .from('sparkpilot_plans')
    .select('id, user_id, scan_id, title, status, metadata, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle<SparkpilotPlan>()

  if (!planRow) notFound()

  const { data: tasksRows } = await supabase
    .from('sparkpilot_tasks')
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .eq('plan_id', id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('order_index', { ascending: true })

  const tasks = (tasksRows ?? []) as SparkpilotTask[]
  const stats = summarizeTasks(tasks)
  const priorityLabels = buildPriorityLabels(planRow.metadata)
  const priorityReasons = buildPriorityReasons(planRow.metadata)
  const priorityCategories = buildPriorityCategories(planRow.metadata)

  // Regroupe les tâches par semaine pour la liste.
  const grouped = groupTasksByWeek(tasks)

  // Calcule la "fin prévue" = max(due_date)
  const lastDueDate = tasks
    .map((t) => t.due_date)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)

  // Avancement par priorité
  const priorityProgress = computePriorityProgress(tasks)

  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <Link
          href="/sparkpilot/plans"
          className="transition hover:text-[#0F1115]"
        >
          Mes plans
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">{planRow.title}</span>
      </nav>

      {/* En-tête du plan */}
      <section
        className="relative mb-8 rounded-[18px] border border-[#E9E5D9] bg-white p-6 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
              <Compass className="h-3.5 w-3.5" />
              Plan d&apos;action · déduit de SparkScan
            </div>
            <h1
              className="mt-3 text-[44px] leading-[0.98] tracking-tight sm:text-[56px]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              {planRow.title}
            </h1>
            <p className="mt-4 text-[14.5px] leading-relaxed text-[#22252C]">
              {stats.total} tâche{stats.total > 1 ? 's' : ''} concrète
              {stats.total > 1 ? 's' : ''}, déduite{stats.total > 1 ? 's' : ''} des
              priorités stratégiques de ton rapport SparkScan. Coche au fil de
              l&apos;eau, reporte si tu ne peux pas, ajuste si la stratégie évolue.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5E626C]">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Créé le {formatShortDate(planRow.created_at)}
              </span>
              <span className="text-[#A8ACB5]">·</span>
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Toi seul
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-5 border-t border-[#E9E5D9]/70 pt-6 sm:grid-cols-4 sm:gap-8">
          <KpiBlock
            label="Avancement"
            value={`${stats.completionPercent}`}
            unit="%"
            bar={stats.completionPercent}
          />
          <KpiBlock
            label="Tâches faites"
            value={`${stats.done}`}
            unit={`/ ${stats.total}`}
            hint={`${stats.todo + stats.inProgress} restantes`}
          />
          <KpiBlock
            label="En cours"
            value={`${stats.todo + stats.inProgress}`}
            unit="à faire"
            hint={stats.overdue > 0 ? `${stats.overdue} en retard` : 'Tout est à jour'}
            hintColor={stats.overdue > 0 ? 'text-[#E0633A]' : 'text-[#5E626C]'}
          />
          <KpiBlock
            label="Fin prévue"
            value={lastDueDate ? formatShortDate(lastDueDate) : '—'}
            hint={lastDueDate ? relativeWeeksLabel(lastDueDate) : 'Pas de date posée'}
          />
        </div>
      </section>

      {/* 3 priorités */}
      {priorityProgress.length > 0 ? (
        <section data-tour="plan-priorities" className="mb-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                Les 3 priorités du rapport
              </div>
              <h2
                className="mt-1 text-[26px] leading-none"
                style={{
                  fontFamily: 'var(--font-instrument-serif), Georgia, serif',
                }}
              >
                Où on doit pousser, dans cet ordre
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {priorityProgress.map((p) => (
              <article
                key={p.index}
                className="relative overflow-hidden rounded-xl border border-[#E9E5D9] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]"
              >
                <span
                  className="absolute right-4 top-4 text-[44px] leading-none opacity-10"
                  style={{
                    fontFamily:
                      'var(--font-instrument-serif), Georgia, serif',
                    color:
                      p.index === 1
                        ? '#4F46E5'
                        : p.index === 2
                          ? '#C7991F'
                          : '#3E6B4A',
                  }}
                >
                  0{p.index}
                </span>
                <div
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    color:
                      p.index === 1
                        ? '#4F46E5'
                        : p.index === 2
                          ? '#C7991F'
                          : '#3E6B4A',
                  }}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT_CLASS[p.index]}`} />
                  Priorité {p.index}
                </div>
                <h3
                  className="mt-2 text-[22px] leading-tight"
                  style={{
                    fontFamily:
                      'var(--font-instrument-serif), Georgia, serif',
                  }}
                >
                  {priorityLabels[p.index] ?? PRIORITY_FALLBACK_LABEL[p.index]}
                </h3>
                {priorityReasons[p.index] ? (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#22252C]">
                    {priorityReasons[p.index]}
                  </p>
                ) : null}

                {/* Bloc pédagogique "Stratégie globale" — toujours visible.
                    Dérivé de playbook_category via priority-pedagogy.ts.
                    R0 30/05/2026 : SparkPilot doit expliquer le pourquoi du comment.
                    Le premier bloc porte data-tour="plan-strategy" pour l'ancre tour. */}
                <div
                  {...(p.index === priorityProgress[0]?.index
                    ? { 'data-tour': 'plan-strategy' }
                    : {})}
                  className="mt-4 rounded-lg border-l-2 border-indigo-300 bg-indigo-50/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#4F46E5]">
                    <TrendingUp className="h-3 w-3" />
                    Stratégie globale
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#22252C]">
                    {getStrategyForCategory(priorityCategories[p.index])}
                  </p>
                </div>

                {/* Bloc pédagogique "Indicateurs de succès" — dépliable.
                    On utilise <details>/<summary> natifs pour rester
                    Server Component pur (pas de state client). */}
                <details className="group mt-2 rounded-lg border border-[#E9E5D9] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#5E626C] transition hover:text-[#0F1115]">
                    <span className="inline-flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      Indicateurs de succès
                    </span>
                    <span className="text-[10px] text-[#A8ACB5] transition group-open:rotate-90">
                      ▸
                    </span>
                  </summary>
                  <p className="border-t border-[#E9E5D9]/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#22252C]">
                    {getSuccessSignalsForCategory(priorityCategories[p.index])}
                  </p>
                </details>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-[24px] tabular-nums text-[#0F1115]"
                      style={{
                        fontFamily:
                          'var(--font-instrument-serif), Georgia, serif',
                      }}
                    >
                      {p.percent}
                    </span>
                    <span className="font-mono text-[11px] text-[#5E626C]">%</span>
                  </div>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5E626C]">
                    {p.total - p.done} à faire
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F7F5EF]">
                  <div
                    className={`h-full rounded-full ${PRIORITY_BAR_CLASS[p.index]}`}
                    style={{ width: `${p.percent}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Liste des tâches groupées */}
      <section
        data-tour="plan-tasks"
        className="overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]"
      >
        {tasks.length === 0 ? (
          <div className="px-5 py-10 sm:px-6">
            <EmptyState
              title="Ce plan n'a pas encore de tâche"
              description="Étrange — relance la décomposition depuis le rapport SparkScan source."
            />
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 border-y border-[#E9E5D9]/70 bg-[#F7F5EF]/60 px-5 py-3 sm:px-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#22252C]">
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-[#E9E5D9]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                  {group.tasks.length} tâche{group.tasks.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="divide-y divide-[#E9E5D9]/60">
                {group.tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    priorityLabel={
                      priorityLabels[t.priority_index as PriorityIndex] ??
                      PRIORITY_FALLBACK_LABEL[t.priority_index as PriorityIndex]
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        )}

        {tasks.length > 0 ? (
          <div className="flex items-center justify-between border-t border-[#E9E5D9]/70 bg-[#F7F5EF]/40 px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5E626C] sm:px-6">
            <span>
              {stats.total} tâche{stats.total > 1 ? 's' : ''} · {stats.done} faite
              {stats.done > 1 ? 's' : ''}
              {stats.overdue > 0 ? ` · ${stats.overdue} en retard` : ''}
            </span>
            <Link
              href="/sparkpilot/calendrier"
              className="inline-flex items-center gap-1 text-[#4F46E5] transition hover:text-[#2E2A78]"
            >
              Voir le calendrier
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function KpiBlock({
  label,
  value,
  unit,
  hint,
  hintColor,
  bar,
}: {
  label: string
  value: string
  unit?: string
  hint?: string
  hintColor?: string
  bar?: number
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="text-[28px] leading-none tabular-nums"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          {value}
        </span>
        {unit ? <span className="text-[13px] text-[#5E626C]">{unit}</span> : null}
      </div>
      {bar !== undefined ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F7F5EF]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#4F46E5]/60"
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : hint ? (
        <div className={`mt-2 text-[12px] ${hintColor ?? 'text-[#5E626C]'}`}>
          {hint}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function buildPriorityLabels(
  metadata: Record<string, unknown> | null,
): Partial<Record<PriorityIndex, string>> {
  const out: Partial<Record<PriorityIndex, string>> = {}
  const priorities =
    (metadata?.priorities as PriorityMetadata[] | undefined) ?? []
  for (const p of priorities) {
    if (p.index === 1 || p.index === 2 || p.index === 3) {
      out[p.index] = p.title
    }
  }
  return out
}

function buildPriorityReasons(
  metadata: Record<string, unknown> | null,
): Partial<Record<PriorityIndex, string>> {
  const out: Partial<Record<PriorityIndex, string>> = {}
  const priorities =
    (metadata?.priorities as PriorityMetadata[] | undefined) ?? []
  for (const p of priorities) {
    if (p.index === 1 || p.index === 2 || p.index === 3) {
      out[p.index] = p.reason
    }
  }
  return out
}

/**
 * Extrait la `playbook_category` snapshotée pour chaque priorité.
 * Sert ensuite à dériver les blocs "Stratégie globale" et "Indicateurs
 * de succès" via priority-pedagogy.ts.
 */
function buildPriorityCategories(
  metadata: Record<string, unknown> | null,
): Partial<Record<PriorityIndex, string>> {
  const out: Partial<Record<PriorityIndex, string>> = {}
  const priorities =
    (metadata?.priorities as PriorityMetadata[] | undefined) ?? []
  for (const p of priorities) {
    if (p.index === 1 || p.index === 2 || p.index === 3) {
      if (p.playbook_category) {
        out[p.index] = p.playbook_category
      }
    }
  }
  return out
}

function computePriorityProgress(tasks: SparkpilotTask[]): {
  index: PriorityIndex
  done: number
  total: number
  percent: number
}[] {
  const result: {
    index: PriorityIndex
    done: number
    total: number
    percent: number
  }[] = []
  for (const index of [1, 2, 3] as PriorityIndex[]) {
    const subset = tasks.filter((t) => t.priority_index === index)
    if (subset.length === 0) continue
    const done = subset.filter((t) => t.status === 'done').length
    result.push({
      index,
      done,
      total: subset.length,
      percent: Math.round((done / subset.length) * 100),
    })
  }
  return result
}

function groupTasksByWeek(
  tasks: SparkpilotTask[],
): { label: string; tasks: SparkpilotTask[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfThisWeek = new Date(today)
  // Lundi (en FR : Mon=1, Sun=0). On normalise.
  const dayOfWeek = (today.getDay() + 6) % 7
  startOfThisWeek.setDate(today.getDate() - dayOfWeek)
  const startOfNextWeek = new Date(startOfThisWeek)
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7)
  const startOfWeekAfter = new Date(startOfNextWeek)
  startOfWeekAfter.setDate(startOfNextWeek.getDate() + 7)

  const buckets = {
    cetteSemaine: [] as SparkpilotTask[],
    semaineProchaine: [] as SparkpilotTask[],
    suite: [] as SparkpilotTask[],
    sansDate: [] as SparkpilotTask[],
  }

  for (const t of tasks) {
    if (!t.due_date) {
      buckets.sansDate.push(t)
      continue
    }
    const d = new Date(`${t.due_date}T00:00:00`)
    if (d.getTime() < startOfNextWeek.getTime()) buckets.cetteSemaine.push(t)
    else if (d.getTime() < startOfWeekAfter.getTime()) buckets.semaineProchaine.push(t)
    else buckets.suite.push(t)
  }

  const out: { label: string; tasks: SparkpilotTask[] }[] = []
  if (buckets.cetteSemaine.length > 0) {
    out.push({
      label: `Cette semaine · ${formatDayMonth(startOfThisWeek)} — ${formatDayMonth(
        new Date(startOfNextWeek.getTime() - 86400000),
      )}`,
      tasks: buckets.cetteSemaine,
    })
  }
  if (buckets.semaineProchaine.length > 0) {
    out.push({
      label: `Semaine prochaine · ${formatDayMonth(startOfNextWeek)} — ${formatDayMonth(
        new Date(startOfWeekAfter.getTime() - 86400000),
      )}`,
      tasks: buckets.semaineProchaine,
    })
  }
  if (buckets.suite.length > 0) {
    out.push({
      label: 'Plus tard dans le mois',
      tasks: buckets.suite,
    })
  }
  if (buckets.sansDate.length > 0) {
    out.push({
      label: 'Sans date posée',
      tasks: buckets.sansDate,
    })
  }
  return out
}

function formatShortDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatDayMonth(d: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(d)
}

function relativeWeeksLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays < 0) return `Dépassée de ${Math.abs(diffDays)} j`
  if (diffDays < 7) return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  const weeks = Math.round(diffDays / 7)
  return `Dans ${weeks} semaine${weeks > 1 ? 's' : ''}`
}
