# Référentiel des stratégies PROUVÉES (2024-2026) — socle anti-invention de SparkPilot

> Ce document est la SEULE base sur laquelle l'expert SparkPilot a le droit de juger
> l'analyse de SparkScan. Règle absolue : si une recommandation n'est ni soutenue
> par une tactique prouvée ci-dessous, ni contredite par un anti-pattern ci-dessous,
> l'expert répond « non vérifiable » — il N'INVENTE JAMAIS de preuve ni de chiffre.
>
> Niveaux de preuve : [PROUVÉ] = source primaire (doc officielle plateforme / papier
> académique / étude à grand échantillon). [TENDANCE] = consensus d'experts sans étude
> massive. [SPÉCULATIF] = circule mais non sourçable → à traiter comme NON fiable.
>
> **VEILLE** — Version v2.0, dernière mise à jour : **03/07/2026** (veille complète : 6 recherches sourcées, sources officielles Meta/Instagram/LinkedIn/Google + études Buffer/Socialinsider/Metricool/Ahrefs/BrightLocal 2025-2026). Prochaine veille conseillée : **~03/10/2026**.
> Procédure de veille (à faire AVEC validation humaine, jamais en auto-écrasement) :
> 1. Relancer les 5 recherches sourcées (blog/SEO, réseaux, GEO, conversion, pub).
> 2. Comparer aux entrées ci-dessous ; ne remplacer que ce qui a une NOUVELLE source fiable.
> 3. Mettre à jour la date ci-dessus. Tout ce qui n'est pas re-sourcé reste tel quel ou passe en [SPÉCULATIF].

---

## ⚠️ LA RÈGLE TRANSVERSALE 2026 : L'ORIGINALITÉ OU LA MORT (ajout v2.0)

Toutes les plateformes ont déployé en 2025-2026 la même arme, non pas contre le contenu IA (autorisé et labellisé partout), mais contre le **contenu répétitif sans valeur ajoutée** :
- **[PROUVÉ] Facebook** : « Rewarding Original Creators » (13/03/2026) : contenu « non original » (reposts, gabarits, clips sans narration, watermarks) = distribution réduite sur TOUTE la Page. Vues des Reels originaux doublées au S2 2025. *(about.fb.com, 13/03/2026 + creators.facebook.com, 14/07/2025)*
- **[PROUVÉ] Instagram** : politique originalité étendue aux photos et carrousels (30/04/2026) : un compte publiant surtout du « non créé ou édité de façon substantielle » est coupé des recommandations aux non-abonnés. *(Engadget/TechCrunch, 30/04/2026)*
- **[PROUVÉ] LinkedIn** : offensive anti « AI slop » (20/05/2026) : détection à 94 % des posts IA génériques → confinés au 1er degré (plus de reach 2e/3e degré). Commentaires automatisés explicitement ciblés. Le contenu « assisté par IA » avec idées originales reste bienvenu. *(TheNextWeb/Entrepreneur, 05/2026)*
- **[PROUVÉ] Google** : « scaled content abuse » = beaucoup de pages IA sans valeur ajoutée = pénalisé (mars 2024 : ~1 446 sites désindexés, motif constant = IA brute à grande échelle sans révision). Aucun cas documenté de pénalité pour IA + relecture humaine + apport original. *(developers.google.com spam policies ; Originality.ai, 03/2024)*
- **[PROUVÉ] Le contenu IA n'est PAS pénalisé en soi** : labels C2PA « AI info » sur Meta/LinkedIn sans impact de portée documenté ; 87,8 % des URLs citées par les AI Overviews sont mixtes humain+IA (corrélation usage IA/citation ≈ 0 ; le 100 % IA atteint rarement la position n°1, le MIX gagne). *(Ahrefs 500K URLs, 14/07/2025)*

**Conséquence opérationnelle pour toute machine de publication** : chaque contenu doit contenir au moins 1 élément non générable par une IA (fait local, chiffre terrain, cas réel, opinion, vraie photo) et varier réellement de format et d'angle. Jamais deux posts sur le même gabarit d'affilée. JAMAIS de commentaires automatisés.

---

## A. CONTENU BLOG / SEO

### Tactiques prouvées (FOND)
- **[PROUVÉ] Intention de recherche** : le contenu doit répondre à ce que l'utilisateur cherche vraiment (info / comparaison / achat / "près de moi"), pas viser un mot-clé. Filtre n°1 : si on ne sait pas quelle intention sert l'article, ne pas l'écrire. *(Google Search Central — Helpful Content)*
- **[PROUVÉ] E-E-A-T, la confiance avant tout** : auteur nommé + expertise réelle + expérience vécue + sources. Crucial en santé/argent/juridique (donc beaucoup de libéraux). *(Google Quality Rater Guidelines)*
- **[PROUVÉ] SEO local = fiche Google Business** : 3 facteurs officiels = Pertinence, Distance, Notoriété. Infos complètes + catégorie + horaires + répondre aux avis + photos. Google : "aucun moyen de payer un meilleur classement local". Souvent plus rentable que le blog pour un artisan. *(Google Business Profile Help)*
- **[PROUVÉ] GEO (être cité par ChatGPT/Perplexity/AI Overviews)** : les 3 leviers efficaces = ajouter des citations/sources (~+25%), des statistiques réelles (~+26%), des citations attribuées (~+28%). Le bourrage de mots-clés NE marche PAS pour les IA. *(papier arXiv 2311.09735, GEO-bench 10 000 requêtes)*
- **[TENDANCE] Clusters thématiques** : 1 page pilier + 4-6 pages satellites qui se lient = autorité sur un sujet. Le principe de couverture est endossé par Google ; les chiffres précis ("+30% trafic") sont [SPÉCULATIF].

### Tactiques prouvées (FORME)
- **[PROUVÉ] Pas de nombre de mots cible** : Google dit explicitement n'avoir AUCUN nombre de mots préféré. Viser la profondeur qui satisfait l'intention, pas un compteur. Repère qualité (Yoast) : ~300 mots plancher, ~900 pour une page pilier — comme plancher, pas comme cible.
- **[PROUVÉ] Structure claire** : titres H2/H3, listes, paragraphes courts, mobile-first. Aide lecteurs ET extraction par les IA.
- **[PROUVÉ] Schema FAQ déprécié (mai 2026)** : les rich results FAQ ne s'affichent plus. Le markup peut rester mais ne plus le vendre comme "générateur de rich snippets". Schema utiles encore : Article, LocalBusiness, Organization, Breadcrumb.
- **[TENDANCE] Rythme réaliste solo** : 1 contenu de qualité, sourcé, par semaine OU par quinzaine, en clusters. La régularité tenue > le volume. Les "3-5 articles/semaine" sont [SPÉCULATIF] et irréalistes pour un solo.

### Anti-patterns blog/SEO (pour DÉMONTER une reco)
- **[PROUVÉ] Keyword stuffing** : bourrer de mots-clés = pénalisé. *(Google spam policies)*
- **[PROUVÉ] Contenu IA de masse non révisé** : générer beaucoup de pages pour manipuler le classement = pénalisé. NUANCE : l'IA n'est PAS interdite ; l'IA éditée + validée par un expert + à vraie valeur est conforme.
- **[PROUVÉ] Achat de liens / PBN / doorway pages / cloaking / thin affiliate** : tous pénalisés. *(Google spam policies)*
- **[PROUVÉ] Bourrer le nom de la fiche Google Business de mots-clés** : suspensions. Ne jamais recommander.

---

## B. RÉSEAUX SOCIAUX ORGANIQUES

### Tactiques prouvées (FOND)
- **[PROUVÉ] La régularité bat le volume** : poster régulièrement sur 20+ semaines = ~+450% d'engagement/post vs 4 semaines ou moins. Mieux vaut 2 posts/semaine tenus 6 mois que 7/semaine abandonnés. *(Buffer, 100K+ comptes sur 26 semaines)*
- **[PROUVÉ] Répondre à ses commentaires** : booste l'engagement du post (~+30% LinkedIn, ~+21% Instagram, ~+9% Facebook). C'est l'arme gratuite n°1 d'un solo local (il peut répondre à 100% des messages). *(Buffer, ~2M posts)*
- **[PROUVÉ via pénalités] Valeur/authenticité > promo pure** : Meta réduit la portée des légendes hors-sujet et de l'"engagement bait". Le contenu utile/coulisses/preuve performe ; la sur-promo dégrade. *(Meta Content Distribution Guidelines)*
- **[PROUVÉ] Surcouche Guadeloupe** : tout CTA pointe vers WhatsApp (lien wa.me), JAMAIS vers le SMS (SMS depuis numéros français bloqués par les opérateurs en GP). Bio = lien WhatsApp direct.

### Tactiques prouvées (FORME — format par réseau, mis à jour v2.0 03/07/2026)
- **[PROUVÉ] LinkedIn** : carrousel/document (PDF à swiper) = format n°1 toutes études 2026 (Metricool 673K posts ; van der Blom relayé). 3-10 slides. Vidéo verticale 30-90 s sous-titrée en 2e (poussée officiellement, +36 % watch time/an, mais saturée). **Signal n°1 = dwell time** (temps de lecture), devant les likes ; question dans le post = +77 % de commentaires. **Golden hour : les 60-90 premières minutes décident de la portée** → ne publier que quand quelqu'un peut répondre aux commentaires dans l'heure. *(Dataslayer 02/2026, Hootsuite 06/2026, Metricool 2026)*
- **[PROUVÉ] LinkedIn, liens et profil vs Page** : liens externes pénalisés sur PROFIL (-27 % impressions) mais PAS sur PAGE (+51 %) → router les liens blog vers la Page. Profil perso >> Page en engagement (2,60 % vs 1,60 % ; posts de personnes = 6-8x la portée des Pages) → le profil du fondateur poste du natif, la Page porte les liens. *(Metricool 2026)*
- **[PROUVÉ] Instagram** : carrousels 0,55 % d'engagement > Reels 0,52 % > images 0,37 % (Socialinsider 35M posts). Reels pour ATTEINDRE (recommandations, jusqu'à 3 min éligibles, idéal <90 s, ~50 % regardés SANS SON → sous-titres obligatoires) ; carrousels pour ENGAGER. Mix conseillé ~60-70 % Reels / 20-30 % carrousels. **Signaux dominants (Mosseri) : watch time, likes/reach, et surtout ENVOIS PAR DM (sends/reach)** → fabriquer du « partageable » (checklists, comparatifs). Trial reels = tester sur des non-abonnés avant les abonnés. *(Hootsuite 06/2026, Buffer 03/2026)*
- **[PROUVÉ] Instagram est indexé par Google depuis le 10/07/2025** (comptes pro, posts publics) : la 1re ligne de légende = titre SEO (mot-clé métier + ville), alt text + géotag = leviers locaux. Chaque post = une mini page Google.
- **[PROUVÉ] Facebook** : engagement par format (Socialinsider 25M posts, éd. 2026) : texte 0,20 % > albums 0,18 % = Reels 0,18 % (seul format en hausse) > images 0,15 % > **liens 0,05 % (le pire, de loin)** → lien en commentaire, jamais dans le post. Depuis 06/2025 toute vidéo FB = Reel, sans limite de durée. >20 % du fil = recommandations de comptes non suivis = la porte d'entrée d'une petite Page. Groupes locaux + Marketplace = prospection de proximité, fort en GP (les groupes exigent un humain, pas d'automatisation).
- **[PROUVÉ] TikTok** : vidéo courte (process / avant-après / coulisses). Ne pas se forcer si pas de moyens de tournage.
- **[PROUVÉ] Structure d'un post** : 1 hook (1ère ligne / 3 premières secondes) → 1 idée utile → 1 seul CTA clair. Pour la GP : "Écris-nous sur WhatsApp".
- **[PROUVÉ] Cadences optimales mesurées (v2.0)** : Instagram **3-5 posts/semaine** = point d'équilibre (+12 % de reach/post vs 1-2 ; Buffer 2,1M posts, 08/2025) ; ne pas publier en rafale. LinkedIn **2-5/semaine, JAMAIS plus de 1/jour** (cannibalisation mesurée au 2e post/jour ; Buffer 4,8M posts, 03/2026). Facebook : constance > volume, pas de fréquence magique. La règle « régularité tenue > volume » (ci-dessus) reste le socle : ces plafonds ne valent que s'ils sont TENUS.
- **[TENDANCE] Meilleurs horaires** : études divergentes (jeudi 9h, mercredi 12h/18h, mercredi 16h LinkedIn…) → baseline à TESTER sur ses propres stats. En GP (GMT-4) : convertir tout tableau US/EU et valider localement.

### Anti-patterns réseaux (pour DÉMONTER une reco)
- **[PROUVÉ] Contenu répétitif / gabarit / « AI slop »** : LE risque n°1 de 2026, voir la règle transversale en tête de document (Meta 03/2026, Instagram 04/2026, LinkedIn 05/2026). Dépriorisation du compte entier, pas juste du post.
- **[PROUVÉ] Commentaires automatisés (LinkedIn)** : explicitement ciblés par l'offensive du 20/05/2026. Jamais.
- **[PROUVÉ] Engagement bait** ("commente OUI", "tague 3 amis") : portée réduite + inéligible monétisation. *(Meta)*
- **[PROUVÉ] Hashtags de masse** : plafond ~5 hashtags Instagram (limite en déploiement déc. 2025) et Facebook (<5 conseil officiel) ; LinkedIn : quasi dépréciés (pages hashtags désactivées ~10/2024), 0-3 max. Aucun gain de portée démontré sur aucune plateforme ; catégorisation seulement.
- **[PROUVÉ] Légendes hors-sujet / clickbait** : restrictions de feed. *(Meta)*
- **[PROUVÉ] Lien externe dans le corps d'un post Facebook** : 0,05 % d'engagement, pire format mesuré (Socialinsider 2026) ; lien en commentaire ou natif.
- **[PROUVÉ] Plus de 1 post/jour sur LinkedIn** : cannibalisation mesurée (Buffer 4,8M posts).
- **[TENDANCE] Acheter des abonnés, pods d'engagement, tag-for-repost** : effondrent l'engagement réel / considérés spam.
- **[PROUVÉ] Image statique comme format principal Instagram** : en déclin net (préférer carrousel/Reel).

### G. FICHE GOOGLE BUSINESS (local) — ajout v2.0 (03/07/2026)
- **[PROUVÉ] Les posts GBP ne font PAS monter le classement** : test contrôlé Sterling Sky (9 semaines, 441 mots-clés) = zéro mouvement. Les posts servent la CONVERSION et le signal « fiche vivante ». 1-2 posts/semaine suffisent. *(Sterling Sky, relais concordants)*
- **[PROUVÉ] Facteurs officiels : pertinence, distance, proéminence** ; catégorie principale = facteur individuel n°1 (Whitespark 2026 relayé : GBP ≈ 32 % du ranking local, avis ≈ 20 %).
- **[PROUVÉ] Avis : récence et vélocité > volume, et RÉPONDRE À TOUT** : 74 % des consommateurs veulent des avis <3 mois ; 80 % favorisent les entreprises qui répondent à tous les avis ; 50 % rejettent les réponses « template » → réponses personnalisées obligatoires, jamais automatisées. *(BrightLocal, 11/02/2026)*
- **[PROUVÉ] JAMAIS de numéro de téléphone dans le texte d'un post GBP** = cause n°1 de rejet automatique. *(Google Business Help)*
- **[PROUVÉ] Médias GBP = vraies photos prises sur place** : les politiques de contribution exigent des médias « capturés par vous, au lieu concerné » → les images IA/stock sont non conformes de facto. Les avis fabriqués (y compris par IA) = interdits (fake engagement), sanctions publiques possibles (bandeau, gel des avis). *(Google contribution policies)*
- **[PROUVÉ] Service-area business (sans vitrine)** : adresse masquée obligatoire, max 20 zones ; la zone déclarée n'est PAS un levier de ranking (distance calculée depuis l'emplacement réel) ; masquer l'adresse fait baisser les rankings (test relayé Local Falcon, 12/2025).
- **[PROUVÉ] 45 % des consommateurs utilisent déjà ChatGPT & co pour trouver un commerce local** (6 % un an avant) ; Gemini/AI Mode s'appuient sur les données Google Maps/Business Profile → la fiche GBP est la donnée d'entrée des recommandations IA locales. *(BrightLocal 02/2026 ; Google ai.google.dev Maps grounding)*

---

## C. VISIBILITÉ DANS LES IA (GEO — être cité par ChatGPT/Perplexity/AI Overviews)

### Tactiques prouvées (FOND) — *(papier académique GEO, arXiv 2311.09735, benchmark 10 000 requêtes)*
- **[PROUVÉ] Ajouter des citations/sources attribuées** → +27,8 % de visibilité IA.
- **[PROUVÉ] Ajouter des statistiques réelles** → +25,9 %.
- **[PROUVÉ] Texte clair et fluide** → +25,1 %.
- **[PROUVÉ] Citer ses sources** → +24,9 %.
- **[PROUVÉ] LEVIER MAJEUR POUR PETIT SITE** : "citer ses sources" profite surtout aux sites MAL classés — une 5e position a gagné +115 % (et le n°1 a perdu). Donc un artisan mal classé a BEAUCOUP à gagner à bien rédiger/sourcer. *(GEO paper)*
- **[PROUVÉ] Le bon levier dépend du sujet** : stats → droit/admin ; citations → société/gens ; sources → factuel.

### Tactiques prouvées (FORME)
- **[PROUVÉ] Réponse directe et factuelle en haut**, phrase autoportante (l'IA extrait des blocs qui ont du sens hors contexte). Langage clair.
- **[PROUVÉ] Page indexable** : Google exige qu'une page soit indexée et éligible à un extrait pour apparaître dans l'IA.
- **[PROUVÉ] Données structurées NON requises pour l'IA** (dixit Google). FAQ/HowTo rich results dépréciés (mai 2026). Schema utile : Article, Organization, LocalBusiness.
- **[TENDANCE] Local** : fiche Google Business complète + beaucoup d'avis récents avec réponses + NAP (nom/adresse/tel) cohérent partout. (chiffres d'éditeurs = non garantis)

### Ajouts v2.0 (03/07/2026) — GEO
- **[PROUVÉ] Facteur n°1 de citation IA = les MENTIONS DE MARQUE hors-site** : corrélation 0,664 (75 000 marques), loin devant les backlinks (0,218). Faire exister le nom à côté de son métier sur des sites tiers (presse locale, annuaires, CCI, LinkedIn, forums) est le levier le plus rentable. *(Ahrefs, 26/05/2025)*
- **[PROUVÉ] Le SEO classique alimente la visibilité IA** : Perplexity recouvre à >91 % le top 10 Google ; page 1 corrèle ~0,65 avec les mentions LLM. *(Semrush 11/2025 ; Seer Interactive 01/2025)*
- **[PROUVÉ] robots.txt : autoriser les bots IA** : `OAI-SearchBot` (ChatGPT search), `ChatGPT-User`, `GPTBot` (entraînement, optionnel), `PerplexityBot`, `Perplexity-User`. Vérifier que le WAF/Cloudflare ne les bloque pas. *(developers.openai.com ; docs.perplexity.ai)*
- **[PROUVÉ] Le trafic venu de ChatGPT convertit à 7,1 %** (2e derrière le payant) ; trafic référé par les IA x3 en un an. *(Similarweb, 28/05/2026)*
- **[PROUVÉ] Fenêtre France** : AI Overviews/AI Mode PAS encore déployés en France (courrier officiel Google 29/06/2026 : été 2026, au plus tard 23/09/2026). CTR mesuré ailleurs : -34 à -58 % en position 1 quand un résumé IA s'affiche (contesté par Google, controverse ouverte). → Se positionner AVANT : réponse courte en haut + valeur locale inextractible en dessous. *(Abondance 30/06/2026 ; Pew 07/2025 ; Ahrefs 02/2026)*
- **[PROUVÉ] Google Discover update (02/2026)** : favorise le contenu localement pertinent de sites du pays + l'expertise démontrée sujet par sujet ; anti-clickbait. La niche « métier × lieu » coche toutes les cases. *(Search Engine Land, 05/02/2026)*

### Anti-patterns GEO (pour DÉMONTER)
- **[PROUVÉ] Keyword stuffing** : INEFFICACE pour l'IA (sous la base de référence). *(GEO paper)*
- **[PROUVÉ] "Il suffit d'être n°1 sur Google pour être cité"** : FAUX (seulement ~38 % des citations viennent du top 10). *(Ahrefs, 4M URL)*
- **[PROUVÉ] Miser sur backlinks/DR comme levier IA principal** : corrélation faible (0,218 vs 0,664 pour les mentions). *(Ahrefs, 75K marques)*
- **[SPÉCULATIF] à refuser** : tout "% de citation" précis par plateforme, "FAQ x3,2 dans AI Overviews", pondérations par IA → non sourçables.

---

## D. CONVERSION SITE / PAGE DE VENTE (CRO)

### Tactiques prouvées (FOND)
- **[PROUVÉ] Proposition de valeur claire en 10 secondes** : qui/quoi/pour qui/bénéfice visibles d'emblée. 57 % du temps de lecture est au-dessus de la ligne de flottaison. *(Nielsen Norman Group)*
- **[PROUVÉ] Un seul objectif / un seul CTA dominant** : pas d'actions concurrentes (dilue la décision). *(CXL)*
- **[PROUVÉ] Réduire la friction** : moins de champs/clics/étapes. La friction de formulaire est la 1re cause d'abandon mobile, devant le prix. *(Baymard)*
- **[PROUVÉ] Preuve/réassurance** : témoignages vérifiables (nom/photo/lieu), garanties, "sans engagement". *(GoodUI)*
- **[PROUVÉ-labo] Ancrage de prix** : un prix de référence à côté du prix réel fait paraître l'offre évidente (ampleur à tester). *(Ariely)*

### Tactiques prouvées (FORME)
- **[TENDANCE] Charpente** : Hero (promesse + CTA) → preuve → bénéfices → objections/FAQ → preuve sociale → CTA répété.
- **[PROUVÉ] CTA sticky mobile** (barre fixe en bas, zone du pouce) → +5 à 12 % de conversion mobile. *(Baymard)* + CTA en haut ET répété en bas.
- **[PROUVÉ] Formulaire minimal** : nom + moyen de contact ; mieux : remplacer le formulaire par WhatsApp (1 clic = friction quasi nulle). *(Baymard)*
- **[PROUVÉ] Lisibilité simple** (niveau CM2-5e) → 11,1 % de conversion vs 5,3 % au niveau "pro". *(Unbounce, 41 000 pages)*
- **[PROUVÉ] Vitesse** : +0,1 s de vitesse mobile → +8 % de conversion. *(Google/Deloitte)*

### Anti-patterns conversion (pour DÉMONTER)
- **[PROUVÉ] Hero vague/slogan abstrait** (échoue au test des 10 s). **Multi-CTA concurrents.** **Formulaire trop long** (>5 champs). **Gros média/vidéo en hero mobile** (plombe la vitesse). **Faux témoignages.** **Prix totalement caché.**
- **[À démasquer] "On juge ton site en 50 ms (selon Google)"** : mal attribué (étude Lindgaard 2006) et mesure l'attrait visuel, PAS la conversion.

---

## E. PUBLICITÉ PAYANTE (Meta / Google) — petit budget local (5-10 €/jour)

### Tactiques prouvées (FOND)
- **[PROUVÉ] 1 campagne, 1 ad set, budget consolidé** : fragmenter un micro-budget = aucun ad set n'apprend (Meta vise ~50 conversions/sem/ad set). *(Meta Business Help)*
- **[TENDANCE] Petit budget = ABO + ciblage LARGE**, pas micro-segmentation. Advantage+/CBO pertinent au-dessus de ~50 €/jour.
- **[PROUVÉ] Objectif aligné sur l'action** : pour la GP, ads **click-to-WhatsApp** ("conversations démarrées" = la métrique, ≠ vente).
- **[TENDANCE] Google petit budget = Search ciblé local, PAS Performance Max** (PMax éparpille, à réserver aux gros budgets).
- **[TERRAIN/INTERNE] GP** : audience ~380 000 hab → NE PAS sur-segmenter ; viser large, laisser l'algo apprendre.

### Tactiques prouvées (FORME)
- **[PROUVÉ] Vidéo courte ~15s** : ~+27 % de CTR vs image. MAIS l'image coûte ~30 % moins cher → à petit budget, une bonne image vaut mieux qu'une vidéo médiocre.
- **[TENDANCE] Hook (3 1res sec) + 1 bénéfice + 1 CTA action** ("Demandez votre devis sur WhatsApp"). Texte court.
- **[TENDANCE] 2-3 créas MAX dans le même ad set** (pas 1 créa/ad set → fragmentation).

### Anti-patterns pub (pour DÉMONTER)
- **[PROUVÉ] Éparpiller le budget sur plusieurs audiences/ad sets** (tout reste en "apprentissage limité").
- **[PROUVÉ] Modifier la campagne tous les jours** (remet l'apprentissage à zéro : audience, créa, budget >20 %, pause/réactivation). Ne rien toucher 5-7 jours.
- **[PROUVÉ] Promettre un ROAS x10 / des leads garantis** = signal d'arnaque. Fourchettes contextualisées seulement.
- **[PROUVÉ] PMax avec un mini-budget local.** **Pas de suivi de conversion** = optimiser à l'aveugle.
- **[NON TRANSPOSABLE] Benchmarks CPL/CPM** : tous US, PAS valables en GP. La seule vérité = les chiffres du compte réel après 1-2 semaines.

---

## F. CHECKLIST DE JUGEMENT (comment classer une reco)

Pour CHAQUE priorité/action proposée par SparkScan, vérifier :
1. **Intention/objectif clair ?** On sait à quoi ça sert (intention de recherche, type de client visé).
2. **Soutenue par une tactique [PROUVÉ] ci-dessus ?** → tendance VALIDÉ.
3. **Correspond à un ANTI-PATTERN ci-dessus ?** → À DÉMONTER (rare).
4. **Améliorable par une tactique prouvée du référentiel ?** → À AJUSTER (donner la version prouvée).
5. **Réaliste pour un solo** (temps/budget limités) ? Sinon = amateur.
6. **Format adapté au réseau** (LinkedIn=carrousel, Instagram=Reel/carrousel, etc.) ?
7. **CTA local correct** (WhatsApp, pas SMS en GP) ?
8. **Mesurable** (position Google, clics, citations IA, RDV, appels via fiche) ?
9. **Chiffres sourcés ?** Tout "+X%" sans source primaire = NON fiable, ne pas s'appuyer dessus.
10. **Couvert par le référentiel ?** Si le sujet n'est NI prouvé NI anti-pattern ici → NON VÉRIFIABLE (dire "je ne sais pas", ne rien inventer).

**Règle d'or** : pas de source = pas d'affirmation. En cas de doute → "non vérifiable", jamais une invention.
