import { createClient } from '@/lib/supabase/client'
import { TOOLS_CONFIG } from '@/config/tiers'

/**
 * Système de crédits SparkHub
 */

export interface CreditBalance {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
}

/**
 * Récupère le solde de crédits d'un utilisateur
 */
export async function getUserCredits(userId: string): Promise<CreditBalance | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('credits')
    .select('*')
    .eq('profile_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    balance: data.balance || 0,
    lifetimeEarned: data.lifetime_earned || 0,
    lifetimeSpent: data.lifetime_spent || 0,
  }
}

/**
 * Calcule le coût d'une utilisation d'outil
 */
export function calculateToolCost(
  toolId: string,
  balance: CreditBalance
): {
  canAfford: boolean
  cost: number
} {
  const tool = TOOLS_CONFIG[toolId as keyof typeof TOOLS_CONFIG]
  if (!tool) {
    throw new Error(`Outil inconnu: ${toolId}`)
  }

  const cost = tool.credits
  const canAfford = balance.balance >= cost

  return {
    canAfford,
    cost,
  }
}

/**
 * Utilise un outil et déduit les crédits
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

  // Vérifier le solde
  const balance = await getUserCredits(userId)
  if (!balance || balance.balance < tool.credits) {
    return { success: false, error: 'Crédits insuffisants' }
  }

  // Déduire les crédits
  const { error: updateError } = await supabase
    .from('credits')
    .update({
      balance: balance.balance - tool.credits,
      lifetime_spent: balance.lifetimeSpent + tool.credits,
    })
    .eq('profile_id', userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Logger la transaction
  await supabase.from('credit_transactions').insert({
    profile_id: userId,
    amount: -tool.credits,
    type: 'spend',
    description: `Utilisation: ${tool.name}`,
  })

  return { success: true }
}

/**
 * Récupère l'historique des transactions
 */
export async function getCreditHistory(
  userId: string,
  limit = 50
): Promise<Array<{
  id: string
  amount: number
  type: string
  description: string
  created_at: string
}>> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('profile_id', userId)
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
export function formatToolCost(toolId: string): string {
  const tool = TOOLS_CONFIG[toolId as keyof typeof TOOLS_CONFIG]
  if (!tool) return '?'
  return `${tool.credits} crédits`
}

/**
 * Liste des packs de crédits disponibles à l'achat
 */
export const CREDIT_PACKS = [
  { credits: 50, price: 12, pricePerCredit: 0.24 },
  { credits: 100, price: 20, pricePerCredit: 0.20 },
  { credits: 200, price: 36, pricePerCredit: 0.18 },
] as const
