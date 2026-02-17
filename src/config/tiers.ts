import { TierType } from '@/types/database'

// Re-export TierType for convenience
export type { TierType }

// Période de grâce après désabonnement (en mois)
// Pendant cette période, l'utilisateur conserve son rang
// Après expiration, il passe en Standard
export const GRACE_PERIOD_MONTHS = 2

export interface TierConfig {
  name: TierType
  displayName: string
  emoji: string
  maxPlaces: number
  minRank: number
  monthlyCredits: number
  creditsValidityMonths: number | null // null = illimités
  bonusCredits: number
  price: number
  features: string[]
  color: string
  bgColor: string
  borderColor: string
}

export const TIERS: Record<TierType, TierConfig> = {
  platine: {
    name: 'platine',
    displayName: 'Platine',
    emoji: '🏆',
    maxPlaces: 10,
    minRank: 1,
    monthlyCredits: 200,
    creditsValidityMonths: null, // Illimités
    bonusCredits: 0,
    price: 9,
    features: [
      '200 crédits/mois',
      'Crédits sans expiration',
      'Accès à tous les outils IA',
      'Support prioritaire 24/7',
      'Badge Platine exclusif',
    ],
    color: 'text-cyan-400',
    bgColor: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-400',
  },
  or: {
    name: 'or',
    displayName: 'Or',
    emoji: '🥇',
    maxPlaces: 20,
    minRank: 11,
    monthlyCredits: 150,
    creditsValidityMonths: 12,
    bonusCredits: 0,
    price: 9,
    features: [
      '150 crédits/mois',
      'Crédits valides 12 mois',
      'Accès à tous les outils IA',
      'Support prioritaire',
      'Badge Or exclusif',
    ],
    color: 'text-yellow-500',
    bgColor: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500',
  },
  argent: {
    name: 'argent',
    displayName: 'Argent',
    emoji: '🥈',
    maxPlaces: 30,
    minRank: 31,
    monthlyCredits: 100,
    creditsValidityMonths: 6,
    bonusCredits: 0,
    price: 9,
    features: [
      '100 crédits/mois',
      'Crédits valides 6 mois',
      'Accès à tous les outils IA',
      'Support standard',
      'Badge Argent',
    ],
    color: 'text-gray-400',
    bgColor: 'bg-gradient-to-r from-gray-400/20 to-gray-500/20',
    borderColor: 'border-gray-400',
  },
  bronze: {
    name: 'bronze',
    displayName: 'Bronze',
    emoji: '🥉',
    maxPlaces: 40,
    minRank: 61,
    monthlyCredits: 75,
    creditsValidityMonths: 3,
    bonusCredits: 0,
    price: 9,
    features: [
      '75 crédits/mois',
      'Crédits valides 3 mois',
      'Accès à tous les outils IA',
      'Support standard',
      'Badge Bronze',
    ],
    color: 'text-orange-600',
    bgColor: 'bg-gradient-to-r from-orange-600/20 to-orange-700/20',
    borderColor: 'border-orange-600',
  },
  standard: {
    name: 'standard',
    displayName: 'Standard',
    emoji: '⭐',
    maxPlaces: 99999,
    minRank: 101,
    monthlyCredits: 50,
    creditsValidityMonths: 1,
    bonusCredits: 0,
    price: 9,
    features: [
      '50 crédits/mois',
      'Crédits valides 1 mois',
      'Accès à tous les outils IA',
      'Support standard',
    ],
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary',
  },
}

export const TIER_ORDER: TierType[] = ['platine', 'or', 'argent', 'bronze', 'standard']

export function getTierByRank(rank: number): TierConfig {
  if (rank <= 10) return TIERS.platine
  if (rank <= 30) return TIERS.or
  if (rank <= 60) return TIERS.argent
  if (rank <= 100) return TIERS.bronze
  return TIERS.standard
}

export function getRemainingPlaces(tierName: TierType, currentCount: number): number {
  const tier = TIERS[tierName]
  if (tierName === 'standard') return Infinity
  return Math.max(0, tier.maxPlaces - currentCount)
}

// Configuration des outils et coûts en crédits
export const TOOLS_CONFIG = {
  // Réseaux sociaux
  post_reseaux: { credits: 3, name: 'Post Réseaux Sociaux', category: 'social' },

  // Texte
  post_ia: { credits: 2, name: 'Post IA', category: 'texte' },
  legende: { credits: 2, name: 'Légende/Bio', category: 'texte' },

  // Photos — SparkHub Studio Photo
  photo_standard_1: { credits: 3, name: 'Studio Photo Standard (1 photo)', category: 'photo' },
  photo_standard_4: { credits: 8, name: 'Studio Photo Standard (4 photos)', category: 'photo' },
  photo_4k_1: { credits: 10, name: 'Studio Photo 4K Pro (1 photo)', category: 'photo' },
  photo_4k_4: { credits: 30, name: 'Studio Photo 4K Pro (4 photos)', category: 'photo' },

  // Vidéos
  video_kling_5s: { credits: 5, name: 'Vidéo Kling 5s', category: 'video' },
  video_hailuo_5s: { credits: 15, name: 'Vidéo Hailuo 5s', category: 'video' },
  video_sora_standard_5s: { credits: 30, name: 'Vidéo Sora 5s', category: 'video' },
  video_veo3_5s: { credits: 60, name: 'Vidéo Veo 3 5s', category: 'video' },
  video_sora_pro_5s: { credits: 80, name: 'Vidéo Sora Pro 5s', category: 'video' },
  video_veo3_audio_5s: { credits: 100, name: 'Vidéo Veo 3 + Audio 5s', category: 'video' },

  // Business
  menu_generator: { credits: 3, name: 'Menu / Carte', category: 'business' },
  mini_site_vitrine: { credits: 150, name: 'Mini Site Vitrine', category: 'business' },
  logo_express: { credits: 5, name: 'Logo Express', category: 'business' },

  // Spark Vidéo
  spark_video_ideas:  { credits: 1,  name: 'Spark Vidéo - Idées',           category: 'video' },
  spark_video_flash:    { credits: 25, name: 'Spark Vidéo Flash (10s)',    category: 'video' },
  spark_video_teaser:   { credits: 30, name: 'Spark Vidéo Teaser (15s)',   category: 'video' },
  spark_video_short:    { credits: 40, name: 'Spark Vidéo Short (25s)',    category: 'video' },
  spark_video_standard: { credits: 55, name: 'Spark Vidéo Standard (40s)', category: 'video' },
  spark_video_tiktok:   { credits: 65, name: 'Spark Vidéo TikTok (50s)',  category: 'video' },
  spark_video_premium:  { credits: 80, name: 'Spark Vidéo Premium (65s)', category: 'video' },
}

// Niveaux de réputation (gamification sans crédits gratuits)
// Avantages : badges, visibilité, priorité dans les recherches
export const REPUTATION_LEVELS = {
  debutant: { min: 0, max: 499, name: 'Débutant', emoji: '🌱', searchBoost: 0, badge: 'Nouveau' },
  regulier: { min: 500, max: 1499, name: 'Régulier', emoji: '🚀', searchBoost: 5, badge: 'Actif' },
  expert: { min: 1500, max: 4999, name: 'Expert', emoji: '⭐', searchBoost: 15, badge: 'Expert' },
  legende: { min: 5000, max: Infinity, name: 'Légende', emoji: '👑', searchBoost: 30, badge: 'Légende' },
}

export function getReputationLevel(points: number) {
  if (points >= 5000) return REPUTATION_LEVELS.legende
  if (points >= 1500) return REPUTATION_LEVELS.expert
  if (points >= 500) return REPUTATION_LEVELS.regulier
  return REPUTATION_LEVELS.debutant
}

// Points actions - pour livreurs ET professionnels
export const POINTS_CONFIG = {
  // Actions communes
  referral: 50,              // Parrainage
  five_star_review: 20,      // Avis 5 étoiles reçu
  badge_earned: 25,          // Badge obtenu
  profile_completed: 30,     // Profil complété à 100%

  // Actions livreurs
  delivery_standard: 10,     // Livraison standard effectuée
  delivery_express: 15,      // Livraison express effectuée
  first_delivery: 30,        // Première livraison

  // Actions professionnels
  first_order: 30,           // Première commande passée
  order_completed: 10,       // Commande livrée avec succès
  recurring_order: 15,       // Commande récurrente
  tool_usage: 5,             // Utilisation d'un outil IA
}
