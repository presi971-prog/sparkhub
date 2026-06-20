/**
 * Profils de marque ÉDITRICE de SparkExecute — la marque qui apparaît côté
 * public dans les livrables (articles, posts, CTA, Schema).
 *
 * MULTI-SITE (comme SparkScan) : chaque run choisit son profil via
 * `input_brief.brand` (id du profil). Sans id → profil par défaut = DCG AI,
 * pour que le comportement existant reste IDENTIQUE.
 *
 * ⚠️ "SparkExecute" / "SparkScan" / "SparkPilot" / "SparkHub" sont des noms
 * d'OUTILS INTERNES et ne doivent JAMAIS être exposés au lecteur final.
 */

export interface BrandProfile {
  /** Identifiant stable du profil (stocké dans input_brief.brand). */
  id: string
  /** Nom public de la marque (la SEULE marque visible par le lecteur). */
  name: string
  /** Domaine public (https://…). */
  domain: string
  /** Lien RÉEL de conversion — le SEUL autorisé dans un CTA. */
  ctaUrl: string
  /** Libellé du bouton/lien de CTA (sans inventer d'autre URL). */
  ctaLabel: string
  /** Audience par défaut si le brief n'en fournit pas. */
  audienceDefault: string
  /** Zone géographique servie (Schema.org areaServed). */
  areaServed: string
  /**
   * Règles d'ancrage propres à la marque (géographie, ton, exemples,
   * contraintes locales). Injecté dans les prompts à la place du bloc
   * "ANCRAGE" autrefois codé en dur DCG AI/Guadeloupe.
   */
  anchoringRules: string
  /**
   * Style d'univers visuel pour les prompts d'image (Nano Banana / Veo).
   * Remplace le « palmiers Guadeloupe » autrefois codé en dur.
   */
  imageStyle: string
}

/** Profil DCG AI — comportement HISTORIQUE préservé à l'identique. */
const DCG_AI: BrandProfile = {
  id: 'dcg_ai',
  name: 'DCG AI',
  domain: 'https://digital-code-growth.com',
  ctaUrl: 'https://digital-code-growth.com/rdv',
  ctaLabel: 'Réserve ton audit gratuit de 30 minutes',
  audienceDefault: 'TPE/PME en Guadeloupe',
  areaServed: 'Guadeloupe',
  anchoringRules: `R0 #1 — ANCRAGE GUADELOUPE (PRIORITÉ ABSOLUE)
- Tous les exemples, références, comparaisons doivent ancrer le contenu en
  Guadeloupe (mention de villes : Pointe-à-Pitre, Basse-Terre, Le Gosier,
  Saint-François ; références au quotidien tropical ; contraintes locales).
- WhatsApp Business > SMS (les SMS sont bloqués depuis numéros français vers
  les opérateurs GP — ne JAMAIS conseiller le SMS).
- Décalage horaire GMT-4 avec Paris (5-6h) si pertinent.
- Ton accessible et chaleureux en français standard.
- INTERDIT : exemples "rue grise européenne", "métro parisien", climat froid.`,
  imageStyle:
    'Ancrage Guadeloupe : palmiers, façades colorées de l\'architecture créole, lumière chaude tropicale. JAMAIS de pull/col roulé, de rue grise européenne, ni de climat froid.',
}

/** Profil Concours SPP — préparation aux concours de sapeur-pompier (national). */
const CONCOURS_SPP: BrandProfile = {
  id: 'concours_spp',
  name: 'Concours SPP',
  domain: 'https://concours-spp.digital-code-growth.com',
  ctaUrl: 'https://concours-spp.digital-code-growth.com/offre',
  ctaLabel: 'Découvrir la préparation Concours SPP',
  audienceDefault:
    'candidats aux concours de sapeur-pompier professionnel (caporal, sergent, lieutenant, capitaine)',
  areaServed: 'France',
  anchoringRules: `R0 #1 — ANCRAGE CONCOURS SPP (PRIORITÉ ABSOLUE)
- Public = candidats EXPERTS et exigeants : la moindre erreur technique
  (épreuve, barème, programme, date) décrédibilise. En cas de doute sur un
  chiffre officiel, reste qualitatif plutôt que d'inventer.
- Référentiel = textes OFFICIELS français (arrêtés, décrets, notes de cadrage,
  brochures de concours). N'invente jamais une épreuve, une durée, un
  coefficient ni un programme.
- Périmètre NATIONAL (France entière) : ne PAS ancrer en Guadeloupe, pas de
  ville/contexte tropical, pas de règle "WhatsApp vs SMS".
- Ton professionnel, pédagogique et encourageant, vouvoiement adapté au public.
- INTERDIT : exemples marketing/TPE-PME hors sujet ; rester centré sur la
  préparation au concours et la réussite du candidat.`,
  imageStyle:
    'Univers sapeurs-pompiers professionnels FRANÇAIS et préparation au concours : caserne, entraînement physique, révision, équipement et tenue crédibles en France. JAMAIS de tenue/matériel étranger (ex. casque US), jamais de détail technique incohérent, pas d\'ancrage tropical imposé.',
}

/** Registre des profils disponibles, indexés par id. */
export const BRAND_PROFILES: Record<string, BrandProfile> = {
  [DCG_AI.id]: DCG_AI,
  [CONCOURS_SPP.id]: CONCOURS_SPP,
}

/** Profil par défaut si aucun n'est précisé (rétro-compat DCG AI). */
export const DEFAULT_BRAND_ID = DCG_AI.id

/**
 * Résout le profil de marque depuis un id (typiquement input_brief.brand).
 * Tout id inconnu ou absent → profil par défaut (DCG AI), pour ne rien casser.
 */
export function resolveBrandProfile(id?: string | null): BrandProfile {
  if (id && BRAND_PROFILES[id]) return BRAND_PROFILES[id]
  return BRAND_PROFILES[DEFAULT_BRAND_ID]
}

/** Construit la règle R0 anti-invention pour un profil donné. */
export function buildR0ZeroInvention(profile: BrandProfile): string {
  return `R0 #0 — ZÉRO INVENTION (PRIORITÉ MAXIMALE)
- INTERDIT d'inventer des témoignages, citations clients, avis, ou noms de
  clients / d'entreprises présentés comme réels.
- INTERDIT d'inventer des statistiques ou des sources. Sans chiffre fiable et
  certain, reste qualitatif (ex. "plusieurs heures par semaine") sans inventer
  de pourcentage ni de source.
- "SparkExecute"/"SparkScan"/"SparkPilot"/"SparkHub" = outils internes : ne
  JAMAIS les nommer. La seule marque visible est ${profile.name}.
- CTA / conversion : utilise UNIQUEMENT ce lien réel (jamais une autre URL,
  jamais "#") → ${profile.ctaUrl}`
}

// ---------------------------------------------------------------------------
// Rétro-compatibilité : les générateurs pas encore migrés importent encore ces
// constantes. Elles pointent sur le profil par défaut (DCG AI) → comportement
// inchangé tant que la migration n'est pas terminée.
// ---------------------------------------------------------------------------
export const PUBLISH_BRAND_NAME = DCG_AI.name
export const PUBLISH_BRAND_DOMAIN = DCG_AI.domain
export const PUBLISH_BRAND_CTA_URL = DCG_AI.ctaUrl
export const R0_ZERO_INVENTION = buildR0ZeroInvention(DCG_AI)
