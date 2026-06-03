/**
 * Grille calendrier mensuelle.
 *
 * Server component pur — pas d'interactions, on navigue de mois en mois
 * via searchParams (?month=YYYY-MM) côté page.
 *
 * Génère 6 semaines (42 cases) pour couvrir tous les mois, en marquant les
 * jours du mois précédent/suivant en grisé.
 */

import type { SparkpilotTask } from '@/lib/sparkpilot/types'
import type { PriorityIndex } from './palette'

interface MonthGridProps {
  /** Le mois affiché, indexé sur le 1er jour (ex : 2026-05-01). */
  monthStart: Date
  /** Toutes les tâches du user, on filtre côté composant. */
  tasks: SparkpilotTask[]
}

interface DayCell {
  date: Date
  isInMonth: boolean
  isToday: boolean
  tasks: SparkpilotTask[]
}

const WEEK_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const PRIORITY_BORDER_CLASS: Record<PriorityIndex, string> = {
  1: 'border-l-[#4F46E5] bg-[#F4F4FE]',
  2: 'border-l-[#C7991F] bg-[#FBF6E8]',
  3: 'border-l-[#3E6B4A] bg-[#ECF2EE]',
}

export function MonthGrid({ monthStart, tasks }: MonthGridProps) {
  const cells = buildCells(monthStart, tasks)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
      <div className="grid grid-cols-7 border-b border-[#E9E5D9] bg-[#F7F5EF]/60 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
        {WEEK_HEADERS.map((label) => (
          <div key={label} className="px-2 py-2.5 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-[#E9E5D9]/70">
        {cells.map((cell) => (
          <DayCellView key={cell.date.toISOString()} cell={cell} />
        ))}
      </div>
    </div>
  )
}

function DayCellView({ cell }: { cell: DayCell }) {
  return (
    <div
      className={`min-h-[110px] px-2 py-2 transition hover:bg-[#FAF8F1] ${
        cell.isInMonth ? 'bg-white' : 'bg-[#FBF9F3]'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`font-mono text-[12px] tabular-nums ${
            cell.isInMonth ? 'text-[#5E626C]' : 'text-[#C9C4B4]'
          } ${
            cell.isToday
              ? 'grid h-[26px] w-[26px] place-content-center rounded-full bg-[#4F46E5] font-semibold text-white'
              : ''
          }`}
        >
          {cell.date.getDate()}
        </span>
      </div>
      <div className="mt-1.5 space-y-1">
        {cell.tasks.slice(0, 3).map((task) => {
          const priorityIndex = task.priority_index as PriorityIndex
          const isDone = task.status === 'done'
          const isOverdue =
            !isDone &&
            cell.date.getTime() <
              new Date(new Date().setHours(0, 0, 0, 0)).getTime()
          return (
            <div
              key={task.id}
              title={task.title}
              className={`overflow-hidden text-ellipsis whitespace-nowrap rounded border-l-[3px] px-1.5 py-[3px] text-[11px] font-medium leading-tight ${
                isDone
                  ? 'border-l-[#A8ACB5] bg-transparent text-[#A8ACB5] line-through'
                  : isOverdue
                    ? 'border-l-[#E0633A] bg-[#FDECE5] text-[#6B2C18]'
                    : `${PRIORITY_BORDER_CLASS[priorityIndex]} text-[#0F1115]`
              }`}
            >
              {task.title}
            </div>
          )
        })}
        {cell.tasks.length > 3 ? (
          <div className="px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
            +{cell.tasks.length - 3} autres
          </div>
        ) : null}
      </div>
    </div>
  )
}

function buildCells(monthStart: Date, tasks: SparkpilotTask[]): DayCell[] {
  // monthStart = le 1er du mois affiché à minuit local
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const firstDay = new Date(year, month, 1)
  // En FR la semaine commence le lundi (Mon=1, Sun=0). On normalise.
  const dayOfWeek = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - dayOfWeek)

  const tasksByDate = groupTasksByDate(tasks)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const key = isoDateKey(d)
    cells.push({
      date: d,
      isInMonth: d.getMonth() === month,
      isToday: d.getTime() === today.getTime(),
      tasks: tasksByDate.get(key) ?? [],
    })
  }
  return cells
}

function groupTasksByDate(
  tasks: SparkpilotTask[],
): Map<string, SparkpilotTask[]> {
  const map = new Map<string, SparkpilotTask[]>()
  for (const t of tasks) {
    if (!t.due_date) continue
    const key = t.due_date // déjà au format YYYY-MM-DD
    const existing = map.get(key)
    if (existing) existing.push(t)
    else map.set(key, [t])
  }
  return map
}

function isoDateKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
