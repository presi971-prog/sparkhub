export const UGC_TYPES = [
  {
    id: 'Produit',
    label: 'Produit',
    emoji: '📦',
    description: 'Un article : plat, bouteille, vêtement, accessoire...',
  },
  {
    id: 'Mascotte ou personnage',
    label: 'Mascotte / Personnage',
    emoji: '🎭',
    description: 'Un personnage ou logo animé de ta marque (ex: mascotte, avatar).',
  },
] as const

export type UgcType = typeof UGC_TYPES[number]['id']

export const UGC_CREDITS = 60

export const UGC_PLACEHOLDERS = {
  qui: 'Décris la personne dans la vidéo. Ex: Une femme de 25 ans, décontractée',
  lieu: 'Décris le lieu. Ex: Dans sa cuisine, en terrasse, au marché',
  action: 'Que fait la personne ? Ex: Elle montre le produit face caméra et sourit',
  ambiance: 'Ex: Décontractée, fun, professionnelle, enthousiaste',
} as const

export const PIPELINE_STEPS_UGC = [
  { id: 'submitted', label: 'Envoyé au serveur', icon: 'upload' },
  { id: 'processing', label: 'Génération en cours (2-5 min)', icon: 'cog' },
  { id: 'completed', label: 'Vidéo prête !', icon: 'check' },
] as const
