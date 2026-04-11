-- ============================================================================
-- Migration 024 — Spark Compta : spark_compta_custom_subcategories
-- ============================================================================
-- Description : Sous-catégories libres créées par chaque pro sous une catégorie
-- principale (ex: "Shell Petit-Bourg" sous "Carburant").
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_custom_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,
  parent_category_id UUID NOT NULL REFERENCES public.spark_compta_categories(id) ON DELETE RESTRICT,

  label TEXT NOT NULL,

  -- Compteur d'usage pour le tri auto-complétion (les plus utilisées en haut)
  usage_count INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (account_id, parent_category_id, label)
);

CREATE INDEX IF NOT EXISTS idx_spark_compta_custom_subcategories_account
  ON public.spark_compta_custom_subcategories(account_id, parent_category_id, usage_count DESC);

ALTER TABLE public.spark_compta_custom_subcategories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.spark_compta_custom_subcategories IS 'Sous-catégories libres créées par le pro (ex: noms de fournisseurs, stations…)';
