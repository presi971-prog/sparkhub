/**
 * Badge "framework" — affiche discrètement la méthode marketing/SEO sur laquelle
 * Claude s'est appuyé pour générer la tâche (ex : "StoryBrand", "GEO",
 * "Pillar+Cluster"…).
 *
 * Objectif UX : renforcer la crédibilité du plan ("ah, c'est appuyé sur de
 * vraies méthodes connues, pas inventé").
 *
 * Si `framework` est vide / null / ne matche aucun pattern connu, on n'affiche
 * tout simplement rien (pas d'icône "?", pas de badge vide).
 *
 * Le mapping framework → icône Lucide est centralisé ici, en interne, pour
 * pouvoir l'étendre facilement quand le playbook évolue (V2, V3…).
 */

import { BookOpen, Heart, Megaphone, Sparkles, Target } from 'lucide-react'
import type { ReactElement } from 'react'

interface FrameworkBadgeProps {
  framework: string | null | undefined
}

/**
 * Pré-rendu des icônes (et non du composant brut) pour respecter la règle
 * lint `react-hooks/static-components` (interdit de "créer" un composant
 * pendant le render via une variable `const Icon = ...`).
 *
 * On utilise `includes` (insensible à la casse) pour rester tolérant aux
 * variations de Claude ("StoryBrand framework", "GEO (Generative Engine
 * Optimization)", etc.). Ordre = priorité de matching.
 */
const ICON_CLASS = 'h-3 w-3'

const FRAMEWORK_ICON_PATTERNS: ReadonlyArray<{
  patterns: ReadonlyArray<string>
  icon: ReactElement
}> = [
  {
    patterns: ['GEO', 'E-E-A-T', 'Schema.org'],
    icon: <Sparkles className={ICON_CLASS} aria-hidden="true" />,
  },
  {
    patterns: ['StoryBrand', 'AIDA', 'Above-the-fold'],
    icon: <Heart className={ICON_CLASS} aria-hidden="true" />,
  },
  {
    patterns: ['Pillar+Cluster', 'Skyscraper', 'Topical Authority', 'Internal linking'],
    icon: <BookOpen className={ICON_CLASS} aria-hidden="true" />,
  },
  {
    patterns: ['Hook-Story-CTA', 'Hormozi', 'Native format'],
    icon: <Megaphone className={ICON_CLASS} aria-hidden="true" />,
  },
  {
    patterns: ['Andromeda', 'PAS copywriting', 'TOFU/MOFU/BOFU', 'CBO Meta'],
    icon: <Target className={ICON_CLASS} aria-hidden="true" />,
  },
]

function resolveIcon(framework: string): ReactElement | null {
  const normalized = framework.toLowerCase()
  for (const entry of FRAMEWORK_ICON_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (normalized.includes(pattern.toLowerCase())) {
        return entry.icon
      }
    }
  }
  return null
}

export function FrameworkBadge({ framework }: FrameworkBadgeProps) {
  if (!framework || framework.trim() === '') return null
  const icon = resolveIcon(framework)
  if (!icon) return null

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600"
      style={{ fontFamily: 'var(--font-geist-mono)' }}
      title={`Méthode utilisée : ${framework}`}
    >
      {icon}
      <span>{framework}</span>
    </span>
  )
}
