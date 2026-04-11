-- ============================================================================
-- Migration 025 — Spark Compta : spark_compta_projects
-- ============================================================================
-- Description : Label transversal chantier / mission / projet / bien pour les
-- familles Mains agiles, Vendeurs de cerveau, Créatifs et Hébergeurs.
-- Permet le calcul de marge par unité de travail.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Type de projet selon la famille
  project_type TEXT NOT NULL CHECK (project_type IN ('chantier', 'mission', 'projet', 'bien')),

  -- Libellé libre (ex: "Chantier Lamarche", "Mission Sogea", "Mariage Durand", "Villa Sainte-Anne")
  label TEXT NOT NULL,

  -- Nom du client associé (optionnel)
  client_name TEXT,

  -- Statut du projet
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'termine', 'annule')),

  -- Montant estimé total (devis, en centimes)
  estimated_amount_cents BIGINT,

  -- Dates de début et fin (optionnelles)
  start_date DATE,
  end_date DATE,

  -- Métadonnées libres (JSON pour flexibilité future)
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour retrouver rapidement les projets actifs d'un compte
CREATE INDEX IF NOT EXISTS idx_spark_compta_projects_account_status
  ON public.spark_compta_projects(account_id, status, created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.spark_compta_projects_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spark_compta_projects_set_updated_at
  BEFORE UPDATE ON public.spark_compta_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.spark_compta_projects_update_timestamp();

ALTER TABLE public.spark_compta_projects ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.spark_compta_projects IS 'Projets/chantiers/missions/biens — label transversal pour calcul de marge par unité';
