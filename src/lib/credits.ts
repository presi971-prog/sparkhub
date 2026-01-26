import { createClient } from '@/lib/supabase/client'
import { TOOLS_CONFIG } from '@/config/tiers'
import type { UserCredits, CreditTransaction } from '@/types/database'

/**
 * Système de crédits à deux niveaux :
 * 1. Crédits abonnement : remis à zéro chaque mois, utilisés en premier, coût normal
 * 2. Crédits achetés : persistent indéfiniment, utilisés après l'abonnement, coût 2x
 */

export interface CreditBalance {
  subscriptionCredits: number
  purchasedCredits: number
  totalCredits: number
  resetDate: Date | null
}

/**
 * Récupère le solde de crédits d'un utilisateur
 */
export async function getUserCredits(userId: string): Promise<CreditBalance | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    subscriptionCredits: data.subscription_credits,
    purchasedCredits: data.purchased_credits,
    totalCredits: data.subscription_credits + data.purchased_credits,
    resetDate: data.subscription_credits_reset_at
      ? new Date(data.subscription_credits_reset_at)
      : null,
  }
}

/**
 * Calcule le coût effectif d'une utilisation d'outil
 * @param toolId - ID de l'outil
 * @param balance - Solde actuel de crédits
 * @returns Le coût effectif et la répartition entre types de crédits
 */
export function calculateToolCost(
  toolId: string,
  balance: CreditBalance
): {
  canAfford: boolean
  baseCost: number
  effectiveCost: number
  subscriptionUsed: number
  purchasedUsed: number
  usingPurchasedCredits: boolean
} {
  const tool = TOOLS_CONFIG[toolId as keyof typeof TOOLS_CONFIG]
  if (!tool) {
    throw new Error(`Outil inconnu: ${toolId}`)
  }

  const baseCost = tool.credits

  // Calculer la répartition
  let subscriptionUsed = 0
  let purchasedUsed = 0
  let effectiveCost = 0

  if (balance.subscriptionCredits >= baseCost) {
    // Assez de crédits abonnement
    subscriptionUsed = baseCost
    effectiveCost = baseCost
  } else if (balance.subscriptionCredits > 0) {
    // Mix des deux types
    subscriptionUsed = balance.subscriptionCredits
    purchasedUsed = baseCost - balance.subscriptionCredits
    effectiveCost = subscriptionUsed + purchasedUsed * 2
  } else {
    // Que des crédits achetés (2x)
    purchasedUsed = baseCost
    effectiveCost = baseCost * 2
  }

  const canAfford =
    balance.subscriptionCredits + balance.purchasedCredits >= baseCost

  return {
    canAfford,
    baseCost,
    effectiveCost,
    subscriptionUsed,
    purchasedUsed,
    usingPurchasedCredits: purchasedUsed > 0,
  }
}

/**
 * Utilise un outil (via la fonction Supabase)
 */
export async function useTool(
  userId: string,
  toolId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const tool = TOOLS_CONFIG[toolId as keyof typeof TOOLS_CONFIG]
  if (!tool) {
    return { success: false, error: 'Outil inconnu' }
  }

  // Appel de la fonction PostgreSQL
  const { data, error } = await supabase.rpc('use_credits', {
    p_user_id: userId,
    p_tool_id: toolId,
    p_tool_name: tool.name,
    p_credit_cost: tool.credits,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: data === true }
}

/**
 * Récupère l'historique des transactions
 */
export async function getCreditHistory(
  userId: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data
}

/**
 * Formate l'affichage du coût d'un outil
 */
export function formatToolCost(
  toolId: string,
  balance: CreditBalance | null
): string {
  const tool = TOOLS_CONFIG[toolId as keyof typeof TOOLS_CONFIG]
  if (!tool) return '?'

  if (!balance) {
    return `${tool.credits} crédits`
  }

  const cost = calculateToolCost(toolId, balance)

  if (cost.usingPurchasedCredits) {
    return `${cost.baseCost} → ${cost.effectiveCost} crédits (2x)`
  }

  return `${cost.baseCost} crédits`
}

/**
 * Calcule le nombre de jours avant le reset
 */
export function getDaysUntilReset(resetDate: Date | null): number | null {
  if (!resetDate) return null

  const now = new Date()
  const diff = resetDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Liste des packs de crédits disponibles à l'achat
 */
export const CREDIT_PACKS = [
  { credits: 50, price: 5, pricePerCredit: 0.10 },
  { credits: 150, price: 12, pricePerCredit: 0.08 },
  { credits: 300, price: 20, pricePerCredit: 0.067 },
  { credits: 500, price: 30, pricePerCredit: 0.06 },
] as const
