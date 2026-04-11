-- ============================================================================
-- Migration 027 — Spark Compta : spark_compta_conversations
-- ============================================================================
-- Description : Sessions conversationnelles WhatsApp entre le pro et le bot.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  account_id UUID NOT NULL REFERENCES public.spark_compta_accounts(id) ON DELETE CASCADE,

  -- Numéro WhatsApp du pro (pour retrouver la conversation)
  whatsapp_phone TEXT NOT NULL,

  -- Mode de la conversation : carnet (le pro logge sa compta) ou reception_client (assistant-whatsapp legacy)
  mode TEXT NOT NULL DEFAULT 'carnet' CHECK (mode IN ('carnet', 'reception_client')),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spark_compta_conversations_account
  ON public.spark_compta_conversations(account_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_spark_compta_conversations_phone
  ON public.spark_compta_conversations(whatsapp_phone, status);

ALTER TABLE public.spark_compta_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "spark_compta_conversations_all" ON public.spark_compta_conversations;
CREATE POLICY "spark_compta_conversations_all"
  ON public.spark_compta_conversations
  FOR ALL
  USING (account_id IN (SELECT public.spark_compta_get_user_account_ids()));

COMMENT ON TABLE public.spark_compta_conversations IS 'Sessions conversationnelles WhatsApp pro ↔ bot';
