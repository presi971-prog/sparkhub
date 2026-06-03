-- Migration 051 : chatbot coach contextuel SparkPilot
--
-- Pourquoi : SparkPilot devient un coach marketing disponible 24/7 en chat.
-- L'utilisateur (artisan, restaurateur, dentiste en Guadeloupe) doit pouvoir
-- poser des questions en direct, en contexte (dashboard / plan / tâche /
-- calendrier), sans avoir à passer par un humain ni quitter l'app.
--
-- 2 tables :
--   - sparkpilot_chat_sessions : un fil de conversation (messages jsonb)
--                                lié à un user, optionnellement à un plan
--                                et/ou une tâche, avec contexte URL.
--   - sparkpilot_chat_usage    : compteur quotidien par user pour appliquer
--                                la limite de 20 questions / jour et tracker
--                                le coût Claude réel.
--
-- RLS strict : un user ne voit/ne modifie QUE ses propres lignes.

-- ============================================================
-- 1. sparkpilot_chat_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS sparkpilot_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Le plan SparkPilot dans le contexte duquel la session a démarré.
  -- Optionnel : un user peut chatter depuis le dashboard ou le glossaire
  -- sans avoir de plan ciblé. ON DELETE SET NULL pour ne pas perdre
  -- l'historique chat si le plan est supprimé.
  plan_id uuid REFERENCES sparkpilot_plans(id) ON DELETE SET NULL,

  -- Idem pour la tâche : optionnelle, conservée même si la tâche est
  -- supprimée.
  task_id uuid REFERENCES sparkpilot_tasks(id) ON DELETE SET NULL,

  -- Historique complet de la conversation en jsonb.
  -- Format attendu (chaque entrée) :
  --   { "role": "user" | "assistant", "content": string, "created_at": ISO }
  -- On reste sur jsonb plutôt qu'une table messages séparée :
  --   - Plus simple à charger côté client (1 SELECT)
  --   - Pas de besoin de rechercher / agréger sur les messages individuels
  --   - Volume modeste (limite 20 questions / jour / user)
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- URL de la page où la session a démarré (ex: "/sparkpilot/plans/<id>").
  -- Utile pour le debug ("d'où venait l'user quand il a posé sa question ?")
  -- et pour l'analytics futur.
  context_url text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index principal : on charge presque toujours la session la plus récente
-- d'un user (route GET /api/sparkpilot/chat/sessions/latest).
CREATE INDEX IF NOT EXISTS sparkpilot_chat_sessions_user_created_idx
  ON sparkpilot_chat_sessions(user_id, created_at DESC);

ALTER TABLE sparkpilot_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkpilot_chat_sessions" ON sparkpilot_chat_sessions;
CREATE POLICY "Users read own sparkpilot_chat_sessions"
  ON sparkpilot_chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkpilot_chat_sessions" ON sparkpilot_chat_sessions;
CREATE POLICY "Users insert own sparkpilot_chat_sessions"
  ON sparkpilot_chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkpilot_chat_sessions" ON sparkpilot_chat_sessions;
CREATE POLICY "Users update own sparkpilot_chat_sessions"
  ON sparkpilot_chat_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sparkpilot_chat_sessions" ON sparkpilot_chat_sessions;
CREATE POLICY "Users delete own sparkpilot_chat_sessions"
  ON sparkpilot_chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkpilot_chat_sessions" ON sparkpilot_chat_sessions;
CREATE POLICY "Service role full access sparkpilot_chat_sessions"
  ON sparkpilot_chat_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 2. sparkpilot_chat_usage
-- ============================================================
-- Compteur quotidien par user (rolling sur le jour calendaire UTC).
-- PK composite (user_id, day) : 1 ligne par jour par user. On UPSERT à
-- chaque message envoyé.
CREATE TABLE IF NOT EXISTS sparkpilot_chat_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,

  -- Nombre de messages user envoyés ce jour (= nombre d'appels Claude).
  -- Sert à appliquer la limite hard de 20/jour.
  messages_count integer NOT NULL DEFAULT 0,

  -- Tokens cumulés (input + output) consommés ce jour. Pour reporting.
  tokens_used integer NOT NULL DEFAULT 0,

  -- Coût cumulé en USD sur la journée (pricing Sonnet 4.6 : $3/M in,
  -- $15/M out). Sert à surveiller la facture Anthropic en prod.
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, day)
);

-- Pas besoin d'index supplémentaire : la PK (user_id, day) est déjà
-- l'index principal pour le pattern d'accès "user × jour courant".

ALTER TABLE sparkpilot_chat_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkpilot_chat_usage" ON sparkpilot_chat_usage;
CREATE POLICY "Users read own sparkpilot_chat_usage"
  ON sparkpilot_chat_usage FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkpilot_chat_usage" ON sparkpilot_chat_usage;
CREATE POLICY "Users insert own sparkpilot_chat_usage"
  ON sparkpilot_chat_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkpilot_chat_usage" ON sparkpilot_chat_usage;
CREATE POLICY "Users update own sparkpilot_chat_usage"
  ON sparkpilot_chat_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkpilot_chat_usage" ON sparkpilot_chat_usage;
CREATE POLICY "Service role full access sparkpilot_chat_usage"
  ON sparkpilot_chat_usage FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 3. Trigger updated_at sur sparkpilot_chat_sessions
-- ============================================================
CREATE OR REPLACE FUNCTION sparkpilot_chat_sessions_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sparkpilot_chat_sessions_updated_at
  ON sparkpilot_chat_sessions;
CREATE TRIGGER trg_sparkpilot_chat_sessions_updated_at
  BEFORE UPDATE ON sparkpilot_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION sparkpilot_chat_sessions_set_updated_at();

CREATE OR REPLACE FUNCTION sparkpilot_chat_usage_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sparkpilot_chat_usage_updated_at
  ON sparkpilot_chat_usage;
CREATE TRIGGER trg_sparkpilot_chat_usage_updated_at
  BEFORE UPDATE ON sparkpilot_chat_usage
  FOR EACH ROW
  EXECUTE FUNCTION sparkpilot_chat_usage_set_updated_at();
