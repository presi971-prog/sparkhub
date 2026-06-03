'use client'

/**
 * <SparkPilotTour /> — orchestrateur du tutoriel interactif Driver.js.
 *
 * Comportement :
 *   1. Au mount, fetch l'état du tour (`GET /api/sparkpilot/tour-progress`).
 *   2. Détecte l'écran courant via `usePathname()` + `detectTourKeyFromPathname`.
 *   3. Si le tour de l'écran n'a JAMAIS été vu (`<key>_done === false`),
 *      lance auto le tour avec Driver.js après un petit délai (laisse le DOM
 *      se rendre, important pour les Server Components SparkPilot).
 *   4. À la fin du tour, PATCH `/api/sparkpilot/tour-progress` pour marquer
 *      l'écran comme "vu" et ne plus relancer auto.
 *
 * Écoute un event custom `sparkpilot:replay-tour` (émis par <HelpButton />)
 * pour relancer le tour manuellement en ignorant l'état "done".
 *
 * R0 ne pas casser : composant passif — n'affiche rien dans le DOM, juste un
 * tour Driver.js par-dessus la page.
 */

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

import {
  TOUR_STEPS,
  detectTourKeyFromPathname,
  type TourKey,
} from '@/lib/sparkpilot/tour/steps'

// Driver.js + son CSS officiel + nos overrides charte SparkPilot.
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '@/styles/driver-overrides.css'

interface TourProgress {
  dashboard_done: boolean
  plan_done: boolean
  calendrier_done: boolean
  frameworks_done: boolean
}

/** Event name émis par <HelpButton /> pour relancer le tour. */
export const REPLAY_TOUR_EVENT = 'sparkpilot:replay-tour'

export function SparkPilotTour() {
  const pathname = usePathname()
  // On garde le driver actif en ref pour pouvoir le destroy proprement
  // lors d'un changement de route ou d'un unmount.
  const driverRef = useRef<Driver | null>(null)

  /**
   * Marque côté serveur que l'user a vu (terminé OU skippé) un tour donné.
   * Best-effort : on n'interrompt jamais l'UI si l'API échoue.
   */
  const markTourDone = useCallback(async (key: TourKey) => {
    try {
      await fetch('/api/sparkpilot/tour-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, done: true }),
      })
    } catch {
      // Silencieux : pas grave si on rate le PATCH, le tour s'est joué.
    }
  }, [])

  /**
   * Démarre Driver.js pour la clé donnée. Détruit toute instance précédente.
   */
  const startTour = useCallback(
    (key: TourKey) => {
      const steps = TOUR_STEPS[key]
      if (!steps || steps.length === 0) return

      // Cleanup d'une éventuelle instance précédente.
      driverRef.current?.destroy()

      const d = driver({
        showProgress: true,
        progressText: '{{current}} sur {{total}}',
        nextBtnText: 'Suivant',
        prevBtnText: 'Précédent',
        doneBtnText: 'Terminé',
        smoothScroll: true,
        allowClose: true,
        // Backdrop : géré par notre CSS .driver-overlay
        overlayOpacity: 1, // on laisse driver poser l'overlay, la couleur vient du CSS
        stagePadding: 6,
        steps,
        // Quand le user termine le tour OU le ferme avant la fin, on marque
        // "done" pour ne plus relancer auto à chaque visite (agaçant).
        // Il pourra toujours le relancer manuellement via le bouton "?".
        onDestroyStarted: () => {
          void markTourDone(key)
          d.destroy()
        },
      })

      d.drive()
      driverRef.current = d
    },
    [markTourDone],
  )

  /**
   * Effet principal : à chaque changement de route, regarde si on doit
   * auto-lancer un tour.
   */
  useEffect(() => {
    const key = detectTourKeyFromPathname(pathname)
    if (!key) {
      // Pas de tour défini pour cette page → cleanup éventuel et exit.
      driverRef.current?.destroy()
      driverRef.current = null
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const res = await fetch('/api/sparkpilot/tour-progress', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!res.ok) return // 401 ou 500 : on ne fait rien
        const data = (await res.json()) as { progress?: TourProgress }
        const progress = data.progress
        if (!progress || cancelled) return

        const alreadyDone =
          (key === 'dashboard' && progress.dashboard_done) ||
          (key === 'plan' && progress.plan_done) ||
          (key === 'calendrier' && progress.calendrier_done) ||
          (key === 'frameworks' && progress.frameworks_done)

        if (alreadyDone) return

        // Petit délai pour laisser le DOM (Server Components) finir de monter
        // avant que Driver.js cherche ses sélecteurs.
        setTimeout(() => {
          if (cancelled) return
          startTour(key)
        }, 600)
      } catch {
        // Silencieux : on ne bloque jamais le rendu SparkPilot pour un tour.
      }
    }

    void run()

    return () => {
      cancelled = true
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [pathname, startTour])

  /**
   * Écoute le bouton "?" persistant qui demande un replay manuel.
   * Le replay ignore l'état "done" et relance toujours le tour de la page.
   */
  useEffect(() => {
    const handler = () => {
      const key = detectTourKeyFromPathname(pathname)
      if (!key) return
      startTour(key)
    }
    window.addEventListener(REPLAY_TOUR_EVENT, handler)
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, handler)
  }, [pathname, startTour])

  return null
}
