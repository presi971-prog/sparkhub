/**
 * Spark Compta — Liste des métiers précis par famille
 *
 * Cette liste est utilisée par le wizard d'onboarding (étape 2) pour proposer
 * au pro un métier spécifique à l'intérieur de sa famille.
 */

import type { Family } from './constants'

export interface Metier {
  slug: string
  label: string
  description?: string
}

export const METIERS_BY_FAMILY: Record<Family, Metier[]> = {
  rouleur: [
    { slug: 'livreur', label: 'Livreur', description: 'Cobeone, Uber Eats, Deliveroo…' },
    { slug: 'taxi', label: 'Taxi' },
    { slug: 'vtc', label: 'VTC (chauffeur privé)' },
    { slug: 'coursier', label: 'Coursier' },
    { slug: 'moto_taxi', label: 'Moto-taxi' },
  ],
  mains_agiles: [
    { slug: 'plombier', label: 'Plombier' },
    { slug: 'electricien', label: 'Électricien' },
    { slug: 'macon', label: 'Maçon' },
    { slug: 'peintre', label: 'Peintre' },
    { slug: 'menuisier', label: 'Menuisier' },
    { slug: 'chauffagiste', label: 'Chauffagiste' },
    { slug: 'carreleur', label: 'Carreleur' },
    { slug: 'couvreur', label: 'Couvreur' },
    { slug: 'serrurier', label: 'Serrurier' },
    { slug: 'jardinier', label: 'Jardinier / paysagiste' },
  ],
  tenancier: [
    { slug: 'restaurant', label: 'Restaurant' },
    { slug: 'bar', label: 'Bar / café' },
    { slug: 'food_truck', label: 'Food truck' },
    { slug: 'boulangerie', label: 'Boulangerie / pâtisserie' },
    { slug: 'commerce', label: 'Commerce / boutique' },
    { slug: 'coiffeur', label: 'Coiffeur / barbier' },
    { slug: 'esthetique', label: 'Esthéticienne / institut' },
    { slug: 'epicerie', label: 'Épicerie' },
  ],
  cerveau: [
    { slug: 'formateur', label: 'Formateur indépendant' },
    { slug: 'consultant', label: 'Consultant (stratégie, marketing, SI, RH…)' },
    { slug: 'coach_pro', label: 'Coach professionnel' },
    { slug: 'redacteur', label: 'Rédacteur web / copywriter' },
    { slug: 'traducteur', label: 'Traducteur / interprète' },
    { slug: 'expert_data', label: 'Expert data / SEO / audit' },
  ],
  creatif: [
    { slug: 'photographe', label: 'Photographe' },
    { slug: 'videaste', label: 'Vidéaste / monteur' },
    { slug: 'graphiste', label: 'Graphiste / designer' },
    { slug: 'illustrateur', label: 'Illustrateur' },
    { slug: 'artiste', label: 'Artiste plasticien' },
    { slug: 'musicien', label: 'Musicien' },
    { slug: 'createur_contenu', label: 'Créateur de contenu (YouTube, Insta, TikTok)' },
  ],
  hebergeur: [
    { slug: 'location_saisonniere', label: 'Location saisonnière' },
    { slug: 'gite', label: 'Gîte rural' },
    { slug: 'chambre_hote', label: "Chambre d'hôte" },
    { slug: 'meuble_tourisme', label: 'Meublé de tourisme' },
    { slug: 'pension', label: 'Petite pension' },
  ],
}

export function getMetiersForFamily(family: Family): Metier[] {
  return METIERS_BY_FAMILY[family] ?? []
}
