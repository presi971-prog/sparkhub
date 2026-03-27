import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rejoins Cobeone — L\'écosystème des pros en Guadeloupe',
  description: 'Agent vocal IA 24/7, outils marketing, clients automatiques. Les premiers pros bénéficient de 0% de commission.',
  openGraph: {
    title: 'Rejoins Cobeone — Offre Pro Guadeloupe',
    description: 'Agent vocal IA 24/7, outils marketing, clients automatiques.',
    url: 'https://sparkhub.digital-code-growth.com/offre-pro',
  },
}

export default function OffreProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="offre-pro-page">
      {children}
    </div>
  )
}
