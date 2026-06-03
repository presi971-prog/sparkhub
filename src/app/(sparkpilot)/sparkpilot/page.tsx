/**
 * Dashboard SparkPilot — "Bonjour Thierry, voici où tu en es."
 *
 * Server Component qui charge :
 *   - le plan actif principal (le plus récent)
 *   - ses tâches du jour et de demain
 *   - les 5 dernières activités du journal
 *
 * Cohérent avec le mockup dashboard.html : salutation + 4 KPIs + liste tâches
 * + carte progression du plan + timeline activité récente.
 */

import { ArrowRight, AlertTriangle, CalendarClock, ListChecks, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { summarizeTasks } from '@/lib/sparkpilot/decompose'
import type {
  PriorityMetadata,
  SparkpilotActivity,
  SparkpilotPlan,
  SparkpilotTask,
} from '@/lib/sparkpilot/types'

import { EmptyState } from '@/components/sparkpilot/empty-state'
import { KpiCard } from '@/components/sparkpilot/kpi-card'
import { PRIORITY_BAR_CLASS, PRIORITY_DOT_CLASS, type PriorityIndex } from '@/components/sparkpilot/palette'
import { TaskCard } from '@/components/sparkpilot/task-card'

export const dynamic = 'force-dynamic'

export default async function SparkPilotDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null // layout aura déjà redirect

  // 1. Plan actif le plus récent
  const { data: planRow } = await supabase
    .from('sparkpilot_plans')
    .select('id, user_id, scan_id, title, status, metadata, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SparkpilotPlan>()

  if (!planRow) {
    return <EmptyDashboard firstName={extractFirstName(user)} />
  }

  // 2. Tâches du plan
  const { data: tasksRows } = await supabase
    .from('sparkpilot_tasks')
    .select(
      'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
    )
    .eq('plan_id', planRow.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('order_index', { ascending: true })

  const tasks = (tasksRows ?? []) as SparkpilotTask[]
  const stats = summarizeTasks(tasks)
  const priorityLabels = buildPriorityLabels(planRow.metadata)

  // 3. Tâches du jour et de demain
  const today = isoDay(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = isoDay(tomorrowDate)

  const overdueAndToday = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && t.due_date <= today,
  )
  const tomorrowTasks = tasks.filter(
    (t) => t.status !== 'done' && t.due_date === tomorrow,
  )

  // 4. Prochaine échéance (1ère tâche non-faite future)
  const nextTask = tasks.find(
    (t) => t.status !== 'done' && t.due_date && t.due_date > today,
  )

  // 5. Avancement par priorité (1, 2, 3)
  const progressByPriority = computeProgressByPriority(tasks)

  // 6. Activité récente (5 derniers événements)
  const { data: activityRows } = await supabase
    .from('sparkpilot_activity')
    .select('id, user_id, plan_id, task_id, event_type, payload, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const activity = (activityRows ?? []) as SparkpilotActivity[]

  const firstName = extractFirstName(user)
  const now = new Date()
  const greetingDate = formatGreetingDate(now)

  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
      <section className="mb-10 sm:mb-12">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#4F46E5]" />
          {greetingDate}
        </div>
        <h1
          className="mt-3 text-[40px] leading-[1.05] tracking-tight sm:text-[54px]"
          style={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
          }}
        >
          Bonjour <span className="italic text-[#2E2A78]">{firstName}</span>,
          <span className="block sm:inline">
            {' '}
            voici où tu en es.
          </span>
        </h1>
        <div
          className="mt-4 h-[2px] w-32 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(79,70,229,0.18) 12%, rgba(79,70,229,0.55) 50%, rgba(79,70,229,0.18) 88%, transparent 100%)',
          }}
        />
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#5E626C]">
          {stats.todo + stats.inProgress > 0
            ? `Tu as ${stats.todo + stats.inProgress} choses à faire pour avancer ton plan `
            : 'Bonne nouvelle : ton plan est à jour. Pas de tâche en attente sur '}
          <span className="font-medium text-[#0F1115]">{planRow.title}</span>.
        </p>
      </section>

      {/* 4 KPI cards */}
      <section
        aria-label="Aperçu"
        data-tour="dashboard-kpis"
        className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
      >
        <KpiCard
          label="À faire cette semaine"
          icon={ListChecks}
          accent="indigo"
          value={stats.todo + stats.inProgress}
          valueSuffix="tâches"
          hint={
            <>
              <span className="font-medium text-[#3E6B4A]">
                {stats.done} terminées
              </span>{' '}
              · {stats.todo} à faire
            </>
          }
        />
        <KpiCard
          label="En retard"
          icon={AlertTriangle}
          accent="ember"
          value={stats.overdue}
          valueSuffix={stats.overdue > 1 ? 'tâches' : 'tâche'}
          hint={
            stats.overdue > 0
              ? 'À reporter ou faire aujourd\'hui'
              : 'Aucune tâche en retard — bravo'
          }
        />
        <KpiCard
          label="Ton plan, où il en est"
          icon={TrendingUp}
          accent="moss"
          value={`${stats.completionPercent}`}
          valueSuffix="%"
          hint={
            <>
              {planRow.title} · {stats.done} de {stats.total} tâches
            </>
          }
        />
        <KpiCard
          label="Prochaine échéance"
          icon={CalendarClock}
          accent="honey"
          value={nextTask?.due_date ? formatShortDate(nextTask.due_date) : '—'}
          hint={nextTask ? nextTask.title : 'Aucune échéance prochaine'}
        />
      </section>

      {/* Aujourd'hui + Demain (2/3) + Progression (1/3) */}
      <section className="mb-10 grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        <div
          data-tour="dashboard-today"
          className="overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] lg:col-span-2"
        >
          <header className="flex items-end justify-between border-b border-[#E9E5D9]/70 px-5 pb-4 pt-5 sm:px-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                Ce que tu fais
              </div>
              <h2
                className="mt-1 text-[24px] leading-none"
                style={{
                  fontFamily: 'var(--font-instrument-serif), Georgia, serif',
                }}
              >
                Aujourd&apos;hui{' '}
                <span className="italic text-[#A8ACB5]">&amp; demain</span>
              </h2>
            </div>
            <Link
              href={`/sparkpilot/plans/${planRow.id}`}
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4F46E5] transition hover:text-[#2E2A78]"
            >
              Voir le plan complet
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          <DaySection
            label={`Aujourd'hui · ${overdueAndToday.length} ${
              overdueAndToday.length > 1 ? 'tâches' : 'tâche'
            }`}
            tasks={overdueAndToday}
            priorityLabels={priorityLabels}
            emptyHint="Rien d'urgent aujourd'hui. Profite ou attaque déjà demain."
          />
          <DaySection
            label={`Demain · ${tomorrowTasks.length} ${
              tomorrowTasks.length > 1 ? 'tâches' : 'tâche'
            }`}
            tasks={tomorrowTasks}
            priorityLabels={priorityLabels}
            emptyHint="Pas de tâche posée pour demain."
          />

          <div className="flex items-center justify-between border-t border-[#E9E5D9]/70 bg-[#F7F5EF]/40 px-5 py-3.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#5E626C] sm:px-6">
            <span>
              {overdueAndToday.length + tomorrowTasks.length} tâche(s) affichée(s)
            </span>
            <Link
              href={`/sparkpilot/plans/${planRow.id}`}
              className="text-[#4F46E5] transition hover:text-[#2E2A78]"
            >
              Tout voir →
            </Link>
          </div>
        </div>

        <aside
          data-tour="dashboard-progress"
          className="overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]"
        >
          <header className="border-b border-[#E9E5D9]/70 px-5 pb-4 pt-5 sm:px-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
              Progression de ton plan
            </div>
            <h2
              className="mt-1 text-[22px] leading-tight"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              {planRow.title}
            </h2>
            <p className="mt-1.5 text-[12.5px] text-[#5E626C]">
              Démarré le {formatShortDate(planRow.created_at.split('T')[0])} ·{' '}
              {stats.total} tâches au total
            </p>
          </header>

          <div className="px-5 py-5 sm:px-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                Avancement global
              </span>
              <span
                className="text-[22px] tabular-nums"
                style={{
                  fontFamily: 'var(--font-instrument-serif), Georgia, serif',
                }}
              >
                {stats.completionPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F7F5EF]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#4F46E5]/60"
                style={{ width: `${stats.completionPercent}%` }}
              />
            </div>

            <div className="mt-7 space-y-5">
              {progressByPriority.map((p) => (
                <div key={p.index}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${PRIORITY_DOT_CLASS[p.index]}`}
                      />
                      <span className="text-[13.5px] font-medium">
                        {priorityLabels[p.index] ?? `Priorité ${p.index}`}
                      </span>
                    </div>
                    <span className="font-mono text-[12px] tabular-nums text-[#22252C]">
                      {p.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#F7F5EF]">
                    <div
                      className={`h-full rounded-full ${PRIORITY_BAR_CLASS[p.index]}`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-[#5E626C]">
                    {p.done} sur {p.total} tâche(s) faite(s)
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E9E5D9]/70 bg-[#F7F5EF]/40 px-5 py-3.5 sm:px-6">
            <Link
              href={`/sparkpilot/plans/${planRow.id}`}
              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#4F46E5] transition hover:text-[#2E2A78]"
            >
              Ouvrir le plan
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </section>

      {/* Activité récente */}
      <section className="mb-14 overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
        <header className="flex items-end justify-between border-b border-[#E9E5D9]/70 px-5 pb-4 pt-5 sm:px-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
              Activité récente
            </div>
            <h2
              className="mt-1 text-[24px] leading-none"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              Ce qui s&apos;est passé{' '}
              <span className="italic text-[#5E626C]">cette semaine</span>
            </h2>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#5E626C]">
            {activity.length} événement{activity.length > 1 ? 's' : ''}
          </span>
        </header>

        {activity.length === 0 ? (
          <div className="px-5 py-6 text-[14px] text-[#5E626C] sm:px-6">
            Rien encore. Coche ta première tâche pour démarrer le journal.
          </div>
        ) : (
          <ol className="relative px-5 py-4 sm:px-6">
            <span className="absolute bottom-6 left-[34px] top-6 w-px bg-[#E9E5D9] sm:left-[42px]" />
            {activity.map((ev) => (
              <ActivityRow key={ev.id} event={ev} />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function DaySection({
  label,
  tasks,
  priorityLabels,
  emptyHint,
}: {
  label: string
  tasks: SparkpilotTask[]
  priorityLabels: Partial<Record<PriorityIndex, string>>
  emptyHint: string
}) {
  return (
    <>
      <div className="flex items-center gap-3 bg-[#F7F5EF]/60 px-5 py-3 sm:px-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          {label}
        </span>
        <span className="h-px flex-1 bg-[#E9E5D9]" />
      </div>
      {tasks.length === 0 ? (
        <p className="px-5 py-4 text-[13px] italic text-[#5E626C] sm:px-6">
          {emptyHint}
        </p>
      ) : (
        <ul className="divide-y divide-[#E9E5D9]/60">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              priorityLabel={
                priorityLabels[t.priority_index as PriorityIndex] ??
                `Priorité ${t.priority_index}`
              }
            />
          ))}
        </ul>
      )}
    </>
  )
}

function ActivityRow({ event }: { event: SparkpilotActivity }) {
  const { label, accent } = describeEvent(event)
  return (
    <li className="relative flex items-start gap-3 py-3 pl-9 sm:pl-10">
      <span
        className={`absolute top-4 grid h-4 w-4 place-content-center rounded-full text-white left-[26px] sm:left-[34px] ${accent}`}
      >
        <span className="text-[9px]">·</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-[#0F1115]">{label}</p>
        <p className="mt-0.5 font-mono text-[11.5px] uppercase tracking-[0.12em] text-[#5E626C]">
          {formatRelativeDate(event.created_at)}
        </p>
      </div>
    </li>
  )
}

function describeEvent(ev: SparkpilotActivity): {
  label: string
  accent: string
} {
  const payload = ev.payload as Record<string, unknown>
  const title = typeof payload.title === 'string' ? payload.title : 'une tâche'
  switch (ev.event_type) {
    case 'task_completed':
      return {
        label: `Tu as terminé « ${title} »`,
        accent: 'bg-[#3E6B4A]',
      }
    case 'task_reopened':
      return {
        label: `Tu as rouvert « ${title} »`,
        accent: 'bg-[#C7991F]',
      }
    case 'plan_created':
      return {
        label: `Plan créé : ${typeof payload.title === 'string' ? payload.title : 'nouveau plan'}`,
        accent: 'bg-[#4F46E5]',
      }
    case 'task_deleted':
      return {
        label: `Tu as supprimé « ${title} »`,
        accent: 'bg-[#A8ACB5]',
      }
    case 'task_created':
      return {
        label: `Nouvelle tâche : « ${title} »`,
        accent: 'bg-[#4F46E5]',
      }
    default:
      return {
        label: `${ev.event_type}`,
        accent: 'bg-[#A8ACB5]',
      }
  }
}

function EmptyDashboard({ firstName }: { firstName: string }) {
  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
        Bienvenue dans SparkPilot
      </div>
      <h1
        className="mt-3 text-[40px] leading-[1.05] tracking-tight sm:text-[54px]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        Bonjour <span className="italic text-[#2E2A78]">{firstName}</span>,
        <span className="block sm:inline"> on attaque ton premier plan.</span>
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#5E626C]">
        SparkPilot transforme un rapport SparkScan en plan d&apos;action concret.
        Lance un scan d&apos;abord, on s&apos;occupe du reste.
      </p>
      <div className="mt-8">
        <EmptyState
          title="Aucun plan pour le moment"
          description="Va sur SparkScan, lance une analyse de ton site. Au bout du scan, tu pourras créer ton plan SparkPilot en un clic."
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
      </div>
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
  const priorities = (metadata?.priorities as PriorityMetadata[] | undefined) ?? []
  for (const p of priorities) {
    if (p.index === 1 || p.index === 2 || p.index === 3) {
      out[p.index] = p.title
    }
  }
  return out
}

function computeProgressByPriority(tasks: SparkpilotTask[]): {
  index: PriorityIndex
  done: number
  total: number
  percent: number
}[] {
  const result: { index: PriorityIndex; done: number; total: number; percent: number }[] = []
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

function extractFirstName(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  if (typeof meta.first_name === 'string' && meta.first_name.trim()) {
    return meta.first_name.trim()
  }
  if (typeof meta.full_name === 'string' && meta.full_name.trim()) {
    return meta.full_name.trim().split(' ')[0]
  }
  return user.email?.split('@')[0] ?? 'Toi'
}

function isoDay(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatGreetingDate(d: Date): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${capitalize(date)} · ${time}`
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  return capitalize(
    new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
    }).format(date),
  )
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diffH = (now - d.getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return `Il y a ${Math.max(1, Math.round(diffH * 60))} min`
  if (diffH < 24) return `Il y a ${Math.round(diffH)} h`
  const days = Math.round(diffH / 24)
  if (days === 1) return 'Hier'
  return `Il y a ${days} jours`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
