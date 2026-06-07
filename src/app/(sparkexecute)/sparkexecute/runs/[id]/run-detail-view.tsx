'use client'

/**
 * Vue détail d'un run SparkExecute (client component).
 *
 * Layout split : à gauche le brief (lecture seule en V1), à droite l'output
 * éditable. En haut, les actions principales (Valider / Refaire / Archiver).
 *
 * Gère :
 *   - polling automatique tant que status = 'generating' (toutes les 3s)
 *   - édition optimiste du contenu (PATCH /api/sparkexecute/runs/[id])
 *   - actions POST /validate, /publish, /redo, /add-legend et DELETE
 *   - rendu spécial pour les packs post_linkedin / post_instagram (image + texte
 *     en 2 colonnes, avec fallback si l'image a échoué)
 *   - rendu spécial pour les runs visual avec section "Légende qui accompagne"
 *   - feedback Sonner sur chaque action
 */

import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  Hash,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { PublicationsList } from '@/components/sparkexecute/publications-list'
import { PublishDialog } from '@/components/sparkexecute/publish-dialog'
import { RunStatusPill } from '@/components/sparkexecute/run-status-pill'
import { RunTypeBadge } from '@/components/sparkexecute/run-type-badge'
import { TYPE_LABEL } from '@/components/sparkexecute/palette'
import type { RunInputBrief, SparkexecuteRun } from '@/lib/sparkexecute/types'

interface RunDetailViewProps {
  initialRun: SparkexecuteRun
}

const VARIANT_OPTIONS: Array<{
  value: NonNullable<RunInputBrief['variant']>
  label: string
  hint: string
}> = [
  { value: 'shorter', label: 'Plus court', hint: 'Compresse, retire les redites' },
  { value: 'punchier', label: 'Plus punchy', hint: 'Hooks plus tape-à-l\'œil' },
  { value: 'pro', label: 'Plus pro', hint: 'Ton plus institutionnel' },
  { value: 'casual', label: 'Plus détendu', hint: 'Ton plus parlé, tutoiement' },
]

/** Stats à masquer dans le bloc générique (déjà affichées ailleurs ou trop techniques). */
const HIDDEN_STAT_KEYS = new Set([
  'schema_jsonld',
  'source_prompt',
  'image_prompt',
])

export function RunDetailView({ initialRun }: RunDetailViewProps) {
  const router = useRouter()
  const [run, setRun] = useState<SparkexecuteRun>(initialRun)
  const [draftContent, setDraftContent] = useState<string>(
    initialRun.output?.content ?? '',
  )
  const [draftLegend, setDraftLegend] = useState<string>(
    initialRun.output?.legend ?? '',
  )
  const [isPending, startTransition] = useTransition()
  const [isAddingLegend, setIsAddingLegend] = useState(false)
  const [isSavingLegend, setIsSavingLegend] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publicationsRefreshKey, setPublicationsRefreshKey] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Polling tant que le run est en cours de génération.
  useEffect(() => {
    if (run.status !== 'generating') return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${run.id}`, {
          cache: 'no-store',
        })
        if (!res.ok) return
        const updated = (await res.json()) as SparkexecuteRun
        setRun(updated)
        if (updated.status !== 'generating') {
          setDraftContent(updated.output?.content ?? '')
          setDraftLegend(updated.output?.legend ?? '')
        }
      } catch {
        // Silence : on réessayera au prochain tick.
      }
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [run.id, run.status])

  const refreshFromServer = useCallback(async () => {
    const res = await fetch(`/api/sparkexecute/runs/${run.id}`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const updated = (await res.json()) as SparkexecuteRun
      setRun(updated)
      setDraftContent(updated.output?.content ?? '')
      setDraftLegend(updated.output?.legend ?? '')
    }
    router.refresh()
  }, [run.id, router])

  async function handleSave() {
    if (isPending) return
    if (draftContent === run.output?.content) {
      toast.info('Aucune modification à enregistrer.')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${run.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ output: { content: draftContent } }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Modifications enregistrées.')
        await refreshFromServer()
      } catch {
        toast.error("Sauvegarde impossible. Vérifie ta connexion et réessaie.")
      }
    })
  }

  async function handleValidate() {
    if (isPending || run.status !== 'draft') return
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/sparkexecute/runs/${run.id}/validate`,
          { method: 'POST' },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Livrable validé. Tu peux le publier quand tu veux.')
        await refreshFromServer()
      } catch {
        toast.error('Validation impossible. Réessaie dans un instant.')
      }
    })
  }

  function handlePublish() {
    if (isPending) return
    setPublishOpen(true)
  }

  async function handlePublishCompleted() {
    setPublicationsRefreshKey((k) => k + 1)
    await refreshFromServer()
  }

  async function handleArchive() {
    if (isPending) return
    if (!confirm('Mettre ce livrable à la corbeille ?')) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${run.id}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Livrable mis à la corbeille. Tu peux le retrouver dans Archivés.')
        router.push('/sparkexecute/mes-creations')
      } catch {
        toast.error('Suppression impossible. Réessaie dans un instant.')
      }
    })
  }

  async function handlePermanentDelete() {
    if (isPending) return
    if (!confirm('Supprimer définitivement ce livrable ? Cette action est irréversible.')) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${run.id}?permanent=true`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        toast.success('Livrable supprimé définitivement.')
        router.push('/sparkexecute/mes-creations')
      } catch {
        toast.error('Suppression impossible. Réessaie dans un instant.')
      }
    })
  }

  async function handleRedo(
    payload: { variant?: RunInputBrief['variant']; framework_override?: string },
  ) {
    if (isPending) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sparkexecute/runs/${run.id}/redo`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { run_id: string }
        toast.success('Nouvelle version en fabrication. On y va !')
        router.push(`/sparkexecute/runs/${data.run_id}`)
      } catch {
        toast.error('Relance impossible. Réessaie dans un instant.')
      }
    })
  }

  async function handleAddLegend(options: { force?: boolean } = {}) {
    if (isAddingLegend || isPending) return
    setIsAddingLegend(true)
    if (options.force) {
      toast.info('Nouvelle légende en cours...')
    }
    try {
      const url = options.force
        ? `/api/sparkexecute/runs/${run.id}/add-legend?force=true`
        : `/api/sparkexecute/runs/${run.id}/add-legend`
      const res = await fetch(url, { method: 'POST' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      toast.success(
        options.force
          ? 'Nouvelle légende prête.'
          : 'Légende ajoutée. Elle accompagne ton visuel.',
      )
      await refreshFromServer()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Réessaie dans un instant.'
      toast.error(`Impossible d'ajouter une légende. ${msg}`)
    } finally {
      setIsAddingLegend(false)
    }
  }

  async function handleSaveLegend() {
    if (isSavingLegend || isPending) return
    if (draftLegend === (run.output?.legend ?? '')) {
      toast.info('Aucune modification à enregistrer.')
      return
    }
    setIsSavingLegend(true)
    try {
      const res = await fetch(`/api/sparkexecute/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ output: { legend: draftLegend } }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success('Légende enregistrée.')
      await refreshFromServer()
    } catch {
      toast.error("Sauvegarde impossible. Vérifie ta connexion et réessaie.")
    } finally {
      setIsSavingLegend(false)
    }
  }

  /**
   * Crée un nouveau run `visual` dérivé du pack post_linkedin / post_instagram,
   * pour permettre à l'user de fabriquer l'image manuellement quand l'auto a
   * échoué (Nano Banana down par ex.).
   */
  async function handleGenerateImageManually() {
    if (isPending) return
    startTransition(async () => {
      try {
        const imagePromptMaybe = run.output?.metadata?.image_prompt
        const sujet =
          typeof imagePromptMaybe === 'string' && imagePromptMaybe.length > 0
            ? imagePromptMaybe.slice(0, 200)
            : (run.input_brief?.sujet ?? 'Visuel pour mon post')

        const res = await fetch('/api/sparkexecute/runs', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'visual',
            input_brief: {
              sujet,
              audience: run.input_brief?.audience,
              ton: run.input_brief?.ton,
            },
          }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { run_id: string }
        toast.success("L'image est en fabrication. On la lie à ton post juste après.")
        router.push(`/sparkexecute/runs/${data.run_id}`)
      } catch {
        toast.error("Impossible de lancer la génération. Réessaie dans un instant.")
      }
    })
  }

  function handleCopyText(text: string, label: string) {
    if (!text) return
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copié dans le presse-papier.`))
      .catch(() => toast.error('Copie impossible. Sélectionne le texte à la main.'))
  }

  const isGenerating = run.status === 'generating'
  const isEditable =
    run.status === 'draft' || run.status === 'validated' || run.status === 'failed'
  const isPostPack = run.type === 'post_linkedin' || run.type === 'post_instagram'
  const isInstagramPack = run.type === 'post_instagram'
  const isCarousel = run.type === 'carousel'
  const isVideo = run.type === 'video'
  // Slides d'un carrousel (stockées dans output.metadata.slides).
  const carouselSlides =
    (run.output?.metadata?.slides as
      | Array<{ index: number; headline: string; subtext: string; image_url?: string }>
      | undefined) ?? []
  const canAddLegend =
    run.type === 'visual' &&
    !!run.output?.image_url &&
    (run.status === 'draft' || run.status === 'validated') &&
    !run.output?.legend

  // Ratio natif d'affichage de l'image (1:1 par défaut, 4:5 si stocké).
  // Compatibilité avec runs existants (aspect_ratio absent → 1:1).
  const storedRatio = run.output?.metadata?.aspect_ratio
  const imageRatioClass = storedRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'
  const imageRatioLabel = storedRatio === '4:5' ? '1080 × 1350 (portrait)' : '1080 × 1080 (carré)'

  // Caption Instagram = texte sans les hashtags inclus en queue de bloc.
  // Si Claude a glissé les hashtags à la fin du content (à la "#tag1 #tag2"),
  // on les retire pour le bouton "Copier la caption". Les hashtags du champ
  // output.hashtags restent source de vérité pour le bouton "Copier les hashtags".
  const captionWithoutHashtags = stripTrailingHashtags(
    draftContent,
    run.output?.hashtags ?? [],
  )
  const hashtagsLine = (run.output?.hashtags ?? [])
    .map((h) => `#${h.replace(/^#/, '')}`)
    .join(' ')

  return (
    <div className="relative mx-auto max-w-[1280px] px-4 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-10">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs text-[#5E626C]">
        <Link
          href="/sparkexecute/mes-creations"
          className="inline-flex items-center gap-1 transition hover:text-[#0F1115]"
        >
          <ArrowLeft className="h-3 w-3" /> Mes créations
        </Link>
      </div>

      {/* Header du run */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <RunTypeBadge type={run.type} />
            <RunStatusPill status={run.status} />
            {run.framework_used ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5E626C]">
                Méthode {run.framework_used}
              </span>
            ) : null}
          </div>
          <h1
            className="text-[28px] leading-tight text-[#0F1115] sm:text-[36px]"
            style={{
              fontFamily: 'var(--font-instrument-serif), Georgia, serif',
            }}
          >
            {run.input_brief?.sujet || 'Sans sujet'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {canAddLegend ? (
            <button
              type="button"
              onClick={() => handleAddLegend()}
              disabled={isAddingLegend || isPending}
              className="inline-flex items-center gap-2 rounded-md border border-[#D1FAE5] bg-white px-4 py-2 text-sm font-medium text-[#064E3B] transition hover:bg-[#ECFDF5] disabled:opacity-60"
            >
              {isAddingLegend ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}{' '}
              Ajouter une légende qui matche
            </button>
          ) : null}
          {run.status === 'draft' ? (
            <button
              type="button"
              onClick={handleValidate}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition disabled:opacity-60"
              style={{
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              }}
            >
              <Check className="h-4 w-4" /> Valider
            </button>
          ) : null}
          {(run.status === 'validated' || run.status === 'draft' || run.status === 'published') ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-[#D1FAE5] bg-[#ECFDF5] px-4 py-2 text-sm font-medium text-[#064E3B] transition hover:bg-[#D1FAE5] disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {run.status === 'published' ? 'Republier' : 'Publier'}
            </button>
          ) : null}
          {run.status === 'archived' ? (
            <button
              type="button"
              onClick={handlePermanentDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <Archive className="h-4 w-4" /> Supprimer définitivement
            </button>
          ) : (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md border border-[#E4E7E2] bg-white px-4 py-2 text-sm font-medium text-[#5E626C] transition hover:bg-[#F7F5EF] disabled:opacity-60"
            >
              <Archive className="h-4 w-4" /> Supprimer
            </button>
          )}
        </div>
      </header>

      {/* Cas spécial : erreur */}
      {run.status === 'failed' && run.error_message ? (
        <div className="mb-6 rounded-xl border border-[#F2C8B5] bg-[#FDECE5] p-5">
          <p className="text-sm font-medium text-[#A1432D]">
            La génération a échoué
          </p>
          <p className="mt-1 text-sm text-[#A1432D]/90">{run.error_message}</p>
          <button
            type="button"
            onClick={() => handleRedo({})}
            disabled={isPending}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#0F1115] px-3 py-1.5 text-xs font-medium text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refaire
          </button>
        </div>
      ) : null}

      {/* Cas spécial : génération en cours */}
      {isGenerating ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#F5E2B6] bg-[#FFF6EA] p-5">
          <Loader2 className="h-5 w-5 animate-spin text-[#A37312]" />
          <div>
            <p className="text-sm font-medium text-[#A37312]">
              L&apos;atelier fabrique ton {TYPE_LABEL[run.type].toLowerCase()}...
            </p>
            <p className="mt-0.5 text-xs text-[#A37312]/80">
              Cette fenêtre se met à jour toute seule. En général moins d&apos;1 minute.
            </p>
          </div>
        </div>
      ) : null}

      {/* Split brief / output */}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Brief (colonne gauche) */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-[#E4E7E2] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
              Brief
            </h2>
            <dl className="space-y-3 text-sm">
              <BriefRow label="Sujet" value={run.input_brief?.sujet} />
              <BriefRow label="Audience" value={run.input_brief?.audience} />
              <BriefRow label="Ton" value={run.input_brief?.ton} />
              <BriefRow
                label="Mots-clés"
                value={
                  run.input_brief?.mots_cles?.length
                    ? run.input_brief.mots_cles.join(', ')
                    : null
                }
              />
              <BriefRow
                label="Longueur visée"
                value={
                  run.input_brief?.longueur_souhaitee
                    ? `${run.input_brief.longueur_souhaitee} mots`
                    : null
                }
              />
              <BriefRow label="Méthode" value={run.framework_used} />
            </dl>
          </section>

          {/* Actions "Refaire variante" — uniquement pour les drafts/validated/published */}
          {!isGenerating && run.status !== 'archived' ? (
            <section className="rounded-xl border border-[#E4E7E2] bg-white p-5 shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
              <h2 className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                <Wand2 className="h-3 w-3" /> Refaire une variante
              </h2>
              <p className="mb-3 text-xs text-[#5E626C]">
                On garde l&apos;original, on génère une nouvelle version.
              </p>
              <div className="space-y-2">
                {VARIANT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRedo({ variant: opt.value })}
                    disabled={isPending}
                    className="flex w-full items-start justify-between gap-3 rounded-md border border-[#E4E7E2] bg-white px-3 py-2.5 text-left text-sm transition hover:border-[#10B981]/40 hover:bg-[#ECFDF5]/40 disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-[#0F1115]">{opt.label}</span>
                      <p className="mt-0.5 text-xs text-[#5E626C]">{opt.hint}</p>
                    </div>
                    <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        {/* Output (colonne droite) */}
        <section className="rounded-xl border border-[#E4E7E2] bg-white shadow-[0_1px_0_rgba(15,17,21,0.04),0_1px_2px_rgba(15,17,21,0.05)]">
          <header className="flex items-center justify-between border-b border-[#E4E7E2] px-5 py-4">
            <h2
              className="text-[18px] leading-tight text-[#0F1115]"
              style={{
                fontFamily: 'var(--font-instrument-serif), Georgia, serif',
              }}
            >
              Le livrable
            </h2>
            {isEditable ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || draftContent === run.output?.content}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0F1115] px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Enregistrer
              </button>
            ) : null}
          </header>

          <div className="p-5">
            {/* ============================================================ */}
            {/* Pack post LinkedIn / Instagram : image + texte en 2 colonnes  */}
            {/* ============================================================ */}
            {isPostPack ? (
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                {/* Colonne image */}
                <div className="space-y-3">
                  {run.output.image_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={run.output.image_url}
                        alt={run.output.alt_text ?? run.input_brief?.sujet ?? 'Visuel du post'}
                        className={`w-full rounded-lg border border-[#E4E7E2] object-cover ${imageRatioClass}`}
                      />
                      <p className="text-xs text-[#5E626C]">
                        Image générée automatiquement ({imageRatioLabel}).
                      </p>
                      {run.output.alt_text ? (
                        <p className="text-xs text-[#5E626C]">
                          <strong className="text-[#0F1115]">Alt :</strong>{' '}
                          {run.output.alt_text}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[#F2C8B5] bg-[#FFF6EA] p-4">
                      <div className="flex items-start gap-2">
                        <ImageIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#A37312]" />
                        <div>
                          <p className="text-sm font-medium text-[#A37312]">
                            On n&apos;a pas réussi à générer l&apos;image
                          </p>
                          <p className="mt-1 text-xs text-[#A37312]/85">
                            {run.output.image_error ??
                              "Tu peux en créer une manuellement, on l'ajoutera à ton post après."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateImageManually}
                        disabled={isPending}
                        className="inline-flex items-center gap-2 rounded-md bg-[#0F1115] px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Générer l&apos;image manuellement
                      </button>
                    </div>
                  )}
                </div>

                {/* Colonne texte */}
                <div className="space-y-3">
                  {isEditable ? (
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="block min-h-[320px] w-full resize-y rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]/30 p-4 font-mono text-sm leading-relaxed text-[#0F1115] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      placeholder="Le texte du post apparaîtra ici dès que l'atelier l'aura fabriqué…"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#0F1115]">
                      {run.output?.content ?? 'Aucun contenu.'}
                    </pre>
                  )}

                  {/* ============================================================ */}
                  {/* Instagram = hashtags séparés (best practice premier commentaire)
                      LinkedIn = bloc unique (hashtags inline à la fin du post). */}
                  {/* ============================================================ */}
                  {isInstagramPack ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(captionWithoutHashtags, 'Caption')}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1115] transition hover:bg-[#F7F5EF]"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copier la caption
                        </button>
                        {hashtagsLine ? (
                          <button
                            type="button"
                            onClick={() => handleCopyText(hashtagsLine, 'Hashtags')}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1115] transition hover:bg-[#F7F5EF]"
                          >
                            <Hash className="h-3.5 w-3.5" /> Copier les hashtags
                          </button>
                        ) : null}
                      </div>

                      {run.output.hashtags && run.output.hashtags.length > 0 ? (
                        <div className="mt-2 rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]/30 p-3">
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                            Hashtags (premier commentaire conseillé)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {run.output.hashtags.map((h) => (
                              <span
                                key={h}
                                className="rounded-md bg-[#ECFDF5] px-2 py-1 text-xs text-[#064E3B]"
                              >
                                #{h.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {run.output.hashtags && run.output.hashtags.length > 0 ? (
                        <div>
                          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                            Hashtags
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {run.output.hashtags.map((h) => (
                              <span
                                key={h}
                                className="rounded-md bg-[#ECFDF5] px-2 py-1 text-xs text-[#064E3B]"
                              >
                                #{h.replace(/^#/, '')}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleCopyText(buildPostCopyText(run), 'Post')}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7E2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F1115] transition hover:bg-[#F7F5EF]"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copier le post
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : isVideo ? (
              <div className="space-y-4">
                {run.output.video_url ? (
                  <video
                    src={run.output.video_url}
                    controls
                    playsInline
                    className="w-full max-w-[360px] rounded-lg border border-[#E4E7E2] bg-black"
                  />
                ) : (
                  <p className="text-sm text-[#A37312]">
                    {run.output.image_error ?? 'Vidéo non disponible.'}
                  </p>
                )}
                <p className="text-xs text-[#5E626C]">
                  Clip vertical ~8 s. Click-droit sur la vidéo pour la télécharger.
                </p>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                    Légende
                  </p>
                  {isEditable ? (
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="block min-h-[120px] w-full resize-y rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]/30 p-4 font-mono text-sm leading-relaxed text-[#0F1115] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      placeholder="La légende de la vidéo…"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#0F1115]">
                      {run.output?.content ?? 'Aucune légende.'}
                    </pre>
                  )}
                  {run.output.hashtags && run.output.hashtags.length > 0 ? (
                    <p className="mt-2 font-mono text-xs text-[#10B981]">
                      {run.output.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : isCarousel ? (
              <div className="space-y-5">
                {/* Galerie des slides */}
                {carouselSlides.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {carouselSlides.map((s) => (
                      <figure
                        key={s.index}
                        className="overflow-hidden rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]"
                      >
                        {s.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.image_url}
                            alt={s.headline}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-[#FFF6EA] p-2 text-center text-[11px] text-[#A37312]">
                            Slide {s.index} — image non générée
                          </div>
                        )}
                        <figcaption className="px-2 py-1.5 text-[11px] leading-tight text-[#5E626C]">
                          <span className="font-mono uppercase tracking-[0.14em] text-[#10B981]">
                            {s.index}.
                          </span>{' '}
                          {s.headline}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#5E626C]">Aucune slide générée.</p>
                )}
                <p className="text-xs text-[#5E626C]">
                  {carouselSlides.length} slide(s). Click-droit sur une image pour la
                  télécharger, puis publie-les dans l&apos;ordre.
                </p>

                {/* Légende du carrousel (éditable) */}
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                    Légende
                  </p>
                  {isEditable ? (
                    <textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="block min-h-[140px] w-full resize-y rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]/30 p-4 font-mono text-sm leading-relaxed text-[#0F1115] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                      placeholder="La légende du carrousel apparaîtra ici…"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#0F1115]">
                      {run.output?.content ?? 'Aucune légende.'}
                    </pre>
                  )}
                  {run.output.hashtags && run.output.hashtags.length > 0 ? (
                    <p className="mt-2 font-mono text-xs text-[#10B981]">
                      {run.output.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : run.type === 'visual' ? (
              run.output.image_url ? (
                <div className="space-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={run.output.image_url}
                    alt={run.output.alt_text ?? run.input_brief?.sujet ?? 'Visuel'}
                    className={`w-full rounded-lg border border-[#E4E7E2] object-cover ${imageRatioClass}`}
                  />
                  <p className="text-xs text-[#5E626C]">
                    Image générée {imageRatioLabel}. Click-droit pour télécharger.
                  </p>
                  {run.output.alt_text ? (
                    <p className="text-xs text-[#5E626C]">
                      <strong className="text-[#0F1115]">Texte alternatif :</strong>{' '}
                      {run.output.alt_text}
                    </p>
                  ) : null}

                  {/* Section légende (si présente) — éditable + Refaire */}
                  {run.output.legend ? (
                    <div className="mt-2 rounded-lg border border-[#D1FAE5] bg-[#ECFDF5]/60 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#064E3B]">
                          <MessageSquare className="h-3 w-3" /> Légende qui accompagne
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyText(draftLegend, 'Légende')}
                            disabled={!draftLegend}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#D1FAE5] bg-white px-2.5 py-1 text-xs font-medium text-[#064E3B] transition hover:bg-[#ECFDF5] disabled:opacity-50"
                          >
                            <Copy className="h-3 w-3" /> Copier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddLegend({ force: true })}
                            disabled={isAddingLegend || isPending || isSavingLegend}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#D1FAE5] bg-white px-2.5 py-1 text-xs font-medium text-[#064E3B] transition hover:bg-[#ECFDF5] disabled:opacity-50"
                          >
                            {isAddingLegend ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}{' '}
                            Refaire la légende
                          </button>
                          {isEditable ? (
                            <button
                              type="button"
                              onClick={handleSaveLegend}
                              disabled={
                                isSavingLegend ||
                                isPending ||
                                isAddingLegend ||
                                draftLegend === (run.output?.legend ?? '')
                              }
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#0F1115] px-2.5 py-1 text-xs font-medium text-white transition disabled:opacity-50"
                            >
                              {isSavingLegend ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : null}
                              Enregistrer
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {isEditable ? (
                        <textarea
                          value={draftLegend}
                          onChange={(e) => setDraftLegend(e.target.value)}
                          className="block min-h-[140px] w-full resize-y rounded-md border border-[#D1FAE5] bg-white p-3 font-sans text-sm leading-relaxed text-[#0F1115] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                          placeholder="La légende qui accompagne ton visuel…"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#0F1115]">
                          {draftLegend}
                        </pre>
                      )}
                    </div>
                  ) : null}

                  {isAddingLegend ? (
                    <p className="inline-flex items-center gap-2 text-xs text-[#5E626C]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      On rédige la légende qui matche…
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm italic text-[#5E626C]">
                  Aucun visuel pour le moment.
                </p>
              )
            ) : isEditable ? (
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="block min-h-[480px] w-full resize-y rounded-lg border border-[#E4E7E2] bg-[#F7F5EF]/30 p-4 font-mono text-sm leading-relaxed text-[#0F1115] focus:border-[#10B981] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                placeholder="Le contenu apparaîtra ici dès que l'atelier l'aura fabriqué…"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#0F1115]">
                {run.output?.content ?? 'Aucun contenu.'}
              </pre>
            )}

            {/* Hashtags si fournis (cas non-pack) — pour ne pas dupliquer dans le pack */}
            {!isPostPack &&
            run.output.hashtags &&
            run.output.hashtags.length > 0 ? (
              <div className="mt-4 border-t border-[#E4E7E2] pt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                  Hashtags suggérés
                </p>
                <div className="flex flex-wrap gap-2">
                  {run.output.hashtags.map((h) => (
                    <span
                      key={h}
                      className="rounded-md bg-[#ECFDF5] px-2 py-1 text-xs text-[#064E3B]"
                    >
                      #{h}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Stats si dispo */}
            {run.output.metadata && Object.keys(run.output.metadata).length > 0 ? (
              <div className="mt-4 border-t border-[#E4E7E2] pt-4">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
                  Stats
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#5E626C] sm:grid-cols-3">
                  {Object.entries(run.output.metadata)
                    .filter(([k]) => !HIDDEN_STAT_KEYS.has(k))
                    .map(([key, value]) => (
                      <div key={key}>
                        <span className="text-[#0F1115]">
                          {formatStatLabel(key)} :
                        </span>{' '}
                        {String(value).slice(0, 100)}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Section Publications déjà faites */}
      <PublicationsList
        runId={run.id}
        refreshKey={publicationsRefreshKey}
        onRetry={() => setPublishOpen(true)}
      />

      {/* Modal Publier multi-plateformes */}
      <PublishDialog
        runId={run.id}
        runType={run.type}
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onPublished={handlePublishCompleted}
      />
    </div>
  )
}

function BriefRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5E626C]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#0F1115]">
        {value && value.length > 0 ? value : (
          <span className="italic text-[#A8ACB5]">non précisé</span>
        )}
      </dd>
    </div>
  )
}

function formatStatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
}

/**
 * Compose le texte à mettre dans le presse-papier pour un pack post :
 * contenu + saut de ligne + hashtags préfixés #.
 */
function buildPostCopyText(run: SparkexecuteRun): string {
  const body = run.output?.content?.trim() ?? ''
  const tags = run.output?.hashtags ?? []
  if (tags.length === 0) return body
  const tagLine = tags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
  return `${body}\n\n${tagLine}`
}

/**
 * Retire d'un bloc de caption les hashtags qui auraient été glissés en queue
 * de texte par le générateur (cas du post Instagram). On compare aux hashtags
 * officiels (output.hashtags) et on dégage les lignes finales qui sont en
 * réalité des listes de #tag. Pas de regex agressive : on s'arrête dès qu'on
 * trouve une ligne non-vide qui n'est pas une chaîne de hashtags.
 */
function stripTrailingHashtags(content: string, knownTags: string[]): string {
  const trimmed = content.trimEnd()
  if (!trimmed) return ''
  if (knownTags.length === 0) return trimmed

  const lines = trimmed.split('\n')
  while (lines.length > 0) {
    const last = lines[lines.length - 1]?.trim() ?? ''
    if (last.length === 0) {
      lines.pop()
      continue
    }
    // Ligne 100% hashtags ?
    const tokens = last.split(/\s+/).filter(Boolean)
    const allHash = tokens.length > 0 && tokens.every((t) => t.startsWith('#'))
    if (allHash) {
      lines.pop()
      continue
    }
    break
  }
  return lines.join('\n').trimEnd()
}
