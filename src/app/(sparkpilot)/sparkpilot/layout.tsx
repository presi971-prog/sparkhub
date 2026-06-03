/**
 * Layout SparkPilot — applique la charte papier crème + fonts + header
 * commun à toutes les pages /sparkpilot/*.
 *
 * Architecture identique à /sparkscan : un layout custom posé dans le segment
 * de route (sparkpilot) pour ne PAS hériter du layout marketing par défaut.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'

import { HubBar } from '@/components/sparkgrowth/hub-bar'
import { SparkPilotChat } from '@/components/sparkpilot/chat/spark-pilot-chat'
import { SparkPilotHeader } from '@/components/sparkpilot/header'
import { HelpButton } from '@/components/sparkpilot/tour/help-button'
import { SparkPilotTour } from '@/components/sparkpilot/tour/spark-pilot-tour'
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
    default: 'SparkPilot — Le copilote de ton plan',
    template: '%s · SparkPilot',
  },
  description:
    "SparkPilot transforme ton rapport SparkScan en plan d'action concret : 3 priorités, 12 tâches, calées sur les bons jours.",
}

export default async function SparkPilotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // SparkPilot est privé : redirige vers la page de connexion si pas connecté.
    redirect('/connexion?redirect=/sparkpilot')
  }

  const { initials, fullName, subtitle } = deriveUserDisplay(user)

  return (
    <div
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-[#F7F5EF] text-[#0F1115] antialiased`}
      style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}
    >
      {/* Halo coloré subtil en haut */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px]"
        style={{
          background:
            'radial-gradient(60% 40% at 12% -10%, rgba(79,70,229,0.10), transparent 70%), radial-gradient(50% 35% at 92% -5%, rgba(224,99,58,0.08), transparent 70%)',
        }}
      />

      <HubBar />

      <SparkPilotHeader
        userInitials={initials}
        userFullName={fullName}
        userSubtitle={subtitle}
      />

      <main className="relative">{children}</main>

      <footer className="border-t border-[#E9E5D9]/70 bg-[#F7F5EF]/40">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 px-5 py-8 text-[#5E626C] sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[18px] text-[#0F1115]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              SparkPilot
            </span>
            <span className="text-[#E9E5D9]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
              v0.1 · beta privée
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em]">
            <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
              Tableau de bord
            </Link>
            <Link
              href="/sparkpilot/plans"
              className="transition hover:text-[#0F1115]"
            >
              Plans
            </Link>
            <Link
              href="/sparkpilot/calendrier"
              className="transition hover:text-[#0F1115]"
            >
              Calendrier
            </Link>
            <Link
              href="/sparkpilot/frameworks"
              className="transition hover:text-[#0F1115]"
            >
              Glossaire
            </Link>
            <Link href="/" className="transition hover:text-[#0F1115]">
              ← Sparkhub
            </Link>
          </div>
        </div>
      </footer>

      {/* Tutoriel interactif Driver.js — composants client.
          <SparkPilotTour /> détecte l'écran courant et lance auto la visite
          guidée si l'user ne l'a jamais vue. <HelpButton /> est le "?" flottant
          (offset bottom: 84px pour cohabiter avec la bulle chat). */}
      <SparkPilotTour />
      <HelpButton />

      {/* Coach SparkPilot — chat contextuel persistant.
          Bulle 56×56px en bas-droite (bottom: 20px), drawer 420px à droite
          au click. Le composant détecte tout seul la page courante via
          usePathname() pour enrichir le contexte envoyé à Claude. */}
      <SparkPilotChat />
    </div>
  )
}

/**
 * Construit les éléments d'affichage (initiales, nom, sous-titre) depuis
 * les métadonnées Supabase Auth. Tolère l'absence de champs.
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
