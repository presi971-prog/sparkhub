# Stratégie SparkHub - Notes de conception

*Dernière mise à jour : 30 janvier 2026*

---

## Vision globale

### L'objectif caché

**SparkHub n'est pas le produit final.** C'est un outil d'acquisition pour **Cobeone**.

```
SparkHub (outils IA pas chers)
        ↓
Attire livreurs + professionnels
        ↓
Obligation d'avoir un compte Cobeone pour s'inscrire
        ↓
Base d'utilisateurs prête pour le lancement officiel de Cobeone
```

### Cobeone, c'est quoi ?

Une **super-app** (style Uber + Deliveroo + Leboncoin + services à domicile) :
- Livraisons (nourriture, courses, médicaments...)
- Transport (taxi, moto)
- Services à domicile (coiffeur, plombier, électricien, baby-sitting...)
- Marketplace (vente/achat/location)

**3 applications distinctes :**
- Cobeone Clients (pour commander)
- Cobeone Prestataires (pour les livreurs, artisans, etc.)
- Cobeone Commerces (pour les restaurants, boutiques)

**Site web :** https://cobeone.com/

**Statut des apps :** Prêtes, les gens peuvent s'inscrire et obtenir leur N° client.

---

## Modèle économique SparkHub

| Élément | Coût |
|---------|------|
| Inscription + accès SparkHub | **Gratuit** |
| Utilisation des outils IA | **Payant** (crédits) |

**Objectif** : Maximiser les inscriptions en enlevant toutes les barrières.

### Prix des crédits

| Pack | Prix | Prix par crédit |
|------|------|-----------------|
| 50 crédits | 5€ | 0.10€ |
| 100 crédits | 9€ | 0.09€ |
| 250 crédits | 20€ | 0.08€ |
| 500 crédits | 35€ | 0.07€ |

---

## Lien SparkHub ↔ Cobeone

### Principe

Pour s'inscrire sur SparkHub, l'utilisateur doit :
1. Avoir un compte sur l'app Cobeone correspondante
2. Fournir son **N° client Cobeone** lors de l'inscription SparkHub

| Type d'utilisateur | App Cobeone requise |
|--------------------|---------------------|
| Livreur | Cobeone Prestataires |
| Professionnel (commerce, resto...) | Cobeone Commerces |

### Validation manuelle (pour le lancement)

1. L'utilisateur s'inscrit avec son N° client Cobeone
2. **Alerte envoyée à l'admin** (toi)
3. L'utilisateur reçoit un message : "Nous vérifions votre éligibilité"
4. Tu vérifies manuellement si le N° existe sur Cobeone
5. Tu valides ou refuses l'inscription
6. L'utilisateur reçoit un **mail ou WhatsApp** de confirmation

---

## Prix des outils IA

### Coûts réels (ce que ça te coûte)

| Outil | Fournisseur | Coût par seconde | Coût pour 5s |
|-------|-------------|------------------|--------------|
| Kling 5s | FAL AI | $0.07/s | 0.32€ |
| Hailuo 5s | FAL AI (MiniMax) | $0.08/s | 0.37€ |
| Sora 5s | OpenAI | $0.10/s | 0.46€ |
| Veo 3 5s | FAL AI (Google) | $0.40/s | 1.84€ |
| Sora Pro 5s | OpenAI | $0.30/s | 1.38€ |
| Veo 3 + Audio 5s | FAL AI (Google) | ~$0.80/s | 3.68€ |

Sources : [FAL AI Pricing](https://fal.ai/pricing), [OpenAI Sora Pricing](https://openai.com/api/pricing/)

### Prix pour les utilisateurs (en crédits)

| Outil | Crédits | Prix client (sans réduc) | Prix client (-50%) |
|-------|---------|--------------------------|-------------------|
| Post IA (texte) | 2 | 0.18€ | 0.09€ |
| Légende/Bio | 2 | 0.18€ | 0.09€ |
| Photo Standard | 3 | 0.27€ | 0.14€ |
| Photo Pro 4K | 10 | 0.90€ | 0.45€ |
| **Kling 5s** | **11** | 0.99€ | 0.50€ |
| **Hailuo 5s** | **13** | 1.17€ | 0.59€ |
| **Sora 5s** | **16** | 1.44€ | 0.72€ |
| **Sora Pro 5s** | **46** | 4.14€ | 2.07€ |
| **Veo 3 5s** | **62** | 5.58€ | 2.79€ |
| **Veo 3 + Audio 5s** | **123** | 11.07€ | 5.54€ |

### Marges par outil

#### Sans réduction (client normal)

| Outil | Client paie | Ça te coûte | Tu gagnes |
|-------|-------------|-------------|-----------|
| Kling 5s | 0.99€ | 0.32€ | **+0.67€** |
| Hailuo 5s | 1.17€ | 0.37€ | **+0.80€** |
| Sora 5s | 1.44€ | 0.46€ | **+0.98€** |
| Veo 3 5s | 5.58€ | 1.84€ | **+3.74€** |
| Sora Pro 5s | 4.14€ | 1.38€ | **+2.76€** |
| Veo 3 + Audio 5s | 11.07€ | 3.68€ | **+7.39€** |

#### Avec réduction -50% (Fondateur Platine ou Légende)

| Outil | Client paie | Ça te coûte | Tu gagnes |
|-------|-------------|-------------|-----------|
| Kling 5s | 0.50€ | 0.32€ | **+0.18€** |
| Hailuo 5s | 0.59€ | 0.37€ | **+0.22€** |
| Sora 5s | 0.72€ | 0.46€ | **+0.26€** |
| Veo 3 5s | 2.79€ | 1.84€ | **+0.95€** |
| Sora Pro 5s | 2.07€ | 1.38€ | **+0.69€** |
| Veo 3 + Audio 5s | 5.54€ | 3.68€ | **+1.86€** |

**Résultat** : Tu gagnes toujours de l'argent, même avec -50%.

---

## Système de points : DEUX compteurs

### Compteur 1 : Points mensuels (pour les réductions)

- **Remis à zéro** chaque 1er du mois
- Sert à calculer les réductions du mois suivant
- Permet d'**améliorer** sa réduction de base

### Compteur 2 : Points cumulés (pour la gamification)

- **Jamais remis à zéro**, s'accumule en permanence
- Sert à déterminer le niveau de réputation (Débutant → Légende)
- Sert à déterminer la réduction de base après 1 an

### Actions qui rapportent des points

| Action | Points | Notes |
|--------|--------|-------|
| **Acheter des crédits** | +3 par crédit | Valorisé car bon pour le business |
| Utiliser un outil IA | +5 par utilisation | |
| Parrainer quelqu'un | +30 par filleul | |
| Recevoir un avis positif | +10 par avis | |
| Compléter son profil à 100% | +50 | Une seule fois |
| Se connecter chaque jour | +2 par jour | |

**Note** : Chaque action ajoute des points aux DEUX compteurs.

---

## ANNÉE 1 : Système Fondateurs

### Deux classements séparés

- **100 Fondateurs Livreurs** (inscrits via Cobeone Prestataires)
- **100 Fondateurs Pros** (inscrits via Cobeone Commerces)

**Total : 200 Fondateurs**

### Réductions de base automatiques (pendant 1 an)

| Rang d'inscription | Statut | Réduction de base |
|--------------------|--------|-------------------|
| 1-10 | Fondateur Platine | -50% |
| 11-30 | Fondateur Or | -30% |
| 31-60 | Fondateur Argent | -20% |
| 61-100 | Fondateur Bronze | -10% |

### Possibilité d'améliorer sa réduction (année 1)

Tous les Fondateurs (sauf 1-10) peuvent atteindre -50% en accumulant des points mensuels :

| Rang | Réduction de base | Peut atteindre | Effort nécessaire |
|------|-------------------|----------------|-------------------|
| 1-10 | -50% | -50% (déjà au max) | Aucun |
| 11-30 | -30% | -50% | Faible |
| 31-60 | -20% | -50% | Moyen |
| 61-100 | -10% | -50% | Important |

---

## ANNÉE 1 : Système Membres (101+)

Les inscrits au-delà des 100 premiers n'ont **pas de réduction de base**.

| Rang | Réduction de base | Peut atteindre | Effort nécessaire |
|------|-------------------|----------------|-------------------|
| 101+ | 0% | -50% | Maximum |

### Fonctionnement des réductions mensuelles

1. **Mois N** : Le membre accumule des points (compteur mensuel)
2. **Fin du mois N** : On calcule la réduction méritée
3. **Mois N+1** : Il bénéficie de cette réduction
4. **1er du mois suivant** : Compteur mensuel remis à zéro, on recommence

---

## APRÈS 1 AN : Tout le monde au même niveau

### La réduction de base dépend du niveau de gamification

Après 1 an, **Fondateurs et Membres sont traités pareil**. La réduction de base dépend du niveau atteint (points cumulés) :

| Niveau | Points cumulés | Réduction de base |
|--------|----------------|-------------------|
| Légende | 5000+ | -50% |
| Expert | 1500 - 4999 | -30% |
| Régulier | 500 - 1499 | -20% |
| Débutant | 0 - 499 | -10% |

### Possibilité d'améliorer avec les points mensuels

Le système mensuel continue de fonctionner. Même avec une réduction de base faible, on peut atteindre -50% en accumulant assez de points dans le mois.

| Niveau de base | Effort pour atteindre -50% |
|----------------|---------------------------|
| Légende (-50%) | Aucun (déjà au max) |
| Expert (-30%) | Faible |
| Régulier (-20%) | Moyen |
| Débutant (-10%) | Important |

### Grille des seuils de points mensuels

Combien de points faut-il accumuler dans le mois pour améliorer sa réduction ?

| Ta réduction de base | Points pour -20% | Points pour -30% | Points pour -50% |
|----------------------|------------------|------------------|------------------|
| -50% (Platine/Légende) | - | - | Automatique |
| -30% (Or/Expert) | - | Automatique | 150 pts |
| -20% (Argent/Régulier) | Automatique | 150 pts | 300 pts |
| -10% (Bronze/Débutant) | 100 pts | 200 pts | 400 pts |
| 0% (Membre 101+) | 150 pts | 300 pts | 500 pts |

#### Exemples

**Sophie a -20% de base (niveau Régulier) :**
- Elle ne fait rien ce mois → -20% le mois prochain
- Elle fait 150 pts → -30% le mois prochain
- Elle fait 300 pts → -50% le mois prochain

**Paul a 0% de base (Membre 150ème) :**
- Il fait 150 pts → -20%
- Il fait 300 pts → -30%
- Il fait 500 pts → -50%

---

## Exemples de parcours utilisateur sur 1 an

### Camille (devient Légende) - Très active

**Ce qu'elle fait chaque mois :**
- Achète ~100 crédits (+300 pts)
- Utilise ~15-20 outils (+75-100 pts)
- Se connecte ~25-30 jours (+50-60 pts)
- Parraine 2-3 personnes (+60-90 pts)

**Après 1 an :** ~5 200 points cumulés → **Niveau Légende** → **-50% pour l'année 2**

**Ce qu'elle te rapporte :** ~1 100 crédits achetés = **~99€/an**

---

### Pierre (devient Expert) - Actif régulièrement

**Ce qu'elle fait chaque mois :**
- Achète ~30 crédits (+90 pts)
- Utilise ~5 outils (+25 pts)
- Se connecte ~15 jours (+30 pts)

**Après 1 an :** ~1 760 points cumulés → **Niveau Expert** → **-30% pour l'année 2**

**Ce qu'il te rapporte :** ~350 crédits achetés = **~31€/an**

---

### Sophie (devient Régulier) - Peu active

**Ce qu'elle fait chaque mois :**
- Achète ~10-20 crédits (+30-60 pts)
- Utilise ~2-3 outils (+10-15 pts)
- Se connecte ~5-10 jours (+10-20 pts)
- Quelques mois sans activité

**Après 1 an :** ~590 points cumulés → **Niveau Régulier** → **-20% pour l'année 2**

**Ce qu'elle te rapporte :** ~110 crédits achetés = **~10€/an**

---

### Thomas (reste Débutant) - Presque inactif

**Ce qu'il fait :**
- Complète son profil (+50 pts)
- Se connecte quelques jours (+20-30 pts)
- N'achète presque rien

**Après 1 an :** ~125 points cumulés → **Niveau Débutant** → **-10% pour l'année 2**

**Ce qu'il te rapporte :** ~10 crédits achetés = **~1€/an**

---

## Projection de revenus

### Avec 1000 utilisateurs (distribution réaliste)

| Profil | % | Nombre | Revenu unitaire | Revenu total |
|--------|---|--------|-----------------|--------------|
| Légende (comme Camille) | 5% | 50 | 99€ | 4 950€ |
| Expert (comme Pierre) | 15% | 150 | 31€ | 4 650€ |
| Régulier (comme Sophie) | 30% | 300 | 10€ | 3 000€ |
| Débutant (comme Thomas) | 50% | 500 | 1€ | 500€ |
| **TOTAL** | 100% | 1000 | | **13 100€/an** |

**Revenu moyen par utilisateur : ~13€/an**

---

## Récapitulatif visuel du cycle de vie

```
┌───────────────────────────────────────────────────────────────────────┐
│                            ANNÉE 1                                    │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  FONDATEURS (1-100)                                                   │
│    Réduction de BASE selon rang d'inscription :                       │
│    1-10: -50%  │  11-30: -30%  │  31-60: -20%  │  61-100: -10%        │
│    Peuvent AMÉLIORER via points mensuels                              │
│                                                                       │
│  MEMBRES (101+)                                                       │
│    Réduction de BASE : 0%                                             │
│    Doivent tout gagner via points mensuels                            │
│                                                                       │
│  Tout le monde accumule des points cumulés (gamification)             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
                                 ↓
┌───────────────────────────────────────────────────────────────────────┐
│                          APRÈS 1 AN                                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  TOUT LE MONDE PAREIL (Fondateurs et Membres)                         │
│                                                                       │
│  Réduction de BASE selon niveau de gamification :                     │
│    Légende (5000+ pts): -50%                                          │
│    Expert (1500-4999 pts): -30%                                       │
│    Régulier (500-1499 pts): -20%                                      │
│    Débutant (0-499 pts): -10%                                         │
│                                                                       │
│  Peuvent AMÉLIORER via points mensuels (système continue)             │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Système de gamification

### Niveaux de réputation

| Niveau | Points cumulés | Avantages |
|--------|----------------|-----------|
| Débutant | 0 - 499 | Visibilité faible |
| Régulier | 500 - 1499 | Visibilité moyenne |
| Expert | 1500 - 4999 | Bonne visibilité |
| Légende | 5000+ | Visibilité maximale |

### Badges

#### Badges Débutant (faciles à obtenir)

| Badge | Condition |
|-------|-----------|
| Nouveau membre | Créer son compte |
| Profil complété | Remplir 100% du profil |
| Premier outil | Utiliser 1 outil IA |

#### Badges Activité (engagement régulier)

| Badge | Condition |
|-------|-----------|
| Fidèle 7 jours | Se connecter 7 jours de suite |
| Fidèle 30 jours | Se connecter 30 jours de suite |
| Accro aux outils | Utiliser 50 outils |
| Gros consommateur | Acheter 500 crédits au total |

#### Badges Sociaux (parrainage, avis)

| Badge | Condition |
|-------|-----------|
| Premier parrain | Parrainer 1 personne |
| Super parrain | Parrainer 10 personnes |
| Bien noté | Recevoir 5 avis positifs |
| Star | Recevoir 20 avis positifs |

#### Badges Prestige (difficiles)

| Badge | Condition |
|-------|-----------|
| Légende | Atteindre le niveau Légende |
| Fondateur | Faire partie des 100 premiers |
| Top mensuel | Être #1 du mois en points |

### Visibilité sur la carte

#### Tri par défaut

Les profils sont triés par :
1. **Niveau de réputation** (Légende en premier, Débutant en dernier)
2. **Nombre de points cumulés** (à niveau égal)

#### Exemple d'affichage

| Position | Livreur | Niveau | Points |
|----------|---------|--------|--------|
| 1 | Camille | Légende | 6 200 pts |
| 2 | Marc | Légende | 5 100 pts |
| 3 | Julie | Expert | 3 800 pts |
| 4 | Pierre | Expert | 2 100 pts |
| 5 | Sophie | Régulier | 900 pts |
| 6 | Thomas | Débutant | 125 pts |

#### Filtres disponibles

| Filtre | Options |
|--------|---------|
| Zone géographique | Pointe-à-Pitre, Basse-Terre, Marie-Galante, Les Saintes, La Désirade, etc. |
| Type de véhicule | Vélo, scooter, moto, voiture, utilitaire, vélo cargo |
| Disponibilité | Disponible maintenant, Tous |
| Note minimum | 3+ étoiles, 4+ étoiles, 5 étoiles |
| Badges | Certifié, Fidèle, Expert, Fondateur, etc. |

Le pro peut combiner les filtres. Le tri (niveau + points) s'applique toujours après filtrage.

### Fondateurs et gamification (année 1)

Les Fondateurs reçoivent les avantages gamification **automatiquement pendant 3 mois après le lancement de Cobeone**.

Après ces 3 mois, ils doivent se battre comme tout le monde.

---

## Urgences à créer (acquisition)

### Urgence 1 : Places Fondateurs limitées
> "Seulement 100 places Fondateurs Livreurs et 100 places Fondateurs Pros"

### Urgence 2 : Crédits offerts (temps limité)
> "50 crédits offerts jusqu'au [date]"

Après cette date, les nouveaux n'ont plus de crédits offerts.

### Urgence 3 : Durée limitée des avantages
> "Réductions Fondateurs valables 1 an, ensuite basées sur votre activité"

Crée une motivation à rester actif.

---

## Stratégie complète

Tous les points ont été définis. La stratégie est prête à être implémentée.

---

## Différences avec le code actuel

Le code actuel de SparkHub fonctionne différemment :
- Le tier est basé sur le rang d'inscription (fixe)
- Abonnement à 9€/mois pour tout le monde
- Pas de système "effort variable selon classement"
- Pas de validation manuelle N° Cobeone
- Un seul compteur de points
- Prix des outils différents

**À implémenter** :
- [ ] Deux compteurs de points (mensuel + cumulé)
- [ ] Système Fondateurs (100 livreurs + 100 pros) avec réductions 1 an
- [ ] Système d'amélioration des réductions par les points mensuels
- [ ] Transition après 1 an : réduction de base = niveau de gamification
- [ ] Niveaux de réputation (Débutant → Légende)
- [ ] Badges (Débutant, Activité, Sociaux, Prestige)
- [ ] Inscription avec N° client Cobeone obligatoire
- [ ] Validation manuelle + alerte admin
- [ ] Message "vérification en cours" + notification mail/WhatsApp
- [ ] Gratuité de l'inscription (outils payants uniquement)
- [ ] Tri des profils sur la carte par niveau + points
- [ ] Nouveaux prix des outils (Kling 11, Hailuo 13, Sora 16, Sora Pro 46, Veo 3 62, Veo 3+Audio 123)

---

*Ce document sera mis à jour au fur et à mesure de nos discussions.*
