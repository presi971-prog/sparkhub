-- ============================================================================
-- Migration 032 — Spark Compta : spark_compta_actions_usage
-- ============================================================================
-- Description : Compteur d'actions mensuelles pour l'enveloppe de 150 actions
-- gratuites par mois. Reset automatique le 1er du mois via job cron.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_actions_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Année-mois au format "YYYY-MM" (ex: "2026-04")
  year_month TEXT NOT NULL,

  -- Type d'action
  action_type TEXT NOT NULL CHECK (action_type IN (
    'log_text',       -- Log texte simple
    'log_photo',      -- Log avec photo de ticket (OCR)
    'log_vocal',      -- Log avec note vocale (Whisper)
    'question',       -- Question en langage naturel
    'export_pdf',     -- Export PDF (coûte plus)
    'correct',        -- Correction (gratuite)
    'delete'          -- Suppression (gratuite)
  )),

  count INT NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id, year_month, action_type)
);

-- Index pour retrouver rapidement les compteurs du mois courant
CREATE INDEX IF NOT EXISTS idx_spark_compta_actions_usage_lookup
  ON public.spark_compta_actions_usage(account_id, year_month);

ALTER TABLE public.spark_compta_actions_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spark_compta_actions_usage_all" ON public.spark_compta_actions_usage;
CREATE POLICY "spark_compta_actions_usage_all"
  ON public.spark_compta_actions_usage
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

COMMENT ON TABLE public.spark_compta_actions_usage IS 'Compteur mensuel d''actions pour l''enveloppe 150 actions';
