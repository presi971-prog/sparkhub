'use client'

import { useEffect, useState } from 'react'
import { SparkScanForm } from './sparkscan-form'
import { CompetitorsPreview } from './competitors-preview'

// ----- Types miroir de src/lib/sparkscan/* -----

export type Qualification = 'direct' | 'indirect' | 'noise'

export interface RawSeo {
  rank: number
  domain: string
  avg_position: number | null
  intersections: number
  estimated_traffic: number | null
  shared_keywords: number | null
}

export interface RawLocal {
  placeId: string | null
  name: string
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  reviews: number | null
  category: string | null
  lat: number | null
  lng: number | null
  googleUrl: string | null
  matchedQueries: string[]
  avgPosition: number | null
  occurrences: number
}

export interface CompetitorEnrichment {
  positioning: string
  strengths: string[]
  weaknesses: string[]
  tactical_action: string
  source_quality: 'site_read' | 'name_only'
}

export interface BlogAnalysis {
  has_blog: boolean
  blog_url: string | null
  publication_frequency: string
  dominant_topics: string[]
  average_length: string
  editorial_quality: string
  exploitable_gap: string
}

// --- Réseaux sociaux (Facebook + Instagram) ---

export interface FacebookPost {
  text: string
  url: string | null
  date: string | null
  likes: number | null
  comments: number | null
  shares: number | null
}

export interface FacebookPageData {
  url: string
  name: string | null
  followers: number | null
  likes: number | null
  rating: number | null
  description: string | null
  email: string | null
  phone: string | null
  website: string | null
  category: string | null
  posts: FacebookPost[]
}

export interface InstagramPost {
  caption: string
  url: string | null
  date: string | null
  likes: number | null
  comments: number | null
  imageUrl: string | null
}

export interface InstagramData {
  url: string
  username: string | null
  fullName: string | null
  biography: string | null
  followers: number | null
  following: number | null
  verified: boolean | null
  postsCount: number | null
  posts: InstagramPost[]
}

export interface SocialAnalysis {
  frequency: 'active' | 'régulière' | 'faible' | 'inactive' | 'inconnue'
  dominant_content: string
  engagement: 'fort' | 'moyen' | 'faible' | 'inconnu'
  opportunity: string
}

export interface SocialMediaPayload {
  data: {
    facebook: FacebookPageData | null
    instagram: InstagramData | null
  }
  analysis: SocialAnalysis | null
}

export type Confidence = 'high' | 'medium' | 'low'

export interface EnrichedCompetitor {
  key: string
  label: string
  rank: number
  qualification: Qualification
  relevance_score: number
  reason: string
  /** Degré de confiance du qualifier — UI affiche un badge "Fiable/À vérifier/Incertain". */
  confidence?: Confidence
  enrichment: CompetitorEnrichment | null
  blog?: BlogAnalysis | null
  social_media?: SocialMediaPayload | null
  /**
   * true = fiche Google Maps trouvée. false = acteur digital-first sans présence
   * locale Maps (signal "prospect potentiel"). undefined = info non disponible
   * (méthode A, sites mûrs).
   */
  has_gmaps?: boolean
  kind: 'seo' | 'local'
  raw_seo?: RawSeo
  raw_local?: RawLocal
}

export interface GeoVisibilityEntry {
  domain: string
  label: string
  mentions: number
  questions_appeared_in: number
  visibility_score: number
  rank: number
}

export interface GeoCitations {
  questions_asked: string[]
  visibility: GeoVisibilityEntry[]
  insights: string
  costUsd: number
}

export type StrategicLever = 'attaquer' | 'copier' | 'eviter' | 'partenariat'

export interface SynthesisPriority {
  competitor_key: string
  competitor_label: string
  lever: StrategicLever
  lever_reason: string
  tactical_action: string
  estimated_gain: string
  estimated_cost: string
  kpi_30j: string
  who_does_it: string
  /** Re-check final : true si validé par 2e passe Claude, false si incohérence détectée. */
  verified?: boolean
  /** Si !verified : 1 phrase explicative — UI affiche un encart d'avertissement. */
  verification_warning?: string
}

export interface StrategicSynthesis {
  executive_summary: string
  market_overview: string
  top3_priorities: SynthesisPriority[]
}

export interface ClientContextInput {
  objective: 'acquisition' | 'fidelisation' | 'differenciation' | 'defense'
  team_size: 'solo' | '2-5' | '5+'
  monthly_budget: 'none' | 'under_500' | '500_2000' | '2000_plus'
  ad_budget: 'none' | 'under_300' | '300_1000' | '1000_plus'
  horizon: '30j' | '90j' | '6m'
}

export type ScanResult = {
  scan_id: string
  status: 'completed' | 'error' | 'running'
  maturity_status: 'young' | 'mature' | null
  ranked_keywords_count: number
  method_used: 'A+C' | 'B' | null
  competitors_enriched: EnrichedCompetitor[]
  synthesis: StrategicSynthesis | null
  geo_citations: GeoCitations | null
  warnings?: string[]
  cost_usd: number
  error_message?: string
}

export interface ScanProgress {
  step: string
  label: string
  percent: number
  started_at?: string
}

export type ScanState =
  | { kind: 'idle' }
  | { kind: 'loading'; startedAt: number; progress?: ScanProgress }
  | { kind: 'success'; data: ScanResult; targetUrl: string; zone: string }
  | { kind: 'error'; error: string }

export function SparkScanContainer({
  userId,
  preloadScanId,
}: {
  userId: string
  preloadScanId?: string
}) {
  const [state, setState] = useState<ScanState>(
    preloadScanId ? { kind: 'loading', startedAt: Date.now() } : { kind: 'idle' },
  )

  // Précharge un scan existant si on arrive avec ?scan_id=XXX (depuis l'historique)
  useEffect(() => {
    if (!preloadScanId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/sparkscan/status?scan_id=${encodeURIComponent(preloadScanId)}`,
        )
        if (cancelled) return
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          setState({
            kind: 'error',
            error: err.error ?? `Impossible de charger le scan (${res.status})`,
          })
          return
        }
        const row = await res.json()
        // Reconstruit un ScanResult à partir de la row DB
        const data: ScanResult = {
          scan_id: row.id,
          status: row.status,
          maturity_status: row.maturity_status,
          ranked_keywords_count: row.ranked_keywords_count ?? 0,
          method_used: row.method_used,
          competitors_enriched: row.competitors_enriched ?? [],
          synthesis: row.synthesis ?? null,
          geo_citations: row.geo_citations ?? null,
          warnings: [],
          cost_usd: row.cost_usd ?? 0,
          error_message: row.error_message,
        }
        if (data.status === 'error' || data.error_message) {
          setState({
            kind: 'error',
            error: data.error_message ?? 'Le scan a échoué',
          })
          return
        }
        setState({
          kind: 'success',
          data,
          targetUrl: row.input_url ?? '',
          zone: row.zone ?? '',
        })
      } catch (err) {
        if (cancelled) return
        setState({
          kind: 'error',
          error: err instanceof Error ? err.message : 'Erreur réseau',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [preloadScanId])

  function handleResult(data: ScanResult, targetUrl: string, zone: string) {
    if (data.status === 'error' || data.error_message) {
      setState({
        kind: 'error',
        error: data.error_message ?? 'Le scan a échoué sans message.',
      })
      return
    }
    setState({ kind: 'success', data, targetUrl, zone })
  }

  function handleError(error: string) {
    setState({ kind: 'error', error })
  }

  function handleStart() {
    setState({ kind: 'loading', startedAt: Date.now() })
  }

  function handleProgress(progress: ScanProgress) {
    setState((prev) =>
      prev.kind === 'loading' ? { ...prev, progress } : prev,
    )
  }

  function handleReset() {
    setState({ kind: 'idle' })
  }

  const isLoading = state.kind === 'loading'
  const isWide = state.kind === 'success'

  return (
    <div
      className={`grid grid-cols-1 items-start gap-12 lg:gap-16 ${
        isWide ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
      }`}
    >
      {!isWide && (
        <div className="space-y-10 lg:col-span-7">
          <div className="space-y-6">
            <h1
              className="text-balance text-5xl font-normal leading-[1.05] tracking-[-0.02em] text-slate-900 sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'var(--font-instrument-serif)' }}
            >
              Découvre tes concurrents,{' '}
              <em className="italic text-pink-700">dépasse-les</em>.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-slate-600">
              Colle l&apos;URL de n&apos;importe quel site. SparkScan trouve
              les vrais concurrents et te dit exactement quoi faire pour les
              dépasser.
            </p>
          </div>
          <SparkScanForm
            userId={userId}
            isLocked={isLoading}
            onStart={handleStart}
            onProgress={handleProgress}
            onResult={handleResult}
            onError={handleError}
            onReset={handleReset}
            canReset={state.kind === 'error'}
          />
        </div>
      )}

      {isWide && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2
            className="text-balance text-3xl font-normal leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            Ton rapport <em className="italic text-pink-700">SparkScan</em>
          </h2>
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            ← Lancer un autre scan
          </button>
        </div>
      )}

      <div
        className={
          isWide ? 'lg:col-span-1' : 'lg:col-span-5 lg:sticky lg:top-24'
        }
      >
        <CompetitorsPreview state={state} />
      </div>
    </div>
  )
}
