export interface SeoSitePreset {
  key: string
  name: string
  url: string
  serpLocation: 'Guadeloupe' | 'France'
  description: string
  seedHints: string[]
}

export const SEO_SITES: SeoSitePreset[] = [
  { key: 'tqd', name: 'TranspoQuickD', url: 'https://transpoquickd.com', serpLocation: 'Guadeloupe',
    description: 'Transport de marchandises et livraison en Guadeloupe, devis gratuit.',
    seedHints: ['transport marchandises guadeloupe', 'livraison guadeloupe', 'transporteur guadeloupe', 'transport frigorifique guadeloupe'] },
  { key: 'kazmanioka', name: 'Kaz ManioKa', url: 'https://kazmanioka.fr', serpLocation: 'Guadeloupe',
    description: 'Location de 2 T2 meublés à Perrin, Les Abymes, à 5 min du nouveau CHU, 800 € par mois.',
    seedHints: ['location t2 abymes', 'location meublé guadeloupe', 'logement interne chu guadeloupe', 'location appartement abymes'] },
  { key: 'dcg-ai', name: 'DCG AI', url: 'https://digital-code-growth.com', serpLocation: 'Guadeloupe',
    description: 'Standardiste IA et WhatsApp 24h/24 pour les entreprises de Guadeloupe.',
    seedHints: ['standard téléphonique', 'permanence téléphonique', 'agent vocal ia', 'standardiste ia', 'secrétariat téléphonique'] },
  { key: 'cobeone', name: 'Cobeone', url: 'https://cobeone.com', serpLocation: 'Guadeloupe',
    description: 'Plateforme qui relie commerces et livreurs en Guadeloupe.',
    seedHints: ['livraison guadeloupe', 'livreur guadeloupe', 'livraison à domicile guadeloupe', 'coursier guadeloupe'] },
  { key: 'concours-spp', name: 'Concours SPP', url: 'https://concoursspp.com', serpLocation: 'France',
    description: 'Préparation en ligne aux concours de sapeur-pompier professionnel.',
    seedHints: ['concours sapeur pompier professionnel', 'préparation concours sapeur pompier', 'concours caporal sapeur pompier', 'concours sergent sapeur pompier'] },
]
export function getSeoSite(key: string) { return SEO_SITES.find(site => site.key === key) }
