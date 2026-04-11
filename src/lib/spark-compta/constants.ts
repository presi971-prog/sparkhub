/**
 * Spark Compta — Constants
 *
 * Constantes métier centralisées. Tout est typé et commenté pour éviter les
 * magic numbers et magic strings dans le reste du code.
 */

// ============================================================================
// Les 6 familles métiers
// ============================================================================

export const FAMILIES = {
  ROULEUR: 'rouleur',
  MAINS_AGILES: 'mains_agiles',
  TENANCIER: 'tenancier',
  CERVEAU: 'cerveau',
  CREATIF: 'creatif',
  HEBERGEUR: 'hebergeur',
} as const

export type Family = (typeof FAMILIES)[keyof typeof FAMILIES]

export const FAMILY_LABELS: Record<Family, string> = {
  rouleur: 'Les Rouleurs',
  mains_agiles: 'Les Mains agiles',
  tenancier: 'Les Tenanciers',
  cerveau: 'Les Vendeurs de cerveau',
  creatif: 'Les Créatifs',
  hebergeur: 'Les Hébergeurs',
}

export const FAMILY_DESCRIPTIONS: Record<Family, string> = {
  rouleur: 'Livreur, taxi, VTC, coursier',
  mains_agiles: 'Artisan (plombier, électricien, maçon, peintre, menuisier…)',
  tenancier: 'Restaurant, bar, commerce, coiffeur, esthéticienne',
  cerveau: 'Formateur, consultant, coach pro, rédacteur, traducteur',
  creatif: 'Photographe, vidéaste, artiste, musicien, graphiste',
  hebergeur: 'Location saisonnière, gîte, chambre d\'hôte',
}

export const FAMILY_EMOJIS: Record<Family, string> = {
  rouleur: '🛵',
  mains_agiles: '🔧',
  tenancier: '🏪',
  cerveau: '🎓',
  creatif: '📸',
  hebergeur: '🏠',
}

// ============================================================================
// Localisations fiscales
// ============================================================================

export const LOCALIZATIONS = {
  METROPOLE: 'metropole',
  GUADELOUPE: 'guadeloupe',
  MARTINIQUE: 'martinique',
  REUNION: 'reunion',
  GUYANE: 'guyane',
  MAYOTTE: 'mayotte',
} as const

export type Localization = (typeof LOCALIZATIONS)[keyof typeof LOCALIZATIONS]

export const LOCALIZATION_LABELS: Record<Localization, string> = {
  metropole: 'France métropolitaine',
  guadeloupe: 'Guadeloupe',
  martinique: 'Martinique',
  reunion: 'Réunion',
  guyane: 'Guyane',
  mayotte: 'Mayotte',
}

// ============================================================================
// Régimes fiscaux
// ============================================================================

export const FISCAL_REGIMES = {
  MICRO_BIC: 'micro_bic',
  MICRO_BNC: 'micro_bnc',
  BIC_REEL: 'bic_reel',
  BNC_REEL: 'bnc_reel',
  SARL: 'sarl',
  SASU: 'sasu',
  EI: 'ei',
  LMNP: 'lmnp',
  LMP: 'lmp',
} as const

export type FiscalRegime = (typeof FISCAL_REGIMES)[keyof typeof FISCAL_REGIMES]

// ============================================================================
// Modes Spark Compta (simple = gratuit, comptable = option Pro payante)
// ============================================================================

export const MODES = {
  SIMPLE: 'simple',
  COMPTABLE: 'comptable',
} as const

export type Mode = (typeof MODES)[keyof typeof MODES]

// ============================================================================
// Types de transaction
// ============================================================================

export const TRANSACTION_TYPES = {
  DEPENSE: 'depense',
  RECETTE: 'recette',
} as const

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES]

// ============================================================================
// Sources de saisie
// ============================================================================

export const TRANSACTION_SOURCES = {
  TEXTE: 'texte',
  VOCAL: 'vocal',
  PHOTO: 'photo',
  MANUEL: 'manuel',
} as const

export type TransactionSource = (typeof TRANSACTION_SOURCES)[keyof typeof TRANSACTION_SOURCES]

// ============================================================================
// Enveloppe d'actions mensuelles (acté : 150 pour tous)
// ============================================================================

export const MONTHLY_ACTIONS_ENVELOPE = 150

export const ACTION_TYPES = {
  LOG_TEXT: 'log_text',
  LOG_PHOTO: 'log_photo',
  LOG_VOCAL: 'log_vocal',
  QUESTION: 'question',
  EXPORT_PDF: 'export_pdf',
  CORRECT: 'correct',
  DELETE: 'delete',
} as const

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES]

// Actions qui comptent dans l'enveloppe (les autres sont gratuites)
export const ACTIONS_COUNTED_IN_ENVELOPE: ActionType[] = [
  'log_text',
  'log_photo',
  'log_vocal',
  'question',
  'export_pdf',
]

// ============================================================================
// Seuils de validation humaine
// ============================================================================

// Au-dessus de ce montant en centimes, l'OCR photo nécessite une validation
// humaine explicite (règle de principe n° 2 du cahier des charges FORGE)
export const OCR_VALIDATION_THRESHOLD_CENTS = 5000 // 50 €

// ============================================================================
// Plages horaires respectueuses pour l'envoi automatique de messages
// ============================================================================

export const QUIET_HOURS = {
  START: 19, // Pas d'envoi automatique après 19h
  END: 8,    // Ni avant 8h
}

// ============================================================================
// Types de familles qui ont un label transversal (chantier/mission/projet/bien)
// ============================================================================

export const PROJECT_TYPE_BY_FAMILY: Record<Family, 'chantier' | 'mission' | 'projet' | 'bien' | null> = {
  rouleur: null,
  mains_agiles: 'chantier',
  tenancier: null,
  cerveau: 'mission',
  creatif: 'projet',
  hebergeur: 'bien',
}
