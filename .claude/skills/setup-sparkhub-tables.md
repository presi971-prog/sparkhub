---
name: setup-sparkhub-tables
description: Crée ou met à jour les tables Supabase pour la nouvelle stratégie SparkHub (Fondateurs, points, gamification, réductions)
allowed-tools: Read, Write, Bash
---

# Setup des tables SparkHub

Crée les tables Supabase nécessaires pour la stratégie SparkHub.

## Tables à créer/modifier

### 1. Table `profiles` (modifier)

Ajouter les colonnes :
- `cobeone_id` (TEXT, nullable) - N° client Cobeone
- `cobeone_type` (TEXT) - 'prestataire' ou 'commerce'
- `is_validated` (BOOLEAN, default false) - Validation admin
- `validated_at` (TIMESTAMP, nullable)
- `registration_rank` (INT, nullable) - Rang d'inscription (1-100 = Fondateur)
- `is_founder` (BOOLEAN, default false)
- `founder_type` (TEXT, nullable) - 'platine', 'or', 'argent', 'bronze'
- `founder_expires_at` (TIMESTAMP, nullable) - Date d'expiration (1 an)
- `monthly_points` (INT, default 0) - Points du mois (reset mensuel)
- `monthly_points_reset_at` (TIMESTAMP) - Date du dernier reset
- `cumulated_points` (INT, default 0) - Points cumulés (jamais reset)
- `gamification_level` (TEXT, default 'debutant') - 'debutant', 'regulier', 'expert', 'legende'
- `current_discount` (INT, default 0) - Réduction actuelle en %

### 2. Table `founder_slots` (créer)

Suivre les places Fondateurs disponibles :
```sql
CREATE TABLE founder_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_type TEXT NOT NULL, -- 'livreur' ou 'professionnel'
  slot_number INT NOT NULL, -- 1 à 100
  profile_id UUID REFERENCES profiles(id),
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_type, slot_number)
);
```

### 3. Table `points_history` (créer)

Historique des points :
```sql
CREATE TABLE points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  points INT NOT NULL,
  action TEXT NOT NULL, -- 'credit_purchase', 'tool_usage', 'referral', 'review', 'profile_complete', 'daily_login'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Table `badges` (modifier si existe, sinon créer)

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL, -- 'debutant', 'activite', 'social', 'prestige'
  condition_type TEXT NOT NULL,
  condition_value INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Table `user_badges` (créer)

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  badge_id UUID NOT NULL REFERENCES badges(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);
```

### 6. Table `pending_registrations` (créer)

Pour la validation manuelle :
```sql
CREATE TABLE pending_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cobeone_id TEXT NOT NULL,
  cobeone_type TEXT NOT NULL, -- 'prestataire' ou 'commerce'
  user_type TEXT NOT NULL, -- 'livreur' ou 'professionnel'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 7. Table `discount_thresholds` (créer)

Seuils de points pour les réductions :
```sql
CREATE TABLE discount_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_discount INT NOT NULL, -- 0, 10, 20, 30, 50
  target_discount INT NOT NULL, -- 20, 30, 50
  points_required INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(base_discount, target_discount)
);

-- Insérer les seuils
INSERT INTO discount_thresholds (base_discount, target_discount, points_required) VALUES
(0, 20, 150),
(0, 30, 300),
(0, 50, 500),
(10, 20, 100),
(10, 30, 200),
(10, 50, 400),
(20, 30, 150),
(20, 50, 300),
(30, 50, 150);
```

## Migrations Supabase

Créer un fichier de migration dans `supabase/migrations/` avec un nom comme `020_sparkhub_strategy.sql`.

## Après exécution

1. Vérifier que toutes les tables sont créées
2. Vérifier les relations (foreign keys)
3. Activer RLS sur les nouvelles tables
4. Créer les politiques de sécurité appropriées
