/**
 * Spark Compta — Types TypeScript
 *
 * Types partagés entre le frontend et l'API. Correspondent exactement aux
 * schémas Supabase définis dans les migrations 021-034.
 *
 * Note : une fois les migrations appliquées, on pourra regénérer ces types
 * automatiquement avec :
 *   npx supabase gen types typescript --project-id wytvwfgamfaoqmvoqzps > src/types/supabase-generated.ts
 */

import type {
  Family,
  Localization,
  FiscalRegime,
  Mode,
  TransactionType,
  TransactionSource,
  ActionType,
} from './constants'

// ============================================================================
// spark_compta_accounts
// ============================================================================

export interface SparkComptaAccount {
  id: string
  commerce_id: string
  primary_family: Family
  secondary_families: Family[]
  specific_metier: string | null
  localization: Localization
  fiscal_regime: FiscalRegime
  is_tva_liable: boolean
  mode: Mode
  sla_settings: SlaSettings
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SlaSettings {
  daily_recap_enabled: boolean
  daily_recap_time: string // "HH:MM"
  weekly_report_day: number // 0 = dimanche, 6 = samedi
  weekly_report_time: string
  monthly_report_day: number // 1-28
  monthly_report_time: string
  enable_inactivity_reminders: boolean
}

// ============================================================================
// spark_compta_categories
// ============================================================================

export type FiscalNature =
  | 'deductible_100'
  | 'deductible_partiel'
  | 'non_deductible'
  | 'cotisation'
  | 'investissement'
  | 'imposable_sans_tva'
  | 'ca_imposable'
  | 'a_classer'

export interface SparkComptaCategory {
  id: string
  code: string
  family: Family
  type: TransactionType
  label_fr: string
  icon_emoji: string
  fiscal_nature: FiscalNature
  pcg_mapping: string | null
  tva_rate_metropole: number | null
  tva_rate_dom: number | null
  display_order: number
  is_system: boolean
  created_at: string
}

// ============================================================================
// spark_compta_transactions
// ============================================================================

export interface SparkComptaTransaction {
  id: string
  account_id: string
  type: TransactionType
  amount_cents: number
  currency: string
  transaction_date: string
  description: string
  category_id: string
  custom_subcategory_id: string | null
  project_id: string | null
  source: TransactionSource
  receipt_image_url: string | null
  pro_percentage: number // 0-100
  tva_rate_applied: number | null
  is_validated_by_user: boolean
  raw_input: string | null
  parsed_by_llm: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// Version avec la catégorie jointe (pour affichage UI)
export interface SparkComptaTransactionWithCategory extends SparkComptaTransaction {
  category: SparkComptaCategory
  custom_subcategory?: SparkComptaCustomSubcategory | null
  project?: SparkComptaProject | null
}

// ============================================================================
// spark_compta_custom_subcategories
// ============================================================================

export interface SparkComptaCustomSubcategory {
  id: string
  account_id: string
  parent_category_id: string
  label: string
  usage_count: number
  created_at: string
}

// ============================================================================
// spark_compta_projects
// ============================================================================

export type ProjectType = 'chantier' | 'mission' | 'projet' | 'bien'
export type ProjectStatus = 'actif' | 'termine' | 'annule'

export interface SparkComptaProject {
  id: string
  account_id: string
  project_type: ProjectType
  label: string
  client_name: string | null
  status: ProjectStatus
  estimated_amount_cents: number | null
  start_date: string | null
  end_date: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================================================
// spark_compta_conversations
// ============================================================================

export type ConversationMode = 'carnet' | 'reception_client'
export type ConversationStatus = 'active' | 'archived'

export interface SparkComptaConversation {
  id: string
  account_id: string
  whatsapp_phone: string
  mode: ConversationMode
  started_at: string
  last_activity_at: string
  status: ConversationStatus
  created_at: string
}

export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageContentType = 'text' | 'voice' | 'image'

export interface SparkComptaConversationMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  content_type: MessageContentType
  media_url: string | null
  metadata: Record<string, unknown>
  transaction_id: string | null
  created_at: string
}

// ============================================================================
// spark_compta_actions_usage
// ============================================================================

export interface SparkComptaActionsUsage {
  id: string
  account_id: string
  year_month: string // "YYYY-MM"
  action_type: ActionType
  count: number
  updated_at: string
}

// ============================================================================
// spark_compta_alerts
// ============================================================================

export type AlertType =
  | 'seuil_plafond'
  | 'derive_categorie'
  | 'inactivite'
  | 'palier_celebre'
  | 'enveloppe_proche'
  | 'facture_en_attente'
  | 'taxe_sejour_a_reverser'
  | 'rappel_decennale'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertChannel = 'whatsapp' | 'email' | 'dashboard' | 'push'

export interface SparkComptaAlert {
  id: string
  account_id: string
  alert_type: AlertType
  message: string
  severity: AlertSeverity
  sent_via: AlertChannel
  is_read: boolean
  read_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ============================================================================
// spark_compta_exports
// ============================================================================

export type ExportFormat = 'csv' | 'pdf_simple' | 'pdf_comptable_pro'
export type ExportSendStatus = 'generated' | 'sent' | 'failed' | 'bounced'

export interface SparkComptaExport {
  id: string
  account_id: string
  period_start: string
  period_end: string
  format: ExportFormat
  file_url: string
  file_size_bytes: number | null
  destination_email: string | null
  send_status: ExportSendStatus
  stats: Record<string, unknown>
  created_at: string
  expires_at: string
}

// ============================================================================
// Dashboard — types agrégés pour l'affichage
// ============================================================================

export interface DashboardStats {
  period_start: string
  period_end: string
  total_recettes_cents: number
  total_depenses_cents: number
  net_cents: number
  net_variation_percent: number | null // vs période précédente
  net_variation_cents: number | null
  top_categories_depenses: TopCategoryStat[]
  transactions_count: number
  envelope_used: number
  envelope_total: number
}

export interface TopCategoryStat {
  category_id: string
  category_label: string
  category_icon: string
  total_cents: number
  percentage: number
  transactions_count: number
}
