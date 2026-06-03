/**
 * Vue calendrier mensuelle — toutes les tâches du user calées sur le mois affiché.
 *
 * Navigation par searchParam ?month=YYYY-MM. Par défaut on affiche le mois en cours.
 */

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { MonthGrid } from '@/components/sparkpilot/month-grid'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function SparkPilotCalendrierPage({
  searchParams,
}: PageProps) {
  const { month: monthParam } = await searchParams
  const monthStart = parseMonthParam(monthParam)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // On charge toutes les tâches actives sur le mois affiché + bordures
  // (semaines débord du mois précédent et suivant).
  const gridStart = startOfGrid(monthStart)
  const gridEnd = endOfGrid(monthStart)

  // Récupère les IDs de plans (active + completed) pour limiter le scope.
  const { data: planRows } = await supabase
    .from('sparkpilot_plans')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['active', 'completed'])

  const planIds = (planRows ?? []).map((p: { id: string }) => p.id)

  let tasks: SparkpilotTask[] = []
  if (planIds.length > 0) {
    const { data: tasksRows } = await supabase
      .from('sparkpilot_tasks')
      .select(
        'id, plan_id, priority_index, title, description, due_date, estimated_duration_minutes, status, completed_at, order_index, created_at',
      )
      .in('plan_id', planIds)
      .not('due_date', 'is', null)
      .gte('due_date', isoDay(gridStart))
      .lte('due_date', isoDay(gridEnd))
      .order('due_date', { ascending: true })
    tasks = (tasksRows ?? []) as SparkpilotTask[]
  }

  const prevMonth = isoMonth(addMonths(monthStart, -1))
  const nextMonth = isoMonth(addMonths(monthStart, 1))
  const monthTitle = capitalize(
    new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(monthStart),
  )

  return (
    <div className="relative mx-auto max-w-[1340px] px-5 py-10 sm:px-8 sm:py-12">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">Calendrier</span>
      </nav>

      <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
            Tes tâches sur le mois
          </div>
          <h1
            className="mt-2 text-[40px] leading-none tracking-tight sm:text-[48px]"
            style={{
              fontFamily: 'var(--font-instrument-serif), Georgia, serif',
            }}
          >
            {monthTitle}
          </h1>
          <p className="mt-2 text-[13.5px] text-[#5E626C]">
            {tasks.length} tâche{tasks.length > 1 ? 's' : ''} planifiée
            {tasks.length > 1 ? 's' : ''} sur la période affichée.
          </p>
        </div>
        <div data-tour="calendar-nav" className="flex items-center gap-2">
          <Link
            href={`/sparkpilot/calendrier?month=${prevMonth}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E9E5D9] bg-white text-[#22252C] transition hover:bg-[#F7F5EF]"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href="/sparkpilot/calendrier"
            className="inline-flex h-9 items-center rounded-md border border-[#E9E5D9] bg-white px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#22252C] transition hover:bg-[#F7F5EF]"
          >
            Aujourd&apos;hui
          </Link>
          <Link
            href={`/sparkpilot/calendrier?month=${nextMonth}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E9E5D9] bg-white text-[#22252C] transition hover:bg-[#F7F5EF]"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div data-tour="calendar-grid">
        <MonthGrid monthStart={monthStart} tasks={tasks} />
      </div>
    </div>
  )
}

function parseMonthParam(raw: string | undefined): Date {
  if (!raw) return startOfThisMonth()
  const match = /^(\d{4})-(\d{2})$/.exec(raw)
  if (!match) return startOfThisMonth()
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return startOfThisMonth()
  }
  return new Date(year, month, 1)
}

function startOfThisMonth(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function startOfGrid(monthStart: Date): Date {
  const dayOfWeek = (monthStart.getDay() + 6) % 7
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    1 - dayOfWeek,
  )
}

function endOfGrid(monthStart: Date): Date {
  const start = startOfGrid(monthStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 41)
  return end
}

function isoDay(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function isoMonth(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

