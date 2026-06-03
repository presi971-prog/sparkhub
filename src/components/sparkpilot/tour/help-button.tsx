'use client'

/**
 * <HelpButton /> — bouton flottant "?" en bas à droite de SparkPilot.
 *
 * Permet au user de relancer à tout moment la visite guidée Driver.js de
 * l'écran courant, même s'il a déjà été marqué "done" en BDD.
 *
 * Implémentation : émet un CustomEvent `sparkpilot:replay-tour` capté par
 * <SparkPilotTour />. Découplage strict : le bouton ne sait rien de Driver.js,
 * il signale juste "lance le tour".
 *
 * Position : bottom-right, 44×44px (taille tappable mobile).
 * Offset bottom = 84px pour laisser la place à la bulle chatbot <SparkPilotChat />
 * (56px de bulle + 20px de marge + 8px d'espacement vertical entre les deux).
 */

import { HelpCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

import {
  REPLAY_TOUR_EVENT,
  // ⚠ on importe juste la constante depuis le tour, pas Driver.js
} from './spark-pilot-tour'
import { detectTourKeyFromPathname } from '@/lib/sparkpilot/tour/steps'

export function HelpButton() {
  const pathname = usePathname()

  // Si la page courante n'a pas de tour défini, on cache le bouton plutôt
  // que d'afficher un "?" qui ne fait rien — moins de confusion pour le user.
  const hasTour = detectTourKeyFromPathname(pathname) !== null
  if (!hasTour) return null

  const handleClick = () => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT))
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Reprendre le tour guidé"
      title="Reprendre le tour guidé"
      className="
        group fixed right-5 z-40
        inline-flex h-11 w-11 items-center justify-center
        rounded-full border border-[#E9E5D9] bg-white text-[#4F46E5]
        shadow-[0_4px_14px_-4px_rgba(15,17,21,0.18),0_1px_3px_rgba(15,17,21,0.08)]
        transition hover:bg-[#EEF0FF] hover:border-[#4F46E5]/30 hover:shadow-[0_6px_18px_-4px_rgba(79,70,229,0.28)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]/40
      "
      style={{ bottom: '84px' }}
    >
      <HelpCircle className="h-5 w-5" strokeWidth={1.75} />
      <span
        className="
          pointer-events-none absolute bottom-full right-0 mb-2
          whitespace-nowrap rounded-md border border-[#E9E5D9] bg-white px-2.5 py-1.5
          font-mono text-[10px] uppercase tracking-[0.18em] text-[#22252C]
          opacity-0 shadow-sm transition group-hover:opacity-100
        "
      >
        Reprendre le tour
      </span>
    </button>
  )
}
