/**
 * Publication PROGRAMMÉE des carrousels éducatifs (SparkExecute).
 *
 * Pourquoi ce module : GHL n'accepte PAS de programmer un carrousel multi-images.
 * Avec `status:"scheduled"`, GHL écrase le carrousel à 1 SEULE image (vérifié le
 * 13/06). En revanche, une publication IMMÉDIATE préserve les 7 slides.
 *
 * Solution : on ne "programme" pas côté GHL. Un passage quotidien (le cron VPS
 * qui appelle déjà /api/sparkexecute/publish-scheduled) publie EN IMMÉDIAT le
 * carrousel dont la date est arrivée. Idempotent : on saute ceux déjà publiés.
 *
 * Sécurité : après publication, on relit le post et on compte les médias ; si
 * GHL a quand même écrasé à 1, on le signale dans la notif Telegram.
 */

import {
  SCHEDULED_CAROUSELS,
  type ScheduledCarouselEntry,
} from '../scheduled-carousels.config'
import { ghlFetch, GHL_DCGAI_LOCATION_ID } from './ghl-client'

export interface CarouselPublishItem {
  id: string
  date: string
  accountId: string
  status: 'published' | 'would_publish' | 'already_published' | 'pending' | 'error'
  mediaKept?: number
  error?: string
}

export interface CarouselPublishSummary {
  today: string
  dryRun: boolean
  publishedNow: CarouselPublishItem[]
  wouldPublish: CarouselPublishItem[]
  alreadyPublished: CarouselPublishItem[]
  pending: CarouselPublishItem[]
  errors: CarouselPublishItem[]
}

function todayUtc(reference?: string): string {
  if (reference && /^\d{4}-\d{2}-\d{2}$/.test(reference)) return reference
  return new Date().toISOString().slice(0, 10)
}

function getUserId(): string {
  const id = process.env.GHL_USER_ID
  if (!id) throw new Error('GHL_USER_ID manquant côté serveur.')
  return id
}

/** Notification Telegram best-effort. */
async function notify(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    /* best-effort */
  }
}

interface GhlPost {
  _id?: string
  id?: string
  status?: string
  summary?: string
  accountIds?: string[]
  media?: unknown[]
}

/** Récupère les posts existants (pour l'idempotence). */
async function fetchExistingPosts(): Promise<GhlPost[]> {
  const res = await ghlFetch<{ results?: { posts?: GhlPost[] }; posts?: GhlPost[] }>(
    `/social-media-posting/${GHL_DCGAI_LOCATION_ID}/posts/list`,
    { method: 'POST', body: { type: 'all', limit: '100', skip: '0' } },
  )
  return res?.results?.posts ?? res?.posts ?? []
}

/** Un carrousel est déjà publié si un post PUBLISHED existe sur ce compte avec le même début de légende. */
function isAlreadyPublished(entry: ScheduledCarouselEntry, existing: GhlPost[]): boolean {
  const head = entry.summary.slice(0, 30)
  return existing.some(
    (p) =>
      (p.accountIds ?? []).includes(entry.accountId) &&
      p.status === 'published' &&
      (p.summary ?? '').startsWith(head),
  )
}

const toItem = (
  e: ScheduledCarouselEntry,
  status: CarouselPublishItem['status'],
  extra: Partial<CarouselPublishItem> = {},
): CarouselPublishItem => ({
  id: e.id,
  date: e.date,
  accountId: e.accountId,
  status,
  ...extra,
})

/**
 * Publie EN IMMÉDIAT les carrousels dont la date est arrivée (1 fois).
 */
export async function publishDueCarousels(
  opts: { referenceDate?: string; dryRun?: boolean } = {},
): Promise<CarouselPublishSummary> {
  const today = todayUtc(opts.referenceDate)
  const dryRun = opts.dryRun ?? false

  const summary: CarouselPublishSummary = {
    today,
    dryRun,
    publishedNow: [],
    wouldPublish: [],
    alreadyPublished: [],
    pending: [],
    errors: [],
  }

  const due = SCHEDULED_CAROUSELS.filter((e) => e.date <= today)
  if (due.length === 0) {
    for (const e of SCHEDULED_CAROUSELS) summary.pending.push(toItem(e, 'pending'))
    return summary
  }

  // Un seul appel liste pour l'idempotence de tout le lot.
  let existing: GhlPost[] = []
  try {
    existing = await fetchExistingPosts()
  } catch {
    existing = []
  }

  for (const entry of SCHEDULED_CAROUSELS) {
    if (entry.date > today) {
      summary.pending.push(toItem(entry, 'pending'))
      continue
    }
    if (isAlreadyPublished(entry, existing)) {
      summary.alreadyPublished.push(toItem(entry, 'already_published'))
      continue
    }
    if (dryRun) {
      summary.wouldPublish.push(toItem(entry, 'would_publish'))
      continue
    }
    try {
      // IMMÉDIAT : scheduleDate = maintenant, AUCUN status → GHL publie tout de
      // suite et PRÉSERVE les slides du carrousel.
      const body = {
        type: 'post',
        accountIds: [entry.accountId],
        userId: getUserId(),
        summary: entry.summary,
        media: entry.media.map((url) => ({ url, type: 'image/png' })),
        scheduleDate: new Date().toISOString(),
      }
      const resp = await ghlFetch<{ data?: GhlPost } & GhlPost>(
        `/social-media-posting/${GHL_DCGAI_LOCATION_ID}/posts`,
        { method: 'POST', body },
      )
      const postId = resp?.data?._id ?? resp?.data?.id ?? resp?._id ?? resp?.id

      // Vérif anti-écrasement : relire le nombre de médias réellement gardés.
      let mediaKept = entry.media.length
      if (postId) {
        try {
          const detail = await ghlFetch<{ results?: { post?: GhlPost } } & GhlPost>(
            `/social-media-posting/${GHL_DCGAI_LOCATION_ID}/posts/${postId}`,
            { method: 'GET' },
          )
          const post = detail?.results?.post ?? detail
          mediaKept = (post?.media ?? []).length
        } catch {
          /* la vérif ne doit pas bloquer */
        }
      }

      const item = toItem(entry, 'published', { mediaKept })
      summary.publishedNow.push(item)
      const warn =
        mediaKept < entry.media.length
          ? ` ⚠️ ATTENTION : ${mediaKept}/${entry.media.length} slides gardées seulement`
          : ` (${mediaKept} slides ✅)`
      await notify(`📣 DCG AI — carrousel publié : ${entry.id}${warn}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      summary.errors.push(toItem(entry, 'error', { error: message }))
    }
  }

  return summary
}
