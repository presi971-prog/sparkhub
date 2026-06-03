'use client'

/**
 * Modal "Publier" multi-plateformes (SparkExecute V1.1).
 *
 * Comportement :
 *  - Au mount : appelle GET /api/sparkexecute/social-accounts pour savoir
 *    quels comptes RS sont connectés dans GHL.
 *  - Affiche la liste des plateformes pertinentes selon `runType` :
 *      - article_seo / article_long / article_court / faq → ghl_blog
 *      - post_linkedin → linkedin (+ option facebook + google_business)
 *      - post_instagram → instagram (+ option facebook)
 *      - hooks_pub / visual → désactivé (l'image doit être attachée à un post)
 *  - Pour chaque plateforme : checkbox + état du compte ("connecté" / "non
 *    connecté avec lien vers GHL").
 *  - Bouton "Publier maintenant" en bas.
 *  - Pendant publication : loading state global avec progression par plateforme.
 *  - À la fin : récap "✅ LinkedIn" / "❌ Instagram (erreur)" + lien "Voir le post".
 *
 * R0 langage simple : "Publier maintenant", "Compte connecté", "Connecte ton
 * compte LinkedIn dans GHL", "Erreur — réessaie".
 */

import { CheckCircle2, ExternalLink, Loader2, Send, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  PublishPlatform,
  RunType,
  SocialPlatform,
} from '@/lib/sparkexecute/types'

interface PublishDialogProps {
  runId: string
  runType: RunType
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Appelé après une publication réussie pour rafraîchir le parent. */
  onPublished?: () => void
}

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

interface PublicationApiResult {
  platform: PublishPlatform
  status: 'pending' | 'published' | 'scheduled' | 'failed'
  publication_id?: string
  external_id?: string | null
  external_url?: string | null
  error?: string
}

interface PlatformConfig {
  platform: PublishPlatform
  label: string
  primary: boolean // par défaut coché
  socialAccount?: SocialPlatform // si === undefined, c'est le blog (pas de compte à connecter)
}

/** Mapping type de run → plateformes disponibles. */
function getAvailablePlatforms(runType: RunType): PlatformConfig[] {
  switch (runType) {
    case 'article_seo':
    case 'article_long':
    case 'article_court':
    case 'faq':
      return [{ platform: 'ghl_blog', label: 'Blog DCG AI', primary: true }]

    case 'post_linkedin':
      return [
        {
          platform: 'linkedin',
          label: 'LinkedIn',
          primary: true,
          socialAccount: 'linkedin',
        },
        {
          platform: 'facebook',
          label: 'Facebook',
          primary: false,
          socialAccount: 'facebook',
        },
        {
          platform: 'google_business',
          label: 'Google Business Profile',
          primary: false,
          socialAccount: 'google_business',
        },
      ]

    case 'post_instagram':
      return [
        {
          platform: 'instagram',
          label: 'Instagram',
          primary: true,
          socialAccount: 'instagram',
        },
        {
          platform: 'facebook',
          label: 'Facebook',
          primary: false,
          socialAccount: 'facebook',
        },
      ]

    case 'hooks_pub':
    case 'visual':
    case 'page_accueil':
    case 'schema_markup':
    default:
      return []
  }
}

export function PublishDialog({
  runId,
  runType,
  open,
  onOpenChange,
  onPublished,
}: PublishDialogProps) {
  const availablePlatforms = useMemo(() => getAvailablePlatforms(runType), [runType])

  const [accounts, setAccounts] = useState<AccountsByPlatform>({})
  const [pitConfigured, setPitConfigured] = useState<boolean>(true)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [accountsLoading, setAccountsLoading] = useState<boolean>(true)

  // Plateformes cochées (défaut : celles primary).
  const [selected, setSelected] = useState<Set<PublishPlatform>>(new Set())

  const [publishing, setPublishing] = useState<boolean>(false)
  const [results, setResults] = useState<PublicationApiResult[] | null>(null)

  // Init cocher les "primary" quand on ouvre le modal.
  useEffect(() => {
    if (!open) return
    const initial = new Set<PublishPlatform>()
    for (const p of availablePlatforms) {
      if (p.primary) initial.add(p.platform)
    }
    setSelected(initial)
    setResults(null)
  }, [open, availablePlatforms])

  // Fetch des comptes connectés.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setAccountsLoading(true)
    setAccountsError(null)
    fetch('/api/sparkexecute/social-accounts', { cache: 'no-store' })
      .then((res) => res.json() as Promise<AccountsApiResponse>)
      .then((data) => {
        if (cancelled) return
        setAccounts(data.accounts ?? {})
        setPitConfigured(data.pit_configured)
        if (data.error) setAccountsError(data.error)
      })
      .catch(() => {
        if (cancelled) return
        setAccountsError('Impossible de lire les comptes connectés. Réessaie dans un instant.')
      })
      .finally(() => {
        if (!cancelled) setAccountsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const togglePlatform = useCallback(
    (platform: PublishPlatform) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(platform)) next.delete(platform)
        else next.add(platform)
        return next
      })
    },
    [],
  )

  const isPlatformReady = useCallback(
    (cfg: PlatformConfig): boolean => {
      if (cfg.platform === 'ghl_blog') return pitConfigured
      if (!cfg.socialAccount) return false
      const connected = accounts[cfg.socialAccount] ?? []
      return connected.length > 0
    },
    [accounts, pitConfigured],
  )

  const canPublish = useMemo(() => {
    if (selected.size === 0) return false
    for (const p of selected) {
      const cfg = availablePlatforms.find((c) => c.platform === p)
      if (!cfg) return false
      if (!isPlatformReady(cfg)) return false
    }
    return true
  }, [selected, availablePlatforms, isPlatformReady])

  async function handlePublish() {
    if (!canPublish || publishing) return
    setPublishing(true)
    setResults(null)

    // Construit accountIds mapping. Préfère le compte DCG AI dédié (filtré par nom).
    // Fallback : 1er compte connecté de la plateforme.
    const DCG_AI_PREFERRED_NAMES: Partial<Record<SocialPlatform, string>> = {
      linkedin: 'Digital Code Growth',
      facebook: 'DCG AI',
      instagram: 'dcg.ai',
      google_business: 'Digital Code Growth',
    }
    const accountIds: Partial<Record<SocialPlatform, string[]>> = {}
    for (const p of selected) {
      if (p === 'ghl_blog') continue
      const list = accounts[p as SocialPlatform] ?? []
      if (list.length === 0) continue
      const preferredName = DCG_AI_PREFERRED_NAMES[p as SocialPlatform]
      const preferred = preferredName
        ? list.find((a) => a.name === preferredName)
        : undefined
      const chosen = preferred ?? list[0]
      accountIds[p as SocialPlatform] = [chosen.id]
    }

    try {
      const res = await fetch(`/api/sparkexecute/runs/${runId}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          platforms: Array.from(selected),
          options: {
            accountIds,
          },
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { publications: PublicationApiResult[] }
      setResults(data.publications)

      const okCount = data.publications.filter(
        (r) => r.status === 'published' || r.status === 'scheduled',
      ).length
      const failCount = data.publications.filter((r) => r.status === 'failed').length

      if (okCount > 0 && failCount === 0) {
        toast.success(`Publié sur ${okCount} plateforme(s).`)
      } else if (okCount > 0 && failCount > 0) {
        toast.warning(`${okCount} OK, ${failCount} en erreur.`)
      } else {
        toast.error('Aucune publication n\'a réussi. Vérifie le détail.')
      }

      if (okCount > 0) onPublished?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(`Publication impossible. ${msg}`)
    } finally {
      setPublishing(false)
    }
  }

  // Si on ne peut rien publier pour ce type de run, on l'annonce clairement.
  if (availablePlatforms.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publication directe indisponible</DialogTitle>
            <DialogDescription>
              Ce type de livrable ne se publie pas tout seul. Tu peux le copier et
              l&apos;intégrer manuellement dans ta campagne (Meta Ads, Google Ads, etc.).
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[#0F1115]">Publier ton livrable</DialogTitle>
          <DialogDescription>
            Choisis où tu veux publier. On envoie tout en 1 clic.
          </DialogDescription>
        </DialogHeader>

        {/* PIT GHL manquant — bloquant */}
        {!pitConfigured ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Le compte GHL n&apos;est pas configuré côté serveur. Préviens
            l&apos;équipe technique pour activer la clé GHL_DCGAI_PIT.
          </div>
        ) : null}

        {/* Liste des plateformes */}
        <div className="space-y-2">
          {availablePlatforms.map((cfg) => {
            const ready = isPlatformReady(cfg)
            const isSelected = selected.has(cfg.platform)
            const isBlog = cfg.platform === 'ghl_blog'
            const connectedAccount = cfg.socialAccount
              ? (accounts[cfg.socialAccount] ?? [])[0]
              : null

            return (
              <label
                key={cfg.platform}
                className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                  isSelected
                    ? 'border-[#10B981]/60 bg-[#ECFDF5]/40'
                    : 'border-[#E4E7E2] bg-white'
                } ${ready ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!ready || publishing}
                  onChange={() => togglePlatform(cfg.platform)}
                  className="mt-1 h-4 w-4 rounded border-[#E4E7E2] text-[#10B981] focus:ring-[#10B981]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[#0F1115]">
                      {cfg.label}
                    </span>
                    {accountsLoading && cfg.socialAccount ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#5E626C]">
                        <Loader2 className="h-3 w-3 animate-spin" /> Vérification…
                      </span>
                    ) : ready ? (
                      <span className="inline-flex items-center gap-1 text-xs text-[#064E3B]">
                        <CheckCircle2 className="h-3 w-3" />
                        {isBlog ? 'Prêt' : 'Compte connecté'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#A1432D]">
                        <XCircle className="h-3 w-3" /> Compte non connecté
                      </span>
                    )}
                  </div>
                  {connectedAccount ? (
                    <p className="mt-0.5 text-xs text-[#5E626C]">
                      Compte : {connectedAccount.name}
                    </p>
                  ) : null}
                  {!ready && cfg.socialAccount ? (
                    <p className="mt-1 text-xs text-[#5E626C]">
                      Connecte ce compte dans{' '}
                      <a
                        href="https://app.gohighlevel.com/v2/marketing/social-planner"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0F1115] underline"
                      >
                        GHL Social Planner
                      </a>
                      .
                    </p>
                  ) : null}
                </div>
              </label>
            )
          })}
        </div>

        {accountsError ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {accountsError}
          </div>
        ) : null}

        {/* Résultats de publication (si on vient d'en faire une) */}
        {results && results.length > 0 ? (
          <div className="space-y-2 rounded-md border border-[#E4E7E2] bg-[#F5F6F4]/50 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5E626C]">
              Résultat
            </p>
            {results.map((r) => (
              <div
                key={`${r.platform}-${r.publication_id ?? Math.random()}`}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  {r.status === 'published' || r.status === 'scheduled' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[#A1432D]" />
                  )}
                  <span className="font-medium text-[#0F1115]">{platformLabel(r.platform)}</span>
                  {r.status === 'scheduled' ? (
                    <span className="text-xs text-[#5E626C]">(programmé)</span>
                  ) : null}
                </div>
                <div className="text-right">
                  {r.external_url ? (
                    <a
                      href={r.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#0F1115] underline"
                    >
                      Voir le post <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                  {r.error ? (
                    <p className="text-xs text-[#A1432D]">{r.error}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={publishing}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#E4E7E2] bg-white px-4 text-sm font-medium text-[#5E626C] transition hover:bg-[#F5F6F4] disabled:opacity-60"
          >
            {results ? 'Fermer' : 'Annuler'}
          </button>
          {!results ? (
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish || publishing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_6px_14px_-6px_rgba(16,185,129,0.5)] transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
              }}
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publier maintenant
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function platformLabel(platform: PublishPlatform): string {
  switch (platform) {
    case 'ghl_blog':
      return 'Blog DCG AI'
    case 'linkedin':
      return 'LinkedIn'
    case 'instagram':
      return 'Instagram'
    case 'facebook':
      return 'Facebook'
    case 'google_business':
      return 'Google Business'
    case 'youtube':
      return 'YouTube'
    case 'tiktok':
      return 'TikTok'
    case 'threads':
      return 'Threads'
    default:
      return platform
  }
}
