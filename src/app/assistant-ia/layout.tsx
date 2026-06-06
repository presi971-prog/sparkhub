import type { Metadata } from 'next'

// Page de vente publique DCG AI — assistante IA pour artisans en Guadeloupe.
// Metadata SEO + OpenGraph dédiés (lang fr héritée du <html lang="fr"> racine).
export const metadata: Metadata = {
  title: 'Ton assistante IA qui répond au téléphone et sur WhatsApp — DCG AI',
  description:
    'Tu es sur un chantier, le téléphone sonne ? Ton assistante IA décroche, répond sur WhatsApp et pose tes rendez-vous toute seule, 24h/24. 197 € par mois au lieu d\'une secrétaire à 2 200 €.',
  alternates: {
    canonical: 'https://sparkhub.digital-code-growth.com/assistant-ia',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'DCG AI',
    title: 'Ton téléphone sonne. Cette fois, quelqu\'un répond.',
    description:
      'Ton assistante IA décroche, répond sur WhatsApp et pose tes rendez-vous toute seule, 24h/24. Conçue pour les artisans de Guadeloupe.',
    url: 'https://sparkhub.digital-code-growth.com/assistant-ia',
    images: [
      {
        url: '/dcg-ai/plombier-guadeloupe.png',
        width: 1080,
        height: 1080,
        alt: 'Un plombier en Guadeloupe consulte son assistante IA sur son téléphone',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ton téléphone sonne. Cette fois, quelqu\'un répond.',
    description:
      'Ton assistante IA décroche, répond sur WhatsApp et pose tes rendez-vous toute seule, 24h/24.',
    images: ['/dcg-ai/plombier-guadeloupe.png'],
  },
}

export default function AssistantIaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
