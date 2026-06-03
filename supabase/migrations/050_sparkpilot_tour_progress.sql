-- Migration 050 : tutoriel interactif SparkPilot (Driver.js)
--
-- Pourquoi : au premier login dans SparkPilot, un user non-tech doit pouvoir
-- comprendre l'app en 5 minutes sans aide humaine. Le composant
-- <SparkPilotTour /> lance automatiquement une visite guidée sur chaque
-- écran principal (dashboard, plan détail, calendrier, glossaire frameworks).
-- Cette table mémorise quels écrans ont déjà été "vus" pour ne pas relancer
-- le tour à chaque visite.
--
-- 1 ligne par user (PK = user_id). 4 booléens : un par écran. Le user peut
-- toujours relancer un tour manuellement via le bouton "?" persistant
-- (HelpButton), qui ignore ces booléens.

CREATE TABLE IF NOT EXISTS sparkpilot_tour_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Un booléen par écran principal de SparkPilot. Passe à TRUE quand le user
  -- a vu le tour de cet écran (auto au premier passage, ou manuel via bouton "?").
  dashboard_done boolean NOT NULL DEFAULT false,
  plan_done boolean NOT NULL DEFAULT false,
  calendrier_done boolean NOT NULL DEFAULT false,
  frameworks_done boolean NOT NULL DEFAULT false,

  -- Dernier moment où un tour a été marqué "done" (utile pour analytics futurs :
  -- combien de temps un user met à découvrir toutes les surfaces).
  last_completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sparkpilot_tour_progress ENABLE ROW LEVEL SECURITY;

-- RLS strict : un user ne voit / ne modifie QUE sa propre ligne.
DROP POLICY IF EXISTS "Users read own sparkpilot_tour_progress" ON sparkpilot_tour_progress;
CREATE POLICY "Users read own sparkpilot_tour_progress"
  ON sparkpilot_tour_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sparkpilot_tour_progress" ON sparkpilot_tour_progress;
CREATE POLICY "Users insert own sparkpilot_tour_progress"
  ON sparkpilot_tour_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sparkpilot_tour_progress" ON sparkpilot_tour_progress;
CREATE POLICY "Users update own sparkpilot_tour_progress"
  ON sparkpilot_tour_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access sparkpilot_tour_progress" ON sparkpilot_tour_progress;
CREATE POLICY "Service role full access sparkpilot_tour_progress"
  ON sparkpilot_tour_progress FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
