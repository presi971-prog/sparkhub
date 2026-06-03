import type { Metadata } from 'next'
import Link from 'next/link'
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google'

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SparkScan — Intelligence concurrentielle',
    template: '%s · SparkScan',
  },
  description:
    "Découvre tes vrais concurrents et décortique leur stratégie : SEO, réseaux sociaux, présence locale, citations dans les IA.",
}

export default function SparkScanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable} relative min-h-screen overflow-x-hidden bg-[#FAFAF7] text-slate-900 antialiased`}
      style={{ fontFamily: 'var(--font-geist), system-ui, sans-serif' }}
    >
      {/* CSS print : cache header/footer, retire l'arrière-plan, optimise pour PDF */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm 1.2cm; }
          html, body { background: white !important; }
          header[class*="sticky"], footer, button[type="button"], .no-print { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          /* Force tous les détails dépliés à l'impression */
          [data-state="closed"] > * { height: auto !important; opacity: 1 !important; }
          section, article { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
        }
      `}</style>

      {/* Subtle soft gradient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-x-0 top-0 h-[700px] opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(167, 139, 250, 0.16), transparent 70%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[400px] opacity-40"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(244, 114, 182, 0.12), transparent 70%)',
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-[#FAFAF7]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link
            href="/sparkscan"
            className="group flex items-baseline gap-2.5"
            aria-label="SparkScan accueil"
          >
            <span
              className="text-2xl font-normal tracking-tight text-slate-900"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              SparkScan
            </span>
            <span
              className="hidden text-[10px] uppercase tracking-[0.22em] text-slate-400 sm:inline"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              v0.1·beta
            </span>
          </Link>

          <nav
            className="flex items-center gap-6 text-xs"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            <Link
              href="/sparkscan/historique"
              className="uppercase tracking-[0.15em] text-slate-500 transition-colors hover:text-slate-900"
            >
              Historique
            </Link>
            <Link
              href="/"
              className="uppercase tracking-[0.15em] text-slate-500 transition-colors hover:text-slate-900"
            >
              ← Sparkhub
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative">{children}</main>

      {/* Footer */}
      <footer
        className="container mx-auto px-6 py-12 text-center text-[10px] uppercase tracking-[0.25em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        <p>
          SparkScan · DataForSEO + Apify + Claude AI
        </p>
      </footer>
    </div>
  )
}
