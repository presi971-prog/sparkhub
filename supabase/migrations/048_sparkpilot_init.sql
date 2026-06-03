-- Migration 048 : initialisation SparkPilot
--
-- Pourquoi : SparkPilot est le copilote qui transforme un rapport SparkScan
-- (3 priorités stratégiques) en plan d'action concret avec des tâches
-- datées, classées par priorité, qu'on coche au fil de l'eau.
--
-- 3 tables :
--   - sparkpilot_plans     : un plan = un rapport SparkScan décomposé
--   - sparkpilot_tasks     : les tâches concrètes du plan (3-4 par priorité)
--   - sparkpilot_activity  : journal de bord (créations, complétions, reports)
--
-- Toutes les tables sont en RLS strict : un user ne voit que ses propres
-- plans / tâches / événements via auth.uid().

-- ============================================================
-- 1. sparkpilot_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS sparkpilot_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Le scan SparkScan source dont est issu le plan (1 plan = 1 scan).
  -- ON DELETE SET NULL : si le scan est purgé, on garde le plan en vie (les
  -- tâches restent valables même sans le rapport d'origine).
  scan_id uuid REFERENCES sparkscan_scans(id) ON DELETE SET NULL,

  -- Titre lisible (ex : "Plan DCG AI — Mai 2026"). Généré au moment de la
  -- création depuis le nom de l'entreprise + le mois en cours.
  title text NOT NULL,

  -- État du plan :
  --   active    : en cours, visible dans le dashboard
  --   archived  : mis de côté par le user, masqué par défaut
  --   completed : 100% des tâches sont 'done'
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'completed')),

  -- Bag jsonb pour stocker du contexte additionnel sans migration future
  -- (ex : entreprise, ville, langue, snapshot des 3 priorités au moment T).
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sparkpilot_plans_user_id_idx
  ON sparkpilot_plans(user_id);
CREATE INDEX IF NOT EXISTS sparkpilot_plans_created_at_idx
  ON sparkpilot_plans(created_at DESC);

ALTER TABLE sparkpilot_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkpilot_plans" ON sparkpilot_plans;
CREATE POLICY "Users read own sparkpilot_plans"
  ON sparkpilot_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkpilot_plans" ON sparkpilot_plans;
CREATE POLICY "Users insert own sparkpilot_plans"
  ON sparkpilot_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkpilot_plans" ON sparkpilot_plans;
CREATE POLICY "Users update own sparkpilot_plans"
  ON sparkpilot_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own sparkpilot_plans" ON sparkpilot_plans;
CREATE POLICY "Users delete own sparkpilot_plans"
  ON sparkpilot_plans FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkpilot_plans" ON sparkpilot_plans;
CREATE POLICY "Service role full access sparkpilot_plans"
  ON sparkpilot_plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 2. sparkpilot_tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS sparkpilot_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES sparkpilot_plans(id) ON DELETE CASCADE,

  -- Indique de quelle priorité stratégique (1, 2, 3) découle la tâche.
  -- Permet de regrouper visuellement les tâches par priorité dans l'UI
  -- (codes couleur indigo / honey / moss dans les mockups).
  priority_index smallint NOT NULL CHECK (priority_index BETWEEN 1 AND 3),

  -- Le titre est une action courte avec un verbe (ex : "Rédiger la FAQ ...").
  title text NOT NULL,

  -- Contexte (1-2 phrases) pour rappeler pourquoi cette tâche compte.
  description text,

  -- Date d'échéance (jour, pas heure — précision suffisante pour SparkPilot V1).
  due_date date,

  -- Durée estimée pour aider l'utilisateur à caler la tâche dans sa journée.
  estimated_duration_minutes integer,

  -- État de la tâche :
  --   todo         : à faire
  --   in_progress  : démarrée
  --   blocked      : bloquée par un truc extérieur
  --   done         : terminée
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),

  -- Mis à NOW() quand la tâche passe en 'done', NULL si elle est rouverte.
  completed_at timestamptz,

  -- Ordre manuel dans le plan (drag & drop futur). Plus petit = plus haut.
  order_index integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sparkpilot_tasks_plan_due_idx
  ON sparkpilot_tasks(plan_id, due_date);
CREATE INDEX IF NOT EXISTS sparkpilot_tasks_plan_status_idx
  ON sparkpilot_tasks(plan_id, status);

ALTER TABLE sparkpilot_tasks ENABLE ROW LEVEL SECURITY;

-- Sur tasks, on vérifie le user via le plan parent (les tasks n'ont pas de
-- user_id direct pour rester normalisé).
DROP POLICY IF EXISTS "Users read own sparkpilot_tasks" ON sparkpilot_tasks;
CREATE POLICY "Users read own sparkpilot_tasks"
  ON sparkpilot_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sparkpilot_plans p
      WHERE p.id = sparkpilot_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users insert own sparkpilot_tasks" ON sparkpilot_tasks;
CREATE POLICY "Users insert own sparkpilot_tasks"
  ON sparkpilot_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sparkpilot_plans p
      WHERE p.id = sparkpilot_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own sparkpilot_tasks" ON sparkpilot_tasks;
CREATE POLICY "Users update own sparkpilot_tasks"
  ON sparkpilot_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sparkpilot_plans p
      WHERE p.id = sparkpilot_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sparkpilot_plans p
      WHERE p.id = sparkpilot_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users delete own sparkpilot_tasks" ON sparkpilot_tasks;
CREATE POLICY "Users delete own sparkpilot_tasks"
  ON sparkpilot_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sparkpilot_plans p
      WHERE p.id = sparkpilot_tasks.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access sparkpilot_tasks" ON sparkpilot_tasks;
CREATE POLICY "Service role full access sparkpilot_tasks"
  ON sparkpilot_tasks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================================
-- 3. sparkpilot_activity
-- ============================================================
CREATE TABLE IF NOT EXISTS sparkpilot_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES sparkpilot_plans(id) ON DELETE CASCADE,

  -- Task optionnelle : pour les events de type plan_created, pas de task_id.
  task_id uuid REFERENCES sparkpilot_tasks(id) ON DELETE SET NULL,

  -- Type d'événement :
  --   plan_created    : le user a créé un plan depuis un rapport SparkScan
  --   task_created    : ajout manuel d'une tâche
  --   task_updated    : modification (titre, due_date, statut hors complete)
  --   task_completed  : tâche cochée comme faite
  --   task_reopened   : tâche décochée (passe de done à todo)
  --   task_deleted    : tâche supprimée
  event_type text NOT NULL,

  -- Détails additionnels (avant/après, contexte) pour reconstituer la story.
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sparkpilot_activity_user_idx
  ON sparkpilot_activity(user_id, created_at DESC);

ALTER TABLE sparkpilot_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own sparkpilot_activity" ON sparkpilot_activity;
CREATE POLICY "Users read own sparkpilot_activity"
  ON sparkpilot_activity FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkpilot_activity" ON sparkpilot_activity;
CREATE POLICY "Users insert own sparkpilot_activity"
  ON sparkpilot_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Volontairement pas d'UPDATE/DELETE côté user : le journal est append-only.
-- (On garde la possibilité côté service_role.)

DROP POLICY IF EXISTS "Service role full access sparkpilot_activity" ON sparkpilot_activity;
CREATE POLICY "Service role full access sparkpilot_activity"
  ON sparkpilot_activity FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
