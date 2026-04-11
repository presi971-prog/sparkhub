-- ============================================================================
-- Migration 022 — Spark Compta : spark_compta_categories (structure)
-- ============================================================================
-- Description : Table de référence des catégories fermées pour les 6 familles
-- métiers. Le seed des 86 catégories est dans la migration 023.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code court unique (ex: "carburant", "loyer_local")
  code TEXT NOT NULL UNIQUE,

  -- Famille métier à laquelle cette catégorie appartient
  family TEXT NOT NULL CHECK (family IN (
    'rouleur', 'mains_agiles', 'tenancier', 'cerveau', 'creatif', 'hebergeur'
  )),

  -- Type (dépense ou recette)
  type TEXT NOT NULL CHECK (type IN ('depense', 'recette')),

  -- Libellé affiché en français
  label_fr TEXT NOT NULL,

  -- Icône emoji pour l'UI
  icon_emoji TEXT NOT NULL,

  -- Nature fiscale (Mode Pro uniquement)
  fiscal_nature TEXT NOT NULL DEFAULT 'deductible_100' CHECK (fiscal_nature IN (
    'deductible_100',        -- Déductible à 100 %
    'deductible_partiel',    -- Déductible partiellement (avec plafond ou prorata)
    'non_deductible',        -- Non déductible
    'cotisation',            -- Cotisations sociales
    'investissement',        -- Bien amortissable
    'imposable_sans_tva',    -- Recette imposable sans TVA (ex: pourboire)
    'ca_imposable',          -- Chiffre d'affaires imposable classique
    'a_classer'              -- Catégorie "Divers" — parking temporaire
  )),

  -- Mapping au Plan Comptable Général français (Mode Pro uniquement)
  pcg_mapping TEXT,

  -- Taux de TVA applicable par défaut en métropole et DOM (nullable)
  tva_rate_metropole NUMERIC(4,2),
  tva_rate_dom NUMERIC(4,2),

  -- Ordre d'affichage dans l'UI (tri par display_order croissant dans la famille)
  display_order INT NOT NULL DEFAULT 100,

  -- Catégorie système (seed initial, non modifiable par l'utilisateur)
  is_system BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour retrouver rapidement les catégories d'une famille+type
CREATE INDEX IF NOT EXISTS idx_spark_compta_categories_family_type
  ON public.spark_compta_categories(family, type, display_order);

-- Activer RLS (lecture seule pour tous les utilisateurs authentifiés — policy dans 035)
ALTER TABLE public.spark_compta_categories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.spark_compta_categories IS 'Catégories fermées par famille métier — table de référence seed';
COMMENT ON COLUMN public.spark_compta_categories.code IS 'Code unique court utilisé par le bot pour classer automatiquement';
