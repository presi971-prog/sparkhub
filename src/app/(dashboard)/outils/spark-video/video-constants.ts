// ═══════════════════════════════════════════════════════════════
// SPARK VIDÉO — Constantes
// ═══════════════════════════════════════════════════════════════

export const VIDEO_TIERS = {
  flash:    { name: 'Flash',    scenes: 2,  durationSec: 10, credits: 25, estMinutes: 5,  emoji: '⚡' },
  teaser:   { name: 'Teaser',   scenes: 3,  durationSec: 15, credits: 30, estMinutes: 6,  emoji: '🎬' },
  short:    { name: 'Short',    scenes: 5,  durationSec: 25, credits: 40, estMinutes: 8,  emoji: '📱' },
  standard: { name: 'Standard', scenes: 8,  durationSec: 40, credits: 55, estMinutes: 12, emoji: '🎥' },
  tiktok:   { name: 'TikTok',   scenes: 10, durationSec: 50, credits: 65, estMinutes: 15, emoji: '📲' },
  premium:  { name: 'Premium',  scenes: 13, durationSec: 65, credits: 80, estMinutes: 20, emoji: '🏆' },
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

// Thématiques pour le générateur d'idées (1 crédit)
export const IDEA_THEMES = [
  { id: 'promo_commerce', label: 'Promo commerce',   emoji: '🏪' },
  { id: 'drole_animaux',  label: 'Animaux drôles',   emoji: '🐱' },
  { id: 'storytelling',   label: 'Mini-histoire',     emoji: '📖' },
  { id: 'tutoriel',       label: 'Tutoriel',          emoji: '🎓' },
  { id: 'nature_voyage',  label: 'Nature & voyage',   emoji: '🏝️' },
  { id: 'motivation',     label: 'Motivation',        emoji: '💪' },
  { id: 'tendance',       label: 'Tendance TikTok',   emoji: '🔥' },
  { id: 'libre',          label: 'Surprise',          emoji: '🎲' },
] as const
