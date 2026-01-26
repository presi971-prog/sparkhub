-- ==============================================
-- COBEONE PRO - Initial Database Schema
-- ==============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ==============================================
-- ENUMS
-- ==============================================

CREATE TYPE user_role AS ENUM ('livreur', 'professionnel', 'admin');
CREATE TYPE tier_type AS ENUM ('platine', 'or', 'argent', 'bronze', 'standard');
CREATE TYPE vehicle_type AS ENUM ('scooter', 'moto', 'voiture', 'utilitaire', 'velo', 'velo_cargo');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
CREATE TYPE zone_type AS ENUM ('basse_terre', 'grande_terre', 'marie_galante', 'les_saintes', 'la_desirade');
CREATE TYPE credit_transaction_type AS ENUM ('purchase', 'spend', 'refund', 'bonus', 'referral');
CREATE TYPE badge_category AS ENUM ('debutant', 'progression', 'expert', 'special');

-- ==============================================
-- TIERS TABLE
-- ==============================================

CREATE TABLE tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name tier_type UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    max_places INTEGER NOT NULL,
    min_rank INTEGER NOT NULL,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    monthly_highlights INTEGER NOT NULL DEFAULT 0,
    highlight_duration_months INTEGER NOT NULL DEFAULT 0,
    promo_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    promo_duration_months INTEGER NOT NULL DEFAULT 0,
    regular_price DECIMAL(10,2) NOT NULL DEFAULT 39,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- PROFILES TABLE (extends auth.users)
-- ==============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'livreur',
    tier_id UUID REFERENCES tiers(id),
    rank_number INTEGER,
    points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for rank ordering
CREATE INDEX idx_profiles_rank ON profiles(rank_number);
CREATE INDEX idx_profiles_points ON profiles(points DESC);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ==============================================
-- LIVREURS TABLE
-- ==============================================

CREATE TABLE livreurs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_type vehicle_type NOT NULL,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    license_plate TEXT,
    siret TEXT,
    has_permit BOOLEAN DEFAULT FALSE,
    has_insurance BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

CREATE INDEX idx_livreurs_available ON livreurs(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_livreurs_verified ON livreurs(is_verified) WHERE is_verified = TRUE;

-- ==============================================
-- PROFESSIONNELS TABLE
-- ==============================================

CREATE TABLE professionnels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    siret TEXT,
    address TEXT,
    sector TEXT,
    description TEXT,
    delivery_needs JSONB DEFAULT '[]'::jsonb,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- ==============================================
-- COMMUNES TABLE (32 communes de Guadeloupe)
-- ==============================================

CREATE TABLE communes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    code_postal TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    zone zone_type NOT NULL,
    population INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communes_zone ON communes(zone);
CREATE INDEX idx_communes_coords ON communes USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- ==============================================
-- ZONES_LIVRAISON TABLE (livreur <-> communes)
-- ==============================================

CREATE TABLE zones_livraison (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livreur_id UUID NOT NULL REFERENCES livreurs(id) ON DELETE CASCADE,
    commune_id UUID NOT NULL REFERENCES communes(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(livreur_id, commune_id)
);

CREATE INDEX idx_zones_livreur ON zones_livraison(livreur_id);
CREATE INDEX idx_zones_commune ON zones_livraison(commune_id);

-- ==============================================
-- SUBSCRIPTIONS TABLE
-- ==============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES tiers(id),
    stripe_subscription_id TEXT,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- ==============================================
-- CREDITS TABLE
-- ==============================================

CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- ==============================================
-- CREDIT_TRANSACTIONS TABLE
-- ==============================================

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type credit_transaction_type NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_profile ON credit_transactions(profile_id);
CREATE INDEX idx_credit_tx_date ON credit_transactions(created_at DESC);

-- ==============================================
-- RESSOURCES TABLE
-- ==============================================

CREATE TABLE ressources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    url TEXT NOT NULL,
    category TEXT NOT NULL,
    credit_cost INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ressources_active ON ressources(is_active, order_index);
CREATE INDEX idx_ressources_category ON ressources(category);

-- ==============================================
-- BADGES TABLE
-- ==============================================

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category badge_category NOT NULL,
    points_reward INTEGER NOT NULL DEFAULT 0,
    condition_type TEXT NOT NULL,
    condition_value INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- PROFILE_BADGES TABLE (earned badges)
-- ==============================================

CREATE TABLE profile_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, badge_id)
);

CREATE INDEX idx_profile_badges_profile ON profile_badges(profile_id);

-- ==============================================
-- AVIS TABLE (reviews)
-- ==============================================

CREATE TABLE avis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_avis_to ON avis(to_profile_id);
CREATE INDEX idx_avis_from ON avis(from_profile_id);

-- ==============================================
-- GEOLOCALISATIONS TABLE (real-time positions)
-- ==============================================

CREATE TABLE geolocalisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    livreur_id UUID NOT NULL REFERENCES livreurs(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    heading DECIMAL(5, 2),
    speed DECIMAL(10, 2),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_livreur ON geolocalisations(livreur_id);
CREATE INDEX idx_geo_timestamp ON geolocalisations(timestamp DESC);
CREATE INDEX idx_geo_coords ON geolocalisations USING GIST (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-assign rank on profile creation
CREATE OR REPLACE FUNCTION assign_rank_number()
RETURNS TRIGGER AS $$
DECLARE
    next_rank INTEGER;
BEGIN
    IF NEW.rank_number IS NULL AND NEW.role = 'livreur' THEN
        SELECT COALESCE(MAX(rank_number), 0) + 1 INTO next_rank
        FROM profiles
        WHERE role = 'livreur';
        NEW.rank_number = next_rank;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-assign tier based on rank
CREATE OR REPLACE FUNCTION assign_tier_by_rank()
RETURNS TRIGGER AS $$
DECLARE
    tier_id_to_assign UUID;
BEGIN
    IF NEW.rank_number IS NOT NULL AND NEW.role = 'livreur' THEN
        IF NEW.rank_number <= 10 THEN
            SELECT id INTO tier_id_to_assign FROM tiers WHERE name = 'platine';
        ELSIF NEW.rank_number <= 30 THEN
            SELECT id INTO tier_id_to_assign FROM tiers WHERE name = 'or';
        ELSIF NEW.rank_number <= 60 THEN
            SELECT id INTO tier_id_to_assign FROM tiers WHERE name = 'argent';
        ELSIF NEW.rank_number <= 100 THEN
            SELECT id INTO tier_id_to_assign FROM tiers WHERE name = 'bronze';
        ELSE
            SELECT id INTO tier_id_to_assign FROM tiers WHERE name = 'standard';
        END IF;
        NEW.tier_id = tier_id_to_assign;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create initial credits for new profile
CREATE OR REPLACE FUNCTION create_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO credits (profile_id, balance, lifetime_earned, lifetime_spent)
    VALUES (NEW.id, 0, 0, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livreurs_updated_at
    BEFORE UPDATE ON livreurs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professionnels_updated_at
    BEFORE UPDATE ON professionnels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ressources_updated_at
    BEFORE UPDATE ON ressources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Rank assignment trigger
CREATE TRIGGER assign_rank_on_insert
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_rank_number();

-- Tier assignment trigger
CREATE TRIGGER assign_tier_on_insert
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_tier_by_rank();

CREATE TRIGGER assign_tier_on_update
    BEFORE UPDATE OF rank_number ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION assign_tier_by_rank();

-- Credits creation trigger
CREATE TRIGGER create_credits_on_profile_insert
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_credits();

-- ==============================================
-- ENABLE REALTIME
-- ==============================================

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE geolocalisations;
ALTER PUBLICATION supabase_realtime ADD TABLE livreurs;
