import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, Target } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Historique des scans',
  description: 'Tous tes scans SparkScan classés du plus récent au plus ancien.',
}

interface ScanRow {
  id: string
  input_url: string
  zone: string
  niveau_zone: string
  langue: string
  status: string
  maturity_status: string | null
  method_used: string | null
  cost_usd: number | null
  created_at: string
  completed_at: string | null
  ranked_keywords_count: number | null
}

export default async function HistoriquePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/connexion?next=/sparkscan/historique')
  }

  const { data: scans, error } = await supabase
    .from('sparkscan_scans')
    .select(
      'id, input_url, zone, niveau_zone, langue, status, maturity_status, method_used, cost_usd, created_at, completed_at, ranked_keywords_count',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="container mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <Link
        href="/sparkscan"
        className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au scan
      </Link>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-balance text-4xl font-normal leading-tight tracking-[-0.02em] text-slate-900 sm:text-5xl"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            Tes scans <em className="italic text-violet-700">SparkScan</em>
          </h1>
          <p
            className="mt-2 text-[10px] uppercase tracking-[0.22em] text-slate-400"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            {scans?.length ?? 0} scan{(scans?.length ?? 0) > 1 ? 's' : ''} · 12 derniers mois
          </p>
        </div>
        <Link
          href="/sparkscan"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.4)] transition hover:bg-slate-800"
        >
          <Target className="h-4 w-4" />
          Lancer un nouveau scan
        </Link>
      </div>

      {error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-800">
          Erreur de chargement : {error.message}
        </div>
      )}

      {!error && (!scans || scans.length === 0) && (
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-base font-medium text-slate-800">
            Aucun scan encore.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Lance ton premier scan pour découvrir tes concurrents.
          </p>
          <Link
            href="/sparkscan"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700"
          >
            Commencer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {scans && scans.length > 0 && (
        <ul className="mt-10 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)]">
          {(scans as ScanRow[]).map((s) => {
            const date = new Date(s.created_at)
            const cleanHost = (() => {
              try {
                return new URL(
                  s.input_url.startsWith('http') ? s.input_url : `https://${s.input_url}`,
                ).hostname.replace(/^www\./, '')
              } catch {
                return s.input_url
              }
            })()
            const statusBadge = {
              completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              error: 'bg-red-50 text-red-700 border-red-200',
              running: 'bg-amber-50 text-amber-700 border-amber-200',
              pending: 'bg-slate-50 text-slate-700 border-slate-200',
            }[s.status] ?? 'bg-slate-50 text-slate-700 border-slate-200'
            const statusLabel = {
              completed: 'Terminé',
              error: 'Échec',
              running: 'En cours',
              pending: 'En attente',
            }[s.status] ?? s.status
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-6 py-5 transition hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="truncate text-sm font-semibold text-slate-900"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      {cleanHost}
                    </p>
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${statusBadge}`}
                    >
                      {statusLabel}
                    </span>
                    {s.maturity_status && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-600">
                        {s.maturity_status === 'mature' ? 'Site référencé' : 'Sans référencement'}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-1 text-xs text-slate-500"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    {s.zone} · {s.niveau_zone} · {s.langue} · {date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                  {s.ranked_keywords_count !== null && s.ranked_keywords_count > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {s.ranked_keywords_count.toLocaleString('fr-FR')} mots-clés détectés sur Google
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {s.cost_usd !== null && (
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      ${s.cost_usd.toFixed(3)}
                    </span>
                  )}
                  <Link
                    href={`/sparkscan?scan_id=${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
                  >
                    Voir
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p
        className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        Tes scans sont conservés 12 mois puis supprimés automatiquement (voir{' '}
        <a href="/sparkscan/cgu" className="hover:text-violet-700 hover:underline">
          conditions
        </a>
        )
      </p>
    </div>
  )
}
