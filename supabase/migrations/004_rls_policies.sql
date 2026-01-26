-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE livreurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones_livraison ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ressources ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE geolocalisations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PROFILES POLICIES
-- ==============================================

-- Everyone can read basic profile info (for map, leaderboard, etc.)
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Profile is created via trigger after auth.users insert
CREATE POLICY "Enable insert for authenticated users only"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ==============================================
-- LIVREURS POLICIES
-- ==============================================

-- Everyone can view verified livreurs (for map)
CREATE POLICY "Verified livreurs are viewable by everyone"
    ON livreurs FOR SELECT
    USING (is_verified = true OR profile_id = auth.uid());

-- Livreurs can update their own info
CREATE POLICY "Livreurs can update own info"
    ON livreurs FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- Authenticated users can insert their livreur profile
CREATE POLICY "Users can create livreur profile"
    ON livreurs FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- ==============================================
-- PROFESSIONNELS POLICIES
-- ==============================================

-- Verified pros are visible
CREATE POLICY "Verified pros are viewable"
    ON professionnels FOR SELECT
    USING (is_verified = true OR profile_id = auth.uid());

-- Pros can update their own info
CREATE POLICY "Pros can update own info"
    ON professionnels FOR UPDATE
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- Users can create pro profile
CREATE POLICY "Users can create pro profile"
    ON professionnels FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- ==============================================
-- COMMUNES POLICIES
-- ==============================================

-- Everyone can read communes
CREATE POLICY "Communes are readable by everyone"
    ON communes FOR SELECT
    USING (true);

-- ==============================================
-- ZONES_LIVRAISON POLICIES
-- ==============================================

-- Everyone can view zones (for map)
CREATE POLICY "Zones are viewable by everyone"
    ON zones_livraison FOR SELECT
    USING (true);

-- Livreurs can manage their own zones
CREATE POLICY "Livreurs can manage own zones"
    ON zones_livraison FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM livreurs
            WHERE livreurs.id = zones_livraison.livreur_id
            AND livreurs.profile_id = auth.uid()
        )
    );

-- ==============================================
-- TIERS POLICIES
-- ==============================================

-- Everyone can view tiers
CREATE POLICY "Tiers are readable by everyone"
    ON tiers FOR SELECT
    USING (true);

-- ==============================================
-- SUBSCRIPTIONS POLICIES
-- ==============================================

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT
    USING (profile_id = auth.uid());

-- Only service role can manage subscriptions (via webhooks)
CREATE POLICY "Service role manages subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- ==============================================
-- CREDITS POLICIES
-- ==============================================

-- Users can view their own credits
CREATE POLICY "Users can view own credits"
    ON credits FOR SELECT
    USING (profile_id = auth.uid());

-- ==============================================
-- CREDIT_TRANSACTIONS POLICIES
-- ==============================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
    ON credit_transactions FOR SELECT
    USING (profile_id = auth.uid());

-- ==============================================
-- RESSOURCES POLICIES
-- ==============================================

-- Active ressources are viewable by everyone
CREATE POLICY "Active ressources are viewable"
    ON ressources FOR SELECT
    USING (is_active = true);

-- Admins can manage ressources
CREATE POLICY "Admins can manage ressources"
    ON ressources FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ==============================================
-- BADGES POLICIES
-- ==============================================

-- Everyone can view badges
CREATE POLICY "Badges are viewable by everyone"
    ON badges FOR SELECT
    USING (true);

-- ==============================================
-- PROFILE_BADGES POLICIES
-- ==============================================

-- Everyone can view earned badges (for leaderboard/profiles)
CREATE POLICY "Profile badges are viewable"
    ON profile_badges FOR SELECT
    USING (true);

-- ==============================================
-- AVIS POLICIES
-- ==============================================

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
    ON avis FOR SELECT
    USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
    ON avis FOR INSERT
    WITH CHECK (from_profile_id = auth.uid());

-- ==============================================
-- GEOLOCALISATIONS POLICIES
-- ==============================================

-- Everyone can view recent geolocations (for map)
CREATE POLICY "Recent geolocations are viewable"
    ON geolocalisations FOR SELECT
    USING (timestamp > NOW() - INTERVAL '1 hour');

-- Livreurs can insert their own position
CREATE POLICY "Livreurs can insert own position"
    ON geolocalisations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM livreurs
            WHERE livreurs.id = geolocalisations.livreur_id
            AND livreurs.profile_id = auth.uid()
        )
    );

-- ==============================================
-- ADMIN POLICIES (for all tables)
-- ==============================================

-- Admins have full access to all tables
CREATE POLICY "Admins have full access to profiles"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to livreurs"
    ON livreurs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to credits"
    ON credits FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to credit_transactions"
    ON credit_transactions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins have full access to profile_badges"
    ON profile_badges FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
