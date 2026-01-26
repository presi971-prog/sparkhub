-- ==============================================
-- SYSTÈME DE CRÉDITS À DEUX NIVEAUX
-- 1. Crédits abonnement : remis à zéro chaque mois, utilisés en premier
-- 2. Crédits achetés : persistent indéfiniment, coût 2x quand utilisés
-- ==============================================

-- Table des soldes de crédits utilisateur
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Crédits de l'abonnement (remis à zéro chaque mois)
  subscription_credits INTEGER NOT NULL DEFAULT 0,
  subscription_credits_reset_at TIMESTAMPTZ, -- Prochaine date de reset

  -- Crédits achetés (persistent indéfiniment)
  purchased_credits INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Table des transactions de crédits (historique)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type de transaction
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'subscription_credit',    -- Crédits mensuels reçus
    'subscription_reset',     -- Reset mensuel (mise à zéro)
    'purchase',               -- Achat de crédits
    'usage_subscription',     -- Utilisation de crédits abonnement
    'usage_purchased'         -- Utilisation de crédits achetés (2x coût)
  )),

  -- Montants
  amount INTEGER NOT NULL,           -- Positif pour crédit, négatif pour débit
  credit_cost INTEGER,               -- Coût en crédits de l'opération (pour usage)
  effective_cost INTEGER,            -- Coût effectif (2x pour crédits achetés)

  -- Détails de l'utilisation
  tool_id TEXT,                      -- ID de l'outil utilisé (si usage)
  tool_name TEXT,                    -- Nom de l'outil

  -- Soldes après transaction
  subscription_balance_after INTEGER,
  purchased_balance_after INTEGER,

  -- Référence à l'achat (si purchase)
  payment_id TEXT,

  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des achats de crédits
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  credits_amount INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,      -- Prix en centimes
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);

-- Fonction pour initialiser les crédits d'un utilisateur
CREATE OR REPLACE FUNCTION initialize_user_credits(p_user_id UUID, p_monthly_credits INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO user_credits (user_id, subscription_credits, subscription_credits_reset_at, purchased_credits)
  VALUES (
    p_user_id,
    p_monthly_credits,
    NOW() + INTERVAL '1 month',
    0
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour utiliser des crédits (priorise les crédits abonnement)
-- Retourne true si succès, false si pas assez de crédits
CREATE OR REPLACE FUNCTION use_credits(
  p_user_id UUID,
  p_tool_id TEXT,
  p_tool_name TEXT,
  p_credit_cost INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub_credits INTEGER;
  v_purchased_credits INTEGER;
  v_sub_used INTEGER := 0;
  v_purchased_used INTEGER := 0;
  v_effective_cost INTEGER := 0;
BEGIN
  -- Récupérer les soldes actuels
  SELECT subscription_credits, purchased_credits
  INTO v_sub_credits, v_purchased_credits
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Calculer comment utiliser les crédits
  IF v_sub_credits >= p_credit_cost THEN
    -- Assez de crédits abonnement
    v_sub_used := p_credit_cost;
    v_effective_cost := p_credit_cost;
  ELSIF v_sub_credits > 0 THEN
    -- Utiliser tous les crédits abonnement + compléter avec achetés (2x)
    v_sub_used := v_sub_credits;
    v_purchased_used := p_credit_cost - v_sub_credits;

    -- Vérifier s'il y a assez de crédits achetés
    IF v_purchased_credits < v_purchased_used THEN
      RETURN FALSE;
    END IF;

    v_effective_cost := v_sub_used + (v_purchased_used * 2);
  ELSE
    -- Que des crédits achetés (coût 2x)
    v_purchased_used := p_credit_cost;

    IF v_purchased_credits < v_purchased_used THEN
      RETURN FALSE;
    END IF;

    v_effective_cost := v_purchased_used * 2;
  END IF;

  -- Mettre à jour les soldes
  UPDATE user_credits
  SET
    subscription_credits = subscription_credits - v_sub_used,
    purchased_credits = purchased_credits - v_purchased_used,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Enregistrer les transactions
  IF v_sub_used > 0 THEN
    INSERT INTO credit_transactions (
      user_id, transaction_type, amount, credit_cost, effective_cost,
      tool_id, tool_name, subscription_balance_after, purchased_balance_after,
      description
    )
    VALUES (
      p_user_id, 'usage_subscription', -v_sub_used, v_sub_used, v_sub_used,
      p_tool_id, p_tool_name, v_sub_credits - v_sub_used, v_purchased_credits - v_purchased_used,
      'Utilisation de ' || p_tool_name
    );
  END IF;

  IF v_purchased_used > 0 THEN
    INSERT INTO credit_transactions (
      user_id, transaction_type, amount, credit_cost, effective_cost,
      tool_id, tool_name, subscription_balance_after, purchased_balance_after,
      description
    )
    VALUES (
      p_user_id, 'usage_purchased', -v_purchased_used, v_purchased_used, v_purchased_used * 2,
      p_tool_id, p_tool_name, v_sub_credits - v_sub_used, v_purchased_credits - v_purchased_used,
      'Utilisation de ' || p_tool_name || ' (crédits achetés, coût 2x)'
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour reset mensuel des crédits (appelée par cron)
CREATE OR REPLACE FUNCTION reset_monthly_subscription_credits()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT uc.user_id, uc.subscription_credits, t.monthly_credits
    FROM user_credits uc
    JOIN profiles p ON p.id = uc.user_id
    JOIN tiers t ON t.id = p.tier_id
    WHERE uc.subscription_credits_reset_at <= NOW()
  LOOP
    -- Log de reset si des crédits restaient
    IF r.subscription_credits > 0 THEN
      INSERT INTO credit_transactions (
        user_id, transaction_type, amount,
        subscription_balance_after, purchased_balance_after,
        description
      )
      SELECT
        r.user_id, 'subscription_reset', -r.subscription_credits,
        0, uc.purchased_credits,
        'Reset mensuel - ' || r.subscription_credits || ' crédits perdus'
      FROM user_credits uc WHERE uc.user_id = r.user_id;
    END IF;

    -- Reset des crédits au maximum du tier
    UPDATE user_credits
    SET
      subscription_credits = r.monthly_credits,
      subscription_credits_reset_at = NOW() + INTERVAL '1 month',
      updated_at = NOW()
    WHERE user_id = r.user_id;

    -- Log des nouveaux crédits
    INSERT INTO credit_transactions (
      user_id, transaction_type, amount,
      subscription_balance_after, purchased_balance_after,
      description
    )
    SELECT
      r.user_id, 'subscription_credit', r.monthly_credits,
      r.monthly_credits, uc.purchased_credits,
      'Crédits mensuels reçus'
    FROM user_credits uc WHERE uc.user_id = r.user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour ajouter des crédits achetés
CREATE OR REPLACE FUNCTION add_purchased_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_payment_id TEXT
)
RETURNS void AS $$
DECLARE
  v_sub_credits INTEGER;
  v_purchased_credits INTEGER;
BEGIN
  -- Mettre à jour le solde
  UPDATE user_credits
  SET
    purchased_credits = purchased_credits + p_credits,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING subscription_credits, purchased_credits
  INTO v_sub_credits, v_purchased_credits;

  -- Log de la transaction
  INSERT INTO credit_transactions (
    user_id, transaction_type, amount, payment_id,
    subscription_balance_after, purchased_balance_after,
    description
  )
  VALUES (
    p_user_id, 'purchase', p_credits, p_payment_id,
    v_sub_credits, v_purchased_credits,
    'Achat de ' || p_credits || ' crédits'
  );
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Utilisateurs peuvent voir leurs propres données
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own purchases" ON credit_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Seul le service peut modifier (via fonctions)
CREATE POLICY "Service can manage credits" ON user_credits
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage transactions" ON credit_transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage purchases" ON credit_purchases
  FOR ALL USING (auth.role() = 'service_role');
