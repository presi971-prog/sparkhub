/**
 * Spark Compta — Helpers
 *
 * Fonctions utilitaires partagées. Formatage monétaire, conversion dates,
 * calculs d'enveloppe, détection de doublons, etc.
 */

import {
  ACTIONS_COUNTED_IN_ENVELOPE,
  MONTHLY_ACTIONS_ENVELOPE,
  OCR_VALIDATION_THRESHOLD_CENTS,
  QUIET_HOURS,
  type ActionType,
} from './constants'

// ============================================================================
// Formatage monétaire
// ============================================================================

/**
 * Convertit un montant en centimes vers un affichage formaté en euros.
 *
 * @example
 *   formatCentsToEuros(12345) // "123,45 €"
 *   formatCentsToEuros(0)     // "0,00 €"
 *   formatCentsToEuros(100)   // "1,00 €"
 */
export function formatCentsToEuros(
  cents: number,
  options?: {
    showDecimals?: boolean
    compact?: boolean
  }
): string {
  const { showDecimals = true, compact = false } = options ?? {}

  const euros = cents / 100

  if (compact && Math.abs(euros) >= 1000) {
    // Compact format : "3,4k €" pour 3 420
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(euros)
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(euros)
}

/**
 * Parse une chaîne "1500" ou "1500,50" ou "1500.50" ou "1 500,50" vers des centimes.
 *
 * @example
 *   parseEurosToCents("60") // 6000
 *   parseEurosToCents("1 500,50") // 150050
 *   parseEurosToCents("1500.50 €") // 150050
 */
export function parseEurosToCents(input: string): number | null {
  if (!input) return null

  // Nettoyer : enlever € et espaces
  const cleaned = input
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .trim()

  const parsed = parseFloat(cleaned)
  if (Number.isNaN(parsed)) return null

  return Math.round(parsed * 100)
}

// ============================================================================
// Dates
// ============================================================================

/**
 * Retourne l'année-mois au format "YYYY-MM" pour la date donnée (ou maintenant).
 *
 * @example
 *   getYearMonth(new Date('2026-04-15')) // "2026-04"
 */
export function getYearMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Vérifie si l'heure actuelle est dans la plage "silencieuse" (19h-8h)
 * où on ne doit PAS envoyer de notifications automatiques.
 */
export function isInQuietHours(date: Date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= QUIET_HOURS.START || hour < QUIET_HOURS.END
}

// ============================================================================
// Enveloppe d'actions
// ============================================================================

/**
 * Calcule le nombre d'actions consommées ce mois, basé sur les counts par type.
 * Seules les actions dans ACTIONS_COUNTED_IN_ENVELOPE comptent.
 */
export function calculateEnvelopeUsed(
  usageByType: Record<ActionType, number>
): number {
  return ACTIONS_COUNTED_IN_ENVELOPE.reduce((sum, type) => {
    return sum + (usageByType[type] ?? 0)
  }, 0)
}

/**
 * Retourne le pourcentage d'utilisation de l'enveloppe (0-100).
 */
export function calculateEnvelopePercent(used: number): number {
  return Math.min(100, Math.round((used / MONTHLY_ACTIONS_ENVELOPE) * 100))
}

/**
 * Vérifie si une action donnée compte dans l'enveloppe.
 */
export function actionCountsInEnvelope(type: ActionType): boolean {
  return ACTIONS_COUNTED_IN_ENVELOPE.includes(type)
}

// ============================================================================
// Validation des données entrantes
// ============================================================================

/**
 * Vérifie si une photo OCR nécessite une validation humaine explicite
 * (seuil : 50 € / 5000 centimes)
 */
export function requiresOcrValidation(amountCents: number): boolean {
  return amountCents >= OCR_VALIDATION_THRESHOLD_CENTS
}

/**
 * Détection basique de doublon : deux transactions sont considérées comme
 * doublons si même montant, même catégorie et créées à moins de 5 minutes.
 *
 * Cette fonction est utilisée dans le flow de création de transaction pour
 * demander confirmation au pro avant d'insérer un éventuel doublon.
 */
export interface PotentialDuplicate {
  id: string
  amount_cents: number
  category_id: string
  created_at: string
}

export function isPotentialDuplicate(
  newTransaction: { amount_cents: number; category_id: string },
  recentTransactions: PotentialDuplicate[]
): PotentialDuplicate | null {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

  for (const tx of recentTransactions) {
    const txTime = new Date(tx.created_at).getTime()
    if (
      tx.amount_cents === newTransaction.amount_cents &&
      tx.category_id === newTransaction.category_id &&
      txTime > fiveMinutesAgo
    ) {
      return tx
    }
  }

  return null
}

// ============================================================================
// Formatage des réponses WhatsApp
// ============================================================================

/**
 * Formate une confirmation de transaction pour WhatsApp.
 *
 * @example
 *   formatTransactionConfirmation({
 *     type: 'depense',
 *     amount_cents: 6000,
 *     category_icon: '⛽',
 *     category_label: 'Carburant',
 *     description: 'Shell Petit-Bourg',
 *     transaction_date: '2026-04-10T06:32:00'
 *   })
 *   // ⛽ Carburant enregistré.
 *   // 60,00 €, Shell Petit-Bourg, 10 avril, 06:32.
 */
export interface TransactionConfirmationInput {
  type: 'depense' | 'recette'
  amount_cents: number
  category_icon: string
  category_label: string
  description: string
  transaction_date: string
}

export function formatTransactionConfirmation(
  input: TransactionConfirmationInput
): string {
  const amount = formatCentsToEuros(input.amount_cents)
  const date = new Date(input.transaction_date)
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const verb = input.type === 'depense' ? 'enregistrée' : 'enregistrée'
  const label =
    input.type === 'depense' ? input.category_label : 'Recette'

  return `${input.category_icon} ${label} ${verb}.
${amount}${input.description ? `, ${input.description}` : ''}, ${dateStr}, ${timeStr}.`
}
