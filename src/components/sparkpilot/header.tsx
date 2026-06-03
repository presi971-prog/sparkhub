'use client'

/**
 * Barre de navigation SparkPilot — copie du header des mockups V1.
 *
 * Inclut :
 *   - logo "boussole" + nom SparkPilot
 *   - nav desktop (Tableau de bord / Mes plans / Calendrier / Suivi)
 *   - bouton "Importer un rapport" (placeholder V1 — pas encore branché)
 *   - avatar utilisateur (initiales)
 *   - menu mobile (drawer)
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, Upload, X } from 'lucide-react'

interface SparkPilotHeaderProps {
  /** Initiales (2 lettres) à afficher dans l'avatar. */
  userInitials: string
  /** Nom complet affiché à droite sur desktop. */
  userFullName: string
  /** Sous-texte sous le nom (ex : "DCG AI · Pointe-à-Pitre"). */
  userSubtitle?: string
}

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/sparkpilot', label: 'Tableau de bord' },
  { href: '/sparkpilot/plans', label: 'Mes plans' },
  { href: '/sparkpilot/calendrier', label: 'Calendrier' },
  { href: '/sparkpilot/suivi', label: 'Suivi' },
  { href: '/sparkpilot/frameworks', label: 'Glossaire' },
]

export function SparkPilotHeader({
  userInitials,
  userFullName,
  userSubtitle,
}: SparkPilotHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#E9E5D9]/80 bg-[#F7F5EF]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link
          href="/sparkpilot"
          className="group flex items-baseline gap-3"
          aria-label="SparkPilot — accueil"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0F1115] text-[#F7F5EF] shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path d="M5 19 L12 5 L19 19 L12 14 Z" strokeLinejoin="round" />
            </svg>
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#E0633A] ring-2 ring-[#F7F5EF]" />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-[22px] tracking-tight text-[#0F1115]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              SparkPilot
            </span>
            <span className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5E626C]">
              Le copilote de ton plan
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/sparkpilot'
                ? pathname === '/sparkpilot'
                : pathname.startsWith(link.href)
            // Attribut data-tour pour ancrer la dernière étape du tour Plan
            // qui pointe sur "Calendrier" pour inciter l'user à y aller.
            const tourId =
              link.href === '/sparkpilot/calendrier' ? 'header-calendar' : undefined
            return (
              <Link
                key={link.href}
                href={link.href}
                data-tour={tourId}
                className={
                  isActive
                    ? 'rounded-md border border-[#4F46E5]/15 bg-[#EEF0FF]/70 px-3 py-2 text-[#0F1115]'
                    : 'rounded-md px-3 py-2 text-[#5E626C] transition hover:bg-white/70 hover:text-[#0F1115]'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/sparkscan"
            data-tour="header-import"
            className="hidden h-9 items-center gap-2 rounded-md border border-[#E9E5D9] bg-white px-3 text-[13px] text-[#22252C] transition hover:bg-[#F7F5EF] sm:inline-flex"
          >
            <Upload className="h-4 w-4" />
            <span>Importer un rapport</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-content-center rounded-full text-[13px] font-semibold tracking-wide text-white"
              style={{
                background:
                  'linear-gradient(135deg, #4F46E5 0%, #6E63F0 60%, #E0633A 130%)',
                boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)',
              }}
            >
              {userInitials}
            </div>
            <div className="hidden text-right leading-tight lg:block">
              <div className="text-[13px] font-medium text-[#0F1115]">
                {userFullName}
              </div>
              {userSubtitle ? (
                <div className="text-[11px] text-[#5E626C]">
                  {userSubtitle}
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E9E5D9] bg-white md:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="absolute inset-x-0 top-16 z-50 mx-3 mt-2 rounded-xl border border-[#E9E5D9] bg-white p-2 shadow-[0_10px_30px_-12px_rgba(15,17,21,0.18),0_2px_6px_rgba(15,17,21,0.06)] md:hidden">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/sparkpilot'
                ? pathname === '/sparkpilot'
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={
                  isActive
                    ? 'block rounded-md bg-[#EEF0FF]/70 px-3 py-2.5 text-[14px] text-[#0F1115]'
                    : 'block rounded-md px-3 py-2.5 text-[14px] text-[#22252C] hover:bg-[#F7F5EF]'
                }
              >
                {link.label}
              </Link>
            )
          })}
          <div className="my-2 border-t border-[#E9E5D9]" />
          <Link
            href="/sparkscan"
            onClick={() => setMobileOpen(false)}
            className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-[14px] text-[#0F1115] hover:bg-[#F7F5EF]"
          >
            <Upload className="h-4 w-4" />
            Importer un rapport SparkScan
          </Link>
        </div>
      ) : null}
    </header>
  )
}
