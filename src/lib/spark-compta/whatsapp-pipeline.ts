/**
 * Spark Compta — Pipeline WhatsApp complet
 *
 * Orchestrateur qui fait le lien entre :
 * - un message entrant (texte + numéro WhatsApp expéditeur)
 * - la compréhension LLM (classify + extract)
 * - l'écriture en base Supabase (spark_compta_transactions)
 * - la préparation de la réponse à renvoyer au pro
 *
 * Cet orchestrateur est stateless : il prend tout en input et retourne un objet
 * describing what happened. L'appelant (webhook) se charge d'envoyer la réponse
 * au pro via l'API WhatsApp Cloud (ou d'afficher dans les logs en mode test).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { processWhatsappMessage } from './llm/process-whatsapp-message'
import { formatCentsToEuros } from './helpers'
import { normalizePhone } from './whatsapp-client'
import type { Family, TransactionType } from './constants'

// ============================================================================
// Types publiques
// ============================================================================

export interface WhatsappPipelineInput {
  /** Numéro WhatsApp au format E.164 (ex: +590691270919) */
  senderPhone: string
  /** Texte brut du message reçu */
  messageText: string
  /** Client Supabase (service role pour écrire en base) */
  supabase: SupabaseClient
}

export type PipelineOutcome =
  | {
      status: 'transaction_logged'
      transaction_id: string
      reply_text: string
      intent: 'log_expense' | 'log_income'
    }
  | {
      status: 'account_not_found'
      reply_text: string
    }
  | {
      status: 'intent_not_actionable'
      intent: string
      reply_text: string
    }
  | {
      status: 'category_not_found'
      suggested_category_code: string
      reply_text: string
    }
  | {
      status: 'error'
      error_message: string
      reply_text: string
    }

// ============================================================================
// Pipeline principal
// ============================================================================

export async function runWhatsappPipeline(
  input: WhatsappPipelineInput
): Promise<PipelineOutcome> {
  try {
    // --------------------------------------------------------------------------
    // ÉTAPE 1 — Identifier le pro à partir de son numéro
    // --------------------------------------------------------------------------
    const account = await findAccountByPhone(input.supabase, input.senderPhone)
    if (!account) {
      return {
        status: 'account_not_found',
        reply_text: `Désolé, je ne te reconnais pas. Crée d'abord ton compte Spark Compta sur https://sparkhub.digital-code-growth.com/outils/spark-compta`,
      }
    }

    // --------------------------------------------------------------------------
    // ÉTAPE 2 — Charger les catégories disponibles pour la famille du pro
    // --------------------------------------------------------------------------
    const { data: categories, error: catError } = await input.supabase
      .from('spark_compta_categories')
      .select('id, code, label_fr, icon_emoji, type')
      .eq('family', account.primary_family)

    if (catError || !categories || categories.length === 0) {
      return {
        status: 'error',
        error_message: `Impossible de charger les catégories : ${catError?.message ?? 'liste vide'}`,
        reply_text: 'Désolé, une erreur technique m\'empêche de te répondre. Réessaie dans quelques instants.',
      }
    }

    // --------------------------------------------------------------------------
    // ÉTAPE 3 — Appeler le pipeline LLM (classify + extract)
    // --------------------------------------------------------------------------
    const processed = await processWhatsappMessage({
      messageText: input.messageText,
      familyContext: account.primary_family as Family,
      availableCategories: categories.map((c) => ({
        code: c.code,
        label_fr: c.label_fr,
        icon_emoji: c.icon_emoji,
        type: c.type as TransactionType,
      })),
    })

    // --------------------------------------------------------------------------
    // ÉTAPE 4 — Si l'intent n'est pas un log, on répond un message adapté
    // --------------------------------------------------------------------------
    if (!processed.transaction) {
      const reply = buildNonTransactionReply(processed.intent)
      return {
        status: 'intent_not_actionable',
        intent: processed.intent,
        reply_text: reply,
      }
    }

    const tx = processed.transaction

    // --------------------------------------------------------------------------
    // ÉTAPE 5 — Trouver l'ID de la catégorie à partir du code retourné par le LLM
    // --------------------------------------------------------------------------
    const matchedCategory = categories.find((c) => c.code === tx.category_code)
    if (!matchedCategory) {
      return {
        status: 'category_not_found',
        suggested_category_code: tx.category_code,
        reply_text: `Désolé, je n'ai pas su classer ta ${
          tx.type === 'depense' ? 'dépense' : 'recette'
        } dans la bonne catégorie. Peux-tu préciser ?`,
      }
    }

    // --------------------------------------------------------------------------
    // ÉTAPE 6 — Insérer la transaction en base
    // --------------------------------------------------------------------------
    const { data: inserted, error: insertError } = await input.supabase
      .from('spark_compta_transactions')
      .insert({
        account_id: account.id,
        type: tx.type,
        amount_cents: tx.amount_cents,
        currency: tx.currency || 'EUR',
        transaction_date: tx.transaction_date_iso,
        description: tx.description,
        category_id: matchedCategory.id,
        source: 'texte',
        pro_percentage: 100,
        is_validated_by_user: true, // texte direct = validation implicite
        raw_input: input.messageText,
        parsed_by_llm: {
          intent: processed.intent,
          intent_confidence: processed.intent_confidence,
          intent_reasoning: processed.intent_reasoning,
          extraction_confidence: tx.extraction_confidence,
          missing_info: tx.missing_info_fr,
        },
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      return {
        status: 'error',
        error_message: `Erreur d'insertion : ${insertError?.message ?? 'unknown'}`,
        reply_text: 'Désolé, une erreur technique m\'empêche d\'enregistrer. Réessaie.',
      }
    }

    // --------------------------------------------------------------------------
    // ÉTAPE 7 — Construire la réponse de confirmation
    // --------------------------------------------------------------------------
    const reply = buildTransactionConfirmation({
      type: tx.type,
      amount_cents: tx.amount_cents,
      category_icon: matchedCategory.icon_emoji,
      category_label: matchedCategory.label_fr,
      description: tx.description,
      transaction_date_iso: tx.transaction_date_iso,
    })

    return {
      status: 'transaction_logged',
      transaction_id: inserted.id,
      reply_text: reply,
      intent: processed.intent as 'log_expense' | 'log_income',
    }
  } catch (error) {
    return {
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      reply_text: 'Désolé, un problème technique est survenu. Peux-tu réessayer ?',
    }
  }
}

// ============================================================================
// Helpers internes
// ============================================================================

interface AccountRecord {
  id: string
  commerce_id: string
  primary_family: string
  localization: string
  fiscal_regime: string
  mode: string
}

/**
 * Retrouve le compte Spark Compta à partir du numéro WhatsApp expéditeur.
 * La recherche se fait via la table `commerces` qui stocke le numéro du pro
 * dans la colonne `telephone`.
 *
 * Matching tolérant aux formats :
 * - Les numéros peuvent être stockés avec espaces, tirets, préfixes variés
 * - Meta envoie au format E.164 sans + (ex: "590691270919")
 * - On normalise les deux à leurs 9 derniers chiffres et on compare
 */
async function findAccountByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<AccountRecord | null> {
  const normalizedIncoming = normalizePhone(phone)
  if (!normalizedIncoming || normalizedIncoming.length < 6) {
    return null
  }

  // Charger tous les commerces avec leur téléphone et filtrer en JS
  // (le matching fuzzy sur les numéros est plus fiable en JS qu'en SQL)
  const { data: commerces } = await supabase
    .from('commerces')
    .select('id, telephone')

  if (!commerces) return null

  const matchedCommerce = commerces.find((c) => {
    if (!c.telephone) return false
    return normalizePhone(c.telephone) === normalizedIncoming
  })

  if (!matchedCommerce) return null

  const { data: account } = await supabase
    .from('spark_compta_accounts')
    .select('id, commerce_id, primary_family, localization, fiscal_regime, mode')
    .eq('commerce_id', matchedCommerce.id)
    .maybeSingle()

  return account as AccountRecord | null
}

interface TransactionConfirmationInput {
  type: 'depense' | 'recette'
  amount_cents: number
  category_icon: string
  category_label: string
  description: string
  transaction_date_iso: string
}

/**
 * Construit le message de confirmation WhatsApp à renvoyer au pro.
 */
function buildTransactionConfirmation(input: TransactionConfirmationInput): string {
  const amount = formatCentsToEuros(input.amount_cents)
  const date = new Date(input.transaction_date_iso)
  const dateStr = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
  const timeStr = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const verb = input.type === 'depense' ? 'enregistrée' : 'enregistrée'
  const label = input.type === 'depense' ? input.category_label : 'Recette'

  return `${input.category_icon} ${label} ${verb}.
${amount}${input.description ? `, ${input.description}` : ''}, ${dateStr}, ${timeStr}.`
}

/**
 * Construit une réponse adaptée pour les messages non-transactionnels.
 */
function buildNonTransactionReply(intent: string): string {
  switch (intent) {
    case 'greeting':
      return `👋 Salut ! Je suis Spark Compta, ton assistant comptable. Envoie-moi une dépense ou une recette en langage naturel et je m'occupe du reste.
Exemple : "60€ essence Shell" ou "course 18"`
    case 'question':
      return `🤔 Les questions sur tes chiffres arrivent bientôt ! Pour l'instant, envoie-moi juste tes dépenses et recettes, je les range dans ton tableau de bord SparkHub.`
    case 'correction':
      return `✏️ La correction de la dernière entrée arrive bientôt. Pour l'instant, tu peux modifier dans ton tableau de bord SparkHub.`
    case 'delete':
      return `🗑️ La suppression par message arrive bientôt. Pour l'instant, tu peux supprimer dans ton tableau de bord SparkHub.`
    default:
      return `Je n'ai pas bien compris. Envoie-moi une dépense ou une recette, exemple : "60€ essence Shell" ou "course 18".`
  }
}
