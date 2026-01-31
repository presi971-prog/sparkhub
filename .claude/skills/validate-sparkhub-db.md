---
name: validate-sparkhub-db
description: Vérifie que la base de données SparkHub est correctement configurée pour la nouvelle stratégie
allowed-tools: Read, Grep, Bash
---

# Validation de la base de données SparkHub

Vérifie que toutes les tables et colonnes nécessaires pour la stratégie SparkHub sont en place.

## Vérifications à effectuer

### 1. Tables requises

Vérifier l'existence de :
- `profiles` (avec les nouvelles colonnes)
- `founder_slots`
- `points_history`
- `badges`
- `user_badges`
- `pending_registrations`
- `discount_thresholds`
- `ressources` (avec les nouveaux prix)

### 2. Colonnes `profiles`

Vérifier que `profiles` contient :
- `cobeone_id`
- `cobeone_type`
- `is_validated`
- `validated_at`
- `registration_rank`
- `is_founder`
- `founder_type`
- `founder_expires_at`
- `monthly_points`
- `monthly_points_reset_at`
- `cumulated_points`
- `gamification_level`
- `current_discount`

### 3. Prix des outils (ressources)

Vérifier que les crédits sont corrects :
- Kling 5s = 11 crédits
- Hailuo 5s = 13 crédits
- Sora 5s = 16 crédits
- Sora Pro 5s = 46 crédits
- Veo 3 5s = 62 crédits
- Veo 3 + Audio 5s = 123 crédits

### 4. Seuils de réduction

Vérifier que `discount_thresholds` contient les 9 entrées :
- (0, 20, 150), (0, 30, 300), (0, 50, 500)
- (10, 20, 100), (10, 30, 200), (10, 50, 400)
- (20, 30, 150), (20, 50, 300)
- (30, 50, 150)

### 5. Places Fondateurs

Vérifier que `founder_slots` contient :
- 100 slots pour 'livreur' (1-100)
- 100 slots pour 'professionnel' (1-100)

### 6. Badges

Vérifier que `badges` contient les badges définis :

**Débutant :**
- Nouveau membre
- Profil complété
- Premier outil

**Activité :**
- Fidèle 7 jours
- Fidèle 30 jours
- Accro aux outils
- Gros consommateur

**Social :**
- Premier parrain
- Super parrain
- Bien noté
- Star

**Prestige :**
- Légende
- Fondateur
- Top mensuel

### 7. RLS (Row Level Security)

Vérifier que RLS est activé sur :
- `pending_registrations`
- `points_history`
- `user_badges`
- `founder_slots`

## Format du rapport

```
✅ Table `profiles` : OK
  ✅ Colonne `cobeone_id` : présente
  ✅ Colonne `monthly_points` : présente
  ⚠️ Colonne `founder_expires_at` : type incorrect (devrait être TIMESTAMP)

❌ Table `founder_slots` : MANQUANTE

✅ Prix des outils : OK
  ✅ Kling 5s = 11 crédits
  ❌ Hailuo 5s = 15 crédits (devrait être 13)

💡 Suggestions :
- Créer la table `founder_slots`
- Mettre à jour le prix de Hailuo 5s
```
