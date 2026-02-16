// Types d'activité
export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { id: 'artisan', label: 'Artisan', emoji: '🔧' },
  { id: 'beaute', label: 'Beauté', emoji: '💇' },
  { id: 'commerce', label: 'Commerce', emoji: '🛍️' },
  { id: 'sport', label: 'Sport', emoji: '💪' },
  { id: 'tourisme', label: 'Tourisme', emoji: '🌴' },
  { id: 'auto', label: 'Auto & Moto', emoji: '🚗' },
  { id: 'evenementiel', label: 'Événementiel', emoji: '🎉' },
] as const

// Styles de logo
export const LOGO_STYLES = [
  { id: 'moderne', label: 'Moderne', desc: 'Lignes épurées, minimaliste, contemporain' },
  { id: 'vintage', label: 'Vintage', desc: 'Rétro, badges, typographie classique' },
  { id: 'tropical', label: 'Tropical', desc: 'Couleurs vives, nature, ambiance caraïbe' },
  { id: 'luxe', label: 'Luxe', desc: 'Élégant, doré, premium, raffiné' },
  { id: 'fun', label: 'Fun', desc: 'Coloré, dynamique, enjoué, décalé' },
  { id: 'surprise', label: 'Surprise', desc: 'L\'IA choisit le meilleur style pour toi' },
] as const

// Palettes de couleurs prédéfinies
export const COLOR_PALETTES = [
  {
    id: 'ocean',
    label: 'Océan',
    colors: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A'],
    preview: 'bg-gradient-to-r from-blue-600 to-cyan-400',
  },
  {
    id: 'tropical',
    label: 'Tropical',
    colors: ['#2D6A4F', '#52B788', '#FFD166', '#F77F00', '#D62828'],
    preview: 'bg-gradient-to-r from-green-600 to-yellow-400',
  },
  {
    id: 'sunset',
    label: 'Coucher de soleil',
    colors: ['#FF6B6B', '#FFA07A', '#FFD93D', '#FF8C42', '#C84B31'],
    preview: 'bg-gradient-to-r from-red-400 to-yellow-400',
  },
  {
    id: 'royal',
    label: 'Royal',
    colors: ['#2C0735', '#6A0572', '#AB83A1', '#D4AF37', '#F5F5DC'],
    preview: 'bg-gradient-to-r from-purple-900 to-yellow-500',
  },
  {
    id: 'nature',
    label: 'Nature',
    colors: ['#1B4332', '#2D6A4F', '#40916C', '#74C69D', '#B7E4C7'],
    preview: 'bg-gradient-to-r from-green-900 to-green-300',
  },
  {
    id: 'noir_dore',
    label: 'Noir & Doré',
    colors: ['#1A1A2E', '#16213E', '#D4AF37', '#F1C40F', '#FFFFFF'],
    preview: 'bg-gradient-to-r from-gray-900 to-yellow-500',
  },
  {
    id: 'pastel',
    label: 'Pastel',
    colors: ['#FFB5E8', '#B28DFF', '#85E3FF', '#BFFCC6', '#FFF5BA'],
    preview: 'bg-gradient-to-r from-pink-300 to-blue-300',
  },
  {
    id: 'surprise',
    label: 'Surprise',
    colors: [],
    preview: 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500',
  },
] as const

// Formats de bannière pour l'export
export const BANNER_FORMATS = [
  { id: 'facebook', label: 'Facebook', width: 820, height: 312, ratio: '820x312' },
  { id: 'instagram', label: 'Instagram', width: 1080, height: 1080, ratio: '1080x1080' },
  { id: 'twitter', label: 'Twitter / X', width: 1500, height: 500, ratio: '1500x500' },
  { id: 'linkedin', label: 'LinkedIn', width: 1584, height: 396, ratio: '1584x396' },
] as const

// Les 4 approches de logo générées
export const LOGO_APPROACHES = [
  { id: 'symbolique', label: 'Symbolique', desc: 'Icône forte qui représente ton activité' },
  { id: 'typographique', label: 'Typographique', desc: 'Le nom stylisé comme identité visuelle' },
  { id: 'combine', label: 'Combiné', desc: 'Icône + texte harmonisés ensemble' },
  { id: 'creatif', label: 'Créatif', desc: 'Approche originale et inattendue' },
] as const

export type BusinessType = typeof BUSINESS_TYPES[number]['id']
export type LogoStyle = typeof LOGO_STYLES[number]['id']
export type PaletteId = typeof COLOR_PALETTES[number]['id']
export type BannerFormatId = typeof BANNER_FORMATS[number]['id']
