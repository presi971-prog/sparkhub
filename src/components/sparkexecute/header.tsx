'use client'

/**
 * Barre de navigation SparkExecute — style atelier (logo wrench-on-anvil).
 *
 * Pattern identique au header SparkPilot pour rester cohérent :
 *   - logo + nom + sous-titre mono
 *   - nav desktop (4 entrées)
 *   - bouton "Créer" émeraude (action principale)
 *   - avatar utilisateur (initiales)
 *   - menu mobile slide-in
 */

import { Menu, Plus, Wrench, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SparkExecuteHeaderProps {
  userInitials: string
  userFullName: string
  userSubtitle?: string
}

const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/sparkexecute', label: 'Tableau de bord' },
  { href: '/sparkexecute/mes-creations', label: 'Mes créations' },
  { href: '/sparkpilot', label: 'Mon plan' },
  { href: '/sparkpilot/frameworks', label: 'Glossaire' },
  { href: '/sparkexecute/reglages', label: 'Réglages' },
]

export function SparkExecuteHeader({
  userInitials,
  userFullName,
  userSubtitle,
}: SparkExecuteHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4E7E2] bg-[#F5F6F4]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link
          href="/sparkexecute"
          className="group flex items-baseline gap-2.5"
          aria-label="SparkExecute — accueil"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center">
            {/* Logo "anvil" conique vert émeraude */}
            <span
              className="absolute inset-0 rounded-[10px]"
              style={{
                background:
                  'conic-gradient(from 220deg at 50% 50%, #064E3B 0deg, #10B981 130deg, #064E3B 220deg, #10B981 360deg)',
              }}
            />
            <Wrench className="relative z-10 h-[18px] w-[18px] text-white" />
          </span>
          <span className="flex flex-col leading-none">
            <span
              className="text-[20px] tracking-tight text-[#0F1115]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              SparkExecute
            </span>
            <span className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#5E626C]">
              Atelier · 3 / 3 de la triade
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/sparkexecute'
                ? pathname === '/sparkexecute'
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? 'rounded-md border border-[#D1FAE5] bg-[#ECFDF5]/70 px-3 py-2 text-[#064E3B]'
                    : 'rounded-md px-3 py-2 text-[#5E626C] transition hover:bg-white/70 hover:text-[#0F1115]'
                }
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/sparkexecute/nouveau"
            className="hidden h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_1px_0_rgba(15,17,21,0.10),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_1px_0_rgba(15,17,21,0.10),0_10px_20px_-8px_rgba(16,185,129,0.55)] sm:inline-flex"
            style={{
              background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
            }}
          >
            <Plus className="h-4 w-4" />
            <span>Créer</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div
              className="grid h-8 w-8 place-content-center rounded-full text-[13px] font-semibold tracking-wide text-white"
              style={{
                background:
                  'linear-gradient(135deg, #10B981 0%, #059669 60%, #064E3B 130%)',
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
                <div className="text-[11px] text-[#5E626C]">{userSubtitle}</div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#E4E7E2] bg-white md:hidden"
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
        <div className="absolute inset-x-0 top-16 z-50 mx-3 mt-2 rounded-xl border border-[#E4E7E2] bg-white p-2 shadow-[0_10px_30px_-12px_rgba(15,17,21,0.18)] md:hidden">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/sparkexecute'
                ? pathname === '/sparkexecute'
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={
                  isActive
                    ? 'block rounded-md bg-[#ECFDF5]/70 px-3 py-2.5 text-[14px] text-[#064E3B]'
                    : 'block rounded-md px-3 py-2.5 text-[14px] text-[#22252C] hover:bg-[#F5F6F4]'
                }
              >
                {link.label}
              </Link>
            )
          })}
          <div className="my-2 border-t border-[#E4E7E2]" />
          <Link
            href="/sparkexecute/nouveau"
            onClick={() => setMobileOpen(false)}
            className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-[14px] text-[#064E3B] hover:bg-[#ECFDF5]"
          >
            <Plus className="h-4 w-4" />
            Créer un livrable
          </Link>
        </div>
      ) : null}
    </header>
  )
}
