/**
 * SparkPilot — mapping pédagogique des tâches.
 *
 * Pourquoi ce fichier ?
 *   Les tâches générées par le moteur de décomposition n'embarquent pas (encore)
 *   les éléments pédagogiques que l'utilisateur (artisan, restaurateur GP, non tech)
 *   réclame pour comprendre POURQUOI il fait une tâche, QUELS RÉSULTATS attendre,
 *   et COMMENT marche la méthode citée.
 *
 *   Plutôt que de regénérer ce contenu via Claude à chaque lecture (coûteux,
 *   non déterministe, fragile), on dérive ces blocs en pur rule-based depuis
 *   ce qu'on a déjà en base (framework + priorité parente). Le contenu source
 *   est tiré du playbook v1.0 (signaux de succès, frameworks éprouvés).
 *
 *   Fichier 100% pur (pas d'I/O, pas de "use client"), importable côté serveur
 *   comme côté client.
 *
 * Conventions de style (R0 langage simple) :
 *   - tutoiement
 *   - phrases courtes
 *   - pas de jargon ("leverage", "funnel", "throughput") → "tes clients", "ton site"
 *   - exemples concrets quand possible
 *
 * Référence : src/lib/sparkpilot/playbooks/playbook-strategies-v1.md
 */

import type { SparkpilotTask } from './types'

// ---------------------------------------------------------------------------
// 1. Normalisation des noms de framework
// ---------------------------------------------------------------------------

/**
 * Slugs canoniques utilisés pour :
 *   - la clé du mapping ci-dessous
 *   - l'ancre dans /sparkpilot/frameworks#<slug>
 *
 * On garde une liste fermée pour rester maître des ancres côté glossaire.
 */
export type FrameworkSlug =
  | 'geo'
  | 'e-e-a-t'
  | 'schema-org'
  | 'storybrand'
  | 'aida'
  | 'above-the-fold'
  | 'pillar-cluster'
  | 'skyscraper'
  | 'topical-authority'
  | 'hook-story-cta'
  | 'native-format-first'
  | 'hormozi'
  | 'pas-copywriting'
  | 'andromeda'
  | 'tofu-mofu-bofu'
  | 'cbo-meta'

/**
 * Patterns de matching tolérants aux variations de Claude
 * (ex : "GEO (Generative Engine Optimization)", "StoryBrand framework"...).
 * Ordre = priorité de matching (le 1er qui matche gagne).
 */
const FRAMEWORK_MATCHERS: ReadonlyArray<{
  slug: FrameworkSlug
  patterns: ReadonlyArray<string>
}> = [
  { slug: 'geo', patterns: ['geo', 'generative engine optimization'] },
  { slug: 'e-e-a-t', patterns: ['e-e-a-t', 'eeat'] },
  { slug: 'schema-org', patterns: ['schema.org', 'schema org', 'json-ld'] },
  { slug: 'storybrand', patterns: ['storybrand'] },
  { slug: 'aida', patterns: ['aida'] },
  { slug: 'above-the-fold', patterns: ['above-the-fold', 'above the fold'] },
  { slug: 'pillar-cluster', patterns: ['pillar+cluster', 'pillar + cluster', 'pillar cluster'] },
  { slug: 'skyscraper', patterns: ['skyscraper'] },
  { slug: 'topical-authority', patterns: ['topical authority'] },
  { slug: 'hook-story-cta', patterns: ['hook-story-cta', 'hook story cta'] },
  { slug: 'native-format-first', patterns: ['native format'] },
  { slug: 'hormozi', patterns: ['hormozi'] },
  { slug: 'pas-copywriting', patterns: ['pas copywriting', 'pas (problème'] },
  { slug: 'andromeda', patterns: ['andromeda'] },
  { slug: 'tofu-mofu-bofu', patterns: ['tofu/mofu/bofu', 'tofu mofu bofu', 'tofu-mofu-bofu'] },
  { slug: 'cbo-meta', patterns: ['cbo meta', 'cbo (campaign'] },
]

/**
 * Renvoie le slug canonique d'un framework, ou null si aucun match.
 * Insensible à la casse, tolère les libellés étendus.
 */
function resolveFrameworkSlug(
  framework: string | null | undefined,
): FrameworkSlug | null {
  if (!framework) return null
  const normalized = framework.toLowerCase().trim()
  if (normalized === '') return null
  for (const matcher of FRAMEWORK_MATCHERS) {
    for (const pattern of matcher.patterns) {
      if (normalized.includes(pattern)) return matcher.slug
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// 2. Mapping framework → contenu pédagogique
// ---------------------------------------------------------------------------

interface FrameworkContent {
  /** Résultats observables attendus si la méthode est bien appliquée. */
  expectedResults: string
  /** Résumé vulgarisé (2-3 phrases) destiné à un non-tech. */
  methodSummary: string
}

/**
 * Source de vérité : pour chaque framework reconnu, ce qu'on dit à
 * l'utilisateur dans les blocs "Résultats" et "Comment ça marche".
 *
 * Cohérent avec le playbook v1.0 (signaux de succès par catégorie).
 */
const FRAMEWORK_CONTENT: Record<FrameworkSlug, FrameworkContent> = {
  geo: {
    expectedResults:
      "Tu commences à apparaître dans les réponses de Perplexity et ChatGPT quand tes prospects posent leurs questions métier. Premiers signaux visibles sous 6 à 8 semaines, à tester toi-même tous les 15 jours.",
    methodSummary:
      "GEO (Generative Engine Optimization), c'est l'équivalent du SEO mais pour les IA comme Perplexity, ChatGPT ou Google AI Overview. L'idée : écrire tes pages avec un ton naturel, des réponses claires et des exemples concrets, pour que les IA aient envie de te citer comme source.",
  },
  'e-e-a-t': {
    expectedResults:
      "Tes pages gagnent en crédibilité aux yeux de Google ET des IA. Tu remontes plus haut sur les requêtes où tu es concurrencé, et tu te fais citer plus souvent comme source fiable.",
    methodSummary:
      "E-E-A-T, c'est la grille que Google utilise pour juger si ton site mérite la confiance : as-tu de l'expérience réelle, de l'expertise, de l'autorité dans ton domaine, et inspires-tu confiance ? Concrètement : tu signes tes articles, tu cites tes sources, tu montres tes vraies réalisations.",
  },
  'schema-org': {
    expectedResults:
      "Tes pages affichent des aperçus enrichis dans Google (étoiles, prix, FAQ dépliable) et les IA les comprennent mieux. Taux de clic dans les résultats Google qui monte de 15 à 30 %.",
    methodSummary:
      "Schema.org, ce sont des étiquettes invisibles qu'on ajoute dans le code de tes pages pour expliquer aux moteurs ce qu'elles contiennent (un article, une FAQ, un produit, un avis). Plus tes pages sont étiquetées, mieux Google et les IA savent les exploiter.",
  },
  storybrand: {
    expectedResults:
      "Tes visiteurs comprennent ton offre en moins de 10 secondes. Le temps passé sur ta page d'accueil augmente, et plus de visiteurs cliquent sur ton bouton principal (devis, contact, réservation).",
    methodSummary:
      "StoryBrand (méthode de Donald Miller), c'est de raconter une histoire simple où ton client est le héros et où toi tu es le guide qui l'aide à résoudre son problème. Sur ta page : on dit le problème du client, ta solution, et ce qu'il doit faire maintenant.",
  },
  aida: {
    expectedResults:
      "Plus de visiteurs vont jusqu'au bout de ta page et cliquent sur ton CTA. Taux de conversion landing → contact qui monte mesurablement après 2-3 semaines.",
    methodSummary:
      "AIDA (Attention, Intérêt, Désir, Action), c'est le séquençage classique d'une page qui convertit : tu attrapes l'œil, tu donnes envie d'en savoir plus, tu fais désirer ta solution, puis tu demandes l'action. Chaque bloc de ta page joue un de ces 4 rôles.",
  },
  'above-the-fold': {
    expectedResults:
      "Le visiteur comprend tout de suite ce que tu vends et comment te contacter, sans avoir à scroller. Moins de visiteurs quittent la page sans rien faire (taux de rebond mobile qui baisse).",
    methodSummary:
      "Above-the-fold, c'est la zone qu'on voit en arrivant sur ton site, AVANT de scroller. Règle : ton titre, ta promesse chiffrée et ton bouton d'action doivent être visibles ici, même sur mobile. Si on doit scroller pour comprendre, c'est déjà perdu.",
  },
  'pillar-cluster': {
    expectedResults:
      "Ta position dans Google monte sur les mots-clés visés. Ton trafic gratuit (organique) augmente mois après mois, et tu commences à recevoir des liens entrants naturels (signe d'autorité).",
    methodSummary:
      "Pillar + Cluster (popularisé par HubSpot), c'est écrire 1 gros article central très complet sur un sujet (le pillar) entouré de 4 à 8 articles plus courts qui creusent chaque sous-angle (les clusters). Tous les clusters pointent vers le pillar : Google comprend que tu es LA référence locale sur ce thème.",
  },
  skyscraper: {
    expectedResults:
      "Ton article remplace celui des concurrents dans le top 3 Google sur ta requête cible. Trafic organique vers cet article qui dépasse la moyenne de ton site en 2 à 4 mois.",
    methodSummary:
      "Skyscraper (méthode de Brian Dean), c'est trouver l'article qui ranke déjà sur ta requête, puis en faire un 10× meilleur : plus complet, mieux écrit, exemples plus récents, visuels en plus. Google récompense le meilleur contenu, pas le 1er publié.",
  },
  'topical-authority': {
    expectedResults:
      "Tu deviens LA référence dans ton secteur aux yeux de Google. Tes nouveaux articles rankent plus vite, et tu remontes sur des requêtes que tu n'as même pas explicitement visées.",
    methodSummary:
      "Topical Authority, c'est couvrir TOUS les angles d'un sujet (pas juste un article isolé). Si tu vends de la climatisation : tu parles installation, entretien, pannes courantes, prix, normes, aides. Google voit que tu maîtrises le sujet de bout en bout et te pousse devant.",
  },
  'hook-story-cta': {
    expectedResults:
      "Tes posts génèrent plus de likes, de commentaires et surtout de messages privés qui se transforment en prospects qualifiés. Engagement qui dépasse 3 % de tes abonnés.",
    methodSummary:
      "Hook-Story-CTA (popularisé par Justin Welsh), c'est la recette d'un post qui marche sur LinkedIn ou Instagram. Première ligne qui accroche (Hook), une mini-histoire vraie (Story), puis un appel à l'action clair (CTA). Pas de blabla, du concret.",
  },
  'native-format-first': {
    expectedResults:
      "Ton contenu performe vraiment sur chaque réseau (pas juste partagé en copié-collé). Plus de vues, plus d'engagement, plus de portée organique.",
    methodSummary:
      "Native format first, c'est d'arrêter de recycler le même contenu partout. Un Reel Instagram ne ressemble pas à un TikTok, qui ne ressemble pas à un post LinkedIn. Chaque réseau a ses codes (durée, format, ton) : on respecte les règles du terrain où on joue.",
  },
  hormozi: {
    expectedResults:
      "Ton nombre d'abonnés et de prospects entrants augmente vite. Tu gagnes en notoriété locale, et tes ventes payantes deviennent plus faciles parce que les gens te connaissent déjà.",
    methodSummary:
      "Hormozi (Alex Hormozi, $100M Offers), c'est donner massivement de la valeur gratuite avant de demander quoi que ce soit. Tutos, conseils, audits offerts : tu crées une dette de réciprocité. Quand tu proposes ton offre payante, les gens disent oui plus facilement.",
  },
  'pas-copywriting': {
    expectedResults:
      "Tes pubs et tes mails ont un taux de clic et de réponse plus élevé. Tes prospects s'identifient au problème que tu décris et te perçoivent comme la bonne solution.",
    methodSummary:
      "PAS (Problème, Agitation, Solution), c'est une structure de rédaction très efficace pour les pubs et les mails de prospection. On nomme le problème que vit le client, on en montre les conséquences concrètes (l'agitation), puis on présente ta solution comme l'évidence.",
  },
  andromeda: {
    expectedResults:
      "Tes campagnes Meta Ads atteignent un coût par prospect qualifié inférieur à ton seuil cible. CTR au-dessus de 1,5 % en Guadeloupe, fréquence sous contrôle, scaling possible sans exploser le coût.",
    methodSummary:
      "Andromeda, c'est la méthode interne validée sur DCG AI pour structurer une campagne Meta Ads en Guadeloupe : ciblage précis (zone + intérêts + âge), 3 hooks testés en parallèle avec CBO, on coupe ce qui ne marche pas à J+7, on scale ce qui marche.",
  },
  'tofu-mofu-bofu': {
    expectedResults:
      "Tu touches le bon prospect au bon moment de sa réflexion. Tes prospects en haut de tunnel deviennent plus nombreux, ton coût d'acquisition global baisse.",
    methodSummary:
      "TOFU/MOFU/BOFU, c'est découper ton tunnel en 3 étages : haut (le prospect découvre le problème), milieu (il compare les solutions), bas (il est prêt à acheter). À chaque étage, le message change : on n'attaque pas un BOFU avec un message de découverte.",
  },
  'cbo-meta': {
    expectedResults:
      "Meta optimise mieux ton budget : les bonnes audiences récupèrent automatiquement le budget gagnant. Coût par lead qui baisse et stabilité des performances semaine sur semaine.",
    methodSummary:
      "CBO (Campaign Budget Optimization), c'est laisser Meta arbitrer ton budget entre tes ensembles de pub plutôt que de fixer un budget par audience. Tu donnes un budget global, Meta envoie l'argent là où ça performe le mieux en temps réel.",
  },
}

// ---------------------------------------------------------------------------
// 3. APIs publiques consommées par task-card
// ---------------------------------------------------------------------------

/**
 * Bloc "🎯 Pourquoi cette tâche ?" (toujours visible).
 *
 * On formule l'OBJECTIF BUSINESS de la tâche (pas l'action). On dérive depuis
 * la priorité parente (priority_index 1/2/3) et le framework cité.
 *
 * Si la priorité parente a un titre lisible dans le snapshot du plan, on
 * pourra le passer plus tard via une 2e fonction enrichie. Pour l'instant on
 * reste rule-based depuis le framework, qui est notre signal le plus fiable.
 */
export function getWhyForTask(task: SparkpilotTask): string {
  const slug = resolveFrameworkSlug(task.metadata?.framework_used)
  if (slug !== null) return WHY_BY_FRAMEWORK[slug]

  // Fallback : on essaie via la catégorie de playbook si elle est stockée.
  const category = task.metadata?.playbook_category
  if (category) {
    const fromCategory = WHY_BY_CATEGORY[category]
    if (fromCategory) return fromCategory
  }

  return FALLBACK_WHY
}

/**
 * Bloc "📊 Quels résultats attendre ?" (dépliable).
 *
 * Renvoie les signaux de succès chiffrés ou observables associés au framework.
 * On accepte une string framework arbitraire (libellé brut depuis la BD) et on
 * la mappe vers un slug canonique.
 */
export function getExpectedResultsForFramework(
  framework: string | null | undefined,
): string {
  const slug = resolveFrameworkSlug(framework)
  if (slug !== null) return FRAMEWORK_CONTENT[slug].expectedResults
  return FALLBACK_EXPECTED_RESULTS
}

/**
 * Bloc "🧭 Comment ça marche ?" (dépliable).
 *
 * Renvoie un résumé vulgarisé en 2-3 phrases + URL vers la fiche complète du
 * glossaire (cette page est créée par un autre agent en parallèle).
 *
 * URL : /sparkpilot/frameworks#<slug>. Si le framework n'est pas reconnu, on
 * pointe vers la racine du glossaire qui restera lisible.
 */
export function getMethodExplanationForFramework(
  framework: string | null | undefined,
): { summary: string; learnMoreUrl: string } {
  const slug = resolveFrameworkSlug(framework)
  if (slug !== null) {
    return {
      summary: FRAMEWORK_CONTENT[slug].methodSummary,
      learnMoreUrl: `/sparkpilot/frameworks#${slug}`,
    }
  }
  return {
    summary: FALLBACK_METHOD_SUMMARY,
    learnMoreUrl: '/sparkpilot/frameworks',
  }
}

// ---------------------------------------------------------------------------
// 4. Contenu auxiliaire (whys par framework + fallbacks)
// ---------------------------------------------------------------------------

/**
 * Mapping framework → "Pourquoi cette tâche" (objectif business en 1 phrase).
 * Chaque entrée doit :
 *   - tutoyer
 *   - parler bénéfice client (pas action mécanique)
 *   - rester < 20 mots
 */
const WHY_BY_FRAMEWORK: Record<FrameworkSlug, string> = {
  geo: "Pour que tes prospects te trouvent quand ils posent leur question à ChatGPT ou Perplexity.",
  'e-e-a-t': "Pour montrer à Google que tu es un vrai pro de ton métier, pas un site bidon.",
  'schema-org': "Pour que Google et les IA comprennent mieux tes pages et les mettent en avant.",
  storybrand: "Pour que tes visiteurs comprennent ton offre en 10 secondes et aient envie de te contacter.",
  aida: "Pour transformer plus de visiteurs en prospects sans toucher à ton trafic actuel.",
  'above-the-fold': "Pour que la personne qui arrive sur ton site sache tout de suite quoi faire.",
  'pillar-cluster': "Pour que Google te voie comme LA référence locale sur ton sujet.",
  skyscraper: "Pour passer devant tes concurrents sur Google sur les requêtes qui rapportent.",
  'topical-authority': "Pour ranker plus vite sur tous les sujets liés à ton métier, pas juste un mot-clé.",
  'hook-story-cta': "Pour que tes posts génèrent des messages privés de vrais prospects, pas juste des likes.",
  'native-format-first': "Pour que ton contenu marche vraiment sur chaque réseau, pas seulement partagé pour faire joli.",
  hormozi: "Pour devenir incontournable localement en donnant tellement de valeur que les gens te recommandent.",
  'pas-copywriting': "Pour que tes pubs et tes mails parlent vraiment à ton prospect et déclenchent un clic.",
  andromeda: "Pour scaler ton acquisition payante en Guadeloupe sans cramer ton budget.",
  'tofu-mofu-bofu': "Pour parler au prospect avec le bon message selon où il en est dans sa décision.",
  'cbo-meta': "Pour que Meta optimise ton budget pub automatiquement vers ce qui marche le mieux.",
}

/**
 * Fallback par catégorie playbook (utilisé si pas de framework reconnu mais
 * qu'on a la catégorie en metadata).
 */
const WHY_BY_CATEGORY: Record<string, string> = {
  'Visibilité IA':
    "Pour que tes prospects te trouvent quand ils cherchent une réponse à leur question.",
  "Conversion site / page d'accueil":
    "Pour transformer plus de visiteurs en prospects, sans dépenser plus en pub.",
  'Contenu de fond':
    "Pour bâtir une autorité durable qui t'amène du trafic gratuit pendant des années.",
  'Présence sociale':
    "Pour te faire connaître localement et créer une communauté qui te recommande.",
  'Acquisition payante':
    "Pour aller chercher des prospects plus vite quand l'organique met du temps.",
}

const FALLBACK_WHY =
  "Cette tâche t'aide à avancer sur ta priorité du mois. Coche-la quand c'est fait pour suivre ton avancement."

const FALLBACK_EXPECTED_RESULTS =
  "Les résultats attendus pour cette méthode arrivent bientôt dans le glossaire. En attendant : termine la tâche, observe ce qui bouge sur ton site et ton activité dans les 4 à 6 semaines."

const FALLBACK_METHOD_SUMMARY =
  "Cette tâche s'appuie sur des bonnes pratiques marketing reconnues. Plus de détails à venir dans le glossaire."
