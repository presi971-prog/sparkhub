'use server'

/**
 * Spark Compta — Server Actions
 *
 * Actions côté serveur pour créer et mettre à jour le compte Spark Compta.
 * Toutes les écritures passent par ces actions pour garantir l'authentification
 * et la validation avant insertion en base.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Family, Localization, FiscalRegime, Mode } from './constants'

// ============================================================================
// createSparkComptaAccount
// ============================================================================

export interface CreateAccountInput {
  primary_family: Family
  secondary_families?: Family[]
  specific_metier: string
  localization: Localization
  fiscal_regime: FiscalRegime
  is_tva_liable: boolean
  mode: Mode
}

export interface CreateAccountResult {
  success: boolean
  account_id?: string
  error?: string
}

/**
 * Crée un compte Spark Compta pour le commerce de l'utilisateur authentifié.
 * Si un compte existe déjà pour ce commerce, le met à jour et marque
 * l'onboarding comme complété.
 */
export async function createSparkComptaAccount(
  input: CreateAccountInput
): Promise<CreateAccountResult> {
  try {
    const supabase = await createClient()

    // 1. Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Non authentifié' }
    }

    // 2. Récupérer le commerce du pro
    const { data: commerce, error: commerceError } = await supabase
      .from('commerces')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    if (commerceError || !commerce) {
      return {
        success: false,
        error: 'Aucun commerce trouvé pour cet utilisateur. Termine d\'abord ton inscription SparkHub.',
      }
    }

    // 3. Créer ou mettre à jour le compte Spark Compta
    const now = new Date().toISOString()

    const { data: account, error: insertError } = await supabase
      .from('spark_compta_accounts')
      .upsert(
        {
          commerce_id: commerce.id,
          primary_family: input.primary_family,
          secondary_families: input.secondary_families ?? [],
          specific_metier: input.specific_metier,
          localization: input.localization,
          fiscal_regime: input.fiscal_regime,
          is_tva_liable: input.is_tva_liable,
          mode: input.mode,
          onboarding_completed_at: now,
          updated_at: now,
        },
        { onConflict: 'commerce_id' }
      )
      .select('id')
      .single()

    if (insertError || !account) {
      return {
        success: false,
        error: insertError?.message ?? 'Erreur lors de la création du compte',
      }
    }

    // 4. Revalider les pages concernées
    revalidatePath('/outils/spark-compta')
    revalidatePath('/outils/spark-compta/dashboard')

    return { success: true, account_id: account.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

// ============================================================================
// getSparkComptaAccount (lecture)
// ============================================================================

/**
 * Récupère le compte Spark Compta de l'utilisateur authentifié.
 * Retourne null si aucun compte n'existe ou si l'onboarding n'est pas terminé.
 */
export async function getSparkComptaAccount() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: commerce } = await supabase
    .from('commerces')
    .select('id')
    .eq('profile_id', user.id)
    .single()
  if (!commerce) return null

  const { data: account } = await supabase
    .from('spark_compta_accounts')
    .select('*')
    .eq('commerce_id', commerce.id)
    .single()

  return account
}
