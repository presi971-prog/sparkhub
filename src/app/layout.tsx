import type { Metadata } from 'next'
import { Geist, Geist_Mono, Inter, Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${outfit.variable} antialiased`}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
