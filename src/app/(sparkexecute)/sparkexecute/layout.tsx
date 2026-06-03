/**
 * Layout SparkExecute — applique la charte atelier émeraude + fonts + header.
 *
 * Architecture identique à /sparkpilot : un layout custom dans le segment de
 * route (sparkexecute) pour NE PAS hériter du layout marketing.
 *
 * Auth obligatoire : redirige vers /connexion si pas de session.
 */

import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SparkExecuteHeader } from '@/components/sparkexecute/header'
import { createClient } from '@/lib/supabase/server'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: "SparkExecute — L'atelier qui produit tes livrables",
    template: '%s · SparkExecute',
  },
  description:
    "SparkExecute transforme tes tâches SparkPilot en livrables marketing prêts à publier : articles SEO, posts LinkedIn, visuels. L'atelier de la triade.",
}

export default async function SparkExecuteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion?redirect=/sparkexecute')
  }

  const { initials, fullName, subtitle } = deriveUserDisplay(user)

  return (
    <div
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-[#F5F6F4] text-[#0F1115] antialiased`}
      style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}
    >
      {/* Halo émeraude top — signature visuelle atelier */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            'radial-gradient(60% 40% at 12% -10%, rgba(16,185,129,0.10), transparent 70%), radial-gradient(50% 35% at 92% -5%, rgba(15,17,21,0.04), transparent 70%)',
        }}
      />

      <SparkExecuteHeader
        userInitials={initials}
        userFullName={fullName}
        userSubtitle={subtitle}
      />

      <main className="relative">{children}</main>

      <footer className="border-t border-[#E4E7E2] bg-[#F5F6F4]/60">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-4 py-8 text-[#5E626C] sm:flex-row sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[18px] text-[#0F1115]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              SparkExecute
            </span>
            <span className="text-[#E4E7E2]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
              v0.1 · atelier
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em]">
            <Link
              href="/sparkscan"
              className="transition hover:text-[#0F1115]"
            >
              ← SparkScan
            </Link>
            <Link
              href="/sparkpilot"
              className="transition hover:text-[#0F1115]"
            >
              ← SparkPilot
            </Link>
            <Link
              href="/sparkexecute"
              className="transition hover:text-[#0F1115]"
            >
              Tableau de bord
            </Link>
            <Link
              href="/sparkexecute/mes-creations"
              className="transition hover:text-[#0F1115]"
            >
              Mes créations
            </Link>
            <Link
              href="/sparkexecute/reglages"
              className="transition hover:text-[#0F1115]"
            >
              Réglages
            </Link>
            <Link href="/" className="transition hover:text-[#0F1115]">
              Sparkhub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Construit les éléments d'affichage (initiales, nom, sous-titre) depuis
 * les métadonnées Supabase Auth. Pattern identique à SparkPilot.
 */
function deriveUserDisplay(user: {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): { initials: string; fullName: string; subtitle?: string } {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const firstName =
    typeof meta.first_name === 'string' ? meta.first_name : ''
  const lastName = typeof meta.last_name === 'string' ? meta.last_name : ''
  const fullNameFromMeta =
    typeof meta.full_name === 'string' ? meta.full_name : ''
  const company = typeof meta.company === 'string' ? meta.company : ''
  const city = typeof meta.city === 'string' ? meta.city : ''

  let fullName = fullNameFromMeta || `${firstName} ${lastName}`.trim()
  if (!fullName) fullName = user.email ?? 'Toi'

  let initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
    fullNameFromMeta
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  if (!initials) initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  const subtitle = [company, city].filter(Boolean).join(' · ') || undefined

  return { initials, fullName, subtitle }
}
