/**
 * Glossaire des frameworks — page de référence pédagogique SparkPilot.
 *
 * Server Component pur : pas d'interactivité, juste du contenu statique
 * structuré pour permettre les liens d'ancre depuis les task cards.
 *
 * R0 30/05/2026 : SparkPilot doit expliquer le pourquoi du comment.
 * Cette page est LA référence où l'utilisateur va comprendre chaque
 * méthode citée dans ses tâches, en français simple, avec des exemples
 * ancrés Guadeloupe.
 *
 * 15 frameworks documentés, dérivés du playbook v1.0
 * (src/lib/sparkpilot/playbooks/playbook-strategies-v1.md).
 */

import Link from 'next/link'
import { BookOpen, ChevronRight, Compass } from 'lucide-react'

export const metadata = {
  title: 'Glossaire des méthodes',
  description:
    "Toutes les stratégies marketing que SparkPilot t'aide à appliquer, expliquées simplement, avec des exemples concrets en Guadeloupe.",
}

/**
 * Un framework documenté.
 *
 * - `id` sert d'ancre HTML pour les liens directs depuis les task cards
 *   (ex : `/sparkpilot/frameworks#pillar-cluster`).
 * - `category` permet de regrouper visuellement par playbook source.
 */
interface Framework {
  id: string
  title: string
  category:
    | 'Visibilité IA'
    | "Conversion site / page d'accueil"
    | 'Contenu de fond'
    | 'Présence sociale'
    | 'Acquisition payante'
  oneLiner: string
  whyItWorks: string
  exampleGP: string
  origin: string
  timeToResults: string
}

/**
 * Les 15 frameworks cités par SparkPilot dans le playbook v1.0.
 * Ordre = ordre d'apparition logique pour un user qui découvre.
 *
 * R0 "ne pas inventer" : pour l'origine, on cite uniquement quand on est
 * sûr de la paternité. Sinon : "Cadre éprouvé en marketing moderne."
 */
const FRAMEWORKS: Framework[] = [
  {
    id: 'geo',
    title: 'GEO (Generative Engine Optimization)',
    category: 'Visibilité IA',
    oneLiner:
      "Optimiser ton site pour qu'il soit cité par ChatGPT, Perplexity et Google AI quand tes prospects posent leurs questions.",
    whyItWorks:
      "En 2026, beaucoup de gens demandent directement à une IA \"qui est le meilleur dentiste à Pointe-à-Pitre ?\" au lieu d'ouvrir Google. Si ton site répond clairement à ces questions, avec un ton humain, des chiffres, des sources, l'IA va te citer dans sa réponse. Tu deviens la recommandation par défaut.",
    exampleGP:
      "Tu es plombier à Baie-Mahault. Tu écris une page \"Combien coûte une fuite d'eau réparée en Guadeloupe en 2026 ?\" avec un tarif moyen, les cas qui font monter le prix, et 3 conseils pour éviter d'aggraver. Quand un habitant demande à ChatGPT, il a de fortes chances de tomber sur ta page et de t'appeler.",
    origin:
      'Terme apparu en 2023 dans la recherche académique. Devenu standard SEO en 2025-2026.',
    timeToResults:
      'Premières citations dans Perplexity/ChatGPT en 4 à 8 semaines après publication, à condition de tester régulièrement tes questions cibles.',
  },
  {
    id: 'e-e-a-t',
    title: 'E-E-A-T',
    category: 'Visibilité IA',
    oneLiner:
      "Montrer que tu as l'Expérience, l'Expertise, l'Autorité et la Confiance pour parler de ton métier.",
    whyItWorks:
      "Google (et les IA) veulent éviter de recommander n'importe qui. Plus tu prouves que tu sais de quoi tu parles (années d'expérience, diplômes, photos de chantiers réels, témoignages clients vérifiables), plus ton contenu est mis en avant. Sans ces preuves, ton site reste invisible même bien écrit.",
    exampleGP:
      "Tu es coiffeuse à Saint-François. Sur ta page \"À propos\", tu mets : 12 ans d'expérience, formation chez L'Oréal Paris en 2014, 800 clientes régulières, 50 photos de coiffures réelles avec accord client, 4 avis Google 5 étoiles cités. Résultat : Google te considère comme une vraie experte et te place devant les pages génériques.",
    origin:
      "Critères officiels publiés par Google dans ses \"Search Quality Guidelines\" (le \"E\" expérience ajouté en 2022).",
    timeToResults:
      "Effet progressif sur 2-3 mois. Plus tu accumules de preuves visibles, plus Google te fait confiance.",
  },
  {
    id: 'schema-org',
    title: 'Schema.org',
    category: 'Visibilité IA',
    oneLiner:
      "Un langage standard pour étiqueter ton contenu afin que Google et les IA comprennent EXACTEMENT de quoi parle ta page.",
    whyItWorks:
      "Tu as beau écrire \"adresse : 12 rue des Manguiers\", Google n'est pas sûr à 100% que c'est ton adresse, ton horaire ou ton tarif. Avec Schema.org, tu ajoutes un petit bout de code invisible qui dit \"ceci est mon adresse\", \"ceci est mon prix\", \"ceci est une question FAQ\". L'IA comprend tout, sans deviner.",
    exampleGP:
      "Restaurant à Sainte-Anne. Tu ajoutes le balisage Schema \"Restaurant\" avec : nom, adresse exacte, horaires (12h-15h / 19h-22h), fourchette de prix (€€), type de cuisine (créole). Quand quelqu'un cherche \"restaurant créole Sainte-Anne ce soir\", tu apparais avec ton horaire et ton menu directement dans Google.",
    origin:
      "Standard créé en 2011 par Google, Microsoft, Yahoo et Yandex ensemble. Toujours la référence en 2026.",
    timeToResults:
      "Les rich snippets (étoiles, prix, horaires affichés dans Google) apparaissent en 1 à 4 semaines après ajout.",
  },
  {
    id: 'storybrand',
    title: 'StoryBrand',
    category: "Conversion site / page d'accueil",
    oneLiner:
      "Sur ton site, le héros n'est pas toi : c'est ton client. Toi, tu es le guide qui l'aide à gagner.",
    whyItWorks:
      "La plupart des sites parlent d'eux : \"Notre entreprise, nos valeurs, notre équipe...\". Le visiteur s'en fiche. Il veut savoir : \"est-ce que vous pouvez régler MON problème ?\". Quand tu inverses le récit — son problème en gros, ta solution en clair, son résultat à la clé — il a envie de t'appeler.",
    exampleGP:
      "BTP à Baie-Mahault. Au lieu de \"Notre entreprise SARL Trucmuche, fondée en 1995, 30 salariés...\", tu écris : \"Ta maison fuit ou ta dalle se fissure ? On vient diagnostiquer gratuitement sous 48h. Toi, tu repars tranquille avec un devis chiffré.\" Le client se reconnait immédiatement et appelle.",
    origin:
      "Méthode formalisée par Donald Miller dans son livre \"Building a StoryBrand\" (2017). Standard du copywriting B2C aujourd'hui.",
    timeToResults:
      "Effet rapide : le taux de conversion (visiteur → contact) peut bouger en 2-4 semaines après refonte du hero.",
  },
  {
    id: 'aida',
    title: 'AIDA',
    category: "Conversion site / page d'accueil",
    oneLiner:
      "Quatre étapes qu'un visiteur traverse avant d'agir : Attention, Intérêt, Désir, Action.",
    whyItWorks:
      "Personne ne décide d'acheter en 2 secondes. Il faut d'abord capter son attention (titre fort), créer de l'intérêt (le problème qu'il vit), faire monter le désir (la solution qui change sa vie), puis demander l'action (un bouton clair). Si tu sautes une étape, le visiteur part.",
    exampleGP:
      "Dentiste à Pointe-à-Pitre. Attention : \"Mal aux dents ? On te reçoit en urgence aujourd'hui.\" Intérêt : \"On sait, attendre 3 semaines un rendez-vous c'est l'enfer.\" Désir : \"Cabinet moderne, anesthésie sans douleur, plateau technique complet.\" Action : gros bouton vert \"Appeler maintenant - 0590 XX XX XX\".",
    origin:
      "Modèle de copywriting publié pour la première fois en 1898 par Elias St. Elmo Lewis. Toujours d'actualité.",
    timeToResults:
      "Effet immédiat sur la page modifiée. Mesurer le taux de clic sur le CTA avant/après pour valider.",
  },
  {
    id: 'above-the-fold',
    title: 'Above-the-fold',
    category: "Conversion site / page d'accueil",
    oneLiner:
      "Tout ce qui compte vraiment doit être visible SANS scroller, dès l'arrivée sur ton site.",
    whyItWorks:
      "Plus de 50% des visiteurs ne scrollent jamais en dessous de la première hauteur d'écran (surtout sur mobile). Si ton titre principal, ta promesse et ton bouton de contact ne sont pas visibles à l'arrivée, ils ne seront jamais vus. Tu perds la moitié des prospects sans le savoir.",
    exampleGP:
      "Salon de beauté au Gosier. Sur mobile, dès l'arrivée on doit voir : nom du salon, \"Coiffure + manucure à domicile en Guadeloupe\", bouton \"Réserver mon créneau\" et numéro WhatsApp. Pas besoin de scroller pour comprendre ce que tu vends et comment te contacter.",
    origin:
      "Concept hérité du journalisme papier (le \"haut du pli\" du journal). Recherches modernes confirmées par Nielsen Norman Group depuis 2006.",
    timeToResults:
      "Effet immédiat. Tester avec 5 personnes \"tu comprends ce qu'on vend en 10 secondes ?\" valide ou invalide ton hero en une après-midi.",
  },
  {
    id: 'pillar-cluster',
    title: 'Pillar + Cluster',
    category: 'Contenu de fond',
    oneLiner:
      "Un gros article central qui fait autorité sur un sujet + des satellites qui creusent les détails.",
    whyItWorks:
      "Google adore quand un site couvre un sujet à fond avec une structure logique. En écrivant 1 article central de 2000 mots + 5-7 articles satellites de 800-1500 mots qui linkent tous vers le central, tu deviens LA référence dans ton domaine. Les algorithmes voient une vraie expertise.",
    exampleGP:
      "Tu es dentiste à Pointe-à-Pitre. Tu écris UN gros article : \"Tout savoir sur les soins dentaires en Guadeloupe : prix, mutuelles, urgences\". Puis 5 articles plus courts qui creusent chaque aspect : \"Combien coûte une couronne en GP\", \"Mutuelles qui remboursent le mieux\", \"Urgences dentaires en GP\", etc. Tous ces articles linkent vers le gros. Résultat : Google te voit comme LA référence dentiste GP.",
    origin:
      "Méthode popularisée par HubSpot vers 2017. Devenue standard en SEO B2B et B2C.",
    timeToResults:
      "Compter 2 mois pour voir les premières remontées Google, 6 mois pour voir un vrai trafic organique stable.",
  },
  {
    id: 'skyscraper',
    title: 'Skyscraper',
    category: 'Contenu de fond',
    oneLiner:
      "Trouve le meilleur article qui existe sur ton sujet, et fais 10 fois mieux.",
    whyItWorks:
      "Plutôt que d'écrire dans le vide, tu regardes ce qui marche déjà sur Google. Tu prends le meilleur article (le plus partagé, le mieux classé), tu vois ses faiblesses, et tu produis une version plus complète, plus à jour, plus illustrée. Google finit par préférer ta version et te place devant.",
    exampleGP:
      "Tu es restaurateur au Gosier. Tu cherches \"meilleurs restaurants Gosier\" et tu trouves un article TripAdvisor de 2022 avec 10 adresses. Toi tu écris en 2026 : 25 adresses testées personnellement, photos perso, fourchettes de prix, types de cuisine, ouvertures actuelles, accès en bus. Plus à jour, plus complet, plus utile. Tu passes devant.",
    origin:
      "Technique formalisée par Brian Dean (fondateur de Backlinko) en 2015. Toujours efficace en 2026.",
    timeToResults:
      "Effet sur 3 à 6 mois selon la concurrence du mot-clé. Très efficace en marché local peu saturé comme la GP.",
  },
  {
    id: 'topical-authority',
    title: 'Topical Authority',
    category: 'Contenu de fond',
    oneLiner:
      "Devenir LA référence sur un sujet en couvrant tous les angles, pas juste un article isolé.",
    whyItWorks:
      "Google ne fait plus confiance aux sites qui écrivent 1 article sur 50 sujets différents. Il préfère les sites qui couvrent 1 sujet à 50 angles. Plus tu publies de contenu cohérent sur ton domaine, plus l'algorithme te désigne comme expert et te place haut dans les résultats.",
    exampleGP:
      "Tu es ostéopathe à Basse-Terre. Au lieu d'éparpiller 1 article santé, 1 sur le sport, 1 sur les bébés, tu choisis UN angle : \"l'ostéopathie en Guadeloupe\". Et tu écris 15 articles : douleurs dorsales et chaleur tropicale, ostéo pendant la grossesse en GP, prix en GP, mutuelles, choisir son praticien... Tu deviens LA référence ostéo GP.",
    origin:
      'Cadre éprouvé en SEO moderne, théorisé dès 2018 par les chercheurs Google et popularisé par Koray Tuğberk GÜBÜR.',
    timeToResults:
      "Vraie autorité visible à partir de 15-20 articles publiés cohérents (6 à 9 mois de production).",
  },
  {
    id: 'internal-linking',
    title: 'Internal linking',
    category: 'Contenu de fond',
    oneLiner:
      "Faire des liens entre tes propres pages pour aider Google (et tes visiteurs) à naviguer.",
    whyItWorks:
      "Chaque lien interne distribue l'autorité de ton site. Si ton article \"prix d'une couronne en GP\" a peu de liens, il sera moins bien classé que ton gros article central. En liant intelligemment, tu donnes du poids à tes pages clés. Et tes visiteurs lisent plus de pages = ils restent, et Google adore.",
    exampleGP:
      "Plombier Baie-Mahault. Ton article \"Tarifs plomberie GP 2026\" doit linker vers \"Réparer une fuite d'eau\", \"Déboucher une canalisation\", \"Remplacer un chauffe-eau\". Et chacun de ces 3 articles linke en retour vers le gros article tarifs. Google voit que tout est connecté, te considère expert global.",
    origin:
      'Cadre éprouvé en SEO depuis les débuts de Google (algorithme PageRank, 1998).',
    timeToResults:
      "Effet progressif sur 2-3 mois après mise en place. Plus le site grandit, plus c'est efficace.",
  },
  {
    id: 'hook-story-cta',
    title: 'Hook-Story-CTA',
    category: 'Présence sociale',
    oneLiner:
      "La structure parfaite d'un post : une accroche d'une ligne, une histoire concrète, un appel à l'action.",
    whyItWorks:
      "Sur LinkedIn ou Instagram, tu as 2 secondes pour capter. Le \"hook\" arrête le doigt qui scroll. La \"story\" (une anecdote vécue) crée la connexion humaine. Le \"CTA\" final dit quoi faire (commenter, partager, te contacter). Cette structure marche parce qu'elle reproduit comment on raconte une bonne histoire à un ami.",
    exampleGP:
      "Tu es comptable au Moule. Hook : \"Hier, j'ai sauvé 4 200 € à un artisan guadeloupéen.\" Story : \"Il pensait être à jour. En vérifiant son crédit d'impôt formation pro, j'ai trouvé 3 ans de manque à gagner. On a fait la réclamation. Réponse positive en 6 semaines.\" CTA : \"Tu es artisan en GP ? Tu as droit à 100h/an de crédit d'impôt. DM moi.\" Engagement garanti.",
    origin:
      "Structure popularisée par Justin Welsh (LinkedIn creator) en 2020-2022. Standard sur LinkedIn FR aujourd'hui.",
    timeToResults:
      "Effet immédiat sur l'engagement (likes, commentaires) du post. Croissance d'abonnés visible sur 4-8 semaines de publication régulière.",
  },
  {
    id: 'native-format-first',
    title: 'Native format first',
    category: 'Présence sociale',
    oneLiner:
      "Un Reel n'est pas un TikTok n'est pas un post LinkedIn. Chaque réseau a son format, respecte-le.",
    whyItWorks:
      "Si tu copies-colles le même contenu partout, tu perds partout. LinkedIn aime les textes longs avec retours à la ligne. Instagram aime les visuels carrés ou verticaux. TikTok aime le brut, sans montage trop pro. Chaque algorithme récompense le format qu'il préfère. Adapter = gagner en portée.",
    exampleGP:
      "Restaurant Gosier. Sur Instagram : photo carrée du plat du jour, légende courte avec emoji. Sur TikTok : vidéo verticale 15 sec du chef qui dresse le plat, musique tendance, pas de montage trop léché. Sur LinkedIn : post long racontant l'histoire derrière le plat (producteur local, traçabilité). Même sujet, 3 formats natifs.",
    origin:
      'Principe énoncé par Gary Vaynerchuk dans son livre "Jab, Jab, Jab, Right Hook" (2013). Renforcé par les algorithmes des plateformes depuis 2020.',
    timeToResults:
      "Effet immédiat sur la portée (reach) des publications. À comparer en 2-3 semaines de tests entre format adapté et format copié.",
  },
  {
    id: 'pas-copywriting',
    title: 'PAS copywriting',
    category: 'Acquisition payante',
    oneLiner:
      "Structure d'accroche publicitaire : Problème, Agitation, Solution. Simple et redoutablement efficace.",
    whyItWorks:
      "En pub, tu as 3 secondes pour convaincre. PAS frappe direct : tu nommes le Problème que vit le prospect (il se reconnait), tu Agites en montrant ce qui va empirer s'il ne fait rien (l'urgence monte), tu proposes la Solution (toi). Le cerveau humain réagit à cette séquence depuis la nuit des temps.",
    exampleGP:
      "Pub Meta pour assurance santé en GP. Problème : \"Tu paies 80€/mois de mutuelle et tu te retrouves avec 200€ de reste à charge chez le dentiste ?\" Agitation : \"En Guadeloupe, les soins dentaires sont 30% au-dessus de la métropole.\" Solution : \"Notre mutuelle GP rembourse 100% du dentaire à partir de 35€/mois.\" Clic garanti.",
    origin:
      'Cadre classique du copywriting direct response, popularisé dès les années 1960 dans la publicité postale américaine.',
    timeToResults:
      "Effet mesurable en 7-14 jours sur une campagne Meta Ads (CTR et coût par lead).",
  },
  {
    id: 'tofu-mofu-bofu',
    title: 'TOFU / MOFU / BOFU',
    category: 'Acquisition payante',
    oneLiner:
      "Ton prospect passe par 3 étapes avant d'acheter : Découverte (TOFU), Réflexion (MOFU), Décision (BOFU). Adapte ton message à chaque étape.",
    whyItWorks:
      "Tu ne parles pas pareil à quelqu'un qui ne te connait pas qu'à quelqu'un qui a déjà visité ton site 3 fois. Le \"top of funnel\" éduque, le \"middle of funnel\" rassure, le \"bottom of funnel\" pousse à l'action. Si tu envoies une pub \"Achetez maintenant -20%\" à un froid, il te ghoste. Si tu lui envoies \"Découvrez nos coulisses\", il te connait.",
    exampleGP:
      "Cabinet kiné Le Lamentin. TOFU (audience large GP) : Reel \"3 exercices pour soulager le mal de dos au bureau\". MOFU (gens qui ont vu le Reel) : pub \"Téléchargez notre guide 10 pages bien-être au bureau\". BOFU (gens qui ont téléchargé) : pub \"Premier RDV diagnostique gratuit cette semaine, 3 créneaux dispo\".",
    origin:
      "Modèle de funnel marketing popularisé par HubSpot vers 2010-2012. Référence universelle aujourd'hui.",
    timeToResults:
      "Construction du funnel en 2-3 semaines. Résultats lisibles sur 4-8 semaines avec un budget pub stable.",
  },
  {
    id: 'cbo-meta',
    title: 'CBO Meta',
    category: 'Acquisition payante',
    oneLiner:
      "Laisser l'algorithme Meta arbitrer ton budget entre tes audiences au lieu de le faire à la main.",
    whyItWorks:
      "Tu as 3 audiences (jeunes parents, sportifs, seniors). Avant, il fallait deviner combien mettre sur chacune. Avec CBO (Campaign Budget Optimization), tu donnes ton budget total à Meta et il distribue automatiquement vers l'audience qui performe le mieux en temps réel. L'algo voit ce que tu ne vois pas.",
    exampleGP:
      "Coach sportif Sainte-Anne, 30€/jour de budget. Tu actives CBO avec 3 audiences : femmes 35-50 GP, sportifs amateurs GP, parents enfants 5-12 GP. Au bout de 5 jours, Meta a mis 20€ sur \"femmes 35-50\" car c'est elles qui réservent le plus. Tu n'aurais jamais deviné. CPL passé de 18€ à 11€.",
    origin:
      "Fonctionnalité officielle de Meta (ex-Facebook) Ads Manager. Devenue le réglage par défaut recommandé par Meta depuis 2020.",
    timeToResults:
      "Première phase d'apprentissage : 5 à 7 jours. Performance stable au bout de 2-3 semaines de campagne.",
  },
]

/**
 * Couleur de la pastille de catégorie. Reprend la palette
 * (`PRIORITY_DOT_CLASS`) pour rester cohérent avec le reste de l'app.
 */
const CATEGORY_COLOR: Record<Framework['category'], string> = {
  'Visibilité IA': '#4F46E5',
  "Conversion site / page d'accueil": '#C7991F',
  'Contenu de fond': '#3E6B4A',
  'Présence sociale': '#E0633A',
  'Acquisition payante': '#2E2A78',
}

export default function SparkPilotFrameworksPage() {
  return (
    <div className="relative mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-12">
      <nav
        aria-label="Fil d'Ariane"
        className="mb-6 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#5E626C]"
      >
        <Link href="/sparkpilot" className="transition hover:text-[#0F1115]">
          Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#0F1115]">Glossaire des méthodes</span>
      </nav>

      {/* Header */}
      <section className="relative mb-10 rounded-[18px] border border-[#E9E5D9] bg-white p-6 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-10">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#4F46E5]">
          <BookOpen className="h-3.5 w-3.5" />
          Bibliothèque pédagogique SparkPilot
        </div>
        <h1
          className="mt-3 text-[40px] leading-[0.98] tracking-tight sm:text-[52px]"
          style={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
          }}
        >
          Glossaire des méthodes éprouvées
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#22252C]">
          Toutes les stratégies que SparkPilot t&apos;aide à appliquer,
          expliquées simplement. Clique sur celle qui t&apos;intéresse pour la
          comprendre en 2 minutes.
        </p>
      </section>

      {/* Sommaire ancres */}
      <section
        data-tour="frameworks-toc"
        className="mb-10 rounded-2xl border border-[#E9E5D9] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          <Compass className="h-3.5 w-3.5" />
          Sommaire — 15 méthodes
        </div>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FRAMEWORKS.map((f) => (
            <li key={f.id}>
              <a
                href={`#${f.id}`}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-[13.5px] text-[#22252C] transition hover:bg-[#F7F5EF] hover:text-[#0F1115]"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLOR[f.category] }}
                  aria-hidden
                />
                <span className="flex-1 truncate">{f.title}</span>
                <ChevronRight className="h-3 w-3 text-[#A8ACB5] transition group-hover:translate-x-0.5 group-hover:text-[#5E626C]" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Sections frameworks */}
      <div className="mx-auto max-w-[800px] space-y-12">
        {FRAMEWORKS.map((f) => (
          <FrameworkSection key={f.id} framework={f} />
        ))}
      </div>

      {/* Footer page */}
      <div className="mx-auto mt-16 max-w-[800px] rounded-2xl border border-[#E9E5D9] bg-[#F7F5EF]/40 p-6 text-center">
        <p className="text-[13.5px] leading-relaxed text-[#5E626C]">
          Une méthode te semble incomplète ou tu veux un exemple plus collé à
          ton métier ? Dis-le, on enrichit ce glossaire en continu.
        </p>
        <Link
          href="/sparkpilot"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#0F1115] px-4 text-[13.5px] font-medium text-[#F7F5EF] transition hover:bg-[#22252C]"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}

/**
 * Carte d'un framework, ancrée via `id` pour les liens directs depuis
 * les task cards (futur) ou les bandeaux Stratégie globale.
 */
function FrameworkSection({ framework }: { framework: Framework }) {
  const color = CATEGORY_COLOR[framework.category]
  return (
    <section
      id={framework.id}
      className="scroll-mt-24 rounded-2xl border border-[#E9E5D9] bg-white p-6 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.04)] sm:p-8"
    >
      {/* En-tête : catégorie + titre */}
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em]">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span style={{ color }}>{framework.category}</span>
      </div>
      <h2
        className="text-[28px] leading-tight tracking-tight sm:text-[32px]"
        style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif' }}
      >
        {framework.title}
      </h2>

      {/* Idée en 1 phrase */}
      <div className="mt-4 rounded-lg border-l-2 border-indigo-300 bg-indigo-50/40 px-4 py-3">
        <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[#4F46E5]">
          L&apos;idée en 1 phrase
        </div>
        <p className="mt-1 text-[14.5px] leading-relaxed text-[#22252C]">
          {framework.oneLiner}
        </p>
      </div>

      {/* Pourquoi ça marche */}
      <div className="mt-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          Pourquoi ça marche
        </h3>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-[#22252C]">
          {framework.whyItWorks}
        </p>
      </div>

      {/* Exemple concret en Guadeloupe */}
      <div className="mt-6 rounded-lg bg-[#F7F5EF]/70 p-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          Exemple concret en Guadeloupe
        </h3>
        <p className="mt-2 text-[14.5px] leading-[1.7] text-[#22252C]">
          {framework.exampleGP}
        </p>
      </div>

      {/* Origine + délai */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E9E5D9]/70 pt-5 sm:grid-cols-2">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
            Origine
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5E626C]">
            {framework.origin}
          </p>
        </div>
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
            Combien de temps
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5E626C]">
            {framework.timeToResults}
          </p>
        </div>
      </div>
    </section>
  )
}
