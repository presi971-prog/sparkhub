'use client'

/**
 * CTA "Créer mon plan SparkPilot" affiché à la fin de la synthèse SparkScan.
 *
 * - POST /api/sparkpilot/plans { scan_id } -> redirige vers /sparkpilot/plans/{plan_id}
 * - Si un plan existe déjà pour ce scan, la route renvoie l'id existant (pas de doublon).
 * - 401 -> toast spécifique + CTA "Me connecter" qui pointe sur /connexion?redirect=/sparkscan
 *
 * Conçu comme un bloc visuellement distinct (accent indigo SparkPilot)
 * pour signaler le passage d'un outil (SparkScan) à un autre (SparkPilot).
 *
 * État "loading" = jauge pédagogique avec 5 étapes qui défilent. Durée
 * totale ~24s (matche la latence Claude). Si l'API répond plus tôt, on
 * saute à 100 % immédiatement ; si elle répond plus tard, on reste sur
 * "Plan prêt" en attente (max 30 s supplémentaires avant timeout).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { toast } from 'sonner'

interface CreatePlanCTAProps {
  scanId: string
}

/**
 * Étapes pédagogiques affichées pendant la génération.
 * `percent` = niveau à atteindre à la FIN de l'étape.
 * `holdMs`  = temps total alloué à cette étape (animation incluse).
 */
const PROGRESS_STEPS: ReadonlyArray<{
  label: string
  percent: number
  holdMs: number
}> = [
  { label: 'Lecture de ton rapport SparkScan…', percent: 15, holdMs: 1500 },
  {
    label: 'Identification des 3 priorités stratégiques…',
    percent: 30,
    holdMs: 2000,
  },
  {
    label: 'Génération des tâches avec le playbook éprouvé…',
    percent: 85,
    holdMs: 18000,
  },
  { label: 'Sauvegarde de ton plan…', percent: 100, holdMs: 2000 },
  { label: 'Plan prêt, on y va !', percent: 100, holdMs: 500 },
]

/** Sécurité : si la jauge est arrivée à 100 % mais l'API n'a toujours pas
 * répondu, on attend max ce délai avant de basculer en erreur. */
const POST_ANIMATION_TIMEOUT_MS = 30_000

export function CreatePlanCTA({ scanId }: CreatePlanCTAProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Refs pour pouvoir annuler proprement les timers en cas d'erreur / unmount.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const apiDoneRef = useRef(false)

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t)
    timersRef.current = []
  }, [])

  const resetState = useCallback(() => {
    clearTimers()
    setIsLoading(false)
    setStepIndex(0)
    setProgress(0)
  }, [clearTimers])

  // Nettoyage si le composant disparaît pendant l'animation.
  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  function startAnimation() {
    apiDoneRef.current = false
    setStepIndex(0)
    setProgress(0)

    // On chaîne les étapes via setTimeout cumulés.
    let cumulative = 0
    PROGRESS_STEPS.forEach((step, idx) => {
      // Démarrage de l'étape : on update step + on lance l'anim vers son %.
      const startT = setTimeout(() => {
        setStepIndex(idx)
        // setProgress sera mis à jour via la transition CSS de la barre,
        // mais on met la valeur cible immédiatement pour piloter la width.
        setProgress(step.percent)
      }, cumulative)
      timersRef.current.push(startT)
      cumulative += step.holdMs
    })
  }

  function jumpToReady() {
    // L'API a répondu plus tôt : on saute direct à la dernière étape.
    clearTimers()
    setStepIndex(PROGRESS_STEPS.length - 1)
    setProgress(100)
  }

  async function handleClick() {
    if (isLoading) return
    setIsLoading(true)
    startAnimation()

    try {
      const res = await fetch('/api/sparkpilot/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId }),
      })

      if (res.status === 401) {
        toast.error('Tu dois te connecter pour créer un plan', {
          action: {
            label: 'Me connecter',
            onClick: () => router.push('/connexion?redirect=/sparkscan'),
          },
        })
        resetState()
        return
      }

      const data = (await res.json().catch(() => ({}))) as {
        plan_id?: string
        error?: string
      }

      if (!res.ok || !data.plan_id) {
        toast.error(
          data.error ?? 'Impossible de créer le plan. Réessaye dans un instant.',
        )
        resetState()
        return
      }

      // Succès : on saute à 100 % puis on redirige avec un petit délai
      // pour laisser l'utilisateur voir "Plan prêt".
      apiDoneRef.current = true
      jumpToReady()
      const finalT = setTimeout(() => {
        router.push(`/sparkpilot/plans/${data.plan_id}`)
      }, 500)
      timersRef.current.push(finalT)
    } catch {
      toast.error('Impossible de créer le plan. Réessaye dans un instant.')
      resetState()
    }
  }

  // Garde-fou : si la jauge a fini son cycle (100 %) mais que l'API
  // n'a pas répondu au bout de POST_ANIMATION_TIMEOUT_MS, on coupe.
  useEffect(() => {
    if (!isLoading) return
    if (progress < 100) return
    if (apiDoneRef.current) return

    const t = setTimeout(() => {
      if (!apiDoneRef.current) {
        toast.error('La génération a pris trop de temps. Réessaye dans un instant.')
        resetState()
      }
    }, POST_ANIMATION_TIMEOUT_MS)
    timersRef.current.push(t)
    return () => clearTimeout(t)
  }, [isLoading, progress, resetState])

  return (
    <section
      aria-label="Passer à l'action avec SparkPilot"
      className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-7"
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-200/30 blur-3xl" />

      {isLoading ? (
        <LoadingPanel
          stepLabel={PROGRESS_STEPS[stepIndex]?.label ?? ''}
          progress={progress}
        />
      ) : (
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_6px_20px_-6px_rgba(79,70,229,0.6)]">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] uppercase tracking-[0.22em] text-indigo-700"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                SparkPilot · plan d&apos;action
              </p>
              <h4 className="mt-1.5 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
                Passe à l&apos;action avec SparkPilot
              </h4>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                Transforme ces 3 priorités en plan d&apos;action concret : 10-12
                tâches concrètes, dates prévues, suivi visuel.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={handleClick}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(79,70,229,0.55)] transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Créer mon plan
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] leading-relaxed text-slate-500 sm:text-right">
              Tu pourras ajuster, reporter, marquer fait. Sans engagement.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

/**
 * Panneau de progression affiché pendant la génération du plan.
 * Composant séparé pour garder `CreatePlanCTA` lisible.
 */
function LoadingPanel({
  stepLabel,
  progress,
}: {
  stepLabel: string
  progress: number
}) {
  // Borne défensive pour éviter les valeurs hors plage.
  const pct = Math.min(100, Math.max(0, progress))

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_6px_20px_-6px_rgba(79,70,229,0.6)]">
          <Compass className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-indigo-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            SparkPilot · génération en cours
          </p>
          <h4 className="mt-1.5 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
            On prépare ton plan d&apos;action…
          </h4>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label="Progression de la génération du plan"
        >
          <div
            className="h-full rounded-full bg-indigo-600 transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <p
            aria-live="polite"
            className="text-sm font-medium text-slate-700"
          >
            {stepLabel}
          </p>
          <span
            className="text-[11px] font-semibold tabular-nums text-indigo-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            {Math.round(pct)} %
          </span>
        </div>
        <p className="text-[12px] leading-relaxed text-slate-500">
          On utilise le playbook stratégique pour générer des tâches adaptées à
          ton secteur.
        </p>
      </div>
    </div>
  )
}

/**
 * Variante affichée quand un plan existe déjà pour ce scan.
 * (Non utilisée actuellement — la route POST renvoie l'id existant
 *  donc le client n'a pas besoin de pré-vérifier. Conservée pour
 *  un futur affichage proactif si on ajoute un GET avec filtre.)
 */
export function ViewExistingPlanCTA({ planId }: { planId: string }) {
  return (
    <section
      aria-label="Voir ton plan SparkPilot existant"
      className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.22em] text-indigo-700"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              SparkPilot · plan existant
            </p>
            <h4 className="mt-1.5 text-xl font-semibold leading-tight text-slate-900">
              Tu as déjà un plan pour ce scan
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              Reprends là où tu t&apos;es arrêté.
            </p>
          </div>
        </div>
        <Link
          href={`/sparkpilot/plans/${planId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
        >
          Voir mon plan existant
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
