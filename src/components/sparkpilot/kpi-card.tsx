/**
 * Carte KPI du dashboard : icône + libellé + grand chiffre + sous-texte.
 * Reprend le pattern des 4 cartes du mockup dashboard.html
 * ("À faire cette semaine", "En retard", "Avancement", "Prochaine échéance").
 */

import type { LucideIcon } from 'lucide-react'

type AccentColor = 'indigo' | 'ember' | 'moss' | 'honey'

interface KpiCardProps {
  /** Petit label en haut (mono, uppercase). */
  label: string
  /** Icône Lucide à droite. */
  icon: LucideIcon
  /** Couleur d'accent (icône + halo). */
  accent: AccentColor
  /** Valeur principale (texte ou JSX si besoin de mise en forme). */
  value: string | number
  /** Suffixe collé à la valeur (ex : "tâches"). */
  valueSuffix?: string
  /** Ligne d'aide en bas (peut être du JSX pour mettre en gras / couleur). */
  hint?: React.ReactNode
}

const ACCENT_BG: Record<AccentColor, string> = {
  indigo: 'bg-[#EEF0FF] text-[#4F46E5]',
  ember: 'bg-[#E0633A]/10 text-[#E0633A]',
  moss: 'bg-[#3E6B4A]/10 text-[#3E6B4A]',
  honey: 'bg-[#C7991F]/10 text-[#C7991F]',
}

const VALUE_COLOR: Record<AccentColor, string> = {
  indigo: 'text-[#0F1115]',
  ember: 'text-[#E0633A]',
  moss: 'text-[#0F1115]',
  honey: 'text-[#0F1115]',
}

export function KpiCard({
  label,
  icon: Icon,
  accent,
  value,
  valueSuffix,
  hint,
}: KpiCardProps) {
  return (
    <article className="relative h-full overflow-hidden rounded-2xl border border-[#E9E5D9] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)]">
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          {label}
        </div>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${ACCENT_BG[accent]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <span
          className={`text-[52px] leading-none tabular-nums ${VALUE_COLOR[accent]}`}
          style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
        >
          {value}
        </span>
        {valueSuffix ? (
          <span className="text-[13px] text-[#5E626C]">{valueSuffix}</span>
        ) : null}
      </div>
      {hint ? (
        <div className="mt-3 text-[12.5px] text-[#5E626C]">{hint}</div>
      ) : null}
    </article>
  )
}
