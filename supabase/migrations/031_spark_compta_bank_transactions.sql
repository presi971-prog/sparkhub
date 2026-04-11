-- ============================================================================
-- Migration 031 — Spark Compta : spark_compta_bank_transactions (préparation v2)
-- ============================================================================
-- Description : Table PRÉPARÉE pour l'agrégation bancaire v2 (Bridge, Budget
-- Insight, etc.). Restera VIDE en v1 mais le schéma est en place pour éviter
-- une refonte future.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Source : quel agrégateur a fourni cette transaction
  source TEXT NOT NULL CHECK (source IN ('bridge', 'budget_insight', 'ofx', 'manual_import')),

  -- ID externe de la transaction chez l'agrégateur (pour dédup)
  external_id TEXT NOT NULL,

  -- Date de la transaction bancaire
  date DATE NOT NULL,

  -- Montant en centimes (signé : positif = crédit, négatif = débit)
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Libellé nettoyé (description humaine)
  description TEXT NOT NULL,

  -- Libellé brut tel que reçu de la banque
  raw_label TEXT,

  -- Nom du marchand (si reconnu par l'agrégateur)
  merchant_name TEXT,

  -- Lien vers la transaction manuelle si matchée (rapprochement automatique)
  matched_manual_log_id UUID REFERENCES public.spark_compta_transactions(id) ON DELETE SET NULL,

  -- Statut du rapprochement
  reconciliation_status TEXT NOT NULL DEFAULT 'pending' CHECK (reconciliation_status IN (
    'pending', 'matched', 'ignored', 'conflicted'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_spark_compta_bank_transactions_account_date
  ON public.spark_compta_bank_transactions(account_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_spark_compta_bank_transactions_matched
  ON public.spark_compta_bank_transactions(matched_manual_log_id)
  WHERE matched_manual_log_id IS NOT NULL;

ALTER TABLE public.spark_compta_bank_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spark_compta_bank_transactions_all" ON public.spark_compta_bank_transactions;
CREATE POLICY "spark_compta_bank_transactions_all"
  ON public.spark_compta_bank_transactions
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

COMMENT ON TABLE public.spark_compta_bank_transactions IS 'Transactions bancaires agrégées (v2, vide en v1)';
