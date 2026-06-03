/**
 * Suivi — placeholder V1.1.
 *
 * En V1, le journal de bord est déjà affiché sur le dashboard. La page Suivi
 * dédiée arrivera en V1.1 avec graphes de progression, comparatif d'un mois
 * sur l'autre, indicateurs SparkScan (delta du score Perplexity, etc.).
 */

import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Suivi · à venir',
}

export default function SparkPilotSuiviPage() {
  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-14">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">Suivi</span>
      </nav>

      <div className="rounded-2xl border border-[#E9E5D9] bg-white p-10 text-center shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-14">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF0FF] text-[#4F46E5]">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1
          className="mt-6 text-[32px] leading-tight tracking-tight sm:text-[40px]"
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          Bientôt — le suivi
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-[14.5px] leading-relaxed text-[#5E626C]">
          On prépare la page suivi : courbe de progression de ton plan, comparaison
          d&apos;un mois sur l&apos;autre, et delta de ton score SparkScan après
          chaque action.
        </p>
        <p className="mx-auto mt-2 max-w-lg text-[13px] text-[#5E626C]">
          En attendant, le journal de bord est déjà visible sur le tableau de bord.
        </p>
        <Link
          href="/sparkpilot"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#0F1115] px-4 text-[13.5px] font-medium text-[#F7F5EF] transition hover:bg-[#22252C]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
