# SparkPilot — Playbook stratégies éprouvées V2

> Source de vérité unique pour la décomposition d'une priorité SparkScan en tâches.
> Mis à jour 03/07/2026 (aligné sur le référentiel prouvé v2.0 : veille algorithmes complète, sources officielles Meta/Instagram/LinkedIn/Google + études 2025-2026).
> Version : `v2.0`

## Principe

Quand SparkPilot transforme une priorité stratégique en tâches concrètes, il **ne doit pas inventer**. Il consulte ce playbook qui contient les méthodes **éprouvées et reconnues** par catégorie de priorité.

Chaque tâche générée doit :
1. Citer le framework dont elle découle
2. Stocker la version du playbook utilisée (`playbook_version: v2.0`)
3. Avoir une durée estimée réaliste
4. Permettre à l'utilisateur de marquer son résultat ("ça a marché / ça n'a pas marché")

## ⚠️ Règle transversale 2026 (s'applique à TOUTES les catégories)

Les plateformes ne pénalisent pas le contenu IA : elles pénalisent le **contenu répétitif sans valeur ajoutée** (Meta 03/2026, Instagram 04/2026, LinkedIn 05/2026 avec détection à 94 %, Google « scaled content abuse »). Toute tâche de production doit donc imposer :
- au moins 1 élément local non générable par une IA (fait terrain, chiffre réel, cas concret, vraie photo, opinion) ;
- une variation réelle de format et d'angle (jamais deux contenus sur le même gabarit d'affilée) ;
- JAMAIS de commentaires automatisés, JAMAIS d'engagement bait.

---

## Catégories de priorités SparkScan (typologie)

1. **Visibilité IA** (Perplexity / ChatGPT / Google AI Overview)
2. **Conversion site / page d'accueil** (visiteur → lead)
3. **Contenu de fond** (SEO long terme, autorité sectorielle)
4. **Présence sociale** (Facebook, Instagram, LinkedIn, TikTok, fiche Google)
5. **Acquisition payante** (Meta Ads, Google Ads)

---

## Playbook 1 — Visibilité IA

**Pourquoi** : 45 % des consommateurs utilisent déjà ChatGPT & co pour trouver un commerce local (BrightLocal 02/2026, contre 6 % un an avant), le trafic venu de ChatGPT convertit à 7,1 % (Similarweb 05/2026), et les AI Overviews arrivent en France à l'été 2026 (au plus tard 23/09/2026) : la fenêtre pour se positionner AVANT est maintenant.

### Frameworks éprouvés
- **Generative Engine Optimization (GEO)** : stats réelles, citations attribuées, sources → +25 à +28 % de visibilité IA ; profite surtout aux sites mal classés (papier arXiv 2311.09735)
- **Brand mentions first** : les mentions de marque hors-site sont le facteur n°1 de citation IA (corrélation 0,664 vs 0,218 pour les backlinks, Ahrefs 75K marques)
- **E-E-A-T** : Experience, Expertise, Authoritativeness, Trustworthiness (Google Search Quality Guidelines)

### Tâches type (à instancier par le moteur)

| # | Titre tâche | Durée | Framework cité |
|---|---|---|---|
| 1.1 | Lister 10 questions que de vrais clients posent aux IA (questions du scan SparkScan + AlsoAsked) | 1h | GEO |
| 1.2 | Rédiger 1 page réponse par question (réponse directe en haut, puis valeur locale inextractible : vrais prix, cas terrain) | 2h/page | GEO + E-E-A-T |
| 1.3 | Ouvrir robots.txt aux bots IA (OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User) et vérifier le pare-feu | 30 min | Indexabilité IA |
| 1.4 | Obtenir 3 mentions de marque hors-site (annuaire local, presse locale, CCI, association pro) | 2h | Brand mentions first |
| 1.5 | Ajouter stats sourcées + citations attribuées dans les 3 pages les plus vues | 1h30 | GEO |
| 1.6 | Compléter la fiche Google Business à 100 % (catégorie principale exacte, horaires, services) : c'est la donnée d'entrée des recommandations IA locales | 1h | Grounding local |

### Signaux de succès
- Score de visibilité IA du scan SparkScan qui monte (page Suivi, delta à chaque re-scan hebdo)
- Rang IA vs concurrents qui monte
- Mentions du nom de la marque sur des sites tiers qui augmentent

### Signaux d'essoufflement → pivot
- Pas de progression du score IA après 8 semaines → prioriser les mentions hors-site (levier n°1) et enrichir les pages avec des données locales fraîches

---

## Playbook 2 — Conversion site / page d'accueil

**Pourquoi** : avant d'attirer plus de trafic, on s'assure qu'on convertit ce qu'on a déjà.

### Frameworks éprouvés
- **StoryBrand** (Donald Miller) : le client est le héros, ton entreprise est le guide
- **Above-the-fold conversion** (Nielsen Norman Group) : l'essentiel visible sans scroller
- **AIDA** : Attention, Intérêt, Désir, Action
- **Friction minimale** (Baymard) : remplacer les formulaires par WhatsApp en Guadeloupe

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 2.1 | Réécrire le hero avec promesse claire + bénéfice (max 15 mots, lisible niveau CM2-5e) | 1h | AIDA / Above-the-fold |
| 2.2 | Ajouter 1 preuve vérifiable au-dessus de la ligne de flottaison (jamais de faux témoignage) | 1h30 | StoryBrand |
| 2.3 | Vérifier CTA principal visible sur mobile sans scroller + CTA sticky mobile | 30 min | Above-the-fold |
| 2.4 | Structurer la page en 3 blocs : problème → solution → preuve | 2h | StoryBrand |
| 2.5 | Remplacer tout formulaire >3 champs par un bouton WhatsApp (wa.me) | 1h | Friction minimale |
| 2.6 | Tester sur 5 personnes externes "tu comprends ce qu'on vend en 10 sec ?" | 1h | User test léger |

### Signaux de succès
- Taux de conversion landing → contact qui monte
- Diminution du taux de rebond mobile

### Signaux d'essoufflement → pivot
- Pas de progression conversion après 6 semaines → A/B test sur le hero (autre angle), audit utilisateur en physique

---

## Playbook 3 — Contenu de fond (SEO long terme)

**Pourquoi** : Google récompense l'autorité topique ET, depuis la Discover update de février 2026, le contenu localement pertinent + l'expertise démontrée sujet par sujet. La niche « métier × lieu » coche toutes les cases.

### Frameworks éprouvés
- **Pillar + Cluster** (HubSpot) : 1 article central + 4-8 satellites liés
- **Topical Authority locale** : couvrir tous les angles de « [service] pour [métier] à [lieu] »
- **People-first + IA assistée** : IA autorisée si relecture humaine + apport original (la ligne exacte de Google : les 1 446 sites désindexés en 2024 étaient tous de l'IA brute à grande échelle)
- **Écrire pour l'après-AI-Overviews** : réponse en 2 phrases en haut, valeur inextractible en dessous (vrais prix locaux, retours terrain, checklists)

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 3.1 | Choisir 1 sujet pillar « métier × lieu » où être LA référence locale | 1h | Topical Authority |
| 3.2 | Rédiger l'article pillar (auteur identifié avec bio, 1-2 éléments terrain invérifiables par une IA) | 4-6h | Pillar + people-first |
| 3.3 | Lister 4-8 sous-sujets clusters depuis les questions du scan | 1h | Pillar + Cluster |
| 3.4 | Rédiger 1 article cluster (réponse directe en haut, valeur locale en dessous) | 2-3h/article | Après-AIO |
| 3.5 | Linker chaque cluster vers le pillar + entre eux | 1h | Internal linking |
| 3.6 | Ajouter Schema Article + LocalBusiness (PAS de Schema FAQ : rich results dépréciés depuis mai 2026) | 30 min/article | SEO technique |
| 3.7 | Décliner l'article en 1 carrousel PDF LinkedIn (Page) + 1 post Google | 1h | Distribution |

### Signaux de succès
- Positions Google qui montent sur « métier × lieu » (page Suivi, mots-clés du scan)
- Trafic organique mensuel qui croît
- Citations dans les réponses IA (score GEO du scan)

### Signaux d'essoufflement → pivot
- Aucune progression à 3 mois → audit technique (vitesse, mobile, indexation), enrichissement avec données locales fraîches

---

## Playbook 4 — Présence sociale

**Pourquoi** : Facebook et Instagram sont les canaux de proximité n°1 en Guadeloupe (Groupes locaux + Marketplace inclus), LinkedIn est le canal B2B, et chaque post Instagram est indexé par Google depuis le 10/07/2025 (= des mini pages de recherche locale).

### Frameworks éprouvés (mis à jour v2.0)
- **Hook-Story-CTA** (Justin Welsh) : accroche 1 ligne, histoire concrète, appel à l'action clair
- **Partage d'abord** : les signaux dominants 2026 sont les envois par DM (Instagram), le dwell time (LinkedIn) et les commentaires (Facebook) → formats « checklist/comparatif qu'on envoie à un collègue »
- **Native format first** : un Reel n'est pas un TikTok n'est pas un post LinkedIn ; les liens vont en commentaire (Facebook) ou sur la Page (LinkedIn : +51 % vs -27 % sur profil)
- **Golden hour** (LinkedIn) : les 60-90 premières minutes décident de la portée → publier uniquement quand on peut répondre aux commentaires dans l'heure

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 4.1 | Définir 3 piliers de contenu (sujets récurrents, ancrés métier local) | 1h | Brand pillars |
| 4.2 | Tenir la cadence par réseau : Instagram 3-5/sem (Reels sous-titrés + carrousels), Facebook constance sans liens dans le post, LinkedIn 2-5/sem max 1/jour | 30 min/sem | Cadences mesurées 2026 |
| 4.3 | Rédiger 1 carrousel PDF LinkedIn 3-10 slides (format n°1) pour la Page, avec le lien blog | 1h30 | Carrousel LinkedIn |
| 4.4 | Tourner 1 Reel vertical <90 s SOUS-TITRÉ (50 % regardent sans le son), décliné TikTok/Shorts | 1h/reel | Native format |
| 4.5 | 1re ligne de chaque post Instagram = mot-clé métier + lieu (posts indexés Google) + géotag + ≤5 hashtags | 15 min/post | SEO Instagram |
| 4.6 | Répondre à 100 % des commentaires dans l'heure qui suit la publication (jamais automatisé) | 30 min/jour | Golden hour / engagement |
| 4.7 | Publier 1-2 posts/semaine sur la fiche Google (JAMAIS de téléphone dans le texte, vraie photo obligatoire) | 30 min/sem | GBP conversion |
| 4.8 | Relayer 1 contenu/semaine dans les Groupes Facebook locaux (à la main, jamais automatisé) | 30 min/sem | Proximité GP |

### Signaux de succès
- Partages/envois par DM et commentaires qui montent (pas seulement les likes)
- Portée vers les non-abonnés (recommandations) qui monte
- Messages privés entrants qui qualifient → leads

### Signaux d'essoufflement → pivot
- Engagement <1 % après 8 semaines → changer le format dominant (basculer vers carrousels si Reels s'essoufflent, ou inversement), tester un nouveau pilier
- Portée non-abonnés qui chute brutalement → suspicion de classification « contenu répétitif » : augmenter la variation et l'ancrage local, réduire le volume 2 semaines

---

## Playbook 5 — Acquisition payante (Meta Ads, Google Ads)

**Pourquoi** : pour scaler vite quand l'organic met du temps.

### Frameworks éprouvés
- **Andromeda** (validé en interne projet-B, ligne guide DCG AI)
- **PAS copywriting** (Problème, Agitation, Solution) pour les hooks publicitaires
- **TOFU/MOFU/BOFU** : adapter le message au stade du funnel
- **1 campagne, 1 ad set, budget consolidé** (Meta Business Help) : ne pas fragmenter un micro-budget

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 5.1 | Définir audience LARGE zone GP (ne pas sur-segmenter : ~380 000 hab) | 1h | Andromeda |
| 5.2 | Rédiger 3 hooks différents (PAS, bénéfice direct, preuve) | 2h | PAS + multivariate |
| 5.3 | Préparer 2-3 créas MAX dans le même ad set | 4h | Anti-fragmentation |
| 5.4 | Lancer campagne click-to-WhatsApp (métrique = conversations démarrées) | 2h | Objectif aligné |
| 5.5 | Ne RIEN toucher pendant 5-7 jours puis analyser et couper les hooks < seuil | 1h | Apprentissage Meta |
| 5.6 | Décliner la créa gagnante en variations | 3h | Iteration |

### Signaux de succès
- CPM stable ou en baisse semaine sur semaine
- CTR > 1.5 % (Meta GP)
- Coût par conversation qualifiée sous le seuil défini par l'utilisateur

### Signaux d'essoufflement → pivot
- CTR < 0.8 % sur 4 hooks → revoir l'angle complet (changer de proposition, pas juste la créa)
- Audience saturée (frequency > 4) → changer d'audience

---

## Évolution dans le temps (R0 stratégie qui vit)

### Plan constant
Si une stratégie marche bien sur un mois (succès > 70 % des tâches, leads en hausse) → SparkPilot propose **le même playbook le mois suivant** avec :
- Variations cohérentes (nouveau sujet cluster, nouveau hook, nouveau pilier)
- Augmentation progressive du volume, dans les plafonds mesurés (Instagram max 5/sem, LinkedIn max 1/jour)
- Renforcement des canaux qui ramènent

### Plan qui pivote
Si une stratégie s'essouffle (signaux ci-dessus) → SparkPilot propose **un pivot** :
- Changement de catégorie (passer de "Visibilité IA" à "Acquisition payante" temporairement)
- Test d'un nouveau framework dans la même catégorie
- Audit avec un humain (consultant) suggéré

### Re-scan hebdomadaire
Le re-scan automatique SparkScan (hebdo, en prod depuis le 03/07/2026) mesure score IA, rang vs concurrents et mots-clés. Chaque nouveau scan alimente la page Suivi et peut régénérer le plan (nouvelles priorités → nouvelles tâches).

---

## Versioning

| Version | Date | Changements |
|---|---|---|
| v1.0 | 2026-05-30 | Création initiale, 5 playbooks de base |
| v2.0 | 2026-07-03 | Alignement veille algorithmes 2026 : règle transversale anti-répétition ; Facebook + fiche Google intégrés au playbook social ; carrousel PDF LinkedIn + routage des liens (Page vs profil) ; golden hour ; cadences mesurées (IG 3-5/sem, LinkedIn max 1/jour) ; sous-titres Reels ; SEO Instagram (indexation Google 10/07/2025) ; suppression Schema FAQ (déprécié 05/2026) ; Visibilité IA recentrée sur mentions hors-site + robots.txt bots IA + fenêtre AI Overviews France ; signaux de succès basés partages/DM/dwell plutôt que likes |

Chaque tâche générée stocke `playbook_version` dans `metadata` → traçabilité.

---

## R0 absolues qui régissent ce playbook

1. **Ne jamais inventer** : si un framework n'est pas largement reconnu dans la communauté SEO/marketing en 2026, on ne l'ajoute pas
2. **Citer la source** quand possible (auteur, équipe, document de référence)
3. **Mesurer en réel** : les signaux de succès/essoufflement doivent être chiffrés, pas vagues
4. **Adapter au contexte GP** : WhatsApp prioritaire vs SMS, taille marché restreinte, marché de proximité, Groupes Facebook locaux
5. **Pédagogie partout** : les titres de tâches et les descriptions doivent être lisibles par un artisan ou un restaurateur
6. **La conversation ne s'automatise JAMAIS** : commentaires, avis, groupes = un humain

---

## À enrichir en V2.5+

- Playbook 6 : Email marketing (nurture des leads capturés)
- Playbook 7 : Avis Google / Trustpilot (campagne de collecte systématique)
- Playbook 8 : Webinaires & événements physiques locaux GP
- Données outcomes anonymisées des autres users DCG AI (apprentissage collectif)
