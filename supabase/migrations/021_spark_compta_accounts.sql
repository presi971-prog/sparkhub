-- ============================================================================
-- Migration 021 — Spark Compta : spark_compta_accounts
-- ============================================================================
-- Description : Table principale qui représente le compte Spark Compta d'un
-- utilisateur (lié à son commerce SparkHub existant).
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rattachement au commerce SparkHub (table existante)
  commerce_id UUID NOT NULL REFERENCES public.commerces(id) ON DELETE CASCADE,

  -- Famille métier principale (obligatoire à l'onboarding)
  primary_family TEXT NOT NULL CHECK (primary_family IN (
    'rouleur',        -- livreur, taxi, VTC, coursier
    'mains_agiles',   -- artisan (plombier, électricien, maçon…)
    'tenancier',      -- restaurant, bar, commerce, coiffeur
    'cerveau',        -- formateur, consultant, coach pro
    'creatif',        -- photographe, vidéaste, artiste
    'hebergeur'       -- location saisonnière, gîte
  )),

  -- Familles secondaires (multi-casquette, optionnel)
  secondary_families TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Métier précis à l'intérieur de la famille (ex: "livreur", "plombier")
  specific_metier TEXT,

  -- Localisation fiscale
  localization TEXT NOT NULL DEFAULT 'metropole' CHECK (localization IN (
    'metropole', 'guadeloupe', 'martinique', 'reunion', 'guyane', 'mayotte'
  )),

  -- Régime fiscal
  fiscal_regime TEXT NOT NULL DEFAULT 'micro_bic' CHECK (fiscal_regime IN (
    'micro_bic', 'micro_bnc', 'bic_reel', 'bnc_reel', 'sarl', 'sasu', 'ei', 'lmnp', 'lmp'
  )),

  -- Assujetti TVA ou franchise en base
  is_tva_liable BOOLEAN NOT NULL DEFAULT false,

  -- Mode simple (gratuit) ou comptable (option payante Pro)
  mode TEXT NOT NULL DEFAULT 'simple' CHECK (mode IN ('simple', 'comptable')),

  -- Paramètres SLA et préférences (timing récaps, notifications…)
  sla_settings JSONB NOT NULL DEFAULT '{
    "daily_recap_enabled": false,
    "daily_recap_time": "20:00",
    "weekly_report_day": 0,
    "weekly_report_time": "19:00",
    "monthly_report_day": 1,
    "monthly_report_time": "08:00",
    "enable_inactivity_reminders": true
  }'::JSONB,

  -- Date de fin du wizard onboarding
  onboarding_completed_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un commerce ne peut avoir qu'un seul compte Spark Compta
  UNIQUE (commerce_id)
);

-- Index pour retrouver rapidement le compte à partir du commerce
CREATE INDEX IF NOT EXISTS idx_spark_compta_accounts_commerce_id
  ON public.spark_compta_accounts(commerce_id);

-- Index pour les stats par famille (pour le dashboard admin futur)
CREATE INDEX IF NOT EXISTS idx_spark_compta_accounts_primary_family
  ON public.spark_compta_accounts(primary_family);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.spark_compta_accounts_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER spark_compta_accounts_set_updated_at
  BEFORE UPDATE ON public.spark_compta_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.spark_compta_accounts_update_timestamp();

-- Activer RLS (les policies sont définies dans la migration 035)
ALTER TABLE public.spark_compta_accounts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.spark_compta_accounts IS 'Compte Spark Compta d''un utilisateur (lié à son commerce SparkHub)';
COMMENT ON COLUMN public.spark_compta_accounts.primary_family IS 'Famille métier principale parmi les 6 familles définies';
COMMENT ON COLUMN public.spark_compta_accounts.mode IS 'simple (gratuit) ou comptable (Mode Pro payant avec mapping PCG)';
