-- ============================================================================
-- Migration 029 — Spark Compta : spark_compta_fiscal_parameters (structure)
-- ============================================================================
-- Description : Table versionnée par année pour les paramètres fiscaux
-- (plafonds repas, plafonds micro-BIC, taux TVA, etc.).
-- Le seed 2026 est dans la migration 030.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_fiscal_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clé du paramètre (ex: "micro_bic_plafond", "repas_plafond_deductible")
  parameter_key TEXT NOT NULL,

  -- Année fiscale de référence
  year INT NOT NULL,

  -- Région (pour les spécificités DOM)
  region TEXT NOT NULL DEFAULT 'metropole' CHECK (region IN (
    'metropole', 'guadeloupe', 'martinique', 'reunion', 'guyane', 'mayotte'
  )),

  -- Valeur (selon le type : numérique, texte ou JSON)
  value_numeric NUMERIC,
  value_text TEXT,
  value_jsonb JSONB,

  -- Source officielle citée
  source_url TEXT,

  -- Métadonnées
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (parameter_key, year, region)
);

CREATE INDEX IF NOT EXISTS idx_spark_compta_fiscal_parameters_key_year
  ON public.spark_compta_fiscal_parameters(parameter_key, year, region);

ALTER TABLE public.spark_compta_fiscal_parameters ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour tous les utilisateurs authentifiés (table de référence)
DROP POLICY IF EXISTS "spark_compta_fiscal_parameters_select" ON public.spark_compta_fiscal_parameters;
CREATE POLICY "spark_compta_fiscal_parameters_select"
  ON public.spark_compta_fiscal_parameters
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE public.spark_compta_fiscal_parameters IS 'Paramètres fiscaux versionnés par année et région';
