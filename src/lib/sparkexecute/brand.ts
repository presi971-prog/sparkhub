/**
 * Marque ÉDITRICE de SparkExecute — celle qui apparaît côté public dans les
 * livrables (articles, posts, CTA, Schema).
 *
 * ⚠️ Ce n'est PAS "SparkExecute" / "SparkScan" / "SparkPilot" / "SparkHub" :
 * ce sont des noms d'OUTILS INTERNES et ne doivent JAMAIS être exposés au
 * lecteur final. Source unique de vérité importée par tous les générateurs.
 *
 * TODO multi-client : à terme, résoudre la marque/domaine depuis le profil de
 * l'utilisateur (un client SparkExecute publie sous SA marque, pas DCG AI).
 */
export const PUBLISH_BRAND_NAME = 'DCG AI'
export const PUBLISH_BRAND_DOMAIN = 'https://digital-code-growth.com'

/**
 * Lien RÉEL de prise de rendez-vous / audit gratuit (widget booking GHL DCG AI).
 * C'est le SEUL lien autorisé dans un CTA. Source : page offre-pro + GHL.
 * TODO multi-client : à terme, lire ce lien depuis le profil de l'utilisateur.
 */
export const PUBLISH_BRAND_CTA_URL =
  'https://demo.digital-code-growth.com/chat-demo-optin'

/** Phrase R0 anti-invention réutilisée dans les prompts des générateurs. */
export const R0_ZERO_INVENTION = `R0 #0 — ZÉRO INVENTION (PRIORITÉ MAXIMALE)
- INTERDIT d'inventer des témoignages, citations clients, avis, ou noms de
  clients / d'entreprises présentés comme réels.
- INTERDIT d'inventer des statistiques ou des sources. Sans chiffre fiable et
  certain, reste qualitatif (ex. "plusieurs heures par semaine") sans inventer
  de pourcentage ni de source.
- "SparkExecute"/"SparkScan"/"SparkPilot"/"SparkHub" = outils internes : ne
  JAMAIS les nommer. La seule marque visible est ${PUBLISH_BRAND_NAME}.
- CTA / prise de RDV : utilise UNIQUEMENT ce lien réel (jamais une autre URL,
  jamais "#") → ${PUBLISH_BRAND_CTA_URL}`
