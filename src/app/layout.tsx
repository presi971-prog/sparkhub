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
    default: 'Cobeone Pro - Plateforme des Livreurs de Guadeloupe',
    template: '%s | Cobeone Pro',
  },
  description:
    'La plateforme des livreurs et professionnels de Guadeloupe. Outils IA, visibilité et réseau pour développer votre activité. Rejoignez les premiers membres et obtenez des avantages exclusifs.',
  keywords: [
    'livreur',
    'guadeloupe',
    'livraison',
    'professionnel',
    'carte',
    'outils IA',
    'cobeone',
  ],
  authors: [{ name: 'Cobeone Pro' }],
  creator: 'Cobeone Pro',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Cobeone Pro',
    title: 'Cobeone Pro - Plateforme des Livreurs de Guadeloupe',
    description:
      'La plateforme des livreurs et professionnels de Guadeloupe. Rejoignez les premiers membres et obtenez des avantages exclusifs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cobeone Pro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cobeone Pro - Plateforme des Livreurs de Guadeloupe',
    description:
      'La plateforme des livreurs et professionnels de Guadeloupe. Rejoignez les premiers membres.',
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
