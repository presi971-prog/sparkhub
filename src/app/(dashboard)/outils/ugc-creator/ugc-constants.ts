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

// ── Presets formulaire guidé ──

export interface UgcPreset {
  id: string
  emoji: string
  label: string
  value: string
}

export const UGC_PERSONAS: UgcPreset[] = [
  { id: 'jeune-femme', emoji: '👩', label: 'Jeune femme', value: "Une jeune femme d'environ 25 ans" },
  { id: 'jeune-homme', emoji: '👨', label: 'Jeune homme', value: "Un jeune homme d'environ 25 ans" },
  { id: 'femme', emoji: '👩‍💼', label: 'Femme', value: "Une femme d'environ 35 ans" },
  { id: 'homme', emoji: '👨‍💼', label: 'Homme', value: "Un homme d'environ 35 ans" },
  { id: 'femme-mature', emoji: '👵', label: 'Femme mature', value: "Une femme d'environ 50 ans" },
  { id: 'homme-mature', emoji: '👴', label: 'Homme mature', value: "Un homme d'environ 50 ans" },
]

export const UGC_LIEUX: UgcPreset[] = [
  { id: 'salon', emoji: '🛋️', label: 'Salon', value: 'Dans un salon confortable et lumineux' },
  { id: 'cuisine', emoji: '🍳', label: 'Cuisine', value: 'Dans une cuisine moderne' },
  { id: 'terrasse', emoji: '☀️', label: 'Terrasse', value: 'En terrasse ensoleillée' },
  { id: 'bureau', emoji: '💼', label: 'Bureau', value: 'Dans un bureau ou espace de travail' },
  { id: 'voiture', emoji: '🚗', label: 'Voiture', value: 'Assis dans une voiture' },
  { id: 'exterieur', emoji: '🌴', label: 'Extérieur', value: 'En extérieur, dans la rue' },
]

export const UGC_ACTIONS: UgcPreset[] = [
  { id: 'unboxing', emoji: '📦', label: 'Unboxing', value: 'Découvre et déballe le produit avec curiosité' },
  { id: 'face-camera', emoji: '📱', label: 'Face caméra', value: 'Tient le produit face caméra et le présente en souriant' },
  { id: 'utilisation', emoji: '✨', label: 'Utilisation', value: 'Utilise le produit de manière naturelle' },
  { id: 'recommandation', emoji: '👍', label: 'Recommandation', value: 'Recommande le produit comme si il parlait à un ami' },
  { id: 'reaction', emoji: '😍', label: 'Réaction', value: 'Réagit avec enthousiasme en découvrant le produit' },
]

export const UGC_AMBIANCES: UgcPreset[] = [
  { id: 'enthousiaste', emoji: '🔥', label: 'Enthousiaste', value: 'Enthousiaste et dynamique' },
  { id: 'decontractee', emoji: '😎', label: 'Décontractée', value: 'Décontractée et naturelle' },
  { id: 'pro', emoji: '💼', label: 'Pro', value: 'Professionnelle et confiante' },
  { id: 'chaleureuse', emoji: '🤗', label: 'Chaleureuse', value: 'Chaleureuse et authentique' },
  { id: 'fun', emoji: '🎉', label: 'Fun', value: 'Fun et énergique' },
]

export const PIPELINE_STEPS_UGC = [
  { id: 'submitted', label: 'Envoyé au serveur', icon: 'upload' },
  { id: 'processing', label: 'Génération en cours (2-5 min)', icon: 'cog' },
  { id: 'completed', label: 'Vidéo prête !', icon: 'check' },
] as const
