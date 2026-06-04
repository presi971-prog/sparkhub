'use client'

/**
 * Wizard de création d'un nouveau run SparkExecute.
 *
 * Étapes :
 *   1) Type du livrable (grille de cards)
 *   2) Brief (sujet obligatoire + 4 champs facultatifs)
 *
 * À la soumission, POST /api/sparkexecute/runs → redirect vers /runs/[id].
 */

import {
  ArrowLeft,
  ArrowRight,
  Code,
  File,
  FileText,
  Image as ImageIcon,
  Images,
  Instagram,
  LayoutTemplate,
  Linkedin,
  Loader2,
  Megaphone,
  MessageCircleQuestion,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { RUN_TYPE_AVAILABLE_V1 } from '@/lib/sparkexecute/type-mapping'
import type { RunInputBrief, RunType } from '@/lib/sparkexecute/types'

interface TypeCard {
  type: RunType
  label: string
  description: string
  icon: LucideIcon
  estimatedSeconds: number
}

const TYPE_CARDS: TypeCard[] = [
  {
    type: 'article_seo',
    label: 'Article SEO',
    description: 'Article 800-2000 mots pour ranker sur Google sur un mot-clé précis.',
    icon: FileText,
    estimatedSeconds: 40,
  },
  {
    type: 'article_long',
    label: 'Article long pillar',
    description: 'Article 2000-3000 mots, format de référence sur un sujet.',
    icon: FileText,
    estimatedSeconds: 60,
  },
  {
    type: 'article_court',
    label: 'Article court',
    description: 'Format 600-1000 mots, plus dense, pour les news et angles précis.',
    icon: File,
    estimatedSeconds: 25,
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: '5 à 10 questions-réponses avec Schema markup intégré.',
    icon: MessageCircleQuestion,
    estimatedSeconds: 20,
  },
  {
    type: 'post_linkedin',
    label: 'Post LinkedIn',
    description: 'Post Hook-Story-CTA prêt à coller, max 1300 caractères.',
    icon: Linkedin,
    estimatedSeconds: 15,
  },
  {
    type: 'post_instagram',
    label: 'Post Instagram',
    description: 'Caption Instagram + hashtags + brief visuel d\'accompagnement.',
    icon: Instagram,
    estimatedSeconds: 15,
  },
  {
    type: 'carousel',
    label: 'Carrousel',
    description: '5 slides image-avec-texte (Hook → valeur → CTA) pour Instagram / LinkedIn.',
    icon: Images,
    estimatedSeconds: 50,
  },
  {
    type: 'hooks_pub',
    label: 'Accroches pub',
    description: '3-5 variantes d\'accroches Meta / Google Ads à A/B tester.',
    icon: Megaphone,
    estimatedSeconds: 15,
  },
  {
    type: 'visual',
    label: 'Visuel',
    description: 'Image 1080×1080 générée (post réseaux, bannière, illustration).',
    icon: ImageIcon,
    estimatedSeconds: 45,
  },
  {
    type: 'page_accueil',
    label: "Page d'accueil",
    description: 'Section above-the-fold + structure StoryBrand / AIDA.',
    icon: LayoutTemplate,
    estimatedSeconds: 30,
  },
  {
    type: 'schema_markup',
    label: 'Schema markup',
    description: 'Bloc Schema.org JSON-LD prêt à coller dans ton site.',
    icon: Code,
    estimatedSeconds: 10,
  },
]

export function NewRunWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedType, setSelectedType] = useState<RunType | null>(null)
  const [brief, setBrief] = useState<RunInputBrief>({
    sujet: '',
    audience: '',
    ton: 'chaleureux et direct',
    mots_cles: [],
    longueur_souhaitee: undefined,
  })
  const [motsClesInput, setMotsClesInput] = useState('')
  const [isPending, startTransition] = useTransition()

  /**
   * Format image visible UNIQUEMENT pour les types qui produisent une image
   * (`visual`, `post_instagram`). Défaut = 4:5 pour Instagram (best practice
   * feed), 1:1 pour le reste (universel LinkedIn / général).
   */
  const showsImageFormat =
    selectedType === 'visual' || selectedType === 'post_instagram'

  function handleSelectType(type: RunType) {
    if (!RUN_TYPE_AVAILABLE_V1[type]) {
      toast.info(
        `Le type "${TYPE_CARDS.find((c) => c.type === type)?.label}" arrive bientôt. Pour la V1, choisis : article SEO, post LinkedIn ou visuel.`,
      )
      return
    }
    setSelectedType(type)
    // Initialise un défaut "aspect_ratio" cohérent : 4:5 pour Instagram, 1:1 sinon.
    setBrief((b) => ({
      ...b,
      aspect_ratio:
        type === 'post_instagram'
          ? '4:5'
          : type === 'visual'
            ? '1:1'
            : undefined,
    }))
    setStep(2)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType) return
    const sujet = brief.sujet.trim()
    if (!sujet) {
      toast.error('Le sujet est obligatoire pour lancer la fabrication.')
      return
    }
    const motsCles = motsClesInput
      .split(/[,;]/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0)
      .slice(0, 12)

    startTransition(async () => {
      try {
        const res = await fetch('/api/sparkexecute/runs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: selectedType,
            input_brief: {
              ...brief,
              sujet,
              mots_cles: motsCles,
            },
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          run_id?: string
          error?: string
        }
        if (!res.ok || !data.run_id) {
          toast.error(data.error ?? 'Création impossible. Réessaie dans un instant.')
          return
        }
        toast.success("L'atelier fabrique ton livrable. Suis la progression sur la page.")
        router.push(`/sparkexecute/runs/${data.run_id}`)
      } catch {
        toast.error('Réseau injoignable. Réessaie dans un instant.')
      }
    })
  }

  return (
    <div className="relative mx-auto max-w-[1080px] px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-10">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-[#5E626C]">
        <Link
          href="/sparkexecute"
          className="inline-flex items-center gap-1 transition hover:text-[#0F1115]"
        >
          <ArrowLeft className="h-3 w-3" /> Tableau de bord
        </Link>
        <span className="text-[#A8ACB5]">/</span>
        <span className="text-[#22252C]">Créer un livrable</span>
      </div>

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-3 text-xs">
        <Stepper index={1} active={step >= 1} done={step > 1} label="Type" />
        <span className="h-px w-10 bg-[#E4E7E2]" />
        <Stepper index={2} active={step >= 2} done={false} label="Brief" />
      </div>

      {step === 1 ? (
        <section>
          <header className="mb-6">
            <h1
              className="mb-2 text-[34px] leading-[1.05] text-[#0F1115] sm:text-[40px]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              Que veux-tu créer ?
            </h1>
            <p className="max-w-2xl text-[15px] text-[#5E626C]">
              Choisis un type. Tu pourras préciser le sujet, le ton et la cible à l&apos;étape suivante.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {TYPE_CARDS.map((card) => {
              const Icon = card.icon
              const isAvailable = RUN_TYPE_AVAILABLE_V1[card.type]
              return (
                <button
                  key={card.type}
                  type="button"
                  onClick={() => handleSelectType(card.type)}
                  className={`relative flex flex-col items-start rounded-xl border p-5 text-left transition ${
                    isAvailable
                      ? 'border-[#E4E7E2] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)] hover:-translate-y-0.5 hover:border-[#10B981]/40 hover:shadow-[0_12px_32px_-14px_rgba(15,17,21,0.22)]'
                      : 'cursor-not-allowed border-[#E4E7E2] bg-[#F5F6F4] opacity-70'
                  }`}
                >
                  {!isAvailable ? (
                    <span className="absolute right-3 top-3 rounded-md bg-[#FFF6EA] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#A37312]">
                      Bientôt
                    </span>
                  ) : null}
                  <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5]">
                    <Icon className="h-5 w-5 text-[#064E3B]" />
                  </span>
                  <h3
                    className="mb-1.5 text-[17px] leading-tight text-[#0F1115]"
                    style={{
                      fontFamily:
                        'var(--font-instrument-serif), Georgia, serif',
                    }}
                  >
                    {card.label}
                  </h3>
                  <p className="text-xs leading-relaxed text-[#5E626C]">
                    {card.description}
                  </p>
                  <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
                    ~{card.estimatedSeconds} s
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 2 && selectedType ? (
        <section>
          <header className="mb-6">
            <p className="mb-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#10B981]">
              <Wrench className="h-3 w-3" />
              {TYPE_CARDS.find((c) => c.type === selectedType)?.label}
            </p>
            <h1
              className="mb-2 text-[34px] leading-[1.05] text-[#0F1115] sm:text-[40px]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              Donne-moi le brief
            </h1>
            <p className="max-w-2xl text-[15px] text-[#5E626C]">
              Plus tu précises, plus le livrable colle à ton besoin. Seul le sujet est obligatoire.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-[#E4E7E2] bg-white p-6 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]"
          >
            <Field
              label="Sujet"
              required
              hint="La phrase qui résume le livrable. Ex : « Comment l'IA fait gagner 10h/semaine à un restaurateur en GP »."
            >
              <input
                type="text"
                value={brief.sujet}
                onChange={(e) =>
                  setBrief((b) => ({ ...b, sujet: e.target.value }))
                }
                placeholder="Ex : Les 5 mythes sur l'IA en Guadeloupe"
                className="block w-full rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-sm placeholder:text-[#A8ACB5] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                required
              />
            </Field>

            <Field
              label="Audience"
              hint="À qui tu parles ? Ex : « Restaurateurs en Guadeloupe »."
            >
              <input
                type="text"
                value={brief.audience ?? ''}
                onChange={(e) =>
                  setBrief((b) => ({ ...b, audience: e.target.value }))
                }
                placeholder="Ex : Patrons de TPE en Guadeloupe"
                className="block w-full rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-sm placeholder:text-[#A8ACB5] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
              />
            </Field>

            <Field
              label="Ton"
              hint="Comment tu veux que ça sonne ? Pro, chaleureux, punchy…"
            >
              <input
                type="text"
                value={brief.ton ?? ''}
                onChange={(e) =>
                  setBrief((b) => ({ ...b, ton: e.target.value }))
                }
                placeholder="Ex : chaleureux et direct (tutoiement)"
                className="block w-full rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-sm placeholder:text-[#A8ACB5] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
              />
            </Field>

            <Field
              label="Mots-clés"
              hint="Séparés par des virgules. Servent au SEO (article) ou à orienter le ton."
            >
              <input
                type="text"
                value={motsClesInput}
                onChange={(e) => setMotsClesInput(e.target.value)}
                placeholder="Ex : ia guadeloupe, restaurant, gain de temps"
                className="block w-full rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-sm placeholder:text-[#A8ACB5] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
              />
            </Field>

            {selectedType === 'article_seo' ||
            selectedType === 'article_long' ||
            selectedType === 'article_court' ? (
              <Field
                label="Longueur visée (mots)"
                hint="Optionnel. Si vide, on prend une longueur par défaut (1200 mots pour article SEO)."
              >
                <input
                  type="number"
                  min={400}
                  max={3000}
                  value={brief.longueur_souhaitee ?? ''}
                  onChange={(e) =>
                    setBrief((b) => ({
                      ...b,
                      longueur_souhaitee: e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : undefined,
                    }))
                  }
                  placeholder="1200"
                  className="block w-32 rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-sm placeholder:text-[#A8ACB5] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                />
              </Field>
            ) : null}

            {showsImageFormat ? (
              <Field
                label="Format de l'image"
                hint="On garde le ratio natif du réseau : carré pour LinkedIn ou usage général, portrait pour le feed Instagram."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        value: '1:1' as const,
                        title: 'Carré',
                        subtitle: 'Pour LinkedIn et usage général',
                        size: '1080 × 1080',
                      },
                      {
                        value: '4:5' as const,
                        title: 'Portrait',
                        subtitle: 'Pour le feed Instagram',
                        size: '1080 × 1350',
                      },
                    ]
                  ).map((opt) => {
                    const isSelected = (brief.aspect_ratio ?? '1:1') === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setBrief((b) => ({ ...b, aspect_ratio: opt.value }))
                        }
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                          isSelected
                            ? 'border-[#10B981] bg-[#ECFDF5]/60 shadow-[0_0_0_1px_#10B981]'
                            : 'border-[#E4E7E2] bg-white hover:border-[#10B981]/40 hover:bg-[#ECFDF5]/30'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex-shrink-0 rounded-sm border border-[#0F1115]/20 ${
                            opt.value === '1:1'
                              ? 'h-8 w-8'
                              : 'h-9 w-[28.8px]'
                          } ${
                            isSelected
                              ? 'bg-[#10B981]/30 border-[#10B981]'
                              : 'bg-[#F5F6F4]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#0F1115]">
                            {opt.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#5E626C]">
                            {opt.subtitle}
                          </span>
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
                            {opt.size}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Field>
            ) : null}

            <div className="flex items-center justify-between border-t border-[#E4E7E2] pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className="inline-flex items-center gap-2 text-sm text-[#5E626C] transition hover:text-[#0F1115]"
              >
                <ArrowLeft className="h-4 w-4" /> Choisir un autre type
              </button>
              <button
                type="submit"
                disabled={isPending || !brief.sujet.trim()}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                }}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Lancer la fabrication
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  )
}

function Stepper({
  index,
  active,
  done,
  label,
}: {
  index: number
  active: boolean
  done: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid h-6 w-6 place-content-center rounded-full text-xs font-semibold ${
          done
            ? 'bg-[#064E3B] text-white'
            : active
              ? 'bg-[#10B981] text-white'
              : 'bg-[#E4E7E2] text-[#5E626C]'
        }`}
      >
        {index}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
        {label}
      </span>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#0F1115]">
        {label} {required ? <span className="text-[#E0633A]">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs text-[#5E626C]">{hint}</p>
      ) : null}
    </div>
  )
}
