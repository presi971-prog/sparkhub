// ═══════════════════════════════════════════════════════════════
// SPARK VIDÉO — Constantes
// ═══════════════════════════════════════════════════════════════

export const VIDEO_TIERS = {
  flash:    { name: 'Flash',    scenes: 2,  clipDuration: 5,  durationSec: 10, credits: 25, estMinutes: 5,  emoji: '⚡' },
  teaser:   { name: 'Teaser',   scenes: 3,  clipDuration: 5,  durationSec: 15, credits: 30, estMinutes: 6,  emoji: '🎬' },
  short:    { name: 'Short',    scenes: 5,  clipDuration: 5,  durationSec: 25, credits: 40, estMinutes: 8,  emoji: '📱' },
  standard: { name: 'Standard', scenes: 5,  clipDuration: 10, durationSec: 50, credits: 55, estMinutes: 12, emoji: '🎥' },
  tiktok:   { name: 'TikTok',   scenes: 6,  clipDuration: 10, durationSec: 60, credits: 65, estMinutes: 15, emoji: '📲' },
  premium:  { name: 'Premium',  scenes: 8,  clipDuration: 10, durationSec: 80, credits: 80, estMinutes: 20, emoji: '🏆' },
} as const

export type VideoTierId = keyof typeof VIDEO_TIERS

export const AMBIANCES = [
  { id: 'cinematique', label: 'Cinématique', emoji: '🎬' },
  { id: 'drole',       label: 'Drôle',       emoji: '😂' },
  { id: 'inspirant',   label: 'Inspirant',   emoji: '✨' },
  { id: 'dramatique',  label: 'Dramatique',  emoji: '🔥' },
  { id: 'tropical',    label: 'Tropical',    emoji: '🌴' },
  { id: 'mysterieux',  label: 'Mystérieux',  emoji: '🌙' },
  { id: 'energique',   label: 'Énergique',   emoji: '⚡' },
] as const

export type AmbianceId = (typeof AMBIANCES)[number]['id']

export const MUSIC_MOODS = [
  { id: 'joyeux',     label: 'Joyeux',     emoji: '🎵' },
  { id: 'calme',      label: 'Calme',      emoji: '🎶' },
  { id: 'epique',     label: 'Épique',     emoji: '🎻' },
  { id: 'tropical',   label: 'Tropical',   emoji: '🥁' },
  { id: 'mysterieux', label: 'Mystérieux', emoji: '🎹' },
  { id: 'electro',    label: 'Électro',    emoji: '🎧' },
] as const

export type MusicMoodId = (typeof MUSIC_MOODS)[number]['id']

// 6 étapes du pipeline avec poids pour la barre de progression
export const PIPELINE_STEPS = [
  { id: 'scenes',        label: 'Écriture du scénario',     weight: 5  },
  { id: 'images',        label: 'Génération des images',    weight: 20 },
  { id: 'video_prompts', label: 'Création des animations',  weight: 5  },
  { id: 'videos',        label: 'Génération des clips',     weight: 40 },
  { id: 'music',         label: 'Composition musicale',     weight: 10 },
  { id: 'montage',       label: 'Montage final',            weight: 20 },
] as const

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]['id']

// ═══════════════════════════════════════════════════════════════
// INSPIRE-MOI — Types de commerce
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_TYPES = [
  { id: 'restaurant',  label: 'Restaurant / Traiteur / Food truck', emoji: '🍽️' },
  { id: 'coiffure',    label: 'Salon de coiffure / Barbier',        emoji: '💇' },
  { id: 'beaute',      label: 'Institut beauté / Esthétique',       emoji: '💅' },
  { id: 'garage',      label: 'Garage / Mécanique auto',            emoji: '🔧' },
  { id: 'boutique',    label: 'Boutique / Vêtements',               emoji: '👗' },
  { id: 'artisan',     label: 'Artisan / BTP',                      emoji: '🏗️' },
  { id: 'service',     label: 'Service à domicile',                 emoji: '🏠' },
  { id: 'autre',       label: 'Autre',                              emoji: '🏢' },
] as const

export type BusinessTypeId = (typeof BUSINESS_TYPES)[number]['id']

// ═══════════════════════════════════════════════════════════════
// INSPIRE-MOI — Thèmes Business (orientés promotion/contenu pro)
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_THEMES = [
  { id: 'promo_offre',   label: 'Promo / Offre spéciale',       emoji: '🏷️' },
  { id: 'avant_apres',   label: 'Avant / Après',                emoji: '🔄' },
  { id: 'produit_star',  label: 'Mon produit star',             emoji: '⭐' },
  { id: 'visite',        label: 'Visite de mon commerce',       emoji: '🚪' },
  { id: 'equipe',        label: 'Mon équipe',                   emoji: '👥' },
  { id: 'coulisses',     label: 'Coulisses / Fabrication',      emoji: '🎬' },
  { id: 'tuto_conseil',  label: 'Tuto / Conseil pro',           emoji: '🎓' },
  { id: 'evenement',     label: 'Événement / Ouverture',        emoji: '🎉' },
  { id: 'temoignage',    label: 'Témoignage client',            emoji: '💬' },
  { id: 'saisonnier',    label: 'Saisonnier (Noël, Carnaval…)', emoji: '🎄' },
] as const

export type BusinessThemeId = (typeof BUSINESS_THEMES)[number]['id']

// ═══════════════════════════════════════════════════════════════
// INSPIRE-MOI — Thèmes Général (contenu fun/viral)
// ═══════════════════════════════════════════════════════════════

export const GENERAL_THEMES = [
  { id: 'promo_commerce', label: 'Promo commerce',   emoji: '🏪' },
  { id: 'drole_animaux',  label: 'Animaux drôles',   emoji: '🐱' },
  { id: 'storytelling',   label: 'Mini-histoire',     emoji: '📖' },
  { id: 'tutoriel',       label: 'Tutoriel',          emoji: '🎓' },
  { id: 'nature_voyage',  label: 'Nature & voyage',   emoji: '🏝️' },
  { id: 'motivation',     label: 'Motivation',        emoji: '💪' },
  { id: 'tendance',       label: 'Tendance TikTok',   emoji: '🔥' },
  { id: 'libre',          label: 'Surprise',          emoji: '🎲' },
] as const

export type GeneralThemeId = (typeof GENERAL_THEMES)[number]['id']

// Rétrocompatibilité
export const IDEA_THEMES = GENERAL_THEMES

// ═══════════════════════════════════════════════════════════════
// INSPIRE-MOI — Niveaux de qualité
// ═══════════════════════════════════════════════════════════════

export const IDEA_LEVELS = [
  { id: 'basique',   label: 'Basique',   credits: 0, engine: null,         description: 'Idées IA',              emoji: '💡' },
  { id: 'tendances', label: 'Tendances', credits: 2, engine: 'tavily',     description: 'Recherche web',          emoji: '📈' },
  { id: 'viral',     label: 'Viral',     credits: 3, engine: 'serper',     description: 'Google + YouTube',       emoji: '🔥' },
  { id: 'expert',    label: 'Expert',    credits: 5, engine: 'perplexity', description: 'Analyse IA approfondie', emoji: '🧠' },
] as const

export type IdeaLevelId = (typeof IDEA_LEVELS)[number]['id']

// ═══════════════════════════════════════════════════════════════
// INSPIRE-MOI — Type de résultat enrichi
// ═══════════════════════════════════════════════════════════════

export interface IdeaResult {
  title: string
  description: string
  style: string
  hook: string
}
