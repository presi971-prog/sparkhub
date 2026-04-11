-- ============================================================================
-- Migration 028 — Spark Compta : spark_compta_conversations_messages
-- ============================================================================
-- Description : Messages individuels d'une conversation WhatsApp.
-- Stocke l'historique conversationnel pour la mémoire du bot.
-- Auteur      : Phase 2 Setup Infra — 11 avril 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spark_compta_conversations_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL REFERENCES public.spark_compta_conversations(id) ON DELETE CASCADE,

  -- Rôle : user (pro), assistant (bot), system (info interne)
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),

  -- Contenu textuel
  content TEXT NOT NULL,

  -- Type de contenu
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'image')),

  -- URL média si voice ou image (Supabase Storage)
  media_url TEXT,

  -- Métadonnées libres (intent détecté, transaction_id liée, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,

  -- Transaction éventuellement créée par ce message (bidirectionnel)
  transaction_id UUID REFERENCES public.spark_compta_transactions(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour récupérer rapidement l'historique d'une conversation (mémoire bot)
CREATE INDEX IF NOT EXISTS idx_spark_compta_conversations_messages_conv
  ON public.spark_compta_conversations_messages(conversation_id, created_at);

ALTER TABLE public.spark_compta_conversations_messages ENABLE ROW LEVEL SECURITY;

-- Policy : un message est accessible si sa conversation appartient au pro
DROP POLICY IF EXISTS "spark_compta_messages_all" ON public.spark_compta_conversations_messages;
CREATE POLICY "spark_compta_messages_all"
  ON public.spark_compta_conversations_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.spark_compta_conversations
      WHERE account_id IN (SELECT public.spark_compta_get_user_account_ids())
    )
  );

COMMENT ON TABLE public.spark_compta_conversations_messages IS 'Messages individuels d''une conversation WhatsApp (pour mémoire et audit)';
