/**
 * Layout SparkGrowth — la "maison" qui unifie la triade.
 *
 * SparkGrowth = nom du produit 3-en-1 (SparkScan → SparkPilot → SparkExecute).
 * Ce layout pose la charte papier crème commune + les fonts + la HubBar (menu
 * commun) + un pied de page. Auth privée comme les 3 outils.
 *
 * ⚠️ Ne PAS confondre avec SparkHub (= app Cobeone parente). SparkGrowth est le
 * produit marketing hébergé dans le même repo.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'

import { HubBar } from '@/components/sparkgrowth/hub-bar'
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
    default: 'SparkGrowth — Ton moteur de croissance en ligne',
    template: '%s · SparkGrowth',
  },
  description:
    'SparkGrowth réunit SparkScan (analyser), SparkPilot (planifier) et SparkExecute (fabriquer) : de l’analyse de tes concurrents jusqu’à la publication, en un seul endroit.',
}

export default async function SparkGrowthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion?redirectTo=/sparkgrowth')
  }

  return (
    <div
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-[#F7F5EF] text-[#0F1115] antialiased`}
      style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}
    >
      {/* Halo TRI-COLORE : rose (Scan) + indigo (Pilot) + émeraude (Execute).
          Symbolise l'unité des 3 outils sous une seule marque. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            'radial-gradient(46% 38% at 16% -8%, rgba(219,39,119,0.10), transparent 70%), radial-gradient(42% 34% at 50% -10%, rgba(79,70,229,0.10), transparent 70%), radial-gradient(46% 38% at 86% -6%, rgba(14,159,110,0.10), transparent 70%)',
        }}
      />

      <HubBar />

      <main className="relative">{children}</main>

      <footer className="border-t border-[#E9E5D9]/70 bg-[#F7F5EF]/40">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 px-5 py-8 text-[#5E626C] sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  'conic-gradient(from 210deg, #DB2777, #4F46E5, #0E9F6E, #DB2777)',
              }}
            />
            <span
              className="text-[18px] text-[#0F1115]"
              style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
            >
              SparkGrowth
            </span>
            <span className="text-[#E9E5D9]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
              v0.1 · beta privée
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em]">
            <Link href="/sparkscan" className="transition hover:text-[#0F1115]">
              Analyser
            </Link>
            <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
              Planifier
            </Link>
            <Link href="/sparkexecute" className="transition hover:text-[#0F1115]">
              Fabriquer
            </Link>
            <Link href="/" className="transition hover:text-[#0F1115]">
              ← SparkHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
