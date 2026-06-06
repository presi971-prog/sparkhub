/**
 * Spark Compta — Pipeline de traitement des messages WhatsApp
 *
 * Prend un message texte entrant (de Fabrice) et fait tout le pipeline :
 * 1. Classifier l'intent via GPT-4o-mini (log_expense / log_income / question / other)
 * 2. Si c'est un log : extraire les données structurées (montant, description,
 *    date, catégorie suggérée) via GPT-4o-mini en Structured Outputs
 * 3. Retourner un objet typé prêt à être inséré en base
 *
 * Ce fichier est agnostique de Supabase — il fait juste la compréhension du
 * langage naturel. L'insertion en base est faite par le webhook qui appelle
 * ce pipeline.
 */

import { chatCompletion } from './openai-client'
import type { Family, TransactionType } from '../constants'

// ============================================================================
// Types d'intents détectables
// ============================================================================

export type MessageIntent =
  | 'log_expense' // "60€ essence Shell" → dépense à enregistrer
  | 'log_income' // "course 18" → recette à enregistrer
  | 'question' // "combien j'ai gagné ce mois ?" → à répondre
  | 'correction' // "corrige ma dernière dépense" → à traiter différemment
  | 'delete' // "annule la dernière" → à traiter différemment
  | 'greeting' // "bonjour", "hello" → réponse polie
  | 'other' // cas non reconnu

// ============================================================================
// Étape 1 — Classification de l'intent
// ============================================================================

export interface IntentClassificationResult {
  intent: MessageIntent
  confidence: number // 0-1
  reasoning_fr: string // petit commentaire en FR pour debug
}

const INTENT_CLASSIFICATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    intent: {
      type: 'string',
      enum: [
        'log_expense',
        'log_income',
        'question',
        'correction',
        'delete',
        'greeting',
        'other',
      ],
      description: "L'intention principale du message",
    },
    confidence: {
      type: 'number',
      description: 'Confiance 0-1 dans la classification',
    },
    reasoning_fr: {
      type: 'string',
      description: 'Brève explication en français (max 1 phrase)',
    },
  },
  required: ['intent', 'confidence', 'reasoning_fr'],
  additionalProperties: false,
}

/**
 * Classifie l'intent d'un message WhatsApp entrant.
 *
 * @example
 *   classifyIntent("60€ essence Shell") → { intent: 'log_expense', confidence: 0.95, ... }
 *   classifyIntent("combien j'ai gagné ce mois ?") → { intent: 'question', confidence: 0.92, ... }
 *   classifyIntent("salut") → { intent: 'greeting', confidence: 0.99, ... }
 */
export async function classifyIntent(
  messageText: string,
  familyContext?: Family
): Promise<IntentClassificationResult> {
  const systemPrompt = `Tu es un classifieur d'intentions pour Spark Compta, un assistant comptable conversationnel accessible via WhatsApp.

Tu reçois un message d'un petit professionnel (livreur, artisan, restaurateur, etc.) et tu dois déterminer son intention principale parmi ces catégories :

- log_expense : le pro te dit qu'il a fait une DÉPENSE (ex: "60€ essence Shell", "matériel 240€ chez Brico", "plein 45", "ticket Metro")
- log_income : le pro te dit qu'il a encaissé une RECETTE (ex: "course 18", "facture Sogea 1200€", "j'ai reçu 500€")
- question : le pro te pose une question sur ses finances (ex: "combien j'ai gagné ce mois ?", "quel est mon top client ?")
- correction : le pro veut CORRIGER une transaction précédente (ex: "non c'était 65 pas 60", "la dernière c'était un repas pas du carburant")
- delete : le pro veut SUPPRIMER la dernière transaction (ex: "annule", "supprime la dernière", "enlève")
- greeting : salutation ou question générale (ex: "bonjour", "salut", "comment ça va ?", "t'es qui ?")
- other : impossible à classer clairement

IMPORTANT : pour log_expense et log_income, cherche un MONTANT et/ou un verbe d'action qui indique une transaction. Si tu hésites entre log_expense et log_income, regarde si le message suggère une sortie (achat, paiement) ou une entrée (reçu, course, facturé).

Retourne un objet JSON avec les champs intent, confidence (0-1), et reasoning_fr (1 phrase en français).`

  const userPrompt = familyContext
    ? `Contexte : ce pro est dans la famille "${familyContext}".

Message à classifier : "${messageText}"`
    : `Message à classifier : "${messageText}"`

  const result = await chatCompletion<IntentClassificationResult>({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'gpt-4o-mini',
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'intent_classification',
        strict: true,
        schema: INTENT_CLASSIFICATION_SCHEMA,
      },
    },
  })

  return result.content
}

// ============================================================================
// Étape 2 — Extraction des données d'une transaction
// ============================================================================

export interface TransactionExtractionInput {
  messageText: string
  intent: 'log_expense' | 'log_income'
  familyContext: Family
  availableCategories: Array<{
    code: string
    label_fr: string
    icon_emoji: string
  }>
}

export interface TransactionExtractionResult {
  amount_cents: number
  description: string
  transaction_date_iso: string // ISO 8601
  category_code: string // un code parmi availableCategories
  currency: string // "EUR" par défaut
  confidence: number // 0-1
  missing_info_fr: string | null // si quelque chose manque, explication en FR
}

const TRANSACTION_EXTRACTION_SCHEMA = {
  type: 'object' as const,
  properties: {
    amount_cents: {
      type: 'integer',
      description: 'Montant en centimes (ex: 6000 pour 60€). Toujours positif.',
    },
    description: {
      type: 'string',
      description: 'Description courte et claire (ex: "Shell Petit-Bourg")',
    },
    transaction_date_iso: {
      type: 'string',
      description:
        'Date au format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). Si non précisée, utilise maintenant.',
    },
    category_code: {
      type: 'string',
      description:
        "Code de la catégorie parmi celles disponibles (obligatoire, doit matcher exactement)",
    },
    currency: {
      type: 'string',
      description: "Devise ISO 4217 (par défaut EUR)",
    },
    confidence: {
      type: 'number',
      description: "Confiance 0-1 dans l'extraction",
    },
    missing_info_fr: {
      type: ['string', 'null'],
      description:
        "Si une info manque (ex: montant pas clair), explication en français. Sinon null.",
    },
  },
  required: [
    'amount_cents',
    'description',
    'transaction_date_iso',
    'category_code',
    'currency',
    'confidence',
    'missing_info_fr',
  ],
  additionalProperties: false,
}

/**
 * Extrait les données structurées d'un message texte (montant, description,
 * date, catégorie suggérée).
 */
export async function extractTransactionData(
  input: TransactionExtractionInput
): Promise<TransactionExtractionResult> {
  const nowIso = new Date().toISOString()

  const categoriesList = input.availableCategories
    .map((c) => `  - ${c.code} (${c.icon_emoji} ${c.label_fr})`)
    .join('\n')

  const systemPrompt = `Tu es un extracteur de données structurées pour Spark Compta.

Tu reçois un message d'un petit professionnel qui te parle d'une ${
    input.intent === 'log_expense' ? 'DÉPENSE' : 'RECETTE'
  } qu'il vient de faire. Tu dois extraire les données de manière précise et les classer dans la bonne catégorie.

RÈGLES STRICTES :
1. Le montant doit TOUJOURS être en centimes (60€ → 6000, 8.50€ → 850, 1500€ → 150000). Jamais négatif.
2. La date doit être au format ISO 8601. Si non précisée dans le message, utilise la date du moment (${nowIso}).
3. La devise est EUR par défaut.
4. Le category_code DOIT être EXACTEMENT un des codes disponibles listés ci-dessous (pas d'invention).
5. La description doit être courte et claire, en reprenant les mots-clés du pro (ex: "Shell Petit-Bourg", pas "Achat de carburant effectué par le professionnel").
6. confidence entre 0 et 1 : 1 si tout est clair, 0.5 si tu dois deviner la catégorie, 0.3 si le message est ambigu.
7. missing_info_fr : null si tout va bien. Sinon une phrase en FR expliquant ce qui manque ("Le montant n'est pas clair, est-ce 60 ou 65 ?").

Contexte pro : famille métier = "${input.familyContext}"

Catégories disponibles pour cette famille (utilise exactement un de ces codes) :
${categoriesList}

Retourne UNIQUEMENT un objet JSON conforme au schéma.`

  const userPrompt = `Message à analyser : "${input.messageText}"`

  const result = await chatCompletion<TransactionExtractionResult>({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'gpt-4o-mini',
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'transaction_extraction',
        strict: true,
        schema: TRANSACTION_EXTRACTION_SCHEMA,
      },
    },
  })

  return result.content
}

// ============================================================================
// Pipeline complet (classify + extract)
// ============================================================================

export interface ProcessedMessage {
  intent: MessageIntent
  intent_confidence: number
  intent_reasoning: string
  transaction?: {
    type: TransactionType
    amount_cents: number
    description: string
    transaction_date_iso: string
    category_code: string
    currency: string
    extraction_confidence: number
    missing_info_fr: string | null
  }
}

/**
 * Pipeline complet : classifie + extrait si c'est un log de transaction.
 *
 * @example
 *   const result = await processWhatsappMessage({
 *     messageText: "60€ essence Shell Petit-Bourg",
 *     familyContext: "rouleur",
 *     availableCategories: [...] // à charger depuis la base
 *   })
 *   // result.intent === "log_expense"
 *   // result.transaction.amount_cents === 6000
 *   // result.transaction.category_code === "rouleur_carburant"
 */
export async function processWhatsappMessage(input: {
  messageText: string
  familyContext: Family
  availableCategories: Array<{
    code: string
    label_fr: string
    icon_emoji: string
    type: TransactionType
  }>
}): Promise<ProcessedMessage> {
  // Étape 1 : classifier
  const classification = await classifyIntent(input.messageText, input.familyContext)

  // Si ce n'est pas un log de transaction, on s'arrête ici
  if (
    classification.intent !== 'log_expense' &&
    classification.intent !== 'log_income'
  ) {
    return {
      intent: classification.intent,
      intent_confidence: classification.confidence,
      intent_reasoning: classification.reasoning_fr,
    }
  }

  // Étape 2 : extraire les données
  // On filtre les catégories du bon type (dépense ou recette)
  const transactionType: TransactionType =
    classification.intent === 'log_expense' ? 'depense' : 'recette'
  const filteredCategories = input.availableCategories.filter(
    (c) => c.type === transactionType
  )

  const extraction = await extractTransactionData({
    messageText: input.messageText,
    intent: classification.intent,
    familyContext: input.familyContext,
    availableCategories: filteredCategories,
  })

  return {
    intent: classification.intent,
    intent_confidence: classification.confidence,
    intent_reasoning: classification.reasoning_fr,
    transaction: {
      type: transactionType,
      amount_cents: extraction.amount_cents,
      description: extraction.description,
      transaction_date_iso: extraction.transaction_date_iso,
      category_code: extraction.category_code,
      currency: extraction.currency,
      extraction_confidence: extraction.confidence,
      missing_info_fr: extraction.missing_info_fr,
    },
  }
}
