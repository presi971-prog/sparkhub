---
name: setup-founders-system
description: Configure le système des Fondateurs SparkHub (100 livreurs + 100 pros, réductions automatiques, expiration 1 an)
allowed-tools: Read, Write, Bash
---

# Configuration du système Fondateurs SparkHub

## Rappel : Les Fondateurs

- **100 Fondateurs Livreurs** (via Cobeone Prestataires)
- **100 Fondateurs Pros** (via Cobeone Commerces)
- **Total : 200 Fondateurs**

## Statuts Fondateurs

| Rang | Statut | Réduction |
|------|--------|-----------|
| 1-10 | Fondateur Platine | -50% |
| 11-30 | Fondateur Or | -30% |
| 31-60 | Fondateur Argent | -20% |
| 61-100 | Fondateur Bronze | -10% |

## Initialisation des slots Fondateurs

```sql
-- Créer les 100 slots pour les livreurs
INSERT INTO founder_slots (user_type, slot_number)
SELECT 'livreur', generate_series(1, 100);

-- Créer les 100 slots pour les professionnels
INSERT INTO founder_slots (user_type, slot_number)
SELECT 'professionnel', generate_series(1, 100);
```

## Fonction : Attribuer un slot Fondateur

```sql
CREATE OR REPLACE FUNCTION claim_founder_slot(
  p_profile_id UUID,
  p_user_type TEXT -- 'livreur' ou 'professionnel'
)
RETURNS TABLE(
  success BOOLEAN,
  slot_number INT,
  founder_type TEXT
) AS $$
DECLARE
  v_slot_number INT;
  v_founder_type TEXT;
BEGIN
  -- Chercher le premier slot disponible
  SELECT fs.slot_number INTO v_slot_number
  FROM founder_slots fs
  WHERE fs.user_type = p_user_type
    AND fs.profile_id IS NULL
  ORDER BY fs.slot_number
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- Si aucun slot disponible
  IF v_slot_number IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::INT, NULL::TEXT;
    RETURN;
  END IF;

  -- Déterminer le type de fondateur
  v_founder_type := CASE
    WHEN v_slot_number <= 10 THEN 'platine'
    WHEN v_slot_number <= 30 THEN 'or'
    WHEN v_slot_number <= 60 THEN 'argent'
    ELSE 'bronze'
  END;

  -- Attribuer le slot
  UPDATE founder_slots
  SET profile_id = p_profile_id, claimed_at = NOW()
  WHERE user_type = p_user_type AND slot_number = v_slot_number;

  -- Mettre à jour le profil
  UPDATE profiles
  SET
    is_founder = TRUE,
    founder_type = v_founder_type,
    registration_rank = v_slot_number,
    founder_expires_at = NOW() + INTERVAL '1 year',
    current_discount = CASE v_founder_type
      WHEN 'platine' THEN 50
      WHEN 'or' THEN 30
      WHEN 'argent' THEN 20
      WHEN 'bronze' THEN 10
    END
  WHERE id = p_profile_id;

  RETURN QUERY SELECT TRUE, v_slot_number, v_founder_type;
END;
$$ LANGUAGE plpgsql;
```

## Fonction : Compter les slots disponibles

```sql
CREATE OR REPLACE FUNCTION get_available_founder_slots()
RETURNS TABLE(
  user_type TEXT,
  total_slots INT,
  claimed_slots INT,
  available_slots INT,
  platine_available INT,
  or_available INT,
  argent_available INT,
  bronze_available INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.user_type,
    100 AS total_slots,
    COUNT(fs.profile_id)::INT AS claimed_slots,
    (100 - COUNT(fs.profile_id))::INT AS available_slots,
    COUNT(*) FILTER (WHERE fs.slot_number <= 10 AND fs.profile_id IS NULL)::INT,
    COUNT(*) FILTER (WHERE fs.slot_number > 10 AND fs.slot_number <= 30 AND fs.profile_id IS NULL)::INT,
    COUNT(*) FILTER (WHERE fs.slot_number > 30 AND fs.slot_number <= 60 AND fs.profile_id IS NULL)::INT,
    COUNT(*) FILTER (WHERE fs.slot_number > 60 AND fs.profile_id IS NULL)::INT
  FROM founder_slots fs
  GROUP BY fs.user_type;
END;
$$ LANGUAGE plpgsql;
```

## Fonction : Vérifier l'expiration des Fondateurs

```sql
CREATE OR REPLACE FUNCTION check_founder_expiration()
RETURNS void AS $$
BEGIN
  -- Les Fondateurs expirés passent au système de gamification
  UPDATE profiles
  SET
    is_founder = FALSE,
    founder_type = NULL,
    founder_expires_at = NULL,
    -- La réduction de base devient celle du niveau de gamification
    current_discount = CASE gamification_level
      WHEN 'legende' THEN 50
      WHEN 'expert' THEN 30
      WHEN 'regulier' THEN 20
      WHEN 'debutant' THEN 10
      ELSE 0
    END
  WHERE is_founder = TRUE
    AND founder_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## Cron job : Vérifier les expirations

```sql
SELECT cron.schedule(
  'check-founder-expiration',
  '0 0 * * *', -- Chaque jour à minuit
  $$SELECT check_founder_expiration()$$
);
```

## API Routes à créer

### GET /api/founders/slots

```typescript
// Récupérer les slots disponibles
export async function GET() {
  const { data, error } = await supabase.rpc('get_available_founder_slots')

  if (error) throw error
  return Response.json(data)
}
```

### POST /api/founders/claim

```typescript
// Réclamer un slot Fondateur (après validation)
export async function POST(req: Request) {
  const { profileId, userType } = await req.json()

  const { data, error } = await supabase.rpc('claim_founder_slot', {
    p_profile_id: profileId,
    p_user_type: userType
  })

  if (error) throw error
  return Response.json(data[0])
}
```

## Processus d'inscription Fondateur

1. L'utilisateur s'inscrit avec son N° Cobeone
2. L'inscription est en attente (`pending_registrations`)
3. L'admin valide l'inscription
4. Le système appelle `claim_founder_slot`
5. Si slot disponible → l'utilisateur devient Fondateur
6. Sinon → l'utilisateur est un Membre normal

## Affichage urgence (frontend)

Afficher sur la page d'accueil :
- "🔥 Plus que X places Platine !"
- "⚡ X places Or restantes"
- etc.

Récupérer les données via `/api/founders/slots`
