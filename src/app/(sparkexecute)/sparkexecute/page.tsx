/**
 * Dashboard SparkExecute — "Bonjour Thierry, voici tes créations en cours."
 *
 * Server Component qui charge :
 *   - les 4 KPIs (brouillons, publiés cette semaine, à refaire, runs ce mois)
 *   - les 3 derniers brouillons à valider
 *   - les prochaines tâches SparkPilot importables (4 max)
 *   - les 4 derniers livrables publiés (carrousel mockup)
 */

import {
  ArrowRight,
  BatteryMedium,
  CheckCheck,
  ExternalLink,
  FilePenLine,
  Hammer,
  RefreshCcw,
  Zap,
} from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/sparkexecute/empty-state'
import { RunCard } from '@/components/sparkexecute/run-card'
import { createClient } from '@/lib/supabase/server'
import { deduceTypeFromFramework, RUN_TYPE_LABEL } from '@/lib/sparkexecute/type-mapping'
import type { SparkexecuteRun } from '@/lib/sparkexecute/types'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

export const dynamic = 'force-dynamic'

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

export default async function SparkExecuteDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null // layout aura déjà redirigé

  // 1) Tous les runs récents (50 derniers) — on dérive plusieurs vues à partir.
  const { data: runsRows } = await supabase
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const runs = (runsRows ?? []) as SparkexecuteRun[]

  // Brouillons à valider (status = draft), 3 plus récents
  const drafts = runs.filter((r) => r.status === 'draft').slice(0, 3)

  // Publiés cette semaine (status = published, published_at >= il y a 7j)
  const publishedThisWeek = filterPublishedThisWeek(runs)

  // À refaire (status = failed)
  const toRedo = runs.filter((r) => r.status === 'failed')

  // 4 derniers publiés (carrousel)
  const lastPublished = runs.filter((r) => r.status === 'published').slice(0, 4)

  // 2) Compteur usage du mois courant (somme runs_count des 30 derniers jours)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]
  const { data: usageRows } = await supabase
    .from('sparkexecute_usage')
    .select('runs_count')
    .eq('user_id', user.id)
    .gte('day', thirtyDaysAgoStr)
  const runsThisMonth = (usageRows ?? []).reduce(
    (acc, row) => acc + (row.runs_count ?? 0),
    0,
  )
  // Quota soft : 50 runs / mois (à exposer en config plus tard).
  const MONTHLY_QUOTA = 50
  const remainingRuns = Math.max(0, MONTHLY_QUOTA - runsThisMonth)
  const quotaPct = Math.min(100, Math.round((remainingRuns / MONTHLY_QUOTA) * 100))

  // 3) Prochaines tâches SparkPilot importables
  //    On charge le plan actif le plus récent, puis ses tâches non-faites
  //    avec un framework cité, sans run SparkExecute existant.
  const { data: planRow } = await supabase
    .from('sparkpilot_plans')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; title: string }>()

  let importableTasks: SparkpilotTask[] = []
  if (planRow) {
    const { data: tasksRows } = await supabase
      .from('sparkpilot_tasks')
      .select(
        'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, metadata, created_at',
      )
      .eq('plan_id', planRow.id)
      .neq('status', 'done')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(20)

    const allTasks = (tasksRows ?? []) as SparkpilotTask[]
    const taskIdsWithRun = new Set(
      runs.filter((r) => r.task_id && r.status !== 'archived').map((r) => r.task_id),
    )
    importableTasks = allTasks
      .filter((t) => t.metadata?.framework_used && !taskIdsWithRun.has(t.id))
      .slice(0, 4)
  }

  const firstName = extractFirstName(user)
  const greetingDate = formatGreetingDate(new Date())

  return (
    <div className="relative mx-auto max-w-[1280px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-10">
      {/* ============== SALUTATION ============== */}
      <section className="mb-8 sm:mb-12">
        <div className="mb-3 flex items-center gap-2">
          <Hammer className="h-3.5 w-3.5 text-[#10B981]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
            {greetingDate}
          </span>
        </div>
        <h1
          className="mb-3 text-[34px] leading-[1.05] text-[#0F1115] sm:text-[44px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Bonjour {firstName}, voici tes créations en cours.
        </h1>
        <div
          className="mb-4 h-[2px] w-40 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.18) 12%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,0.18) 88%, transparent 100%)',
          }}
        />
        <p className="max-w-2xl text-[15px] text-[#5E626C]">
          {drafts.length > 0
            ? `${drafts.length} brouillon${drafts.length > 1 ? 's' : ''} attendent ta validation. Une fois validés, ils sont prêts à publier sur ton site, ton LinkedIn ou tes pubs.`
            : 'Aucun brouillon en attente. Lance une nouvelle création ou pioche dans tes tâches SparkPilot.'}
        </p>
      </section>

      {/* ============== KPI CARDS ============== */}
      <section className="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Brouillons à valider"
          icon={FilePenLine}
          accent="emerald"
          value={drafts.length}
          suffix={drafts.length > 1 ? 'en attente' : 'en attente'}
          hint={
            drafts[0]
              ? `Le plus récent : ${formatRelative(drafts[0].created_at)}.`
              : 'Rien à valider pour le moment.'
          }
          isHighlight
        />
        <KpiCard
          label="Publiés cette semaine"
          icon={CheckCheck}
          accent="emerald"
          value={publishedThisWeek.length}
          hint={
            publishedThisWeek.length > 0
              ? describePublishedMix(publishedThisWeek)
              : 'Aucun encore. Valide un brouillon pour démarrer.'
          }
        />
        <KpiCard
          label="À refaire"
          icon={RefreshCcw}
          accent="ember"
          value={toRedo.length}
          hint={
            toRedo[0]?.error_message
              ? toRedo[0].error_message.slice(0, 80)
              : 'Aucune erreur récente.'
          }
        />
        <KpiCard
          label="Crédits restants ce mois"
          icon={BatteryMedium}
          accent="steel"
          value={remainingRuns}
          suffix={`sur ${MONTHLY_QUOTA}`}
          hint="Recharge au 1er du mois."
          progress={quotaPct}
        />
      </section>

      {/* ============== À VALIDER EN PRIORITÉ ============== */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2
              className="text-[26px] leading-tight text-[#0F1115] sm:text-[30px]"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
            >
              À valider en priorité
            </h2>
            <p className="mt-1 text-sm text-[#5E626C]">
              Tes 3 brouillons les plus récents. Ouvre, ajuste, valide.
            </p>
          </div>
          <Link
            href="/sparkexecute/mes-creations"
            className="hidden items-center gap-1 text-sm font-medium text-[#22252C] transition hover:text-[#064E3B] sm:inline-flex"
          >
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {drafts.length === 0 ? (
          <EmptyState
            title="Aucun brouillon en attente"
            description="Lance une nouvelle création ou importe une tâche depuis ton plan SparkPilot."
            action={
              <Link
                href="/sparkexecute/nouveau"
                className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)]"
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
          <div className="grid gap-4 md:grid-cols-3">
            {drafts.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                sourceLabel={
                  run.task_id ? 'SparkPilot · tâche liée' : 'Création libre'
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ============== PROCHAINES TÂCHES SPARKPILOT ============== */}
      {importableTasks.length > 0 ? (
        <section className="mb-12 sm:mb-16">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2
                className="text-[26px] leading-tight text-[#0F1115] sm:text-[30px]"
                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
              >
                Tes prochaines tâches du plan
              </h2>
              <p className="mt-1 text-sm text-[#5E626C]">
                Importées de SparkPilot. Un clic et l&apos;atelier les produit pour toi.
              </p>
            </div>
            {planRow ? (
              <Link
                href={`/sparkpilot/plans/${planRow.id}`}
                className="hidden items-center gap-1 text-sm font-medium text-[#22252C] transition hover:text-[#064E3B] sm:inline-flex"
              >
                Voir le plan <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E4E7E2] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
            {importableTasks.map((task, idx) => (
              <ImportableTaskRow
                key={task.id}
                task={task}
                isLast={idx === importableTasks.length - 1}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ============== DERNIERS PUBLIÉS ============== */}
      {lastPublished.length > 0 ? (
        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2
                className="text-[26px] leading-tight text-[#0F1115] sm:text-[30px]"
                style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
              >
                Tes derniers livrables publiés
              </h2>
              <p className="mt-1 text-sm text-[#5E626C]">
                Pour t&apos;inspirer et reproduire ce qui marche.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lastPublished.map((run) => (
              <RunCard key={run.id} run={run} sourceLabel="Publié" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

// ============================================================
// Sous-composants
// ============================================================

interface KpiCardProps {
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'emerald' | 'ember' | 'steel'
  value: number | string
  suffix?: string
  hint?: string
  /** Si fourni, dessine une mini-progress bar (0..100). */
  progress?: number
  /** Si true, ajoute un liseré vert "etabli" sur le bord gauche. */
  isHighlight?: boolean
}

function KpiCard({
  label,
  icon: Icon,
  accent,
  value,
  suffix,
  hint,
  progress,
  isHighlight,
}: KpiCardProps) {
  const accentText =
    accent === 'emerald'
      ? 'text-[#10B981]'
      : accent === 'ember'
        ? 'text-[#E0633A]'
        : 'text-[#5E626C]'
  const valueColor = accent === 'ember' ? 'text-[#E0633A]' : 'text-[#0F1115]'

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-[#E4E7E2] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)] ${
        isHighlight
          ? 'shadow-[inset_3px_0_0_#10B981,0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]'
          : ''
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${accentText}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-[44px] leading-none tabular-nums ${valueColor}`}
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          {value}
        </span>
        {suffix ? <span className="text-xs text-[#5E626C]">{suffix}</span> : null}
      </div>
      {typeof progress === 'number' ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E4E7E2]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #10B981, #059669)',
            }}
          />
        </div>
      ) : null}
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-[#5E626C]">{hint}</p>
      ) : null}
    </article>
  )
}

function ImportableTaskRow({
  task,
  isLast,
}: {
  task: SparkpilotTask
  isLast: boolean
}) {
  const framework = task.metadata?.framework_used ?? null
  const type = deduceTypeFromFramework(framework, task.title)
  const priorityColor =
    task.priority_index === 1
      ? 'bg-[#E0633A]'
      : task.priority_index === 2
        ? 'bg-[#C7991F]'
        : 'bg-[#475569]'

  return (
    <div
      className={`flex flex-col gap-3 px-5 py-4 transition hover:bg-[#F7F5EF]/40 sm:flex-row sm:items-center sm:gap-4 ${
        isLast ? '' : 'border-b border-[#E4E7E2]'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${priorityColor}`}
        />
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
              Priorité {task.priority_index}
              {task.due_date ? ` · échéance ${formatShortDate(task.due_date)}` : ''}
            </span>
          </div>
          <p className="text-[15px] font-medium leading-snug text-[#0F1115]">
            {task.title}
          </p>
          <p className="mt-0.5 text-xs text-[#5E626C]">
            Suggéré : {RUN_TYPE_LABEL[type]}
            {framework ? ` · méthode ${framework}` : ''}
          </p>
        </div>
      </div>
      <Link
        href={`/sparkpilot/plans/${task.plan_id}`}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition hover:shadow-[0_10px_20px_-8px_rgba(16,185,129,0.55)]"
        style={{
          background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
        }}
      >
        <Zap className="h-4 w-4" /> Faire avec SparkExecute
      </Link>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

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

function formatGreetingDate(d: Date): string {
  const date = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
  return `${date.charAt(0).toUpperCase()}${date.slice(1)} · Pointe-à-Pitre`
}

function formatRelative(iso: string): string {
  const diffH = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60)
  if (diffH < 1) return "il y a moins d'1 h"
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`
  const days = Math.round(diffH / 24)
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(date)
  return formatted
}

function filterPublishedThisWeek(runs: SparkexecuteRun[]): SparkexecuteRun[] {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return runs.filter((r) => {
    if (r.status !== 'published' || !r.published_at) return false
    return new Date(r.published_at).getTime() >= sevenDaysAgo
  })
}

function describePublishedMix(runs: SparkexecuteRun[]): string {
  const counts: Record<string, number> = {}
  for (const r of runs) {
    counts[r.type] = (counts[r.type] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([type, n]) => `${n} ${RUN_TYPE_LABEL[type as keyof typeof RUN_TYPE_LABEL] ?? type}`)
    .join(' + ')
}
