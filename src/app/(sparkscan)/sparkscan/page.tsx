import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SparkScanContainer } from './sparkscan-container'

export const metadata: Metadata = {
  title: 'Analyser un site',
  description:
    "Colle l'URL d'un site. SparkScan trouve les vrais concurrents et te dit comment les dépasser sur Google et dans les IA.",
}

export default async function SparkScanPage({
  searchParams,
}: {
  searchParams: Promise<{ scan_id?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/connexion?next=/sparkscan')
  }

  // Si on arrive avec ?scan_id=XXX (depuis l'historique), on précharge le scan
  const params = await searchParams
  const preloadScanId =
    typeof params?.scan_id === 'string' ? params.scan_id : undefined

  return (
    <div className="container mx-auto px-6 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <span
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-pink-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            <span className="h-1 w-1 rounded-full bg-pink-600" />
            Plateforme d&apos;intelligence concurrentielle
          </span>
        </div>

        <SparkScanContainer userId={user.id} preloadScanId={preloadScanId} />

        <div className="mt-20 border-t border-slate-200/80 pt-10 sm:mt-28">
          <p
            className="mb-5 text-center text-[10px] uppercase tracking-[0.25em] text-slate-400"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Propulsé par
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500 sm:gap-x-12">
            <span>DataForSEO</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>Apify</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>Claude AI</span>
            <span className="hidden text-slate-300 sm:inline">·</span>
            <span>Perplexity</span>
          </div>
          <p
            className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            <a href="/sparkscan/cgu" className="hover:text-pink-700 hover:underline">
              Conditions d&apos;utilisation
            </a>
            <span className="mx-3 text-slate-300">·</span>
            <span>10 scans / 24h max · conseils à titre indicatif</span>
          </p>
        </div>
      </div>
    </div>
  )
}
