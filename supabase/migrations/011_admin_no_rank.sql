-- ==============================================
-- LES ADMINS N'ONT PAS DE RANG NI DE TIER
-- ==============================================

-- Retirer le rang et tier des admins existants
UPDATE profiles
SET rank_number = NULL, tier_id = NULL
WHERE role = 'admin';

-- Modifier la fonction assign_rank_number pour exclure les admins
CREATE OR REPLACE FUNCTION assign_rank_number()
RETURNS TRIGGER AS $$
DECLARE
    next_rank INTEGER;
BEGIN
    -- Seuls les livreurs ont un rang
    IF NEW.rank_number IS NULL AND NEW.role = 'livreur' THEN
        SELECT COALESCE(MAX(rank_number), 0) + 1 INTO next_rank
        FROM profiles
        WHERE role = 'livreur';
        NEW.rank_number = next_rank;
    END IF;

    -- Si on passe en admin, retirer le rang
    IF NEW.role = 'admin' THEN
        NEW.rank_number = NULL;
        NEW.tier_id = NULL;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Modifier la fonction assign_tier_by_rank pour exclure les admins
CREATE OR REPLACE FUNCTION assign_tier_by_rank()
RETURNS TRIGGER AS $$
DECLARE
    tier_id_to_assign UUID;
BEGIN
    -- Les admins n'ont pas de tier
    IF NEW.role = 'admin' THEN
        NEW.tier_id = NULL;
        RETURN NEW;
    END IF;

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
