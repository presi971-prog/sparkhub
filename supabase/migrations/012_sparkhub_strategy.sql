-- ============================================================
-- Migration 012: SparkHub Strategy Implementation
-- Adds: Founders system, Cobeone validation, Points system, Gamification
-- ============================================================

-- ============================================================
-- 1. NEW ENUMS
-- ============================================================

-- Founder types
CREATE TYPE founder_type AS ENUM ('platine', 'or', 'argent', 'bronze');

-- Gamification levels
CREATE TYPE gamification_level AS ENUM ('debutant', 'regulier', 'expert', 'legende');

-- Registration status
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Cobeone app type
CREATE TYPE cobeone_type AS ENUM ('prestataire', 'commerce');

-- ============================================================
-- 2. ALTER PROFILES TABLE
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cobeone_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cobeone_app cobeone_type;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP;

-- Founder fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founder_status founder_type;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS founder_expires_at TIMESTAMP;

-- Points system (2 counters)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_points INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_points_reset_at TIMESTAMP DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cumulated_points INT DEFAULT 0;

-- Gamification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gam_level gamification_level DEFAULT 'debutant';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_discount INT DEFAULT 0;

-- ============================================================
-- 3. FOUNDER SLOTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS founder_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type user_role NOT NULL, -- 'livreur' ou 'professionnel'
  slot_number INT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP,

  UNIQUE(user_type, slot_number)
);

-- Create 100 slots for livreurs
INSERT INTO founder_slots (user_type, slot_number)
SELECT 'livreur'::user_role, generate_series(1, 100)
ON CONFLICT DO NOTHING;

-- Create 100 slots for professionnels
INSERT INTO founder_slots (user_type, slot_number)
SELECT 'professionnel'::user_role, generate_series(1, 100)
ON CONFLICT DO NOTHING;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_founder_slots_available
ON founder_slots (user_type, slot_number)
WHERE profile_id IS NULL;

-- ============================================================
-- 4. PENDING REGISTRATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  cobeone_id TEXT NOT NULL,
  cobeone_app cobeone_type NOT NULL,
  user_type user_role NOT NULL,

  -- Livreur specific
  vehicle_type vehicle_type,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  license_plate TEXT,
  zones TEXT[],

  -- Pro specific
  company_name TEXT,
  siret TEXT,
  address TEXT,
  sector TEXT,

  -- Status
  status registration_status DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for pending registrations
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status
ON pending_registrations (status)
WHERE status = 'pending';

-- ============================================================
-- 5. POINTS HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INT NOT NULL,
  action TEXT NOT NULL, -- 'credit_purchase', 'tool_usage', 'referral', 'review', 'profile_complete', 'daily_login'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for user history
CREATE INDEX IF NOT EXISTS idx_points_history_profile
ON points_history (profile_id, created_at DESC);

-- ============================================================
-- 6. DISCOUNT THRESHOLDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS discount_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_discount INT NOT NULL, -- Current discount level (0, 10, 20, 30)
  target_discount INT NOT NULL, -- Target discount level
  points_required INT NOT NULL -- Monthly points needed
);

-- Insert threshold grid
INSERT INTO discount_thresholds (base_discount, target_discount, points_required) VALUES
  -- From 0% base
  (0, 20, 150),
  (0, 30, 300),
  (0, 50, 500),
  -- From 10% base (Bronze)
  (10, 20, 100),
  (10, 30, 200),
  (10, 50, 400),
  -- From 20% base (Argent / Régulier)
  (20, 30, 150),
  (20, 50, 300),
  -- From 30% base (Or / Expert)
  (30, 50, 150)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. FUNCTION: Add Points
-- ============================================================

CREATE OR REPLACE FUNCTION add_points(
  p_profile_id UUID,
  p_points INT,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Add to history
  INSERT INTO points_history (profile_id, points, action, description)
  VALUES (p_profile_id, p_points, p_action, p_description);

  -- Update both counters + recalculate gamification level
  UPDATE profiles
  SET
    monthly_points = monthly_points + p_points,
    cumulated_points = cumulated_points + p_points,
    gam_level = CASE
      WHEN cumulated_points + p_points >= 5000 THEN 'legende'::gamification_level
      WHEN cumulated_points + p_points >= 1500 THEN 'expert'::gamification_level
      WHEN cumulated_points + p_points >= 500 THEN 'regulier'::gamification_level
      ELSE 'debutant'::gamification_level
    END
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. FUNCTION: Claim Founder Slot
-- ============================================================

CREATE OR REPLACE FUNCTION claim_founder_slot(
  p_profile_id UUID,
  p_user_type user_role
)
RETURNS TABLE(
  success BOOLEAN,
  slot_number INT,
  founder_status TEXT
) AS $$
DECLARE
  v_slot_number INT;
  v_founder_status founder_type;
BEGIN
  -- Find first available slot
  SELECT fs.slot_number INTO v_slot_number
  FROM founder_slots fs
  WHERE fs.user_type = p_user_type
    AND fs.profile_id IS NULL
  ORDER BY fs.slot_number
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No slot available
  IF v_slot_number IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INT, NULL::TEXT;
    RETURN;
  END IF;

  -- Determine founder type
  v_founder_status := CASE
    WHEN v_slot_number <= 10 THEN 'platine'::founder_type
    WHEN v_slot_number <= 30 THEN 'or'::founder_type
    WHEN v_slot_number <= 60 THEN 'argent'::founder_type
    ELSE 'bronze'::founder_type
  END;

  -- Claim the slot
  UPDATE founder_slots
  SET profile_id = p_profile_id, claimed_at = NOW()
  WHERE user_type = p_user_type AND slot_number = v_slot_number;

  -- Update profile
  UPDATE profiles
  SET
    is_founder = TRUE,
    founder_status = v_founder_status,
    registration_rank = v_slot_number,
    founder_expires_at = NOW() + INTERVAL '1 year',
    current_discount = CASE v_founder_status
      WHEN 'platine' THEN 50
      WHEN 'or' THEN 30
      WHEN 'argent' THEN 20
      WHEN 'bronze' THEN 10
    END
  WHERE id = p_profile_id;

  RETURN QUERY SELECT TRUE, v_slot_number, v_founder_status::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. FUNCTION: Get Available Founder Slots
-- ============================================================

CREATE OR REPLACE FUNCTION get_available_founder_slots()
RETURNS TABLE(
  user_type user_role,
  total_slots INT,
  claimed_slots BIGINT,
  available_slots BIGINT,
  platine_available BIGINT,
  or_available BIGINT,
  argent_available BIGINT,
  bronze_available BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.user_type,
    100 AS total_slots,
    COUNT(fs.profile_id) AS claimed_slots,
    (100 - COUNT(fs.profile_id)) AS available_slots,
    COUNT(*) FILTER (WHERE fs.slot_number <= 10 AND fs.profile_id IS NULL) AS platine_available,
    COUNT(*) FILTER (WHERE fs.slot_number > 10 AND fs.slot_number <= 30 AND fs.profile_id IS NULL) AS or_available,
    COUNT(*) FILTER (WHERE fs.slot_number > 30 AND fs.slot_number <= 60 AND fs.profile_id IS NULL) AS argent_available,
    COUNT(*) FILTER (WHERE fs.slot_number > 60 AND fs.profile_id IS NULL) AS bronze_available
  FROM founder_slots fs
  GROUP BY fs.user_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. FUNCTION: Calculate Next Month Discount
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_next_month_discount(
  p_profile_id UUID,
  p_monthly_points INT
)
RETURNS INT AS $$
DECLARE
  v_base_discount INT;
  v_max_achieved INT;
BEGIN
  -- Get base discount
  SELECT
    CASE
      WHEN is_founder AND founder_expires_at > NOW() THEN
        CASE founder_status
          WHEN 'platine' THEN 50
          WHEN 'or' THEN 30
          WHEN 'argent' THEN 20
          WHEN 'bronze' THEN 10
          ELSE 0
        END
      ELSE
        CASE gam_level
          WHEN 'legende' THEN 50
          WHEN 'expert' THEN 30
          WHEN 'regulier' THEN 20
          WHEN 'debutant' THEN 10
          ELSE 0
        END
    END INTO v_base_discount
  FROM profiles
  WHERE id = p_profile_id;

  -- Already at max
  IF v_base_discount >= 50 THEN
    RETURN 50;
  END IF;

  -- Find best achievable discount
  SELECT COALESCE(MAX(target_discount), v_base_discount) INTO v_max_achieved
  FROM discount_thresholds
  WHERE base_discount = v_base_discount
    AND points_required <= p_monthly_points;

  RETURN v_max_achieved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. FUNCTION: Reset Monthly Points
-- ============================================================

CREATE OR REPLACE FUNCTION reset_monthly_points()
RETURNS void AS $$
BEGIN
  -- Calculate next month discount BEFORE reset
  UPDATE profiles
  SET current_discount = calculate_next_month_discount(id, monthly_points)
  WHERE monthly_points > 0;

  -- Reset monthly points
  UPDATE profiles
  SET
    monthly_points = 0,
    monthly_points_reset_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. FUNCTION: Check Founder Expiration
-- ============================================================

CREATE OR REPLACE FUNCTION check_founder_expiration()
RETURNS void AS $$
BEGIN
  -- Expired founders switch to gamification-based discount
  UPDATE profiles
  SET
    is_founder = FALSE,
    founder_status = NULL,
    founder_expires_at = NULL,
    current_discount = CASE gam_level
      WHEN 'legende' THEN 50
      WHEN 'expert' THEN 30
      WHEN 'regulier' THEN 20
      WHEN 'debutant' THEN 10
      ELSE 0
    END
  WHERE is_founder = TRUE
    AND founder_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 13. FUNCTION: Check and Award Badges
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_award_badges(p_profile_id UUID)
RETURNS TABLE(
  badge_id UUID,
  badge_name TEXT,
  newly_awarded BOOLEAN
) AS $$
DECLARE
  v_badge RECORD;
  v_count INT;
  v_has_badge BOOLEAN;
BEGIN
  FOR v_badge IN SELECT * FROM badges LOOP
    -- Check if badge already earned
    SELECT EXISTS(
      SELECT 1 FROM profile_badges
      WHERE profile_id = p_profile_id AND badge_id = v_badge.id
    ) INTO v_has_badge;

    IF NOT v_has_badge THEN
      -- Check condition based on badge category and name
      CASE
        -- Account created (Nouveau membre)
        WHEN v_badge.name = 'Nouveau membre' THEN
          v_count := 1;

        -- Profile complete
        WHEN v_badge.name = 'Profil complété' THEN
          SELECT
            CASE WHEN full_name IS NOT NULL AND phone IS NOT NULL AND avatar_url IS NOT NULL
            THEN 100 ELSE 0 END
          INTO v_count FROM profiles WHERE id = p_profile_id;

        -- Tool usage badges
        WHEN v_badge.name = 'Premier outil' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'tool_usage';

        WHEN v_badge.name = 'Accro aux outils' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'tool_usage';
          IF v_count < 50 THEN v_count := 0; END IF;

        -- Consecutive days
        WHEN v_badge.name = 'Fidèle 7 jours' THEN
          SELECT COUNT(DISTINCT DATE(created_at)) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id
            AND action = 'daily_login'
            AND created_at > NOW() - INTERVAL '7 days';

        WHEN v_badge.name = 'Fidèle 30 jours' THEN
          SELECT COUNT(DISTINCT DATE(created_at)) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id
            AND action = 'daily_login'
            AND created_at > NOW() - INTERVAL '30 days';

        -- Credits purchased
        WHEN v_badge.name = 'Gros consommateur' THEN
          SELECT COALESCE(SUM(
            CASE WHEN action = 'credit_purchase' THEN points / 3 ELSE 0 END
          ), 0) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id;
          IF v_count < 500 THEN v_count := 0; END IF;

        -- Referrals
        WHEN v_badge.name = 'Premier parrain' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'referral';

        WHEN v_badge.name = 'Super parrain' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'referral';
          IF v_count < 10 THEN v_count := 0; END IF;

        -- Reviews
        WHEN v_badge.name = 'Bien noté' THEN
          SELECT COUNT(*) INTO v_count
          FROM avis
          WHERE to_profile_id = p_profile_id AND rating >= 4;
          IF v_count < 5 THEN v_count := 0; END IF;

        WHEN v_badge.name = 'Star' THEN
          SELECT COUNT(*) INTO v_count
          FROM avis
          WHERE to_profile_id = p_profile_id AND rating >= 4;
          IF v_count < 20 THEN v_count := 0; END IF;

        -- Level reached
        WHEN v_badge.name = 'Légende' THEN
          SELECT cumulated_points INTO v_count
          FROM profiles WHERE id = p_profile_id;
          IF v_count < 5000 THEN v_count := 0; END IF;

        -- Founder
        WHEN v_badge.name = 'Fondateur' THEN
          SELECT CASE WHEN is_founder THEN 1 ELSE 0 END INTO v_count
          FROM profiles WHERE id = p_profile_id;

        ELSE
          v_count := 0;
      END CASE;

      -- Award badge if condition met
      IF v_count > 0 THEN
        INSERT INTO profile_badges (profile_id, badge_id)
        VALUES (p_profile_id, v_badge.id)
        ON CONFLICT (profile_id, badge_id) DO NOTHING;

        -- Add points for earning badge
        IF v_badge.points_reward > 0 THEN
          PERFORM add_points(p_profile_id, v_badge.points_reward, 'badge_earned', v_badge.name);
        END IF;

        RETURN QUERY SELECT v_badge.id, v_badge.name, TRUE;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 14. TRIGGER: Check Badges After Points
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_points_insert ON points_history;
CREATE TRIGGER after_points_insert
AFTER INSERT ON points_history
FOR EACH ROW
EXECUTE FUNCTION trigger_check_badges();

-- ============================================================
-- 15. RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE founder_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_thresholds ENABLE ROW LEVEL SECURITY;

-- Founder slots: public read, no direct write
CREATE POLICY "Anyone can view founder slots"
ON founder_slots FOR SELECT
USING (true);

-- Pending registrations: only admins
CREATE POLICY "Admins can view pending registrations"
ON pending_registrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update pending registrations"
ON pending_registrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Anyone can insert (registration)
CREATE POLICY "Anyone can register"
ON pending_registrations FOR INSERT
WITH CHECK (true);

-- Points history: users see their own
CREATE POLICY "Users can view own points history"
ON points_history FOR SELECT
USING (profile_id = auth.uid());

-- Discount thresholds: public read
CREATE POLICY "Anyone can view discount thresholds"
ON discount_thresholds FOR SELECT
USING (true);

-- ============================================================
-- 16. INSERT NEW BADGES (if not exist)
-- ============================================================

INSERT INTO badges (name, description, icon, category, points_reward) VALUES
  ('Nouveau membre', 'Bienvenue sur SparkHub !', '🎉', 'debutant', 10),
  ('Profil complété', 'Votre profil est complet à 100%', '✅', 'debutant', 50),
  ('Premier outil', 'Vous avez utilisé votre premier outil IA', '🛠️', 'debutant', 20),
  ('Fidèle 7 jours', 'Connecté 7 jours de suite', '📅', 'progression', 30),
  ('Fidèle 30 jours', 'Connecté 30 jours de suite', '🔥', 'progression', 100),
  ('Accro aux outils', 'Vous avez utilisé 50 outils', '⚡', 'expert', 50),
  ('Gros consommateur', 'Vous avez acheté 500 crédits', '💰', 'expert', 50),
  ('Premier parrain', 'Vous avez parrainé votre première personne', '🤝', 'progression', 30),
  ('Super parrain', 'Vous avez parrainé 10 personnes', '🌟', 'expert', 100),
  ('Bien noté', 'Vous avez reçu 5 avis positifs', '👍', 'progression', 30),
  ('Star', 'Vous avez reçu 20 avis positifs', '⭐', 'expert', 100),
  ('Légende', 'Vous avez atteint le niveau Légende', '👑', 'special', 200),
  ('Fondateur', 'Vous faites partie des 200 premiers', '🏆', 'special', 100),
  ('Top mensuel', 'Vous êtes #1 du mois', '🥇', 'special', 150)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DONE
-- ============================================================
