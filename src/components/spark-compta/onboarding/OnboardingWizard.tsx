'use client'

/**
 * Spark Compta — Wizard d'onboarding (Premium Edition)
 *
 * Parcours en 5 étapes (0 → 4) :
 *  0. Démo visuelle du futur dashboard
 *  1. Choix de la famille métier
 *  2. Métier précis + localisation fiscale
 *  3. Régime fiscal + mode (simple / comptable)
 *  4. Connexion WhatsApp + création du compte
 *
 * Persistance localStorage, animations Framer Motion, tutoiement, mobile-first.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MessageCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Zap,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import {
  createSparkComptaAccount,
  type CreateAccountInput,
} from '@/lib/spark-compta/actions'
import {
  FAMILIES,
  FAMILY_LABELS,
  FAMILY_DESCRIPTIONS,
  FAMILY_EMOJIS,
  LOCALIZATIONS,
  LOCALIZATION_LABELS,
  FISCAL_REGIMES,
  MODES,
  type Family,
  type Localization,
  type FiscalRegime,
  type Mode,
} from '@/lib/spark-compta/constants'
import { getMetiersForFamily } from '@/lib/spark-compta/metiers'

// ============================================================================
// Types & constants locaux
// ============================================================================

const STORAGE_KEY = 'spark-compta-onboarding-state'
const TOTAL_STEPS = 5 // étapes 0 → 4

const WHATSAPP_URL =
  'https://wa.me/590691270919?text=Salut%20Spark%20Compta%2C%20je%20veux%20d%C3%A9marrer%20%21'

const FISCAL_REGIME_LABELS: Record<FiscalRegime, string> = {
  micro_bic: 'Micro-BIC (commerce, artisanat)',
  micro_bnc: 'Micro-BNC (prestations intellectuelles)',
  bic_reel: 'BIC au réel',
  bnc_reel: 'BNC au réel (déclaration contrôlée)',
  sarl: 'SARL',
  sasu: 'SASU',
  ei: 'Entreprise Individuelle (EI)',
  lmnp: 'LMNP (loueur meublé non pro)',
  lmp: 'LMP (loueur meublé pro)',
}

interface WizardState {
  step: number
  primary_family: Family | null
  specific_metier: string
  localization: Localization | null
  fiscal_regime: FiscalRegime | null
  is_tva_liable: boolean
  mode: Mode
}

const INITIAL_STATE: WizardState = {
  step: 0,
  primary_family: null,
  specific_metier: '',
  localization: null,
  fiscal_regime: null,
  is_tva_liable: false,
  mode: MODES.SIMPLE,
}

// ============================================================================
// Hook utilitaire — count up
// ============================================================================

function useCountUp(target: number, duration = 1400, trigger: unknown = null) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, trigger])
  return value
}

// ============================================================================
// Background atmosphérique (aurora + grain + grid)
// ============================================================================

function AtmosphereBackground() {
  // Floating particles — reduced from 24 to 6, pure CSS animation, very slow
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        left: 8 + ((i * 17) % 84),
        size: 3 + ((i * 11) % 3),
        delay: (i * 6) % 40,
        duration: 40 + ((i * 7) % 20),
        hue: ['#60A5FA', '#A78BFA', '#7DD3FC'][i % 3],
      })),
    []
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient — calm indigo night (static, cheap) */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#1e1b4b_0%,#0f172a_35%,#1e1b4b_65%,#312e81_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#312e81_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#4c1d95_0%,transparent_60%)]" />

      {/*
        Aurora blobs — SMALLER (600-800px), no mix-blend-screen, lower opacity,
        promoted to their own GPU layer via transform-gpu + will-change.
        Hidden on mobile and when user prefers reduced motion (see @media rules below).
      */}
      <div className="spark-aurora hidden md:block">
        <div
          aria-hidden
          className="spark-blob spark-blob-1 absolute -top-40 left-1/2 h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#60A5FA_0%,#3B82F6_20%,transparent_60%)] blur-3xl transform-gpu"
        />
        <div
          aria-hidden
          className="spark-blob spark-blob-2 absolute top-1/3 -left-40 h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,#A78BFA_0%,#8B5CF6_20%,transparent_62%)] blur-3xl transform-gpu"
        />
        <div
          aria-hidden
          className="spark-blob spark-blob-3 absolute -bottom-40 -right-32 h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle,#818CF8_0%,#6366F1_18%,transparent_60%)] blur-3xl transform-gpu"
        />
      </div>

      {/* 6 Floating particles — pure CSS keyframes, very long durations */}
      <div className="spark-particles absolute inset-0 hidden md:block">
        {particles.map((p) => (
          <span
            key={p.id}
            aria-hidden
            className="spark-particle absolute bottom-0 rounded-full transform-gpu"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.hue,
              boxShadow: `0 0 ${p.size * 3}px ${p.hue}`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle grid (static, ~free) */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Keyframes + perf isolation + reduced motion */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .spark-blob {
          will-change: transform;
          opacity: 0.32;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .spark-blob-1 { animation: sparkCompta_drift1 36s infinite; opacity: 0.35; }
        .spark-blob-2 { animation: sparkCompta_drift2 44s infinite; opacity: 0.28; }
        .spark-blob-3 { animation: sparkCompta_drift3 52s infinite; opacity: 0.30; }

        .spark-particle {
          will-change: transform, opacity;
          animation-name: sparkCompta_particle;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
          opacity: 0;
        }

        @keyframes sparkCompta_drift1 {
          0%, 100% { transform: translate3d(-50%, 0, 0) scale(1); }
          50% { transform: translate3d(-48%, 24px, 0) scale(1.04); }
        }
        @keyframes sparkCompta_drift2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(28px, -18px, 0) scale(1.03); }
        }
        @keyframes sparkCompta_drift3 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-24px, -28px, 0) scale(1.05); }
        }
        @keyframes sparkCompta_particle {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          10%  { opacity: 0.55; }
          90%  { opacity: 0.55; }
          100% { transform: translate3d(0, -900px, 0); opacity: 0; }
        }
        @keyframes sparkCompta_sheen {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }

        /* Kill animations on reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .spark-blob,
          .spark-particle { animation: none !important; }
          .spark-particles { display: none; }
        }
      `,
        }}
      />
    </div>
  )
}

// ============================================================================
// Glass container (carte principale du wizard)
// ============================================================================

function GlassContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/*
        Single subtle halo behind the card (was 3 — pink/blue/emerald).
        Kept the most elegant: blue-to-purple radial behind top-left.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-[radial-gradient(circle,#6366F1_0%,transparent_70%)] opacity-35 blur-3xl transform-gpu"
      />

      {/*
        Static 2-color gradient border (blue → purple), no conic rainbow cycling.
        Paints once, never invalidates.
      */}
      <div className="relative rounded-[28px] p-[1.5px] bg-[linear-gradient(135deg,#60A5FA_0%,#8B5CF6_50%,#6366F1_100%)] shadow-[0_24px_60px_-24px_rgba(99,102,241,0.35)]">
        <div
          className="relative overflow-hidden rounded-[26px] bg-white/[0.05] backdrop-blur-md"
          style={{
            boxShadow:
              'inset 0 0 60px rgba(99, 102, 241, 0.10), inset 0 0 28px rgba(59, 130, 246, 0.07)',
          }}
        >
          {/* Top highlight line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
          />
          {/* Inner radial tint (single, subtle) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.10),transparent_60%)]"
          />
          {children}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Composant principal
// ============================================================================

export default function OnboardingWizard() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappOpened, setWhatsappOpened] = useState(false)

  // Restauration depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WizardState>
        setState((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // localStorage indisponible ou JSON invalide → on ignore
    }
    setHydrated(true)
  }, [])

  // Sauvegarde à chaque changement (après hydration)
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // pas critique
    }
  }, [state, hydrated])

  const patch = (partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }

  const goTo = (step: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_STEPS - 1, step))
    setState((prev) => ({ ...prev, step: clamped }))
  }

  const next = () => goTo(state.step + 1)
  const back = () => goTo(state.step - 1)

  // Validation par étape
  const canProceed = useMemo(() => {
    switch (state.step) {
      case 0:
        return true
      case 1:
        return state.primary_family !== null
      case 2:
        return !!state.specific_metier && state.localization !== null
      case 3:
        return state.fiscal_regime !== null
      case 4:
        return true
      default:
        return false
    }
  }, [state])

  // Soumission finale
  const handleSubmit = async () => {
    setError(null)
    if (
      !state.primary_family ||
      !state.specific_metier ||
      !state.localization ||
      !state.fiscal_regime
    ) {
      setError('Il manque des informations. Reviens en arrière pour compléter.')
      return
    }

    const input: CreateAccountInput = {
      primary_family: state.primary_family,
      specific_metier: state.specific_metier,
      localization: state.localization,
      fiscal_regime: state.fiscal_regime,
      is_tva_liable: state.is_tva_liable,
      mode: state.mode,
    }

    setSubmitting(true)
    try {
      const result = await createSparkComptaAccount(input)
      if (!result.success) {
        setError(result.error ?? 'Erreur inconnue lors de la création.')
        setSubmitting(false)
        return
      }
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      router.push('/outils/spark-compta/dashboard')
    } catch (err) {
      console.error('[spark-compta] createSparkComptaAccount failed', err)
      setError(
        err instanceof Error ? err.message : 'Erreur inattendue. Réessaie.'
      )
      setSubmitting(false)
    }
  }

  return (
    <>
      <AtmosphereBackground />

      <div className="mx-auto w-full max-w-3xl space-y-6 px-1 py-6">
        {/* Header + progress segments */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium uppercase tracking-[0.18em] backdrop-blur-md"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
              </span>
              Spark Compta
            </motion.span>
            <motion.span
              key={state.step}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono tabular-nums text-slate-300"
            >
              <span className="text-white">0{state.step + 1}</span>
              <span className="text-slate-600"> / 0{TOTAL_STEPS}</span>
            </motion.span>
          </div>

          {/* Progress segments */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
              const isPast = i < state.step
              const isCurrent = i === state.step
              return (
                <div
                  key={i}
                  className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/5"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      width: isPast ? '100%' : isCurrent ? '100%' : '0%',
                      opacity: isPast ? 0.5 : isCurrent ? 1 : 0,
                    }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400"
                  />
                  {isCurrent && (
                    <motion.div
                      aria-hidden
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.3, 0.9, 0.3] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-violet-400 blur-[6px]"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Erreur globale */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200 backdrop-blur-md"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-300" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenu étape */}
        <GlassContainer>
          <div className="relative p-6 sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.step}
                initial={{ opacity: 0, y: 24, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.99 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {state.step === 0 && <StepDemo onNext={next} />}
                {state.step === 1 && (
                  <StepFamily
                    selected={state.primary_family}
                    onSelect={(f) => patch({ primary_family: f })}
                  />
                )}
                {state.step === 2 && (
                  <StepMetierLocalization
                    family={state.primary_family}
                    metier={state.specific_metier}
                    localization={state.localization}
                    onMetierChange={(m) => patch({ specific_metier: m })}
                    onLocalizationChange={(l) => patch({ localization: l })}
                  />
                )}
                {state.step === 3 && (
                  <StepRegimeMode
                    regime={state.fiscal_regime}
                    isTvaLiable={state.is_tva_liable}
                    mode={state.mode}
                    onRegimeChange={(r) => {
                      const isMicro =
                        r === FISCAL_REGIMES.MICRO_BIC ||
                        r === FISCAL_REGIMES.MICRO_BNC
                      patch({
                        fiscal_regime: r,
                        is_tva_liable: isMicro ? false : state.is_tva_liable,
                      })
                    }}
                    onTvaChange={(v) => patch({ is_tva_liable: v })}
                    onModeChange={(m) => patch({ mode: m })}
                  />
                )}
                {state.step === 4 && (
                  <StepWhatsapp
                    opened={whatsappOpened}
                    onOpenWhatsapp={() => setWhatsappOpened(true)}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </GlassContainer>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 px-1">
          <motion.button
            type="button"
            onClick={back}
            disabled={state.step === 0 || submitting}
            whileTap={{ scale: 0.96 }}
            className={`group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:pointer-events-none ${
              state.step === 0 ? 'invisible' : ''
            }`}
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Retour
          </motion.button>

          {state.step < TOTAL_STEPS - 1 ? (
            state.step === 0 ? (
              <div />
            ) : (
              <PrimaryButton
                onClick={next}
                disabled={!canProceed || submitting}
              >
                Suivant
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </PrimaryButton>
            )
          ) : (
            <PrimaryButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  Terminer
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </PrimaryButton>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// PrimaryButton — bouton gradient premium avec sheen au hover
// ============================================================================

function PrimaryButton({
  children,
  onClick,
  disabled,
  large = false,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  large?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold text-white shadow-[0_6px_22px_rgba(99,102,241,0.28)] transition-shadow hover:shadow-[0_10px_30px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50 ${
        large ? 'px-8 py-3.5 text-base' : 'px-6 py-2.5 text-sm'
      }`}
    >
      {/* Gradient base — blue → indigo → violet, calmer than pink */}
      <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
      {/* Inner highlight */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-60" />
      {/* Sheen */}
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden"
      >
        <span
          className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            animation: 'sparkCompta_sheen 1.2s ease-in-out',
          }}
        />
      </span>
      {/* Border ring */}
      <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
      <span className="relative inline-flex items-center">{children}</span>
    </motion.button>
  )
}

// ============================================================================
// Étape 0 — Démo visuelle
// ============================================================================

function StepDemo({ onNext }: { onNext: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const ca = useCountUp(4820, 1400, mounted)
  const dep = useCountUp(1240, 1400, mounted)
  const net = useCountUp(3580, 1600, mounted)

  // Consistent KPI visual: same subtle blue→purple number gradient for all 3
  // (was 3 fighting vivid gradients). Accent bar color still differs slightly
  // to keep the label/trend semantic (green up, red down, violet net).
  const KPI_NUMBER_GRADIENT =
    'bg-gradient-to-br from-sky-200 via-indigo-200 to-violet-300'

  const fakeStats = [
    {
      key: 'ca',
      label: "Chiffre d'affaires",
      value: ca,
      suffix: '€',
      trend: '+18%',
      icon: TrendingUp,
      accent: 'from-emerald-400/80 to-teal-400/80',
      glow: 'shadow-[0_0_40px_-16px_rgba(16,185,129,0.45)]',
      text: 'text-emerald-200',
      numberGradient: KPI_NUMBER_GRADIENT,
    },
    {
      key: 'dep',
      label: 'Dépenses',
      value: dep,
      suffix: '€',
      trend: '-6%',
      icon: TrendingDown,
      accent: 'from-rose-400/80 to-orange-400/80',
      glow: 'shadow-[0_0_40px_-16px_rgba(244,63,94,0.45)]',
      text: 'text-rose-200',
      numberGradient: KPI_NUMBER_GRADIENT,
    },
    {
      key: 'net',
      label: 'Bénéfice net',
      value: net,
      suffix: '€',
      trend: '+24%',
      icon: Wallet,
      accent: 'from-blue-400/80 to-violet-400/80',
      glow: 'shadow-[0_0_40px_-16px_rgba(139,92,246,0.55)]',
      text: 'text-indigo-200',
      numberGradient: KPI_NUMBER_GRADIENT,
    },
  ]

  const topExpenses = [
    {
      label: 'Carburant',
      amount: '420 €',
      pct: 34,
      hue: 'from-sky-400 to-indigo-400',
      glow: '',
    },
    {
      label: 'Entretien véhicule',
      amount: '280 €',
      pct: 23,
      hue: 'from-indigo-400 to-violet-400',
      glow: '',
    },
    {
      label: 'Assurance pro',
      amount: '180 €',
      pct: 15,
      hue: 'from-violet-400 to-fuchsia-400',
      glow: '',
    },
  ]

  // Line chart points (courbe fictive CA 12 mois)
  const chartPoints = [35, 48, 42, 58, 51, 66, 72, 63, 80, 74, 88, 95]
  const chartPath = useMemo(() => {
    const w = 600
    const h = 120
    const step = w / (chartPoints.length - 1)
    const max = Math.max(...chartPoints)
    const min = Math.min(...chartPoints)
    const coords = chartPoints.map((p, i) => {
      const x = i * step
      const y = h - ((p - min) / (max - min)) * (h - 10) - 5
      return [x, y] as const
    })
    // smooth via quadratic
    let d = `M ${coords[0][0]},${coords[0][1]}`
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1]
      const [x1, y1] = coords[i]
      const cx = (x0 + x1) / 2
      d += ` Q ${cx},${y0} ${cx},${(y0 + y1) / 2} T ${x1},${y1}`
    }
    const area = d + ` L ${w},${h} L 0,${h} Z`
    return { line: d, area }
  }, [])

  return (
    <div className="space-y-10">
      {/* Hero title */}
      <div className="space-y-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white backdrop-blur shadow-[0_0_20px_rgba(96,165,250,0.4)]"
        >
          <Sparkles className="h-3 w-3 text-cyan-300" />
          Aperçu en direct
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-balance text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl"
          style={{
            textShadow: '0 0 28px rgba(139,92,246,0.25)',
          }}
        >
          Voilà à quoi ressemblera
          <br />
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            ton Spark Compta.
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-auto max-w-xl text-sm text-white/80 sm:text-base"
        >
          Tu logues tes dépenses par WhatsApp, et tout se met à jour tout seul.
          Zéro tableur. Zéro prise de tête.
        </motion.p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {fakeStats.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md ${stat.glow}`}
          >
            {/* Accent bar */}
            <div
              className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${stat.accent}`}
            />
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/70">
                  {stat.label}
                </span>
                <stat.icon className={`h-4 w-4 ${stat.text}`} />
              </div>
              <div
                className={`font-mono text-4xl font-black tabular-nums leading-none sm:text-5xl ${stat.numberGradient} bg-clip-text text-transparent`}
              >
                {stat.value.toLocaleString('fr-FR')}
                <span className="ml-1 text-2xl">{stat.suffix}</span>
              </div>
              <div className={`mt-2 text-[11px] font-semibold ${stat.text}`}>
                {stat.trend} ce mois
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md shadow-[0_0_40px_-24px_rgba(99,102,241,0.45)]"
      >
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">Évolution du CA</div>
              <div className="text-[11px] text-white/50">12 derniers mois</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold text-emerald-200">
              <TrendingUp className="h-3 w-3" />
              +38% YoY
            </div>
          </div>

          <svg
            viewBox="0 0 600 120"
            className="h-32 w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sc_line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
              <linearGradient id="sc_area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1="0"
                x2="600"
                y1={30 * i + 10}
                y2={30 * i + 10}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="2 4"
              />
            ))}
            <motion.path
              d={chartPath.area}
              fill="url(#sc_area)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 1 }}
            />
            <motion.path
              d={chartPath.line}
              fill="none"
              stroke="url(#sc_line)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 1.6, ease: 'easeOut' }}
            />
          </svg>
        </div>
      </motion.div>

      {/* Top expenses */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md shadow-[0_0_40px_-24px_rgba(139,92,246,0.35)]"
      >
        <div className="relative mb-4 flex items-center justify-between">
          <div className="text-sm font-bold text-white">Top 3 des dépenses</div>
          <div className="text-[11px] text-white/50">Mars 2026</div>
        </div>
        <div className="relative space-y-4">
          {topExpenses.map((exp, i) => (
            <motion.div
              key={exp.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-white/90">{exp.label}</span>
                <span className="font-mono font-bold tabular-nums text-white">
                  {exp.amount}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${exp.pct * 2.5}%` }}
                  transition={{
                    delay: 0.85 + i * 0.1,
                    duration: 1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`h-full rounded-full bg-gradient-to-r ${exp.hue} ${exp.glow}`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row"
      >
        <PrimaryButton onClick={onNext} large>
          Configurer le mien
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </PrimaryButton>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full px-5 py-3 text-sm text-slate-400 transition-colors hover:text-white"
        >
          Passer la démo
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================================
// Étape 1 — Choix de la famille métier
// ============================================================================

// Per-family color identity retained, but saturation toned down
// (was 500/600 vivid — now stays at 400 level with softer rgba).
const FAMILY_ACCENTS: Record<
  Family,
  {
    gradient: string
    glow: string
    ring: string
  }
> = {
  rouleur: {
    gradient: 'from-sky-400 to-blue-400',
    glow: 'rgba(96,165,250,0.35)',
    ring: 'rgba(96,165,250,0.6)',
  },
  mains_agiles: {
    gradient: 'from-amber-400 to-orange-400',
    glow: 'rgba(251,146,60,0.35)',
    ring: 'rgba(251,146,60,0.6)',
  },
  tenancier: {
    gradient: 'from-emerald-400 to-teal-400',
    glow: 'rgba(52,211,153,0.35)',
    ring: 'rgba(52,211,153,0.6)',
  },
  cerveau: {
    gradient: 'from-violet-400 to-purple-400',
    glow: 'rgba(168,139,250,0.38)',
    ring: 'rgba(168,139,250,0.6)',
  },
  creatif: {
    gradient: 'from-pink-400 to-fuchsia-400',
    glow: 'rgba(244,114,182,0.38)',
    ring: 'rgba(244,114,182,0.6)',
  },
  hebergeur: {
    gradient: 'from-cyan-400 to-sky-400',
    glow: 'rgba(34,211,238,0.35)',
    ring: 'rgba(34,211,238,0.6)',
  },
}

function StepFamily({
  selected,
  onSelect,
}: {
  selected: Family | null
  onSelect: (family: Family) => void
}) {
  const families = Object.values(FAMILIES) as Family[]

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black tracking-tight text-white sm:text-3xl"
          style={{ textShadow: '0 0 24px rgba(99,102,241,0.25)' }}
        >
          Dans quelle famille tu te{' '}
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            reconnais
          </span>{' '}
          ?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-white/70"
        >
          Choisis celle qui colle le mieux à ton activité principale.
        </motion.p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {families.map((family, i) => {
          const isSelected = selected === family
          const accent = FAMILY_ACCENTS[family]
          return (
            <motion.button
              key={family}
              type="button"
              onClick={() => onSelect(family)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className="group relative"
            >
              {/* Softer gradient halo when selected (layoutId = cheap, GPU) */}
              {isSelected && (
                <motion.span
                  layoutId="family-ring"
                  aria-hidden
                  className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${accent.gradient} opacity-50 blur-md`}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div
                className={`relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-white/30 bg-white/[0.10]'
                    : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]'
                }`}
                style={
                  isSelected
                    ? { boxShadow: `inset 0 0 40px ${accent.glow}` }
                    : undefined
                }
              >
                {/* Accent top bar */}
                <div
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${accent.gradient}`}
                />
                <span
                  className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-3xl"
                  aria-hidden
                  style={{ boxShadow: `0 0 18px ${accent.glow}` }}
                >
                  {FAMILY_EMOJIS[family]}
                </span>
                <div className="relative min-w-0 flex-1">
                  <div className="font-bold text-white">
                    {FAMILY_LABELS[family]}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/70">
                    {FAMILY_DESCRIPTIONS[family]}
                  </div>
                </div>
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className={`relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent.gradient} text-white ring-2 ring-white/40`}
                      style={{ boxShadow: `0 0 14px ${accent.ring}` }}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Étape 2 — Métier précis + localisation
// ============================================================================

function StepMetierLocalization({
  family,
  metier,
  localization,
  onMetierChange,
  onLocalizationChange,
}: {
  family: Family | null
  metier: string
  localization: Localization | null
  onMetierChange: (slug: string) => void
  onLocalizationChange: (loc: Localization) => void
}) {
  const metiers = family ? getMetiersForFamily(family) : []

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h2
          className="text-2xl font-black tracking-tight text-white sm:text-3xl"
          style={{ textShadow: '0 0 24px rgba(99,102,241,0.25)' }}
        >
          Précise ton{' '}
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            métier
          </span>
        </h2>
        <p className="text-sm text-white/70">
          Ça nous aide à te proposer les bonnes catégories de dépenses.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <Label htmlFor="metier" className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Ton métier précis
          </Label>
          <Select value={metier} onValueChange={onMetierChange}>
            <SelectTrigger
              id="metier"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] text-white backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/[0.10] focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/30"
            >
              <SelectValue placeholder="Choisis ton métier" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
              {metiers.map((m) => (
                <SelectItem key={m.slug} value={m.slug}>
                  {m.label}
                  {m.description ? ` — ${m.description}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-2"
        >
          <Label htmlFor="localization" className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Ta localisation fiscale
          </Label>
          <Select
            value={localization ?? undefined}
            onValueChange={(v) => onLocalizationChange(v as Localization)}
          >
            <SelectTrigger
              id="localization"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] text-white backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/[0.10] focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/30"
            >
              <SelectValue placeholder="Où es-tu basé fiscalement ?" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
              {(Object.values(LOCALIZATIONS) as Localization[]).map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {LOCALIZATION_LABELS[loc]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>
      </div>
    </div>
  )
}

// ============================================================================
// Étape 3 — Régime fiscal + mode
// ============================================================================

function StepRegimeMode({
  regime,
  isTvaLiable,
  mode,
  onRegimeChange,
  onTvaChange,
  onModeChange,
}: {
  regime: FiscalRegime | null
  isTvaLiable: boolean
  mode: Mode
  onRegimeChange: (r: FiscalRegime) => void
  onTvaChange: (v: boolean) => void
  onModeChange: (m: Mode) => void
}) {
  const modes: Array<{
    value: Mode
    title: string
    tag: string
    tagClass: string
    desc: string
    icon: React.ComponentType<{ className?: string }>
    includes: string[]
  }> = [
    {
      value: MODES.SIMPLE,
      title: 'Simple',
      tag: 'Gratuit',
      tagClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
      desc: 'Tu logues dépenses et recettes, tu vois ton bénéfice. Parfait pour garder le contrôle.',
      icon: Zap,
      includes: ['Dépenses & recettes', 'Bénéfice en temps réel', 'Export CSV'],
    },
    {
      value: MODES.COMPTABLE,
      title: 'Comptable',
      tag: 'Option Pro',
      tagClass: 'bg-gradient-to-r from-blue-500/20 to-pink-500/20 text-purple-200 border-purple-400/30',
      desc: 'Tout Simple + exports FEC, journaux, rapprochement bancaire, liasse assistée.',
      icon: FileSpreadsheet,
      includes: ['Exports FEC', 'Journaux comptables', 'Liasse fiscale'],
    },
  ]

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h2
          className="text-2xl font-black tracking-tight text-white sm:text-3xl"
          style={{ textShadow: '0 0 24px rgba(99,102,241,0.25)' }}
        >
          Ton{' '}
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            régime
          </span>{' '}
          et ton{' '}
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
            mode
          </span>
        </h2>
        <p className="text-sm text-white/70">
          Aucune inquiétude, tu pourras le modifier plus tard.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="regime" className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Régime fiscal
          </Label>
          <Select
            value={regime ?? undefined}
            onValueChange={(v) => onRegimeChange(v as FiscalRegime)}
          >
            <SelectTrigger
              id="regime"
              className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] text-white backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/[0.10] focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-400/30"
            >
              <SelectValue placeholder="Choisis ton régime fiscal" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl">
              {(Object.values(FISCAL_REGIMES) as FiscalRegime[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {FISCAL_REGIME_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label
          htmlFor="tva"
          className="relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/[0.08]"
        >
          <Checkbox
            id="tva"
            checked={isTvaLiable}
            onCheckedChange={(v) => onTvaChange(v === true)}
            className="mt-0.5 border-white/30 data-[state=checked]:border-purple-400 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-500"
          />
          <div className="space-y-1">
            <span className="block font-medium text-white">
              Je suis assujetti à la TVA
            </span>
            <p className="text-xs text-slate-400">
              Coche si tu factures la TVA à tes clients. En micro, c&apos;est souvent
              non (sauf dépassement de seuil).
            </p>
          </div>
        </label>

        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
            Mode Spark Compta
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map((m) => {
              const isSelected = mode === m.value
              const Icon = m.icon
              return (
                <motion.button
                  key={m.value}
                  type="button"
                  onClick={() => onModeChange(m.value)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative text-left"
                >
                  {isSelected && (
                    <motion.span
                      layoutId="mode-ring"
                      aria-hidden
                      className="absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-400 via-indigo-400 to-violet-400 opacity-50 blur-md"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div
                    className={`relative h-full overflow-hidden rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? 'border-white/30 bg-white/[0.10] shadow-[inset_0_0_40px_rgba(99,102,241,0.22)]'
                        : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="relative mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-gradient-to-br from-indigo-500/25 to-blue-500/25">
                          <Icon className="h-4 w-4 text-indigo-200" />
                        </span>
                        <span className="font-bold text-white">{m.title}</span>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${m.tagClass}`}>
                        {m.tag}
                      </span>
                    </div>
                    <p className="relative text-xs leading-relaxed text-white/75">{m.desc}</p>
                    <ul className="relative mt-3 space-y-1">
                      {m.includes.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-1.5 text-[11px] text-white/85"
                        >
                          <ShieldCheck className="h-3 w-3 text-indigo-300" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <AnimatePresence>
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500"
                        >
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Étape 4 — Connexion WhatsApp
// ============================================================================

function StepWhatsapp({
  opened,
  onOpenWhatsapp,
}: {
  opened: boolean
  onOpenWhatsapp: () => void
}) {
  return (
    <div className="relative space-y-8">
      {/* Softer sunrise radial backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,#10B981_0%,#047857_20%,transparent_65%)] opacity-20 blur-3xl transform-gpu"
      />

      <div className="relative space-y-3 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200 backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-300/80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
          </span>
          Dernière étape
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-2xl font-black tracking-tight text-white sm:text-4xl"
          style={{ textShadow: '0 0 24px rgba(16,185,129,0.3)' }}
        >
          Connecte{' '}
          <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
            WhatsApp
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto max-w-md text-sm text-white/75"
        >
          Tout se passe sur WhatsApp. Envoie-nous un premier message pour démarrer
          ta conversation avec Spark Compta.
        </motion.p>
      </div>

      <div className="relative flex flex-col items-center gap-6 py-4">
        {/* Pulsing emerald sun — one pulse ring, softer core */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 180, damping: 16 }}
          className="relative transform-gpu"
        >
          {/* Single soft outer glow halo */}
          <div
            aria-hidden
            className="absolute inset-0 -m-12 rounded-full bg-[radial-gradient(circle,#10B981_0%,transparent_65%)] opacity-30 blur-3xl"
          />
          {/* Single pulse ring */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-emerald-400/30 transform-gpu"
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
          />
          {/* Core sphere — subtler */}
          <motion.div
            className="relative flex h-32 w-32 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#6EE7B7_0%,#34D399_35%,#10B981_70%,#065F46_100%)] ring-2 ring-emerald-200/40 transform-gpu"
            style={{
              boxShadow:
                '0 0 40px rgba(16,185,129,0.45), inset -15px -15px 30px rgba(4,120,87,0.5), inset 10px 10px 20px rgba(167,243,208,0.35)',
            }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MessageCircle
              className="h-14 w-14 text-white"
              strokeWidth={2.2}
            />
          </motion.div>
        </motion.div>

        {/* WhatsApp button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpenWhatsapp}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-base font-semibold text-white shadow-[0_6px_24px_rgba(37,211,102,0.35)] transition-shadow hover:shadow-[0_10px_34px_rgba(37,211,102,0.5)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#25D366] via-[#20BA5A] to-[#128C7E]" />
            <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent opacity-60" />
            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30" />
            <span
              aria-hidden
              className="absolute inset-0 overflow-hidden rounded-full"
            >
              <span
                className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ animation: 'sparkCompta_sheen 1.2s ease-in-out' }}
              />
            </span>
            <MessageCircle className="relative h-5 w-5" />
            <span className="relative">Ouvrir WhatsApp</span>
          </motion.a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-md text-center text-xs text-slate-500"
        >
          Une fois que tu as envoyé le message, reviens ici et clique sur{' '}
          <span className="font-semibold text-slate-200">Terminer</span>.
        </motion.p>

        <AnimatePresence>
          {opened && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
              WhatsApp ouvert dans un nouvel onglet
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
