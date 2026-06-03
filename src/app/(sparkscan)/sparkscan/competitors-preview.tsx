'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Globe,
  MapPin,
  Star,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Target,
  Zap,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Swords,
  Copy as CopyIcon,
  Compass,
  Handshake,
  TrendingDown as Gauge,
  Wallet,
  User as UserIcon,
  Download,
  Printer,
  ClipboardCopy,
  FileText,
  Bot,
  Quote,
  BookOpen,
  PenLine,
  Facebook,
  Instagram,
  Users,
  Mail,
  Phone,
  ExternalLink,
  MessageCircle,
  Heart,
  Share2,
  BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  ScanState,
  ScanResult,
  EnrichedCompetitor,
  SynthesisPriority,
  StrategicLever,
  GeoCitations,
} from './sparkscan-container'
import { buildExportMarkdown, downloadMarkdown } from './export-markdown'
import { CreatePlanCTA } from '@/components/sparkpilot/create-plan-cta'

// ------------------------------------------------------------
// MOCK (état idle)
// ------------------------------------------------------------

const MOCK_COMPETITORS = [
  { rank: 1, name: 'concurrent-a.com', score: 92, traffic: '124k', tag: 'Direct' },
  { rank: 2, name: 'concurrent-b.fr', score: 87, traffic: '89k', tag: 'Direct' },
  { rank: 3, name: 'concurrent-c.com', score: 81, traffic: '67k', tag: 'Indirect' },
  { rank: 4, name: 'concurrent-d.com', score: 76, traffic: '52k', tag: 'Local' },
  { rank: 5, name: 'concurrent-e.fr', score: 71, traffic: '34k', tag: 'Local' },
]

const TAG_STYLES: Record<string, string> = {
  Direct: 'bg-violet-50 text-violet-700 border-violet-100',
  Indirect: 'bg-blue-50 text-blue-700 border-blue-100',
  Local: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------

export function CompetitorsPreview({ state }: { state: ScanState }) {
  return (
    <AnimatePresence mode="wait">
      {state.kind === 'idle' && <IdlePanel key="idle" />}
      {state.kind === 'loading' && (
        <LoadingPanel key="loading" progress={state.progress} />
      )}
      {state.kind === 'success' && (
        <ResultsPanel
          key="success"
          data={state.data}
          targetUrl={state.targetUrl}
          zone={state.zone}
        />
      )}
      {state.kind === 'error' && (
        <ErrorPanel key="error" error={state.error} />
      )}
    </AnimatePresence>
  )
}

// ------------------------------------------------------------
// IDLE
// ------------------------------------------------------------

function IdlePanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
      className="relative"
    >
      <div className="absolute -top-3 -right-3 z-10 hidden sm:block">
        <div
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white shadow-lg"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          <Sparkles className="h-3 w-3" />
          Aperçu fictif
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(15,23,42,0.12)]">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            À quoi ressemble un rapport SparkScan
          </h3>
          <p
            className="mt-1 text-xs text-slate-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            exemple — colle une URL pour lancer un vrai scan
          </p>
        </div>

        <ul className="divide-y divide-slate-100">
          {MOCK_COMPETITORS.map((c, i) => (
            <motion.li
              key={c.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.4 + i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="px-6 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <RankBadge rank={c.rank} />
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-slate-900"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      {c.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {c.traffic} visites/mois
                      </span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${TAG_STYLES[c.tag]}`}
                      >
                        {c.tag}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-base font-semibold text-slate-900">
                      {c.score}
                    </span>
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <p
                    className="mt-0.5 text-[9px] uppercase tracking-[0.15em] text-slate-400"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    Match
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>

        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-3">
          <span
            className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Aperçu — données illustratives. Le vrai rapport contient bien plus.
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ------------------------------------------------------------
// LOADING
// ------------------------------------------------------------

const LOADING_STEPS = [
  'Détection des candidats…',
  'Qualification par l’IA — on vire le bruit…',
  'Lecture des sites concurrents un par un…',
  'Forces, faiblesses, plan d’attaque…',
  'Synthèse stratégique en cours…',
]

function LoadingPanel({
  progress,
}: {
  progress?: { step: string; label: string; percent: number }
}) {
  // Fallback : si pas encore de progress server (premier tick avant polling),
  // on affiche les textes cycliques génériques. Sinon, on affiche la vraie étape.
  const [stepIndex, setStepIndex] = useState(0)
  useEffect(() => {
    if (progress) return
    const id = setInterval(() => {
      setStepIndex((i) => (i + 1) % LOADING_STEPS.length)
    }, 8000)
    return () => clearInterval(id)
  }, [progress])

  const displayLabel = progress?.label ?? LOADING_STEPS[stepIndex]
  const percent = progress?.percent ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_40px_-8px_rgba(15,23,42,0.12)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/70 via-white to-pink-50/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-violet-700" />
            <h3 className="text-base font-semibold text-slate-900">
              Construction de ton rapport
            </h3>
          </div>
          {progress && (
            <span
              className="text-[10px] uppercase tracking-[0.18em] text-violet-700"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              {percent}%
            </span>
          )}
        </div>
        {/* Barre de progression réelle (Phase C étape 2) */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(2, percent)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p
          className="mt-2 text-xs text-slate-500"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          DataForSEO · Apify · Claude (qualification + analyse + synthèse)
        </p>
      </div>

      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={progress?.step ?? `cycle-${stepIndex}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
            </span>
            <span className="text-sm font-medium text-slate-700">
              {displayLabel}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="divide-y divide-slate-100">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Pulse
                    className="h-3 w-40 rounded bg-slate-200/80"
                    delayMs={i * 120}
                  />
                  <Pulse
                    className="h-2.5 w-56 rounded bg-slate-100"
                    delayMs={i * 120 + 80}
                  />
                </div>
              </div>
              <Pulse
                className="h-3 w-10 rounded bg-slate-200/80"
                delayMs={i * 120 + 40}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-6 py-3">
        <span
          className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Compte 8 à 12 minutes
        </span>
        <span
          className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Tu peux fermer l’onglet
        </span>
      </div>
    </motion.div>
  )
}

function Pulse({ className, delayMs }: { className: string; delayMs: number }) {
  return (
    <div
      className={`${className} animate-pulse`}
      style={{ animationDelay: `${delayMs}ms` }}
    />
  )
}

// ------------------------------------------------------------
// RESULTS — synthèse stratégique + cards de concurrents enrichis
// ------------------------------------------------------------

function ResultsPanel({
  data,
  targetUrl,
  zone,
}: {
  data: ScanResult
  targetUrl: string
  zone: string
}) {
  const [viewMode, setViewMode] = useState<'express' | 'complete'>('complete')
  const competitors = data.competitors_enriched ?? []
  const synthesis = data.synthesis
  const cleanHost = (() => {
    try {
      return new URL(
        targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
      ).hostname.replace(/^www\./, '')
    } catch {
      return targetUrl
    }
  })()
  const isMature = data.method_used === 'A+C'
  const isExpress = viewMode === 'express'

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8"
    >
      {/* HEADER */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-violet-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Rapport SparkScan
          </p>
          <h3
            className="mt-2 text-3xl font-normal leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            {cleanHost}
          </h3>
          <p
            className="mt-1 text-xs text-slate-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            {zone} · {isMature ? 'analyse SEO Google (site référencé)' : 'analyse locale Google Maps (site sans référencement Google)'} · {competitors.length} concurrent{competitors.length > 1 ? 's' : ''} qualifié{competitors.length > 1 ? 's' : ''} · coût ${data.cost_usd.toFixed(3)}
          </p>
        </div>
        {/* Toggle vue express / vue complète */}
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('express')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isExpress
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Vue express
          </button>
          <button
            type="button"
            onClick={() => setViewMode('complete')}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !isExpress
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Vue complète
          </button>
        </div>
      </header>

      {/* WARNINGS (rapport partiel, etc.) */}
      {data.warnings && data.warnings.length > 0 && (
        <WarningsCard warnings={data.warnings} />
      )}

      {/* SYNTHÈSE STRATÉGIQUE */}
      {synthesis && synthesis.top3_priorities.length > 0 && (
        <SynthesisCard synthesis={synthesis} />
      )}

      {/* CTA SparkPilot — uniquement si le scan est terminé et a des priorités */}
      {data.status === 'completed' &&
        synthesis &&
        synthesis.top3_priorities.length > 0 && (
          <CreatePlanCTA scanId={data.scan_id} />
        )}

      {/* VISIBILITÉ IA (GEO) — caché en vue express */}
      {!isExpress && data.geo_citations && data.geo_citations.visibility.length > 0 && (
        <GeoVisibilityCard
          geo={data.geo_citations}
          targetDomain={cleanHost}
        />
      )}

      {/* LISTE CONCURRENTS — top 3 seulement en vue express, tout en vue complète */}
      {competitors.length === 0 ? (
        <EmptyResults isMethodA={isMature} />
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h4
              className="text-[11px] uppercase tracking-[0.22em] text-slate-500"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              {isExpress
                ? `Top ${Math.min(3, competitors.length)} concurrents`
                : 'Tous les concurrents qualifiés'}
            </h4>
            <span
              className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              {isExpress
                ? 'Bascule en vue complète pour tout voir'
                : 'Clique pour déplier le détail'}
            </span>
          </div>
          <div className="space-y-3">
            {(isExpress ? competitors.slice(0, 3) : competitors).map((c, i) => (
              <CompetitorCard key={c.key} c={c} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* CTA — exports + actions concrètes */}
      <CTASection data={data} targetUrl={targetUrl} zone={zone} />

      {/* FOOTER */}
      <footer
        className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-[10px] uppercase tracking-[0.18em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        <span>scan {data.scan_id.slice(0, 8)}</span>
        <span>SparkScan v0.6 — analyse + synthèse IA</span>
      </footer>
    </motion.div>
  )
}

// ------------------------------------------------------------
// CTA SECTION : exports + actions concrètes
// ------------------------------------------------------------

function CTASection({
  data,
  targetUrl,
  zone,
}: {
  data: ScanResult
  targetUrl: string
  zone: string
}) {
  const langue = 'fr'
  const cleanHost = (() => {
    try {
      return new URL(
        targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
      ).hostname.replace(/^www\./, '')
    } catch {
      return 'scan'
    }
  })()
  const dateSlug = new Date().toISOString().slice(0, 10)

  function handleExportMarkdown() {
    const md = buildExportMarkdown(data, targetUrl, zone, langue)
    const filename = `sparkscan_${cleanHost}_${dateSlug}.md`
    downloadMarkdown(filename, md)
    toast.success(`Export téléchargé : ${filename}`)
  }

  async function handleCopyExecutive() {
    const summary = data.synthesis?.executive_summary
    if (!summary) {
      toast.error('Aucun résumé exécutif à copier')
      return
    }
    try {
      await navigator.clipboard.writeText(summary)
      toast.success('Résumé exécutif copié dans le presse-papier')
    } catch {
      toast.error('Copie impossible — utilise Ctrl+C dans le rapport')
    }
  }

  async function handleCopyFullReport() {
    const md = buildExportMarkdown(data, targetUrl, zone, langue)
    try {
      await navigator.clipboard.writeText(md)
      toast.success('Rapport complet copié dans le presse-papier')
    } catch {
      toast.error('Copie impossible — utilise le téléchargement à la place')
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)]"
    >
      <div className="flex flex-col gap-1">
        <span
          className="text-[10px] uppercase tracking-[0.22em] text-violet-700"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          La suite — passer à l&apos;action
        </span>
        <p className="text-sm text-slate-600">
          Garde ce rapport, partage-le, ou approfondis-le avec Claude.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CTAButton
          icon={FileText}
          label="Exporter pour Claude"
          hint="Télécharger .md"
          accent
          onClick={handleExportMarkdown}
        />
        <CTAButton
          icon={ClipboardCopy}
          label="Copier le rapport complet"
          hint="Colle dans email / doc"
          onClick={handleCopyFullReport}
        />
        <CTAButton
          icon={CopyIcon}
          label="Copier juste le résumé"
          hint="1 phrase pour ton équipe"
          onClick={handleCopyExecutive}
        />
        <CTAButton
          icon={Printer}
          label="Imprimer / PDF"
          hint="Version papier ou archive"
          onClick={handlePrint}
        />
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        <span className="font-medium text-slate-700">Astuce :</span> ouvre
        Claude dans un autre onglet, colle l&apos;export, et demande-lui par
        exemple :{' '}
        <em className="text-slate-700">
          &quot;Challenge ces 3 priorités. Lesquelles sont vraiment réalistes vs.
          trop ambitieuses ?&quot;
        </em>
      </p>
    </motion.section>
  )
}

function CTAButton({
  icon: Icon,
  label,
  hint,
  onClick,
  accent = false,
}: {
  icon: typeof Download
  label: string
  hint: string
  onClick: () => void
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
        accent
          ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50/40 text-violet-900 hover:border-violet-300 hover:from-violet-100 hover:to-pink-100/40'
          : 'border-slate-200 bg-slate-50/50 text-slate-800 hover:border-slate-300 hover:bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${accent ? 'text-violet-700' : 'text-slate-500'}`}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span
        className={`text-[10px] uppercase tracking-[0.15em] ${accent ? 'text-violet-600/70' : 'text-slate-400'}`}
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        {hint}
      </span>
    </button>
  )
}

// ------------------------------------------------------------
// SYNTHESIS CARD (top du rapport)
// ------------------------------------------------------------

const LEVER_META: Record<
  StrategicLever,
  { label: string; icon: typeof Swords; classes: string; pill: string }
> = {
  attaquer: {
    label: 'Attaquer',
    icon: Swords,
    classes: 'border-rose-200 bg-rose-50/70 text-rose-900',
    pill: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  copier: {
    label: 'Copier',
    icon: CopyIcon,
    classes: 'border-blue-200 bg-blue-50/70 text-blue-900',
    pill: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  eviter: {
    label: 'Éviter',
    icon: Compass,
    classes: 'border-amber-200 bg-amber-50/70 text-amber-900',
    pill: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  partenariat: {
    label: 'Partenariat',
    icon: Handshake,
    classes: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
}

function SynthesisCard({
  synthesis,
}: {
  synthesis: {
    executive_summary: string
    market_overview: string
    top3_priorities: SynthesisPriority[]
  }
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-pink-50/40 p-7 shadow-[0_8px_40px_-12px_rgba(109,40,217,0.15)]"
    >
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="absolute -bottom-16 -left-12 h-56 w-56 rounded-full bg-pink-200/30 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-700" />
          <span
            className="text-[10px] uppercase tracking-[0.22em] text-violet-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Plan d&apos;attaque · 30 prochains jours
          </span>
        </div>

        {/* Executive summary : 1 phrase en haut pour les pressés */}
        {synthesis.executive_summary && (
          <p
            className="mt-4 text-2xl leading-snug text-slate-900"
            style={{ fontFamily: 'var(--font-instrument-serif)' }}
          >
            {synthesis.executive_summary}
          </p>
        )}

        {/* Market overview : 2-3 phrases sur le marché */}
        {synthesis.market_overview && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
            <span
              className="mr-2 inline-block text-[10px] uppercase tracking-[0.18em] text-slate-400"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              Marché ·
            </span>
            {synthesis.market_overview}
          </p>
        )}

        {/* Top 3 priorités enrichies */}
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {synthesis.top3_priorities.map((p, i) => (
            <PriorityCard key={p.competitor_key} priority={p} index={i} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function PriorityCard({
  priority: p,
  index: i,
}: {
  priority: SynthesisPriority
  index: number
}) {
  const meta = LEVER_META[p.lever] ?? LEVER_META.attaquer
  const LeverIcon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
      className="relative flex flex-col rounded-xl border border-white/80 bg-white/80 p-5 backdrop-blur"
    >
      {/* Header : rang + label + badge levier */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-xl font-semibold text-violet-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <p className="truncate text-base font-semibold text-slate-900">
            {p.competitor_label}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.pill}`}
        >
          <LeverIcon className="h-2.5 w-2.5" />
          {meta.label}
        </span>
      </div>

      {/* Pourquoi ce levier */}
      <p className="mt-2 text-xs leading-relaxed text-slate-600">
        {p.lever_reason}
      </p>

      {/* Re-check Phase B : si la priorité n'a pas passé la vérification finale */}
      {p.verified === false && p.verification_warning && (
        <div
          className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5"
          title="Vérification finale (re-check Phase B) : cette priorité présente une incohérence détectée par l'IA. Vérifie manuellement avant d'agir."
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" />
          <div>
            <p
              className="text-[10px] uppercase tracking-[0.18em] text-amber-800"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              ⚠ Cohérence à vérifier
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">
              {p.verification_warning}
            </p>
          </div>
        </div>
      )}

      {/* Action concrète */}
      <div className={`mt-3 rounded-lg border p-3 ${meta.classes}`}>
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Action concrète
          </span>
        </div>
        <p className="mt-1.5 text-[13px] leading-snug">{p.tactical_action}</p>
      </div>

      {/* 4 cellules : gain / coût / KPI / qui */}
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <MiniStat
          icon={Gauge}
          label="Gain estimé"
          value={p.estimated_gain || '—'}
        />
        <MiniStat
          icon={Wallet}
          label="Coût"
          value={p.estimated_cost || '—'}
        />
        <MiniStat
          icon={Target}
          label="Tu sais que ça marche si…"
          value={p.kpi_30j || '—'}
          wide
        />
        <MiniStat
          icon={UserIcon}
          label="Qui le fait"
          value={p.who_does_it || '—'}
          wide
        />
      </dl>
    </motion.div>
  )
}

// ------------------------------------------------------------
// BLOG STRATEGY CARD (intégré dans le détail d'un concurrent)
// ------------------------------------------------------------

function BlogStrategyCard({
  blog,
}: {
  blog: NonNullable<EnrichedCompetitor['blog']>
}) {
  const frequencyColor: Record<string, string> = {
    active: 'text-emerald-700',
    irregulière: 'text-amber-700',
    abandonnée: 'text-rose-700',
    inconnue: 'text-slate-500',
  }
  const qualityColor: Record<string, string> = {
    experte: 'text-emerald-700',
    marketing: 'text-amber-700',
    faible: 'text-rose-700',
    inconnue: 'text-slate-500',
  }
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-center gap-1.5">
        <PenLine className="h-3.5 w-3.5 text-blue-700" />
        <p
          className="text-[10px] uppercase tracking-[0.2em] text-blue-700"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Stratégie de contenu (blog)
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-blue-950 sm:grid-cols-3">
        <div>
          <span
            className="text-[9px] uppercase tracking-[0.15em] text-blue-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Fréquence
          </span>
          <p
            className={`text-sm font-medium capitalize ${frequencyColor[blog.publication_frequency] ?? 'text-blue-900'}`}
          >
            {blog.publication_frequency}
          </p>
        </div>
        <div>
          <span
            className="text-[9px] uppercase tracking-[0.15em] text-blue-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Longueur typique
          </span>
          <p className="text-sm font-medium capitalize text-blue-900">
            {blog.average_length}
          </p>
        </div>
        <div>
          <span
            className="text-[9px] uppercase tracking-[0.15em] text-blue-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Qualité éditoriale
          </span>
          <p
            className={`text-sm font-medium capitalize ${qualityColor[blog.editorial_quality] ?? 'text-blue-900'}`}
          >
            {blog.editorial_quality}
          </p>
        </div>
      </div>
      {blog.dominant_topics.length > 0 && (
        <div className="mt-3">
          <span
            className="text-[9px] uppercase tracking-[0.15em] text-blue-500"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Sujets dominants
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {blog.dominant_topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      {blog.exploitable_gap && (
        <p className="mt-3 rounded-md border border-blue-200 bg-white/70 p-2.5 text-xs leading-relaxed text-blue-900">
          <BookOpen className="mr-1 -mt-0.5 inline h-3 w-3 text-blue-700" />
          <strong>Comment l&apos;exploiter :</strong> {blog.exploitable_gap}
        </p>
      )}
      {blog.blog_url && (
        <a
          href={blog.blog_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[10px] uppercase tracking-[0.15em] text-blue-600 hover:underline"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          → Voir le blog
        </a>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// SOCIAL MEDIA CARD (Facebook + Instagram, intégrée dans le détail concurrent)
// ------------------------------------------------------------

function SocialMediaCard({
  sm,
}: {
  sm: NonNullable<EnrichedCompetitor['social_media']>
}) {
  const [fbExpanded, setFbExpanded] = useState(false)
  const [igExpanded, setIgExpanded] = useState(false)
  const { data, analysis } = sm
  if (!data.facebook && !data.instagram) return null

  const POSTS_PREVIEW = 3
  // Defensive : Apify renvoie parfois les nombres en string (ex: "4.5"). Le
  // backend normalise désormais via toNum(), mais les anciens scans déjà en base
  // peuvent encore contenir des strings. On force la conversion côté UI aussi.
  const toN = (v: unknown): number | null => {
    if (v == null) return null
    if (typeof v === 'number') return Number.isFinite(v) ? v : null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const fmtNum = (n: unknown) => {
    const x = toN(n)
    return x == null ? '—' : x.toLocaleString('fr-FR')
  }
  const fmtRating = (n: unknown) => {
    const x = toN(n)
    return x == null ? null : x.toFixed(1)
  }
  const fmtDate = (d: string | null) => (d ? d.slice(0, 10) : '')

  const freqColor: Record<string, string> = {
    active: 'text-emerald-700',
    régulière: 'text-blue-700',
    faible: 'text-amber-700',
    inactive: 'text-rose-700',
    inconnue: 'text-slate-500',
  }
  const engColor: Record<string, string> = {
    fort: 'text-emerald-700',
    moyen: 'text-blue-700',
    faible: 'text-amber-700',
    inconnu: 'text-slate-500',
  }

  const fb = data.facebook
  const ig = data.instagram
  const fbPostsShown = fb
    ? fbExpanded
      ? fb.posts
      : fb.posts.slice(0, POSTS_PREVIEW)
    : []
  const igPostsShown = ig
    ? igExpanded
      ? ig.posts
      : ig.posts.slice(0, POSTS_PREVIEW)
    : []

  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
      {/* En-tête : label + badges plateformes */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-rose-700" />
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-rose-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Réseaux sociaux
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fb && (
            <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] text-rose-700">
              <Facebook className="h-3 w-3" />
              Facebook
            </span>
          )}
          {ig && (
            <span className="flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[10px] text-rose-700">
              <Instagram className="h-3 w-3" />
              Instagram
            </span>
          )}
        </div>
      </div>

      {/* Mini-stats analyse Claude */}
      {analysis && (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <span
                className="text-[9px] uppercase tracking-[0.15em] text-rose-500"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Fréquence
              </span>
              <p
                className={`text-sm font-medium capitalize ${freqColor[analysis.frequency] ?? 'text-slate-700'}`}
              >
                {analysis.frequency}
              </p>
            </div>
            <div>
              <span
                className="text-[9px] uppercase tracking-[0.15em] text-rose-500"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Engagement
              </span>
              <p
                className={`text-sm font-medium capitalize ${engColor[analysis.engagement] ?? 'text-slate-700'}`}
              >
                {analysis.engagement}
              </p>
            </div>
            <div>
              <span
                className="text-[9px] uppercase tracking-[0.15em] text-rose-500"
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Contenu dominant
              </span>
              <p className="text-sm font-medium text-slate-800">
                {analysis.dominant_content || '—'}
              </p>
            </div>
          </div>
          {analysis.opportunity && (
            <p className="mt-3 rounded-md border border-rose-200 bg-white/70 p-2.5 text-xs leading-relaxed text-rose-900">
              <Sparkles className="mr-1 -mt-0.5 inline h-3 w-3 text-rose-700" />
              <strong>Comment l&apos;exploiter :</strong> {analysis.opportunity}
            </p>
          )}
        </>
      )}

      {/* Section Facebook */}
      {fb && (
        <div className="mt-4 border-t border-rose-100 pt-3">
          <div className="flex items-center gap-1.5">
            <Facebook className="h-3.5 w-3.5 text-blue-600" />
            <p
              className="text-[10px] uppercase tracking-[0.18em] text-slate-500"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              {fb.name || 'Page Facebook'}
              {fb.category && (
                <span className="ml-2 text-slate-400 normal-case tracking-normal">
                  · {fb.category}
                </span>
              )}
            </p>
          </div>
          {/* Stats page FB */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
            {fb.followers != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-400" />
                <strong>{fmtNum(fb.followers)}</strong> followers
              </span>
            )}
            {fb.likes != null && fb.likes !== fb.followers && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-slate-400" />
                {fmtNum(fb.likes)} likes
              </span>
            )}
            {fmtRating(fb.rating) && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" />
                {fmtRating(fb.rating)}/5
              </span>
            )}
          </div>
          {fb.description && (
            <p className="mt-2 text-xs italic leading-relaxed text-slate-600">
              {fb.description}
            </p>
          )}
          {/* Contact compact */}
          {(fb.email || fb.phone || fb.website) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
              {fb.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {fb.email}
                </span>
              )}
              {fb.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {fb.phone}
                </span>
              )}
              {fb.website && (
                <a
                  href={fb.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-rose-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {fb.website.replace(/^https?:\/\//, '').replace(/^www\./, '').slice(0, 40)}
                </a>
              )}
            </div>
          )}
          {/* Posts FB */}
          {fb.posts.length > 0 && (
            <div className="mt-3 space-y-2">
              {fbPostsShown.map((p, i) => (
                <div
                  key={`fb-${i}`}
                  className="rounded-md border border-slate-200 bg-white/60 p-2.5 text-xs"
                >
                  <p className="leading-relaxed text-slate-800">
                    {p.text.slice(0, 200) || <em className="text-slate-400">(post sans texte)</em>}
                    {p.text.length > 200 && '…'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    {p.date && (
                      <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
                        {fmtDate(p.date)}
                      </span>
                    )}
                    {p.likes != null && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" />
                        {fmtNum(p.likes)}
                      </span>
                    )}
                    {p.comments != null && (
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {fmtNum(p.comments)}
                      </span>
                    )}
                    {p.shares != null && (
                      <span className="flex items-center gap-0.5">
                        <Share2 className="h-2.5 w-2.5" />
                        {fmtNum(p.shares)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {fb.posts.length > POSTS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setFbExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-rose-600 hover:underline"
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${fbExpanded ? 'rotate-180' : ''}`}
                  />
                  {fbExpanded
                    ? 'Replier'
                    : `Voir les ${fb.posts.length - POSTS_PREVIEW} autres posts`}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section Instagram */}
      {ig && (
        <div className="mt-4 border-t border-rose-100 pt-3">
          <div className="flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5 text-pink-600" />
            <p
              className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              {ig.username ? `@${ig.username}` : 'Compte Instagram'}
              {ig.verified && <BadgeCheck className="h-3 w-3 text-sky-500" />}
              {ig.fullName && (
                <span className="ml-1 text-slate-400 normal-case tracking-normal">
                  · {ig.fullName}
                </span>
              )}
            </p>
          </div>
          {/* Stats profil IG */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
            {ig.followers != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-slate-400" />
                <strong>{fmtNum(ig.followers)}</strong> followers
              </span>
            )}
            {ig.following != null && (
              <span className="text-slate-500">{fmtNum(ig.following)} suivis</span>
            )}
            {ig.postsCount != null && (
              <span className="text-slate-500">{fmtNum(ig.postsCount)} posts</span>
            )}
          </div>
          {ig.biography && (
            <p className="mt-2 text-xs italic leading-relaxed text-slate-600">
              {ig.biography}
            </p>
          )}
          {/* Posts IG */}
          {ig.posts.length > 0 && (
            <div className="mt-3 space-y-2">
              {igPostsShown.map((p, i) => (
                <div
                  key={`ig-${i}`}
                  className="rounded-md border border-slate-200 bg-white/60 p-2.5 text-xs"
                >
                  <p className="leading-relaxed text-slate-800">
                    {p.caption.slice(0, 200) || <em className="text-slate-400">(post sans légende)</em>}
                    {p.caption.length > 200 && '…'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    {p.date && (
                      <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
                        {fmtDate(p.date)}
                      </span>
                    )}
                    {p.likes != null && (
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5" />
                        {fmtNum(p.likes)}
                      </span>
                    )}
                    {p.comments != null && (
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {fmtNum(p.comments)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {ig.posts.length > POSTS_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setIgExpanded((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-rose-600 hover:underline"
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${igExpanded ? 'rotate-180' : ''}`}
                  />
                  {igExpanded
                    ? 'Replier'
                    : `Voir les ${ig.posts.length - POSTS_PREVIEW} autres posts`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// GEO VISIBILITY CARD
// ------------------------------------------------------------

function GeoVisibilityCard({
  geo,
  targetDomain,
}: {
  geo: GeoCitations
  targetDomain: string
}) {
  const maxScore = Math.max(1, ...geo.visibility.map((v) => v.visibility_score))
  const targetEntry = geo.visibility.find((v) =>
    v.domain.toLowerCase().includes(targetDomain.toLowerCase()),
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-600" />
          <span
            className="text-[10px] uppercase tracking-[0.22em] text-indigo-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Visibilité dans les IA
          </span>
        </div>
        {targetEntry && (
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Ton score
            </span>
            <span className="text-2xl font-semibold text-slate-900">
              {targetEntry.visibility_score}
            </span>
            <span className="text-xs text-slate-400">/100</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-600">
              rang {targetEntry.rank}/{geo.visibility.length}
            </span>
          </div>
        )}
      </div>

      {/* Insights global */}
      {geo.insights && (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
          <Quote className="mr-1.5 -mt-0.5 inline h-3 w-3 text-indigo-500" />
          {geo.insights}
        </p>
      )}

      {/* Barres de visibilité */}
      <div className="mt-5">
        <p
          className="mb-2 text-[10px] uppercase tracking-[0.18em] text-slate-500"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Score par acteur (% de la visibilité max)
        </p>
        <ul className="space-y-1.5">
          {geo.visibility.map((v) => {
            const pct = Math.round((v.visibility_score / maxScore) * 100)
            const isTarget = v.domain
              .toLowerCase()
              .includes(targetDomain.toLowerCase())
            return (
              <li
                key={v.domain}
                className={`grid grid-cols-12 items-center gap-2 rounded-md px-2 py-1.5 ${
                  isTarget
                    ? 'bg-indigo-50/70 ring-1 ring-indigo-200'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span
                  className={`col-span-4 truncate text-xs ${isTarget ? 'font-semibold text-indigo-900' : 'text-slate-700'}`}
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  {isTarget ? '★ ' : ''}
                  {v.label}
                </span>
                <div className="col-span-6 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${isTarget ? 'bg-indigo-500' : 'bg-slate-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span
                  className={`col-span-2 text-right text-xs font-semibold ${isTarget ? 'text-indigo-700' : 'text-slate-600'}`}
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  {v.visibility_score}/100
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Questions posées */}
      <details className="mt-5">
        <summary
          className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Voir les {geo.questions_asked.length} questions posées aux IA
        </summary>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {geo.questions_asked.map((q, i) => (
            <li key={i}>· {q}</li>
          ))}
        </ul>
      </details>
    </motion.section>
  )
}

// ------------------------------------------------------------
// WARNINGS CARD — rapport partiel, source non disponible, etc.
// ------------------------------------------------------------

function WarningsCard({ warnings }: { warnings: string[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-[0_4px_24px_-12px_rgba(245,158,11,0.2)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-amber-700"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Rapport partiel
          </p>
          <ul className="mt-2 space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="text-sm leading-relaxed text-amber-900">
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: typeof Wallet
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div
      className={`rounded-md border border-slate-200 bg-white/60 p-2.5 ${wide ? 'col-span-2' : ''}`}
    >
      <div className="flex items-center gap-1 text-slate-500">
        <Icon className="h-2.5 w-2.5" />
        <span
          className="text-[9px] uppercase tracking-[0.15em]"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {label}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-slate-800">{value}</p>
    </div>
  )
}

// ------------------------------------------------------------
// COMPETITOR CARD (expandable)
// ------------------------------------------------------------

const QUALIF_STYLES: Record<string, string> = {
  direct: 'bg-rose-50 text-rose-700 border-rose-200',
  indirect: 'bg-amber-50 text-amber-700 border-amber-200',
}

function CompetitorCard({ c, index }: { c: EnrichedCompetitor; index: number }) {
  const [open, setOpen] = useState(index < 3) // top 3 dépliés par défaut
  const e = c.enrichment
  const hasDetails =
    e && (e.positioning || e.strengths.length || e.weaknesses.length || e.tactical_action)

  return (
    <motion.article
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.08)] transition hover:shadow-[0_8px_32px_-12px_rgba(15,23,42,0.12)]"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/60"
      >
        <div className="flex min-w-0 items-center gap-4">
          <RankBadge rank={c.rank} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className={`truncate text-sm font-semibold text-slate-900 ${c.kind === 'seo' ? '' : ''}`}
                style={
                  c.kind === 'seo'
                    ? { fontFamily: 'var(--font-geist-mono)' }
                    : undefined
                }
              >
                {c.label}
              </p>
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${QUALIF_STYLES[c.qualification] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}
              >
                {c.qualification === 'direct' ? 'Direct' : 'Indirect'}
              </span>
              {c.kind === 'seo' ? (
                <span className="hidden rounded-full border border-violet-100 bg-violet-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-violet-700 sm:inline">
                  <Globe className="mr-0.5 inline h-2.5 w-2.5" />
                  SEO
                </span>
              ) : (
                <span className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-700 sm:inline">
                  <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                  Local
                </span>
              )}
              {c.has_gmaps === false && (
                <span
                  className="hidden rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-700 sm:inline"
                  title="Acteur trouvé via web search, mais sans fiche Google Maps locale. Signal business : prospect potentiel pour structurer sa présence locale."
                >
                  <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />
                  Sans GMaps
                </span>
              )}
              {c.confidence === 'high' && (
                <span
                  className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-700 sm:inline"
                  title="Jugement fiable : zone géo + métier clairement vérifiés dans le site du candidat."
                >
                  ✓ Fiable
                </span>
              )}
              {c.confidence === 'medium' && (
                <span
                  className="hidden rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-blue-700 sm:inline"
                  title="À vérifier : un ou plusieurs critères partiellement vérifiés (zone floue, métier voisin, contenu incomplet). Jette un œil au site avant d'agir."
                >
                  ? À vérifier
                </span>
              )}
              {c.confidence === 'low' && (
                <span
                  className="hidden rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-rose-700 sm:inline"
                  title="Incertain : peu d'éléments dans le site du candidat (inaccessible, vide, illisible). Vérifie manuellement avant toute action."
                >
                  ! Incertain
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{c.reason}</p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-lg font-semibold text-slate-900">
                {c.relevance_score}
              </span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
            <p
              className="text-[9px] uppercase tracking-[0.15em] text-slate-400"
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              Menace
            </p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-5 border-t border-slate-100 bg-slate-50/50 px-5 py-5">
              {e?.positioning && (
                <div>
                  <p
                    className="text-[10px] uppercase tracking-[0.2em] text-slate-500"
                    style={{ fontFamily: 'var(--font-geist-mono)' }}
                  >
                    Positionnement
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                    {e.positioning}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {e && e.strengths.length > 0 && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      <p
                        className="text-[10px] uppercase tracking-[0.2em] text-emerald-700"
                        style={{ fontFamily: 'var(--font-geist-mono)' }}
                      >
                        Forces
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-emerald-900">
                      {e.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-emerald-500">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {e && e.weaknesses.length > 0 && (
                  <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-orange-700" />
                      <p
                        className="text-[10px] uppercase tracking-[0.2em] text-orange-700"
                        style={{ fontFamily: 'var(--font-geist-mono)' }}
                      >
                        Faiblesses à exploiter
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-orange-900">
                      {e.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-orange-500">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {e?.tactical_action && (
                <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50/60 p-4">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-violet-700" />
                    <p
                      className="text-[10px] uppercase tracking-[0.2em] text-violet-700"
                      style={{ fontFamily: 'var(--font-geist-mono)' }}
                    >
                      Action concrète cette semaine
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-violet-950">
                    {e.tactical_action}
                  </p>
                </div>
              )}

              {/* Stratégie de contenu (blog) */}
              {c.blog && c.blog.has_blog && <BlogStrategyCard blog={c.blog} />}

              {/* Réseaux sociaux (Facebook + Instagram) */}
              {c.social_media && <SocialMediaCard sm={c.social_media} />}

              {/* Raw data — petit, info technique */}
              <RawData c={c} />

              {e?.source_quality === 'name_only' && (
                <p
                  className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
                  style={{ fontFamily: 'var(--font-geist-mono)' }}
                >
                  ⚠ Analyse basée sur le nom uniquement (site inaccessible)
                </p>
              )}
            </div>
          </motion.div>
        )}
        {open && !hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 text-xs text-slate-500">
              Pas d&apos;analyse détaillée disponible pour ce concurrent.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function RawData({ c }: { c: EnrichedCompetitor }) {
  if (c.kind === 'seo' && c.raw_seo) {
    const r = c.raw_seo
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.15em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        <span className="inline-flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {formatBigNumber(r.shared_keywords ?? 0)} mots-clés en commun
        </span>
        {r.estimated_traffic ? (
          <span>
            {formatBigNumber(Math.round(r.estimated_traffic))} visites/mois est.
          </span>
        ) : null}
        {r.avg_position ? (
          <span>Position moyenne {r.avg_position.toFixed(1)}</span>
        ) : null}
      </div>
    )
  }
  if (c.kind === 'local' && c.raw_local) {
    const r = c.raw_local
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.15em] text-slate-400"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        {r.rating ? (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {r.rating.toFixed(1)} ({r.reviews ?? 0} avis)
          </span>
        ) : null}
        {r.category && <span>{r.category}</span>}
        {r.address && <span className="truncate">{r.address.split(',')[0]}</span>}
        {r.website && (
          <a
            href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
            target="_blank"
            rel="noreferrer"
            className="text-violet-700 hover:underline"
          >
            {r.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}
          </a>
        )}
      </div>
    )
  }
  return null
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-pink-100 text-xs font-semibold text-violet-800"
      style={{ fontFamily: 'var(--font-geist-mono)' }}
    >
      {String(rank).padStart(2, '0')}
    </div>
  )
}

function EmptyResults({ isMethodA }: { isMethodA: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-700">
        Aucun concurrent vraiment pertinent trouvé
      </p>
      <p className="mt-2 max-w-md text-xs text-slate-500">
        {isMethodA
          ? 'Les candidats remontés par DataForSEO ont tous été jugés "non concurrents" par l’IA (probablement de gros agrégateurs). Essaie une zone géo plus précise ou un site plus spécifique.'
          : 'Google Maps n’a pas trouvé d’établissements pertinents pour ce site. Vérifie que la zone est bien renseignée.'}
      </p>
    </div>
  )
}

// ------------------------------------------------------------
// ERROR
// ------------------------------------------------------------

function ErrorPanel({ error }: { error: string }) {
  const friendly = translateError(error)
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-[0_8px_40px_-8px_rgba(220,38,38,0.15)]"
    >
      <div className="flex items-start gap-4 border-b border-red-100 bg-red-50/60 px-6 py-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-red-900">
            Le scan n’a pas abouti
          </h3>
          <p className="mt-1 text-sm text-red-800">{friendly}</p>
        </div>
      </div>
      <div className="px-6 py-4">
        <p
          className="text-[10px] uppercase tracking-[0.18em] text-slate-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          Détail technique
        </p>
        <p
          className="mt-2 break-words text-xs text-slate-600"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {error}
        </p>
      </div>
    </motion.div>
  )
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`
  return String(n)
}

function translateError(err: string): string {
  const lower = err.toLowerCase()
  if (lower.includes('monthly usage') || lower.includes('hard limit')) {
    return 'L’outil Google Maps (Apify) a atteint sa limite mensuelle. Réessaie après le reset du cycle, ou augmente la limite dans Apify Console.'
  }
  if (lower.includes('apify') && lower.includes('403')) {
    return 'Apify a refusé l’appel (limite ou clé API). Vérifie ton compte Apify.'
  }
  if (lower.includes('dataforseo') && lower.includes('40501')) {
    return 'DataForSEO ne reconnaît pas cette zone géographique. Essaie une zone plus large (un pays).'
  }
  if (lower.includes('non authentifié') || lower.includes('401')) {
    return 'Tu n’es plus connecté. Recharge la page et reconnecte-toi.'
  }
  if (lower.includes('claude') || lower.includes('anthropic')) {
    return 'L’analyse IA a échoué. Réessaie dans un instant.'
  }
  if (lower.includes('fetch') || lower.includes('timeout') || lower.includes('aborted')) {
    return 'La connexion a été interrompue. Vérifie ta connexion internet et réessaie.'
  }
  return 'Quelque chose s’est mal passé. Le détail technique est ci-dessous, partage-le à Thierry si ça se reproduit.'
}
