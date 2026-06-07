'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  ArrowRight,
  RotateCcw,
  Target,
  Users,
  Wallet,
  Clock,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ScanResult, ClientContextInput, ScanProgress } from './sparkscan-container'

const ZONE_LEVELS = [
  { value: 'pays', label: 'Pays' },
  { value: 'region', label: 'Région' },
  { value: 'departement', label: 'Département' },
  { value: 'ville', label: 'Ville' },
]

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
]

const OBJECTIVES: { value: ClientContextInput['objective']; label: string; hint: string }[] = [
  { value: 'acquisition', label: 'Gagner des clients', hint: 'Nouveaux clients qui arrivent' },
  { value: 'fidelisation', label: 'Garder mes clients', hint: 'Faire revenir ceux qui sont déjà venus' },
  { value: 'differenciation', label: 'Me démarquer', hint: 'Image / positionnement / réputation' },
  { value: 'defense', label: 'Défendre ma place', hint: 'Empêcher la concurrence de me piquer mes clients' },
]

const TEAMS: { value: ClientContextInput['team_size']; label: string }[] = [
  { value: 'solo', label: 'Tout seul' },
  { value: '2-5', label: '2 à 5 personnes' },
  { value: '5+', label: '5 et plus' },
]

const BUDGETS: { value: ClientContextInput['monthly_budget']; label: string }[] = [
  { value: 'under_500', label: 'Moins de 500€/mois' },
  { value: '500_2000', label: '500 à 2 000€/mois' },
  { value: '2000_plus', label: 'Plus de 2 000€/mois' },
]

const HORIZONS: { value: ClientContextInput['horizon']; label: string }[] = [
  { value: '30j', label: '30 jours' },
  { value: '90j', label: '90 jours (3 mois)' },
  { value: '6m', label: '6 mois' },
]

/**
 * Survie à la fermeture d'onglet (fix audit Vague 2 #5) : on stocke le scan en cours
 * dans le localStorage. Si l'utilisateur ferme l'onglet et revient, on récupère le
 * scan_id et on reprend le polling sans relancer (qui doublerait les coûts).
 */
const RESUME_STORAGE_KEY = 'sparkscan:in_progress'
const RESUME_MAX_AGE_MS = 30 * 60 * 1000 // 30 min

interface ResumeState {
  scan_id: string
  url: string
  zone: string
  ts: number // timestamp création
}

function loadResumeState(): ResumeState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ResumeState>
    if (!parsed.scan_id || !parsed.url || !parsed.zone || typeof parsed.ts !== 'number') {
      return null
    }
    if (Date.now() - parsed.ts > RESUME_MAX_AGE_MS) {
      window.localStorage.removeItem(RESUME_STORAGE_KEY)
      return null
    }
    return parsed as ResumeState
  } catch {
    return null
  }
}

function saveResumeState(state: ResumeState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* localStorage plein ou désactivé : on n'a juste pas la fonctionnalité */
  }
}

function clearResumeState(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(RESUME_STORAGE_KEY)
  } catch {
    /* idem */
  }
}

interface SparkScanFormProps {
  userId: string
  isLocked: boolean
  canReset: boolean
  onStart: () => void
  onProgress?: (progress: ScanProgress) => void
  onResult: (data: ScanResult, targetUrl: string, zone: string) => void
  onError: (error: string) => void
  onReset: () => void
}

const labelClass =
  'block text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500'
const inputClass =
  'h-12 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-4 text-slate-900 placeholder:text-slate-400 transition focus:border-pink-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-pink-500/10 disabled:cursor-not-allowed disabled:opacity-60'
const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")"
const selectClass = `${inputClass} appearance-none bg-[length:1em] bg-[right_0.85rem_center] bg-no-repeat pr-10`

export function SparkScanForm({
  userId: _userId,
  isLocked,
  canReset,
  onStart,
  onProgress,
  onResult,
  onError,
  onReset,
}: SparkScanFormProps) {
  const [url, setUrl] = useState('')
  const [zone, setZone] = useState('Guadeloupe')
  const [niveauZone, setNiveauZone] = useState('region')
  const [langue, setLangue] = useState('fr')

  const [objective, setObjective] =
    useState<ClientContextInput['objective']>('acquisition')
  const [teamSize, setTeamSize] = useState<ClientContextInput['team_size']>('solo')
  const [monthlyBudget, setMonthlyBudget] =
    useState<ClientContextInput['monthly_budget']>('500_2000')
  const [horizon, setHorizon] = useState<ClientContextInput['horizon']>('90j')

  // Auto-reprise d'un scan interrompu (onglet fermé puis rouvert) : si un
  // scan_id est dans le localStorage et qu'il a moins de 30 min, on reprend
  // automatiquement le polling sans relancer (qui doublerait les coûts).
  const resumeAttemptedRef = useRef(false)
  useEffect(() => {
    if (resumeAttemptedRef.current) return
    resumeAttemptedRef.current = true
    const resume = loadResumeState()
    if (!resume) return
    toast.info('Reprise du scan en cours…')
    onStart()
    setUrl(resume.url)
    setZone(resume.zone)
    pollScanStatus(resume.scan_id, resume.url, resume.zone).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Erreur de reprise'
      onError(msg)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!url) {
      toast.error("Colle d'abord une URL")
      return
    }
    // Validation client : on évite un aller-retour serveur pour les URLs trivialement invalides.
    // Le serveur refera une validation stricte anti-SSRF + check IP de toute façon.
    try {
      const test = new URL(url.startsWith('http') ? url : `https://${url}`)
      if (!test.hostname.includes('.') || test.hostname.length < 4) {
        toast.error('URL invalide. Exemple : digital-code-growth.com')
        return
      }
    } catch {
      toast.error('URL invalide. Exemple : digital-code-growth.com')
      return
    }
    onStart()
    try {
      // Phase C étape 2 : mode async. La route POST répond en 1s avec :
      //   - 200 + ScanResult complet  → cache hit, on affiche direct
      //   - 202 + { scan_id, status } → pipeline en background, on poll status
      const res = await fetch('/api/sparkscan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30 * 1000),
        body: JSON.stringify({
          url,
          zone,
          niveau_zone: niveauZone,
          langue,
          client_context: {
            objective,
            team_size: teamSize,
            monthly_budget: monthlyBudget,
            horizon,
          },
        }),
      })

      // Cas erreur HTTP (auth, validation, rate limit, etc.)
      if (!res.ok && res.status !== 202) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error || `Erreur ${res.status}`)
      }

      // Cas cache hit (200)
      if (res.status === 200) {
        const data = (await res.json()) as ScanResult
        onResult(data, url, zone)
        return
      }

      // Cas async (202) : récupérer scan_id et lancer le polling
      const startBody = (await res.json()) as { scan_id: string; status: string }
      const scanId = startBody.scan_id
      if (!scanId) throw new Error('scan_id absent de la réponse 202')
      // Mémorise le scan en cours pour survivre à une fermeture d'onglet.
      saveResumeState({ scan_id: scanId, url, zone, ts: Date.now() })
      await pollScanStatus(scanId, url, zone)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau'
      toast.error(msg)
      onError(msg)
    }
  }

  /**
   * Polling Phase C : interroge /api/sparkscan/status toutes les 2s tant que le
   * scan est 'running'. Met à jour onProgress à chaque tick avec la step en
   * cours. Quand status='completed' → reconstruit ScanResult et appelle onResult.
   * Quand status='error' → appelle onError.
   *
   * Plafond de sécurité : 20 min max (évite poll infini si serveur bloqué).
   */
  async function pollScanStatus(scanId: string, targetUrl: string, targetZone: string): Promise<void> {
    const POLL_INTERVAL_MS = 2500
    const MAX_WAIT_MS = 20 * 60 * 1000
    const startedAt = Date.now()

    while (Date.now() - startedAt < MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      let row: {
        status: 'running' | 'completed' | 'error'
        progress?: { step: string; label: string; percent: number; started_at?: string }
        error_message?: string | null
        id: string
        maturity_status: 'young' | 'mature' | null
        ranked_keywords_count: number | null
        method_used: 'A+C' | 'B' | null
        competitors_enriched: ScanResult['competitors_enriched'] | null
        synthesis: ScanResult['synthesis'] | null
        geo_citations: ScanResult['geo_citations'] | null
        cost_usd: number | null
      }
      try {
        const r = await fetch(
          `/api/sparkscan/status?scan_id=${encodeURIComponent(scanId)}`,
          { signal: AbortSignal.timeout(15 * 1000) },
        )
        if (!r.ok) {
          // 404 = scan introuvable, 500 = serveur. On continue à poller un peu
          // avant d'abandonner.
          continue
        }
        row = await r.json()
      } catch {
        // Erreur réseau temporaire → on retentera au prochain tick
        continue
      }

      if (row.progress && onProgress) {
        onProgress({
          step: row.progress.step,
          label: row.progress.label,
          percent: row.progress.percent,
          started_at: row.progress.started_at,
        })
      }

      if (row.status === 'completed') {
        clearResumeState()
        onResult(
          {
            scan_id: row.id,
            status: 'completed',
            maturity_status: row.maturity_status,
            ranked_keywords_count: row.ranked_keywords_count ?? 0,
            method_used: row.method_used,
            competitors_enriched: row.competitors_enriched ?? [],
            synthesis: row.synthesis ?? null,
            geo_citations: row.geo_citations ?? null,
            warnings: [],
            cost_usd: row.cost_usd ?? 0,
          },
          targetUrl,
          targetZone,
        )
        return
      }

      if (row.status === 'error') {
        clearResumeState()
        onError(row.error_message || 'Le scan a échoué côté serveur')
        return
      }
      // status === 'running' → on continue de poller
    }

    // Timeout 20 min : le scan continue côté serveur. On laisse la resume state
    // active (sans clear) pour qu'un refresh permette de récupérer le résultat
    // une fois la pipeline terminée.
    onError(
      "Ton scan prend plus que prévu. Pas de panique — il continue côté serveur. Reviens dans 5 min, on devrait l'avoir.",
    )
  }

  function handleReset() {
    onReset()
    setUrl('')
  }

  function handleFillExample() {
    setUrl('https://fnac.com')
    setZone('France')
    setNiveauZone('pays')
    setLangue('fr')
    setObjective('acquisition')
    setTeamSize('5+')
    setMonthlyBudget('2000_plus')
    setHorizon('90j')
    toast.success('Exemple chargé — clique "Lancer l’analyse" pour tester')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="space-y-6"
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.08)]"
      >
        {/* Bouton "Tester avec un exemple" — réduit la friction du nouveau user */}
        {!isLocked && !url && (
          <button
            type="button"
            onClick={handleFillExample}
            className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-pink-300 bg-pink-50/40 px-4 py-2.5 text-xs font-medium text-pink-700 transition hover:border-pink-500 hover:bg-pink-50"
          >
            <Sparkles className="h-3 w-3" />
            <span>Pas envie de remplir ? Tester avec un exemple (fnac.com)</span>
          </button>
        )}

        {/* ============ BLOC 1 : Le site à analyser ============ */}
        <div className="space-y-5">
          <SectionTitle index="01" label="Le site à analyser" />

          <div className="space-y-2">
            <label
              htmlFor="url"
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              URL du site
            </label>
            <input
              id="url"
              type="url"
              required
              disabled={isLocked}
              placeholder="https://exemple.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            />
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3 space-y-2">
              <label
                htmlFor="zone"
                className={labelClass}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Zone géographique
              </label>
              <input
                id="zone"
                type="text"
                disabled={isLocked}
                placeholder="Guadeloupe / Paris…"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <label
                htmlFor="niveauZone"
                className={labelClass}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                Niveau
              </label>
              <select
                id="niveauZone"
                disabled={isLocked}
                value={niveauZone}
                onChange={(e) => setNiveauZone(e.target.value)}
                className={selectClass}
                style={{ backgroundImage: selectChevron }}
              >
                {ZONE_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="langue"
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              Langue du rapport
            </label>
            <select
              id="langue"
              disabled={isLocked}
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              className={selectClass}
              style={{ backgroundImage: selectChevron }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* ============ BLOC 2 : Le cadrage business ============ */}
        <div className="space-y-5">
          <SectionTitle
            index="02"
            label="Ton cadrage"
            hint="L'IA adapte ses recommandations à TES moyens. Plus c'est précis, plus c'est pertinent."
          />

          {/* Objectif */}
          <div className="space-y-2">
            <label
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              <Target className="mr-1.5 inline h-3 w-3 text-pink-600" />
              Ton objectif principal
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OBJECTIVES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setObjective(o.value)}
                  className={`flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    objective === o.value
                      ? 'border-pink-500 bg-pink-50/60 shadow-sm ring-2 ring-pink-500/15'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-slate-900">
                    {o.label}
                  </span>
                  <span className="text-[11px] text-slate-500">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Équipe + Budget */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="team"
                className={labelClass}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                <Users className="mr-1.5 inline h-3 w-3 text-pink-600" />
                Ton équipe
              </label>
              <select
                id="team"
                disabled={isLocked}
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value as ClientContextInput['team_size'])}
                className={selectClass}
                style={{ backgroundImage: selectChevron }}
              >
                {TEAMS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="budget"
                className={labelClass}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
              >
                <Wallet className="mr-1.5 inline h-3 w-3 text-pink-600" />
                Ton budget marketing mensuel
              </label>
              <select
                id="budget"
                disabled={isLocked}
                value={monthlyBudget}
                onChange={(e) =>
                  setMonthlyBudget(e.target.value as ClientContextInput['monthly_budget'])
                }
                className={selectClass}
                style={{ backgroundImage: selectChevron }}
              >
                {BUDGETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Horizon */}
          <div className="space-y-2">
            <label
              htmlFor="horizon"
              className={labelClass}
              style={{ fontFamily: 'var(--font-geist-mono)' }}
            >
              <Clock className="mr-1.5 inline h-3 w-3 text-pink-600" />
              Horizon visé pour voir les résultats
            </label>
            <select
              id="horizon"
              disabled={isLocked}
              value={horizon}
              onChange={(e) => setHorizon(e.target.value as ClientContextInput['horizon'])}
              className={selectClass}
              style={{ backgroundImage: selectChevron }}
            >
              {HORIZONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ============ CTA ============ */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLocked}
            className="group flex h-14 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 text-base font-medium text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.4)] transition-all hover:bg-slate-800 hover:shadow-[0_8px_28px_-4px_rgba(15,23,42,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLocked ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyse en cours…</span>
              </>
            ) : (
              <>
                <span>Lancer l&apos;analyse</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
          {canReset && !isLocked && (
            <button
              type="button"
              onClick={handleReset}
              className="flex h-14 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              title="Lancer un nouveau scan"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Nouveau</span>
            </button>
          )}
        </div>

        <p
          className="pt-1 text-center text-[10px] uppercase tracking-[0.22em] text-slate-400"
          style={{ fontFamily: 'var(--font-geist-mono)' }}
        >
          {isLocked
            ? 'Compte 8 à 12 min — tu peux fermer l’onglet, on retrouve ton scan en revenant'
            : '8 à 12 min · 10 vrais concurrents · plan d’action sur 30 jours'}
        </p>
      </form>
    </motion.div>
  )
}

function SectionTitle({
  index,
  label,
  hint,
}: {
  index: string
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-0.5 text-xs font-semibold text-pink-700"
        style={{ fontFamily: 'var(--font-geist-mono)' }}
      >
        {index}
      </span>
      <div>
        <h3
          className="text-sm font-semibold text-slate-900"
          style={{ fontFamily: 'var(--font-instrument-serif)' }}
        >
          {label}
        </h3>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  )
}
