/**
 * Badge type d'un run SparkExecute (Article SEO / Post LinkedIn / Visuel / etc.).
 * Reprend le style "type-chip" des mockups : mono uppercase + icône.
 */

import {
  Code,
  File,
  FileText,
  Image as ImageIcon,
  Images,
  Instagram,
  LayoutTemplate,
  Linkedin,
  Megaphone,
  MessageCircleQuestion,
  type LucideIcon,
} from 'lucide-react'

import type { RunType } from '@/lib/sparkexecute/types'
import { TYPE_LABEL } from './palette'

interface RunTypeBadgeProps {
  type: RunType
}

const ICONS: Record<RunType, LucideIcon> = {
  article_seo: FileText,
  article_long: FileText,
  article_court: File,
  faq: MessageCircleQuestion,
  post_linkedin: Linkedin,
  post_instagram: Instagram,
  hooks_pub: Megaphone,
  visual: ImageIcon,
  carousel: Images,
  page_accueil: LayoutTemplate,
  schema_markup: Code,
}

export function RunTypeBadge({ type }: RunTypeBadgeProps) {
  const Icon = ICONS[type]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border border-[#D1FAE5] bg-[#ECFDF5] px-2 py-0.5 font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-[#064E3B]"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {TYPE_LABEL[type]}
    </span>
  )
}
