/**
 * Palette SparkExecute — couleurs et classes Tailwind partagées.
 *
 * Style "atelier d'imprimerie" : fond gris-vert calé, accent vert émeraude,
 * typo Geist + Instrument Serif. Cohérent avec SparkScan / SparkPilot (mêmes
 * fonts, même bandeau halo) mais avec sa signature émeraude au lieu d'indigo.
 *
 * Toutes les couleurs sont en valeurs arbitraires Tailwind 4 (`bg-[#xxxxxx]`),
 * pour ne pas avoir à étendre la config Tailwind globale.
 */

import type { RunStatus, RunType } from '@/lib/sparkexecute/types'

// ============================================================
// Couleurs de marque (cf. mockups V1)
// ============================================================
export const COLORS = {
  // Fond atelier — neutre froid légèrement teinté vert
  shop: '#F5F6F4',
  card: '#FFFFFF',
  line: '#E4E7E2',

  // Texte (ink-900 → ink-100)
  ink900: '#0F1115',
  ink700: '#22252C',
  ink500: '#5E626C',
  ink300: '#A8ACB5',
  ink100: '#E6E7EB',

  // Accent émeraude (signature SparkExecute)
  emerald: '#10B981',
  emeraldInk: '#064E3B',
  emeraldSoft: '#ECFDF5',
  emeraldChip: '#D1FAE5',

  // Statuts métier (alignés SparkPilot pour cohérence familiale)
  ember: '#E0633A', // urgent / à refaire
  honey: '#C7991F', // attention / brouillon
  steel: '#475569', // archivé / inactif
} as const

// ============================================================
// Mapping status → couleurs / libellé pour la pill de status
// ============================================================
export const STATUS_LABEL: Record<RunStatus, string> = {
  generating: 'En fabrication',
  draft: 'Brouillon',
  validated: 'Validé',
  published: 'Publié',
  archived: 'Archivé',
  failed: 'Échoué',
}

export const STATUS_CLASSES: Record<RunStatus, string> = {
  generating:
    'bg-[#FFF6EA] text-[#A37312] border border-[#F5E2B6]',
  draft: 'bg-[#F3F2EC] text-[#22252C] border border-[#E4E7E2]',
  validated: 'bg-[#ECFDF5] text-[#064E3B] border border-[#D1FAE5]',
  published: 'bg-[#D1FAE5] text-[#064E3B] border border-[#A7F3D0]',
  archived: 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
  failed: 'bg-[#FDECE5] text-[#A1432D] border border-[#F2C8B5]',
}

// ============================================================
// Mapping type → libellé court (pour les badges)
// ============================================================
export const TYPE_LABEL: Record<RunType, string> = {
  article_seo: 'Article SEO',
  article_long: 'Article long',
  article_court: 'Article court',
  faq: 'FAQ',
  post_linkedin: 'Post LinkedIn',
  post_instagram: 'Post Instagram',
  hooks_pub: 'Accroches pub',
  visual: 'Visuel',
  carousel: 'Carrousel',
  video: 'Vidéo',
  page_accueil: "Page d'accueil",
  schema_markup: 'Schema markup',
}

/**
 * Icône Lucide à afficher par type (nom du composant lucide-react).
 * On garde le nom en string pour éviter les imports lourds dans la palette.
 */
export const TYPE_ICON_NAME: Record<RunType, string> = {
  article_seo: 'FileText',
  article_long: 'FileText',
  article_court: 'File',
  faq: 'MessageCircleQuestion',
  post_linkedin: 'Linkedin',
  post_instagram: 'Instagram',
  hooks_pub: 'Megaphone',
  visual: 'Image',
  carousel: 'Images',
  video: 'Video',
  page_accueil: 'LayoutTemplate',
  schema_markup: 'Code',
}
