-- ============================================================================
-- Migration 034 — Spark Compta : spark_compta_exports
-- ============================================================================
-- Description : Historique des exports générés par le pro (CSV, PDF pour le
-- comptable, rapports mensuels…). Les fichiers sont stockés dans Supabase
-- Storage, cette table stocke uniquement les métadonnées.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Période couverte par l'export
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Format
  format TEXT NOT NULL CHECK (format IN (
    'csv',                -- CSV brut (colonnes: date, description, montant, catégorie, type, mois)
    'pdf_simple',         -- PDF avec mise en page SparkHub (mode simple)
    'pdf_comptable_pro'   -- PDF avec mapping PCG et décomposition TVA (Mode Pro uniquement)
  )),

  -- URL du fichier généré dans Supabase Storage
  file_url TEXT NOT NULL,

  -- Taille du fichier en octets
  file_size_bytes INT,

  -- Email de destination si envoi direct (consentement explicite requis)
  destination_email TEXT,

  -- Statut d'envoi
  send_status TEXT NOT NULL DEFAULT 'generated' CHECK (send_status IN (
    'generated', 'sent', 'failed', 'bounced'
  )),

  -- Métadonnées (nombre de transactions, total recettes/dépenses, etc.)
  stats JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Retention : les PDFs sont auto-supprimés au bout de 90 jours
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX IF NOT EXISTS idx_spark_compta_exports_account
  ON public.spark_compta_exports(account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_spark_compta_exports_expires
  ON public.spark_compta_exports(expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.spark_compta_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spark_compta_exports_all" ON public.spark_compta_exports;
CREATE POLICY "spark_compta_exports_all"
  ON public.spark_compta_exports
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

COMMENT ON TABLE public.spark_compta_exports IS 'Historique des exports PDF/CSV avec expiration automatique à 90 jours';
