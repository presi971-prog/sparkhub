-- ============================================================================
-- Migration 033 — Spark Compta : spark_compta_alerts
-- ============================================================================
-- Description : Alertes intelligentes et rappels envoyés au pro par le bot.
-- Respecte la règle d'or Spark Compta : informer, alerter sur les risques,
-- ne JAMAIS conseiller sur la gestion interne du commerce.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Type d'alerte
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'seuil_plafond',           -- Approche d'un plafond fiscal (ex: 80% micro-BIC)
    'derive_categorie',        -- Une catégorie dérive de sa moyenne habituelle
    'inactivite',              -- Aucune action depuis X jours (relance douce)
    'palier_celebre',          -- Palier franchi (ex: 1000€, 3000€ net)
    'enveloppe_proche',        -- Enveloppe 150 actions à 80%+
    'facture_en_attente',      -- Facture non encaissée depuis N jours (Vendeurs de cerveau)
    'taxe_sejour_a_reverser',  -- Rappel taxe de séjour (Hébergeurs)
    'rappel_decennale'         -- Pas d'assurance décennale loggée depuis 12 mois (Mains agiles)
  )),

  -- Message de l'alerte (texte envoyé au pro)
  message TEXT NOT NULL,

  -- Sévérité (info/warning/critical)
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),

  -- Canal d'envoi
  sent_via TEXT NOT NULL CHECK (sent_via IN ('whatsapp', 'email', 'dashboard', 'push')),

  -- Statut de lecture
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Métadonnées contextuelles (valeurs chiffrées, période concernée, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour retrouver les alertes non lues d'un compte
CREATE INDEX IF NOT EXISTS idx_spark_compta_alerts_unread
  ON public.spark_compta_alerts(account_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_spark_compta_alerts_type
  ON public.spark_compta_alerts(account_id, alert_type, created_at DESC);

ALTER TABLE public.spark_compta_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spark_compta_alerts_all" ON public.spark_compta_alerts;
CREATE POLICY "spark_compta_alerts_all"
  ON public.spark_compta_alerts
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

COMMENT ON TABLE public.spark_compta_alerts IS 'Alertes intelligentes informatives (jamais de conseil sur la gestion interne)';
