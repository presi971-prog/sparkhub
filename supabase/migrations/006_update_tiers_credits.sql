-- ==============================================
-- MISE À JOUR DU SYSTÈME DE TIERS
-- Prix unique 9€/mois, différenciation par crédits
-- PAS de bonus crédits à l'inscription
-- ==============================================

-- Mise à jour des tiers existants
UPDATE tiers SET
  max_places = 10,
  min_rank = 1,
  discount_percent = 0,
  monthly_credits = 200,
  credits_validity_months = NULL, -- Illimités
  bonus_credits = 0,
  promo_price = 9.00,
  promo_duration_months = 0,
  regular_price = 9.00,
  features = '["200 crédits/mois (valeur max)", "Crédits sans expiration", "Accès à tous les outils IA", "Support prioritaire 24/7", "Badge Platine exclusif"]'::jsonb
WHERE name = 'platine';

UPDATE tiers SET
  max_places = 20,
  min_rank = 11,
  discount_percent = 0,
  monthly_credits = 150,
  credits_validity_months = 12,
  bonus_credits = 0,
  promo_price = 9.00,
  promo_duration_months = 0,
  regular_price = 9.00,
  features = '["150 crédits/mois", "Crédits valides 12 mois", "Accès à tous les outils IA", "Support prioritaire", "Badge Or exclusif"]'::jsonb
WHERE name = 'or';

UPDATE tiers SET
  max_places = 30,
  min_rank = 31,
  discount_percent = 0,
  monthly_credits = 100,
  credits_validity_months = 6,
  bonus_credits = 0,
  promo_price = 9.00,
  promo_duration_months = 0,
  regular_price = 9.00,
  features = '["100 crédits/mois", "Crédits valides 6 mois", "Accès à tous les outils IA", "Support standard", "Badge Argent"]'::jsonb
WHERE name = 'argent';

UPDATE tiers SET
  max_places = 40,
  min_rank = 61,
  discount_percent = 0,
  monthly_credits = 75,
  credits_validity_months = 3,
  bonus_credits = 0,
  promo_price = 9.00,
  promo_duration_months = 0,
  regular_price = 9.00,
  features = '["75 crédits/mois", "Crédits valides 3 mois", "Accès à tous les outils IA", "Support standard", "Badge Bronze"]'::jsonb
WHERE name = 'bronze';

UPDATE tiers SET
  max_places = 99999,
  min_rank = 101,
  discount_percent = 0,
  monthly_credits = 50,
  credits_validity_months = 1,
  bonus_credits = 0,
  promo_price = 9.00,
  promo_duration_months = 0,
  regular_price = 9.00,
  features = '["50 crédits/mois", "Crédits valides 1 mois", "Accès à tous les outils IA", "Support standard"]'::jsonb
WHERE name = 'standard';

-- Ajouter les colonnes si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiers' AND column_name = 'monthly_credits') THEN
    ALTER TABLE tiers ADD COLUMN monthly_credits INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiers' AND column_name = 'credits_validity_months') THEN
    ALTER TABLE tiers ADD COLUMN credits_validity_months INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiers' AND column_name = 'bonus_credits') THEN
    ALTER TABLE tiers ADD COLUMN bonus_credits INTEGER DEFAULT 0;
  END IF;
END $$;
