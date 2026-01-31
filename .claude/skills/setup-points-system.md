---
name: setup-points-system
description: Configure le système de points SparkHub (2 compteurs, actions, calcul des réductions)
allowed-tools: Read, Write, Bash
---

# Configuration du système de points SparkHub

## Rappel : 2 compteurs de points

1. **Points mensuels** (`monthly_points`) : Remis à zéro chaque 1er du mois
2. **Points cumulés** (`cumulated_points`) : Jamais remis à zéro

Chaque action ajoute des points aux DEUX compteurs.

## Actions et points

| Action | Points | Code action |
|--------|--------|-------------|
| Acheter des crédits | +3 par crédit | `credit_purchase` |
| Utiliser un outil IA | +5 par utilisation | `tool_usage` |
| Parrainer quelqu'un | +30 par filleul | `referral` |
| Recevoir un avis positif | +10 par avis | `review` |
| Compléter son profil | +50 (une fois) | `profile_complete` |
| Se connecter (quotidien) | +2 par jour | `daily_login` |

## Fonction Supabase : Ajouter des points

```sql
CREATE OR REPLACE FUNCTION add_points(
  p_profile_id UUID,
  p_points INT,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Ajouter à l'historique
  INSERT INTO points_history (profile_id, points, action, description)
  VALUES (p_profile_id, p_points, p_action, p_description);

  -- Mettre à jour les deux compteurs
  UPDATE profiles
  SET
    monthly_points = monthly_points + p_points,
    cumulated_points = cumulated_points + p_points,
    -- Recalculer le niveau de gamification
    gamification_level = CASE
      WHEN cumulated_points + p_points >= 5000 THEN 'legende'
      WHEN cumulated_points + p_points >= 1500 THEN 'expert'
      WHEN cumulated_points + p_points >= 500 THEN 'regulier'
      ELSE 'debutant'
    END
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql;
```

## Fonction Supabase : Reset mensuel des points

```sql
CREATE OR REPLACE FUNCTION reset_monthly_points()
RETURNS void AS $$
BEGIN
  -- Calculer la réduction du mois suivant AVANT le reset
  UPDATE profiles
  SET current_discount = calculate_next_month_discount(id, monthly_points);

  -- Reset des points mensuels
  UPDATE profiles
  SET
    monthly_points = 0,
    monthly_points_reset_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

## Fonction Supabase : Calculer la réduction du mois suivant

```sql
CREATE OR REPLACE FUNCTION calculate_next_month_discount(
  p_profile_id UUID,
  p_monthly_points INT
)
RETURNS INT AS $$
DECLARE
  v_base_discount INT;
  v_max_achieved INT;
BEGIN
  -- Récupérer la réduction de base
  SELECT
    CASE
      WHEN is_founder AND founder_expires_at > NOW() THEN
        CASE founder_type
          WHEN 'platine' THEN 50
          WHEN 'or' THEN 30
          WHEN 'argent' THEN 20
          WHEN 'bronze' THEN 10
          ELSE 0
        END
      ELSE
        CASE gamification_level
          WHEN 'legende' THEN 50
          WHEN 'expert' THEN 30
          WHEN 'regulier' THEN 20
          WHEN 'debutant' THEN 10
          ELSE 0
        END
    END INTO v_base_discount
  FROM profiles
  WHERE id = p_profile_id;

  -- Si déjà à 50%, retourner 50
  IF v_base_discount >= 50 THEN
    RETURN 50;
  END IF;

  -- Chercher la meilleure réduction atteignable
  SELECT COALESCE(MAX(target_discount), v_base_discount) INTO v_max_achieved
  FROM discount_thresholds
  WHERE base_discount = v_base_discount
    AND points_required <= p_monthly_points;

  RETURN v_max_achieved;
END;
$$ LANGUAGE plpgsql;
```

## Cron job : Reset mensuel

Créer un cron job Supabase qui s'exécute chaque 1er du mois à 00:00 :

```sql
SELECT cron.schedule(
  'reset-monthly-points',
  '0 0 1 * *',
  $$SELECT reset_monthly_points()$$
);
```

## API Routes à créer

### POST /api/points/add

```typescript
// Ajouter des points
export async function POST(req: Request) {
  const { profileId, points, action, description } = await req.json()

  const { error } = await supabase.rpc('add_points', {
    p_profile_id: profileId,
    p_points: points,
    p_action: action,
    p_description: description
  })

  if (error) throw error
  return Response.json({ success: true })
}
```

### GET /api/points/history

```typescript
// Historique des points
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profileId')

  const { data, error } = await supabase
    .from('points_history')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return Response.json(data)
}
```

## Intégrations à mettre en place

1. **Achat de crédits** : Appeler `add_points` avec `credit_purchase` après paiement Stripe
2. **Utilisation d'outil** : Appeler `add_points` avec `tool_usage` après génération
3. **Parrainage** : Appeler `add_points` avec `referral` quand le filleul valide son compte
4. **Avis** : Appeler `add_points` avec `review` quand un avis 4+ étoiles est reçu
5. **Profil** : Appeler `add_points` avec `profile_complete` quand le profil est à 100%
6. **Connexion quotidienne** : Vérifier la dernière connexion et appeler `add_points` si > 24h
