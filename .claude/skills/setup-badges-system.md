---
name: setup-badges-system
description: Configure le système de badges SparkHub (création, attribution automatique, vérification)
allowed-tools: Read, Write, Bash
---

# Configuration du système de badges SparkHub

## Liste des badges à créer

### Badges Débutant

| Badge | Condition | Valeur |
|-------|-----------|--------|
| Nouveau membre | Créer son compte | 1 |
| Profil complété | Remplir 100% du profil | 100 |
| Premier outil | Utiliser 1 outil IA | 1 |

### Badges Activité

| Badge | Condition | Valeur |
|-------|-----------|--------|
| Fidèle 7 jours | Se connecter 7 jours de suite | 7 |
| Fidèle 30 jours | Se connecter 30 jours de suite | 30 |
| Accro aux outils | Utiliser 50 outils | 50 |
| Gros consommateur | Acheter 500 crédits au total | 500 |

### Badges Sociaux

| Badge | Condition | Valeur |
|-------|-----------|--------|
| Premier parrain | Parrainer 1 personne | 1 |
| Super parrain | Parrainer 10 personnes | 10 |
| Bien noté | Recevoir 5 avis positifs | 5 |
| Star | Recevoir 20 avis positifs | 20 |

### Badges Prestige

| Badge | Condition | Valeur |
|-------|-----------|--------|
| Légende | Atteindre le niveau Légende | 5000 |
| Fondateur | Faire partie des 100 premiers | 100 |
| Top mensuel | Être #1 du mois en points | 1 |

## Script d'initialisation des badges

```sql
-- Badges Débutant
INSERT INTO badges (name, description, icon, category, condition_type, condition_value) VALUES
('Nouveau membre', 'Bienvenue sur SparkHub !', '🎉', 'debutant', 'account_created', 1),
('Profil complété', 'Votre profil est complet à 100%', '✅', 'debutant', 'profile_complete', 100),
('Premier outil', 'Vous avez utilisé votre premier outil IA', '🛠️', 'debutant', 'tool_usage', 1);

-- Badges Activité
INSERT INTO badges (name, description, icon, category, condition_type, condition_value) VALUES
('Fidèle 7 jours', 'Connecté 7 jours de suite', '📅', 'activite', 'consecutive_days', 7),
('Fidèle 30 jours', 'Connecté 30 jours de suite', '🔥', 'activite', 'consecutive_days', 30),
('Accro aux outils', 'Vous avez utilisé 50 outils', '⚡', 'activite', 'tool_usage', 50),
('Gros consommateur', 'Vous avez acheté 500 crédits', '💰', 'activite', 'credits_purchased', 500);

-- Badges Sociaux
INSERT INTO badges (name, description, icon, category, condition_type, condition_value) VALUES
('Premier parrain', 'Vous avez parrainé votre première personne', '🤝', 'social', 'referrals', 1),
('Super parrain', 'Vous avez parrainé 10 personnes', '🌟', 'social', 'referrals', 10),
('Bien noté', 'Vous avez reçu 5 avis positifs', '👍', 'social', 'positive_reviews', 5),
('Star', 'Vous avez reçu 20 avis positifs', '⭐', 'social', 'positive_reviews', 20);

-- Badges Prestige
INSERT INTO badges (name, description, icon, category, condition_type, condition_value) VALUES
('Légende', 'Vous avez atteint le niveau Légende', '👑', 'prestige', 'level_reached', 5000),
('Fondateur', 'Vous faites partie des 100 premiers', '🏆', 'prestige', 'founder', 100),
('Top mensuel', 'Vous êtes #1 du mois', '🥇', 'prestige', 'monthly_top', 1);
```

## Fonction : Vérifier et attribuer les badges

```sql
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
    -- Vérifier si le badge est déjà attribué
    SELECT EXISTS(
      SELECT 1 FROM user_badges
      WHERE profile_id = p_profile_id AND badge_id = v_badge.id
    ) INTO v_has_badge;

    IF NOT v_has_badge THEN
      -- Vérifier la condition selon le type
      CASE v_badge.condition_type
        WHEN 'account_created' THEN
          v_count := 1; -- Toujours vrai si le compte existe

        WHEN 'profile_complete' THEN
          SELECT
            CASE WHEN full_name IS NOT NULL AND phone IS NOT NULL AND avatar_url IS NOT NULL
            THEN 100 ELSE 0 END
          INTO v_count FROM profiles WHERE id = p_profile_id;

        WHEN 'tool_usage' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'tool_usage';

        WHEN 'consecutive_days' THEN
          -- Calculer les jours consécutifs de connexion
          SELECT COUNT(DISTINCT DATE(created_at)) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id
            AND action = 'daily_login'
            AND created_at > NOW() - (v_badge.condition_value || ' days')::INTERVAL;

        WHEN 'credits_purchased' THEN
          SELECT COALESCE(SUM(
            CASE WHEN action = 'credit_purchase' THEN points / 3 ELSE 0 END
          ), 0) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id;

        WHEN 'referrals' THEN
          SELECT COUNT(*) INTO v_count
          FROM points_history
          WHERE profile_id = p_profile_id AND action = 'referral';

        WHEN 'positive_reviews' THEN
          SELECT COUNT(*) INTO v_count
          FROM avis
          WHERE to_profile_id = p_profile_id AND rating >= 4;

        WHEN 'level_reached' THEN
          SELECT cumulated_points INTO v_count
          FROM profiles WHERE id = p_profile_id;

        WHEN 'founder' THEN
          SELECT CASE WHEN is_founder THEN 1 ELSE 0 END INTO v_count
          FROM profiles WHERE id = p_profile_id;

        WHEN 'monthly_top' THEN
          -- Vérifier si l'utilisateur a été #1 du mois
          SELECT CASE WHEN registration_rank = 1 THEN 1 ELSE 0 END INTO v_count
          FROM profiles WHERE id = p_profile_id;
          -- Note: implémenter une vraie logique de top mensuel

        ELSE
          v_count := 0;
      END CASE;

      -- Attribuer le badge si la condition est remplie
      IF v_count >= v_badge.condition_value THEN
        INSERT INTO user_badges (profile_id, badge_id)
        VALUES (p_profile_id, v_badge.id)
        ON CONFLICT (profile_id, badge_id) DO NOTHING;

        RETURN QUERY SELECT v_badge.id, v_badge.name, TRUE;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Trigger : Vérifier les badges après chaque action

```sql
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.profile_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_points_insert
AFTER INSERT ON points_history
FOR EACH ROW
EXECUTE FUNCTION trigger_check_badges();
```

## API Route : Récupérer les badges d'un utilisateur

```typescript
// GET /api/badges/user/[profileId]
export async function GET(req: Request, { params }) {
  const { profileId } = params

  // Badges obtenus
  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select(`
      earned_at,
      badges (
        id,
        name,
        description,
        icon,
        category
      )
    `)
    .eq('profile_id', profileId)

  // Tous les badges
  const { data: allBadges } = await supabase
    .from('badges')
    .select('*')
    .order('category')

  // Combiner pour afficher earned/not earned
  const badgesWithStatus = allBadges.map(badge => ({
    ...badge,
    earned: earnedBadges.some(eb => eb.badges.id === badge.id),
    earned_at: earnedBadges.find(eb => eb.badges.id === badge.id)?.earned_at
  }))

  return Response.json(badgesWithStatus)
}
```

## API Route : Vérifier les nouveaux badges

```typescript
// POST /api/badges/check
export async function POST(req: Request) {
  const { profileId } = await req.json()

  const { data: newBadges } = await supabase.rpc('check_and_award_badges', {
    p_profile_id: profileId
  })

  // Filtrer les nouveaux badges
  const awarded = newBadges.filter(b => b.newly_awarded)

  return Response.json({
    newBadges: awarded,
    count: awarded.length
  })
}
```

## Notification de nouveau badge

```typescript
// Après attribution d'un badge
export async function notifyNewBadge(profileId: string, badge: Badge) {
  // Notification in-app (via Supabase Realtime ou autre)

  // Email optionnel
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', profileId)
    .single()

  await resend.emails.send({
    from: 'SparkHub <noreply@sparkhub.pro>',
    to: profile.email,
    subject: `🏅 Nouveau badge débloqué : ${badge.name}`,
    html: `
      <h2>Félicitations ${profile.full_name} !</h2>
      <p>Vous avez débloqué un nouveau badge :</p>
      <div style="text-align: center; font-size: 48px;">${badge.icon}</div>
      <h3 style="text-align: center;">${badge.name}</h3>
      <p style="text-align: center;">${badge.description}</p>
    `
  })
}
```
