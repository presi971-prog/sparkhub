'use client'

import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Settings,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  SocialPlatform,
} from '@/lib/sparkexecute/types'

interface SocialAccount {
  id: string
  name: string
  platform: SocialPlatform
}

type AccountsByPlatform = Partial<Record<SocialPlatform, SocialAccount[]>>

interface AccountsApiResponse {
  pit_configured: boolean
  accounts: AccountsByPlatform
  error?: string
}

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google Business Profile',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  threads: 'Threads',
}

const PLATFORMS_V1_1: SocialPlatform[] = [
  'linkedin',
  'instagram',
  'facebook',
  'google_business',
]

export function ReglagesView() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AccountsApiResponse | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/sparkexecute/social-accounts', {
        cache: 'no-store',
      })
      const json = (await res.json()) as AccountsApiResponse
      setData(json)
    } catch {
      setFetchError('Impossible de lire les réglages. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="relative mx-auto max-w-[1080px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-10">
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          <Settings className="h-3 w-3" /> Réglages
        </div>
        <h1
          className="text-[32px] leading-tight text-[#0F1115]"
          style={{
            fontFamily: 'var(--font-instrument-serif), Georgia, serif',
          }}
        >
          Connexions GHL
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#5E626C]">
          SparkExecute publie tes livrables directement via ton compte GHL DCG AI.
          Vérifie ici que tout est branché.
        </p>
      </header>

      {/* État du PIT */}
      <section className="mb-6 rounded-xl border border-[#E4E7E2] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          Compte GHL serveur
        </h2>
        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-[#5E626C]">
            <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
          </p>
        ) : data?.pit_configured ? (
          <p className="inline-flex items-center gap-2 text-sm text-[#064E3B]">
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" /> Le compte GHL DCG AI
            est connecté côté serveur.
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 text-sm text-[#A1432D]">
            <XCircle className="h-4 w-4" /> Le compte GHL n&apos;est pas connecté côté
            serveur. Préviens l&apos;équipe technique.
          </p>
        )}
      </section>

      {/* Comptes Social Planner */}
      <section className="mb-6 rounded-xl border border-[#E4E7E2] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
            Comptes sociaux connectés
          </h2>
          <a
            href="https://app.gohighlevel.com/v2/marketing/social-planner"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1115] transition hover:bg-[#F5F6F4]"
          >
            Connecter un compte <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {fetchError ? (
          <p className="text-sm text-[#A1432D]">{fetchError}</p>
        ) : loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-[#5E626C]">
            <Loader2 className="h-4 w-4 animate-spin" /> Lecture des comptes…
          </p>
        ) : data?.error ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {data.error}
          </div>
        ) : (
          <ul className="divide-y divide-[#E4E7E2]">
            {PLATFORMS_V1_1.map((platform) => {
              const accounts = data?.accounts?.[platform] ?? []
              const connected = accounts.length > 0
              return (
                <li
                  key={platform}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    {connected ? (
                      <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[#A1432D]" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#0F1115]">
                        {PLATFORM_LABEL[platform]}
                      </p>
                      <p className="text-xs text-[#5E626C]">
                        {connected
                          ? accounts.map((a) => a.name).join(', ')
                          : 'Aucun compte connecté'}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Doc rapide */}
      <section className="rounded-xl border border-[#E4E7E2] bg-[#F5F6F4]/40 p-5">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
          Comment connecter un compte
        </h2>
        <ol className="ml-5 list-decimal space-y-2 text-sm text-[#22252C]">
          <li>
            Va dans{' '}
            <a
              href="https://app.gohighlevel.com/v2/marketing/social-planner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0F1115] underline"
            >
              GHL → Marketing → Social Planner
            </a>
            .
          </li>
          <li>Clique sur <em>Connecter un compte</em>.</li>
          <li>
            Choisis la plateforme (LinkedIn, Instagram, Facebook, Google Business),
            connecte-toi et autorise GHL.
          </li>
          <li>Reviens ici et rafraîchis la page. Le compte apparaîtra connecté.</li>
        </ol>
      </section>
    </div>
  )
}
