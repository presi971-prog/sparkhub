-- ==============================================
-- GESTION DES DÉSABONNEMENTS
-- Période de grâce de 2 mois pour conserver le rang
-- ==============================================

-- Ajouter les colonnes de gestion du désabonnement sur profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'
  CHECK (subscription_status IN ('active', 'cancelled', 'inactive')),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

-- Table pour historiser les changements de tier (audit)
CREATE TABLE IF NOT EXISTS tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  previous_tier_id UUID REFERENCES tiers(id),
  new_tier_id UUID REFERENCES tiers(id),
  previous_rank INTEGER,
  new_rank INTEGER,
  reason TEXT NOT NULL, -- 'subscription', 'cancellation', 'grace_period_expired', 'resubscription'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_user_id ON tier_history(user_id);

-- Fonction appelée quand un utilisateur se désabonne
CREATE OR REPLACE FUNCTION handle_subscription_cancellation(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_current_tier_id UUID;
  v_current_rank INTEGER;
BEGIN
  -- Récupérer les infos actuelles
  SELECT tier_id, rank_number INTO v_current_tier_id, v_current_rank
  FROM profiles WHERE id = p_user_id;

  -- Mettre à jour le profil
  UPDATE profiles SET
    subscription_status = 'cancelled',
    cancelled_at = NOW(),
    grace_period_ends_at = NOW() + INTERVAL '2 months',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Réinitialiser les crédits d'abonnement
  UPDATE user_credits SET
    subscription_credits = 0,
    subscription_credits_reset_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Historiser
  INSERT INTO tier_history (user_id, previous_tier_id, new_tier_id, previous_rank, new_rank, reason)
  VALUES (p_user_id, v_current_tier_id, v_current_tier_id, v_current_rank, v_current_rank, 'cancellation');
END;
$$ LANGUAGE plpgsql;

-- Fonction appelée quand la période de grâce expire (cron job)
CREATE OR REPLACE FUNCTION process_expired_grace_periods()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- Traiter tous les utilisateurs dont la période de grâce a expiré
  FOR r IN
    SELECT id, tier_id, rank_number
    FROM profiles
    WHERE subscription_status = 'cancelled'
      AND grace_period_ends_at <= NOW()
  LOOP
    -- Passer en inactif et perdre le rang (le tier sera recalculé à la réinscription)
    UPDATE profiles SET
      tier_id = NULL,
      rank_number = NULL,
      subscription_status = 'inactive',
      cancelled_at = NULL,
      grace_period_ends_at = NULL,
      updated_at = NOW()
    WHERE id = r.id;

    -- Historiser la perte de rang
    INSERT INTO tier_history (user_id, previous_tier_id, new_tier_id, previous_rank, new_rank, reason)
    VALUES (r.id, r.tier_id, NULL, r.rank_number, NULL, 'grace_period_expired');
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour déterminer le tier selon le rang
CREATE OR REPLACE FUNCTION get_tier_for_rank(p_rank INTEGER)
RETURNS UUID AS $$
DECLARE
  v_tier_id UUID;
BEGIN
  SELECT id INTO v_tier_id FROM tiers
  WHERE p_rank >= min_rank
  ORDER BY min_rank DESC
  LIMIT 1;

  RETURN v_tier_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction appelée quand un utilisateur se réabonne
CREATE OR REPLACE FUNCTION handle_resubscription(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_current_status TEXT;
  v_current_tier_id UUID;
  v_current_rank INTEGER;
  v_grace_ends TIMESTAMPTZ;
  v_new_tier_id UUID;
  v_new_rank INTEGER;
  v_monthly_credits INTEGER;
BEGIN
  -- Récupérer les infos actuelles
  SELECT subscription_status, tier_id, rank_number, grace_period_ends_at
  INTO v_current_status, v_current_tier_id, v_current_rank, v_grace_ends
  FROM profiles WHERE id = p_user_id;

  IF v_current_status = 'cancelled' AND v_grace_ends > NOW() THEN
    -- Dans la période de grâce : récupère son tier
    UPDATE profiles SET
      subscription_status = 'active',
      cancelled_at = NULL,
      grace_period_ends_at = NULL,
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Historiser
    INSERT INTO tier_history (user_id, previous_tier_id, new_tier_id, previous_rank, new_rank, reason)
    VALUES (p_user_id, v_current_tier_id, v_current_tier_id, v_current_rank, v_current_rank, 'resubscription');

  ELSE
    -- Hors période de grâce : nouveau rang en fin de file
    SELECT COALESCE(MAX(rank_number), 0) + 1 INTO v_new_rank FROM profiles WHERE rank_number IS NOT NULL;

    -- Déterminer le tier correspondant au nouveau rang
    v_new_tier_id := get_tier_for_rank(v_new_rank);

    UPDATE profiles SET
      tier_id = v_new_tier_id,
      rank_number = v_new_rank,
      subscription_status = 'active',
      cancelled_at = NULL,
      grace_period_ends_at = NULL,
      updated_at = NOW()
    WHERE id = p_user_id;

    -- Historiser
    INSERT INTO tier_history (user_id, previous_tier_id, new_tier_id, previous_rank, new_rank, reason)
    VALUES (p_user_id, v_current_tier_id, v_new_tier_id, v_current_rank, v_new_rank, 'resubscription');
  END IF;

  -- Initialiser/réinitialiser les crédits
  SELECT monthly_credits INTO v_monthly_credits
  FROM tiers WHERE id = (SELECT tier_id FROM profiles WHERE id = p_user_id);

  INSERT INTO user_credits (user_id, subscription_credits, subscription_credits_reset_at)
  VALUES (p_user_id, v_monthly_credits, NOW() + INTERVAL '1 month')
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_credits = v_monthly_credits,
    subscription_credits_reset_at = NOW() + INTERVAL '1 month',
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS pour tier_history
ALTER TABLE tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tier history" ON tier_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage tier history" ON tier_history
  FOR ALL USING (auth.role() = 'service_role');
