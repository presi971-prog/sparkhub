'use client'

/**
 * HubBar — barre de navigation COMMUNE à tout SparkGrowth.
 *
 * C'est le "fil rouge" qui suit l'utilisateur sur les 3 outils (SparkScan,
 * SparkPilot, SparkExecute) + le retour vers le hub d'accueil. Objectif :
 * ne plus JAMAIS se perdre entre les 3 sites jusqu'ici séparés.
 *
 * Volontairement FINE et NON-sticky : elle se pose tout en haut, au-dessus du
 * header propre à chaque outil (qui, lui, reste sticky). Aucune cohabitation
 * de deux barres collées → pas de chevauchement.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Module {
  href: string
  step: string
  label: string
  /** Couleur d'accent du module (rose / indigo / émeraude). */
  color: string
  tint: string
}

const MODULES: Module[] = [
  { href: '/sparkscan', step: '1', label: 'Analyser', color: '#DB2777', tint: '#FCE7F3' },
  { href: '/sparkpilot', step: '2', label: 'Planifier', color: '#4F46E5', tint: '#EEF0FF' },
  { href: '/sparkexecute', step: '3', label: 'Fabriquer', color: '#0E9F6E', tint: '#E7F9F1' },
]

export function HubBar() {
  const pathname = usePathname() ?? ''

  return (
    <div className="w-full border-b border-[#E9E5D9]/70 bg-[#F7F5EF]/60 backdrop-blur-sm">
      <div className="mx-auto flex h-9 max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8">
        {/* Retour au hub */}
        <Link
          href="/sparkgrowth"
          className="group inline-flex items-center gap-1.5"
          aria-label="SparkGrowth — accueil"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              background:
                'conic-gradient(from 210deg, #DB2777, #4F46E5, #0E9F6E, #DB2777)',
            }}
          />
          <span
            className="text-[13px] leading-none tracking-tight text-[#0F1115]"
            style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
          >
            SparkGrowth
          </span>
        </Link>

        {/* Les 3 modules */}
        <nav className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.18em] sm:text-[10px]">
          {MODULES.map((m, i) => {
            const isActive = pathname.startsWith(m.href)
            return (
              <span key={m.href} className="flex items-center">
                <Link
                  href={m.href}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition"
                  style={
                    isActive
                      ? { background: m.tint, color: m.color }
                      : { color: '#5E626C' }
                  }
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className="grid h-3.5 w-3.5 place-content-center rounded-full text-[8px] font-semibold text-white"
                    style={{ background: isActive ? m.color : '#C8C7BE' }}
                  >
                    {m.step}
                  </span>
                  <span className="hidden sm:inline">{m.label}</span>
                </Link>
                {i < MODULES.length - 1 ? (
                  <span className="px-0.5 text-[#C8C7BE]">→</span>
                ) : null}
              </span>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
