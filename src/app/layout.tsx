import type { Metadata } from 'next'
import { Geist, Inter, Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin-ext'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin-ext'],
  weight: ['400', '600'],
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin-ext'],
  weight: ['600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'SparkHub - Votre succès commence ici',
    template: '%s | SparkHub',
  },
  description:
    'SparkHub, la plateforme des livreurs et professionnels de Guadeloupe. Outils IA, visibilité et réseau pour développer votre activité. Votre succès commence ici.',
  keywords: [
    'livreur',
    'guadeloupe',
    'livraison',
    'professionnel',
    'carte',
    'outils IA',
    'sparkhub',
  ],
  authors: [{ name: 'SparkHub' }],
  creator: 'SparkHub',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'SparkHub',
    title: 'SparkHub - Votre succès commence ici',
    description:
      'La plateforme des livreurs et professionnels de Guadeloupe. Votre succès commence ici.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SparkHub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SparkHub - Votre succès commence ici',
    description:
      'La plateforme des livreurs et professionnels de Guadeloupe. Votre succès commence ici.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'SparkHub',
              url: 'https://sparkhub.digital-code-growth.com',
              logo: 'https://sparkhub.digital-code-growth.com/logo.png',
              description: 'Plateforme d\'outils IA pour livreurs et professionnels en Guadeloupe',
              areaServed: {
                '@type': 'Place',
                name: 'Guadeloupe',
              },
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${inter.variable} ${outfit.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
