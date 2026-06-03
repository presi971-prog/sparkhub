# SparkPilot — Playbook stratégies éprouvées V1

> Source de vérité unique pour la décomposition d'une priorité SparkScan en tâches.
> Mis à jour 30/05/2026.
> Version : `v1.0`

## Principe

Quand SparkPilot transforme une priorité stratégique en tâches concrètes, il **ne doit pas inventer**. Il consulte ce playbook qui contient les méthodes **éprouvées et reconnues** par catégorie de priorité.

Chaque tâche générée doit :
1. Citer le framework dont elle découle
2. Stocker la version du playbook utilisée (`playbook_version: v1.0`)
3. Avoir une durée estimée réaliste
4. Permettre à l'utilisateur de marquer son résultat ("ça a marché / ça n'a pas marché")

---

## Catégories de priorités SparkScan (typologie)

Les priorités SparkScan tombent généralement dans une de ces 5 catégories. Le moteur de décomposition identifie la catégorie d'abord, puis applique le playbook correspondant.

1. **Visibilité IA** (Perplexity / ChatGPT / Google AI Overview)
2. **Conversion site / page d'accueil** (visiteur → lead)
3. **Contenu de fond** (SEO long terme, autorité sectorielle)
4. **Présence sociale** (LinkedIn, Instagram, TikTok)
5. **Acquisition payante** (Meta Ads, Google Ads)

---

## Playbook 1 — Visibilité IA

**Pourquoi** : 50% des recherches B2B en 2026 passent par Perplexity, ChatGPT, Google AI Overview. Si tu n'es pas cité, tu n'existes pas pour ces canaux.

### Frameworks éprouvés
- **Generative Engine Optimization (GEO)** : optimiser le contenu pour les moteurs génératifs (Aleksandr et al. 2023)
- **E-E-A-T** : Experience, Expertise, Authoritativeness, Trustworthiness (Google Search Quality Guidelines)
- **Schema.org structured data** : balisage JSON-LD reconnu par tous les LLM modernes

### Tâches type (à instancier par le moteur)

| # | Titre tâche | Durée | Framework cité |
|---|---|---|---|
| 1.1 | Lister 10 questions clients fréquentes (Reddit, Quora, AlsoAsked, AnswerThePublic) | 1h | GEO |
| 1.2 | Rédiger 1 page FAQ par question (200-400 mots, ton naturel, exemples concrets) | 2h/page | GEO + E-E-A-T |
| 1.3 | Ajouter Schema FAQPage JSON-LD sur chaque page | 30 min/page | Schema.org |
| 1.4 | Référencer toutes les FAQ dans sitemap.xml | 15 min | SEO technique |
| 1.5 | Soumettre via IndexNow + Search Console + Perplexity Pro | 30 min | Indexation rapide |
| 1.6 | Citer 2-3 sources externes reconnues sur chaque page | 1h total | E-E-A-T |

### Signaux de succès
- Apparition dans Perplexity (test manuel toutes les 2 semaines avec ses questions cibles)
- Tracking via tools comme Otterly.ai ou Profound (V2)
- Croissance organique trafic FAQ pages

### Signaux d'essoufflement → pivot
- Pas de citation IA après 8 semaines → revoir le ton (plus humain), enrichir avec données récentes, citer plus de sources

---

## Playbook 2 — Conversion site / page d'accueil

**Pourquoi** : avant d'attirer plus de trafic, on s'assure qu'on convertit ce qu'on a déjà.

### Frameworks éprouvés
- **StoryBrand** (Donald Miller) : le client est le héros, ton entreprise est le guide
- **Above-the-fold conversion** (Nielsen Norman Group) : tout l'essentiel doit être visible sans scroller
- **AIDA** : Attention, Intérêt, Désir, Action — séquencement classique
- **Proof-driven copy** : promesses chiffrées > promesses vagues

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 2.1 | Réécrire le hero avec promesse chiffrée + délai (max 15 mots) | 1h | AIDA / Above-the-fold |
| 2.2 | Ajouter 1 témoignage client / cas concret au-dessus de la ligne de flottaison | 1h30 | StoryBrand |
| 2.3 | Vérifier CTA principal visible sur mobile sans scroller | 30 min | Above-the-fold |
| 2.4 | Structurer la page en 3 blocs : problème → solution → preuve | 2h | StoryBrand |
| 2.5 | Ajouter FAQ courte (5 questions kill-objections) en bas de page | 1h30 | Conversion-driven design |
| 2.6 | Tester sur 5 personnes externes "tu comprends ce qu'on vend en 10 sec ?" | 1h | User test léger |

### Signaux de succès
- Taux de conversion landing → contact qui monte
- Temps moyen passé sur la home qui augmente
- Diminution du taux de rebond mobile

### Signaux d'essoufflement → pivot
- Pas de progression conversion après 6 semaines → A/B test sur le hero (autre angle), audit utilisateur en physique

---

## Playbook 3 — Contenu de fond (SEO long terme)

**Pourquoi** : Google récompense l'autorité topique. Un site avec 1 article = invisible. Un site avec 10 articles cohérents = autorité.

### Frameworks éprouvés
- **Pillar + Cluster** (popularisé par HubSpot) : 1 article central + 4-8 articles satellites qui linkent vers lui
- **Skyscraper Technique** (Brian Dean, Backlinko) : trouver le meilleur contenu existant et faire 10× mieux
- **Topical Authority** : couvrir TOUS les angles d'un sujet pour devenir LA référence
- **Internal linking** : structurer les liens pour distribuer l'autorité

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 3.1 | Choisir 1 sujet pillar (sujet large où être LA référence locale) | 1h | Topical Authority |
| 3.2 | Rédiger article pillar 2000-3000 mots | 6-8h | Pillar + Cluster |
| 3.3 | Lister 4-8 sous-sujets pour les clusters | 1h | Pillar + Cluster |
| 3.4 | Rédiger 1 article cluster 800-1500 mots (à répéter par cluster) | 3-4h/article | Skyscraper |
| 3.5 | Linker chaque cluster vers le pillar + entre eux | 1h | Internal linking |
| 3.6 | Ajouter Schema Article + featured snippet target sur chaque | 30 min/article | SEO technique |
| 3.7 | Promotion via newsletter + LinkedIn + WhatsApp Business | 2h total | Distribution |

### Signaux de succès
- Position Google qui monte sur les mots-clés ciblés
- Trafic organique mensuel qui croît mois après mois
- Backlinks naturels qui arrivent (signe d'autorité)

### Signaux d'essoufflement → pivot
- Aucune progression à 3 mois → audit technique (vitesse, mobile, indexation), enrichissement des articles avec data fraîche

---

## Playbook 4 — Présence sociale

**Pourquoi** : LinkedIn, Instagram, TikTok sont les canaux où les TPE/PME se font connaître localement en 2026.

### Frameworks éprouvés
- **Hook-Story-CTA** (Justin Welsh) : accroche 1 ligne, histoire concrète, appel à l'action clair
- **Hormozi's lead magnet** : donner massivement de la valeur gratuite pour attirer
- **Native format first** : un Reel n'est pas un TikTok n'est pas un post LinkedIn

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 4.1 | Définir 3 piliers de contenu (sujets récurrents) | 1h | Brand pillars |
| 4.2 | Planifier 3 publications semaine (1 par pilier) | 30 min/semaine | Cadence |
| 4.3 | Rédiger 1 post LinkedIn (Hook-Story-CTA) | 45 min/post | Justin Welsh |
| 4.4 | Tourner 1 Reel Instagram (15-30 sec, format vertical) | 1h/reel | Native format |
| 4.5 | Répondre à 100% des commentaires sous 24h | 30 min/jour | Engagement |
| 4.6 | Identifier 5 comptes locaux à suivre et engager chaque semaine | 30 min/semaine | Networking |

### Signaux de succès
- Croissance abonnés > 5% mois (calibré contexte local GP)
- Engagement rate > 3% (likes + commentaires / abonnés)
- Messages privés entrants qui qualifient → leads

### Signaux d'essoufflement → pivot
- Engagement < 1% après 8 semaines → changer de format dominant, tester nouveau pilier de contenu

---

## Playbook 5 — Acquisition payante (Meta Ads, Google Ads)

**Pourquoi** : pour scaler vite quand l'organic met du temps.

### Frameworks éprouvés
- **Andromeda** (validé en interne projet-B, ligne guide DCG AI) — voir [[feedback-andromeda-ligne-guide-dcg-ai]]
- **PAS copywriting** (Problème, Agitation, Solution) pour les hooks publicitaires
- **TOFU/MOFU/BOFU** : adapter le message au stade du funnel
- **CBO Meta** : Campaign Budget Optimization pour laisser Meta arbitrer

### Tâches type

| # | Titre tâche | Durée | Framework |
|---|---|---|---|
| 5.1 | Définir audience cible précise (zone GP + intérêts + âge) | 1h | Andromeda |
| 5.2 | Rédiger 3 hooks différents (PAS, bénéfice direct, témoignage) | 2h | PAS + multivariate |
| 5.3 | Tourner 3 créas vidéo 15 sec (1 par hook) | 4h | Native format |
| 5.4 | Lancer campagne Meta CBO avec 3 hooks en parallèle | 2h | CBO Meta |
| 5.5 | Analyser perf à J+7 et couper les hooks < seuil | 1h | A/B kill |
| 5.6 | Optimiser la création gagnante en variations | 3h | Iteration |

### Signaux de succès
- CPM stable ou en baisse semaine sur semaine
- CTR > 1.5% (Meta GP) ou > 3% (Google Search)
- Coût par lead qualifié sous le seuil défini par l'utilisateur

### Signaux d'essoufflement → pivot
- CTR < 0.8% sur 4 hooks → revoir l'angle complet (changer de proposition, pas juste la créa)
- Audience saturée (frequency > 4) → changer d'audience

---

## Évolution dans le temps (R0 stratégie qui vit)

### Plan constant
Si une stratégie marche bien sur un mois (succès > 70% des tâches, leads en hausse) → SparkPilot propose **le même playbook le mois suivant** avec :
- Variations cohérentes (nouveau sujet cluster, nouveau hook, nouveau pilier)
- Augmentation progressive du volume (1 article/semaine → 2/semaine)
- Renforcement des canaux qui ramènent

### Plan qui pivote
Si une stratégie s'essouffle (signaux ci-dessus) → SparkPilot propose **un pivot** :
- Changement de catégorie (passer de "Visibilité IA" à "Acquisition payante" temporairement)
- Test d'un nouveau framework dans la même catégorie
- Audit avec un humain (consultant) suggéré

### Re-scan trimestriel
Tous les 90 jours, SparkPilot recommande de relancer SparkScan pour voir comment les concurrents ont bougé. Le nouveau rapport peut changer les priorités → nouveau plan généré.

---

## Versioning

| Version | Date | Changements |
|---|---|---|
| v1.0 | 2026-05-30 | Création initiale, 5 playbooks de base |

Quand le marché évolue (nouveau format majeur, changement algo, nouveau framework éprouvé), on bump une version (v1.1, v2.0...) et on documente le changelog ici.

Chaque tâche générée stocke `playbook_version` dans `metadata` → traçabilité.

---

## R0 absolues qui régissent ce playbook

1. **Ne jamais inventer** : si un framework n'est pas largement reconnu dans la communauté SEO/marketing en 2026, on ne l'ajoute pas
2. **Citer la source** quand possible (auteur, équipe, document de référence)
3. **Mesurer en réel** : les signaux de succès/essoufflement doivent être chiffrés, pas vagues
4. **Adapter au contexte GP** : tenir compte des spécificités Guadeloupe (WhatsApp prioritaire vs SMS, taille marché restreinte, marché de proximité)
5. **Pédagogie partout** : les titres de tâches et les descriptions doivent être lisibles par un artisan ou un restaurateur, pas par un dev ou un growth hacker

---

## À enrichir en V1.5+

- Playbook 6 : Email marketing (Mailerlite/Klaviyo/Lemlist)
- Playbook 7 : Notations Google Business / TripAdvisor / Trustpilot
- Playbook 8 : Webinaires & événements physiques locaux GP
- Données outcomes anonymisées des autres users DCG AI (apprentissage collectif)
