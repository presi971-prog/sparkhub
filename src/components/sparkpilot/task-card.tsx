'use client'

/**
 * Ligne tâche réutilisable (utilisée dans le dashboard et dans le plan).
 *
 * Côté client parce qu'on a besoin de :
 *   - cocher / décocher la tâche (toggle bidirectionnel : done ↔ todo)
 *     → POST /api/sparkpilot/tasks/[id]/complete pour cocher
 *     → PATCH /api/sparkpilot/tasks/[id] body { status: 'todo' } pour rouvrir
 *   - feedback optimiste : on barre le titre immédiatement, on rollback si l'API échoue
 *   - feedback Sonner : toast success/info/erreur après chaque toggle
 *   - 3 blocs pédagogiques (Pourquoi visible / Résultats dépliable / Comment dépliable)
 *     dérivés depuis lib/sparkpilot/pedagogy.ts
 *
 * Design : copié des mockups dashboard.html (ligne <li class="task-row">) +
 * plan.html (avec actions hover).
 */

import { ChevronDown, Compass, Loader2, Target, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { FrameworkBadge } from './framework-badge'
import type { PriorityIndex } from './palette'
import { PriorityBadge } from './priority-badge'
import { StatusPill } from './status-pill'
import {
  getExpectedResultsForFramework,
  getMethodExplanationForFramework,
  getWhyForTask,
} from '@/lib/sparkpilot/pedagogy'
import { deduceTypeFromFramework } from '@/lib/sparkexecute/type-mapping'
import type { SparkpilotTask } from '@/lib/sparkpilot/types'

interface TaskCardProps {
  task: SparkpilotTask
  /** Libellé lisible de la priorité (ex : "Visibilité IA"). */
  priorityLabel: string
  /** Optionnel : la classe d'arrière-plan (ex : bg-rouge pour en retard). */
  highlightClass?: string
}

export function TaskCard({
  task,
  priorityLabel,
  highlightClass,
}: TaskCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Statut optimiste local pour donner un feedback instantané.
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)
  const isDone = optimisticStatus === 'done'

  // Bouton "Faire avec SparkExecute" : on l'affiche sur TOUTES les tâches.
  // Si la tâche a un framework_used en metadata, on l'utilise. Sinon, on
  // infère le type depuis le titre. Loading state local pour ne pas
  // re-cliquer pendant la création du run.
  const [isExecutePending, startExecuteTransition] = useTransition()

  function handleExecute() {
    if (isExecutePending) return
    const inferredType = deduceTypeFromFramework(
      task.metadata?.framework_used,
      task.title,
    )
    startExecuteTransition(async () => {
      try {
        const res = await fetch('/api/sparkexecute/runs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            type: inferredType,
            input_brief: {
              // Contexte complet (étape 3.3) : le livrable est généré depuis
              // le titre ET la description de la tâche, au lieu d'un titre nu.
              sujet: task.description
                ? `${task.title} — Contexte : ${task.description.slice(0, 400)}`
                : task.title,
              audience: '',
            },
          }),
        })

        if (res.status === 401) {
          toast.error('Connecte-toi pour lancer SparkExecute', {
            action: {
              label: 'Me connecter',
              onClick: () => router.push('/connexion?redirect=/sparkpilot'),
            },
          })
          return
        }

        const data = (await res.json().catch(() => ({}))) as {
          run_id?: string
          error?: string
        }

        if (!res.ok || !data.run_id) {
          toast.error(
            data.error ?? "Impossible de lancer la fabrication. Réessaye dans un instant.",
          )
          return
        }

        toast.success("L'atelier prépare ton livrable.")
        router.push(`/sparkexecute/runs/${data.run_id}`)
      } catch {
        toast.error("Réseau injoignable. Réessaye dans un instant.")
      }
    })
  }

  const isOverdue =
    optimisticStatus !== 'done' &&
    task.due_date !== null &&
    new Date(`${task.due_date}T00:00:00`).getTime() < startOfToday().getTime()

  const priorityIndex = task.priority_index as PriorityIndex

  // Contenu pédagogique dérivé du framework + priorité (pur, importable serveur/client).
  const why = getWhyForTask(task)
  const framework = task.metadata?.framework_used
  const expectedResults = getExpectedResultsForFramework(framework)
  const methodExplanation = getMethodExplanationForFramework(framework)

  function handleToggle() {
    if (isPending) return
    const previousStatus = optimisticStatus
    const nextStatus = isDone ? 'todo' : 'done'
    setOptimisticStatus(nextStatus)
    startTransition(async () => {
      try {
        const endpoint = isDone
          ? `/api/sparkpilot/tasks/${task.id}`
          : `/api/sparkpilot/tasks/${task.id}/complete`
        const init: RequestInit = isDone
          ? {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ status: 'todo' }),
            }
          : { method: 'POST' }
        const res = await fetch(endpoint, init)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Feedback positif après succès API (le toggle est validé en base).
        if (nextStatus === 'done') {
          toast.success('Bien joué !')
        } else {
          toast.info('Tâche remise à faire')
        }
        router.refresh()
      } catch {
        // Rollback : on remet l'état d'avant le toggle + on prévient l'utilisateur.
        setOptimisticStatus(previousStatus)
        toast.error(
          'Mise à jour impossible. Vérifie ta connexion et réessaie.',
        )
      }
    })
  }

  return (
    <li
      className={`flex items-start gap-4 px-5 py-4 transition hover:bg-[#FBF9F2] sm:px-6 ${highlightClass ?? ''}`}
    >
      <input
        type="checkbox"
        checked={isDone}
        onChange={handleToggle}
        disabled={isPending}
        aria-label={isDone ? 'Marquer comme à faire' : 'Marquer comme faite'}
        className="mt-1 h-[18px] w-[18px] flex-shrink-0 cursor-pointer rounded-[5px] border border-[#C9C4B4] bg-[#FFFDF7] accent-[#4F46E5] transition focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-[15px] font-medium text-[#0F1115] ${isDone ? 'text-[#A8ACB5] line-through' : ''}`}
          >
            {task.title}
          </span>
          <StatusPill status={optimisticStatus} isOverdue={isOverdue} />
        </div>
        {task.description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[#5E626C]">
            {task.description}
          </p>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em]">
          <PriorityBadge index={priorityIndex} label={priorityLabel} />
          <FrameworkBadge framework={task.metadata?.framework_used} />
          {task.due_date ? (
            <span
              className={
                isOverdue ? 'font-semibold text-[#E0633A]' : 'text-[#5E626C]'
              }
            >
              {formatDueDate(task.due_date)}
            </span>
          ) : null}
          {task.estimated_duration_minutes ? (
            <>
              <span className="text-[#A8ACB5]">·</span>
              <span className="text-[#5E626C]">
                {formatDuration(task.estimated_duration_minutes)}
              </span>
            </>
          ) : null}
        </div>

        {/*
          Blocs pédagogiques (R0 SparkPilot = coach qui éduque, pas to-do).
          Mobile-first : tout empilé en colonne, padding cohérent.
          Fond légèrement indigo pour différencier des autres infos.
        */}
        <div className="mt-3 space-y-2 rounded-lg bg-indigo-50/40 p-3 sm:p-3.5">
          {/* Bloc 1 — Pourquoi (toujours visible) */}
          <div className="flex items-start gap-2">
            <Target
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                Pourquoi cette tâche ?
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#3F3E47]">
                {why}
              </p>
            </div>
          </div>

          {/* Bloc 2 — Résultats attendus (dépliable) */}
          <details className="group rounded-md">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-[12px] font-medium text-indigo-700 transition hover:text-indigo-900">
              <TrendingUp className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Voir les résultats attendus</span>
              <ChevronDown
                className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-1.5 pl-6 text-[13px] leading-relaxed text-[#3F3E47]">
              {expectedResults}
            </p>
          </details>

          {/* Bloc 3 — Comment ça marche (dépliable) */}
          <details className="group rounded-md">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 text-[12px] font-medium text-indigo-700 transition hover:text-indigo-900">
              <Compass className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>Comprendre la méthode</span>
              <ChevronDown
                className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="mt-1.5 pl-6">
              <p className="text-[13px] leading-relaxed text-[#3F3E47]">
                {methodExplanation.summary}
              </p>
              <Link
                href={methodExplanation.learnMoreUrl}
                className="mt-1.5 inline-block text-[12px] font-medium text-indigo-600 underline-offset-2 hover:text-indigo-800 hover:underline"
              >
                En savoir plus dans le glossaire
              </Link>
            </div>
          </details>
        </div>

        {/*
          Pont vers SparkExecute (3e outil de la triade).
          Affiché uniquement si la tâche a un framework cité (= elle a été
          décomposée par Claude). Click → POST /api/sparkexecute/runs et
          redirect sur la page détail du nouveau run. Idempotent côté API
          (si un run existe déjà pour cette tâche, on retourne sur l'existant).
        */}
        {!isDone ? (
          <div className="mt-3 flex">
            <button
              type="button"
              onClick={handleExecute}
              disabled={isExecutePending}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              }}
            >
              {isExecutePending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              Faire avec SparkExecute
            </button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

/** Formate une date YYYY-MM-DD en "Lundi 1er juin" (français). */
function formatDueDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`)
  const today = startOfToday()
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (diffDays === 0) return "Pour aujourd'hui"
  if (diffDays === 1) return 'Pour demain'
  if (diffDays === -1) return 'Hier'
  if (diffDays < 0) return `Retard ${Math.abs(diffDays)} j`
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Met la première lettre en majuscule pour cohérence visuelle.
  const str = formatter.format(date)
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Formate des minutes en "30 min" / "2 h" / "1 h 30". */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} h`
  return `${h} h ${m.toString().padStart(2, '0')}`
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
