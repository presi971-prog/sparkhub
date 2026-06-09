/**
 * Publication PROGRAMMÉE d'articles de blog (SparkExecute).
 *
 * Pourquoi ce module : le blog GHL ne connaît que DRAFT / PUBLISHED, il n'a pas
 * de "date de publication future" native. SparkExecute prend donc ce rôle :
 * les articles sont créés en brouillon, on leur associe une date, et un passage
 * quotidien (le cron déjà existant /api/content-machine/generate-daily) fait
 * passer en PUBLISHED ceux dont la date est arrivée.
 *
 * Avantage vs un script local : ça tourne dans le cloud (Vercel cron), donc même
 * si la machine de l'utilisateur est éteinte.
 *
 * Idempotent : on lit la liste des posts déjà publiés (GET /blogs/posts/all ne
 * renvoie QUE les publiés) et on saute ceux qui le sont déjà. Rejouer le cron
 * plusieurs fois ne republie jamais en double.
 *
 * R0 : pas d'<img> hero dans le rawHTML (l'en-tête passe par imageUrl) — déjà
 * garanti à la génération du payload (cf scheduled-blog.config.ts).
 */

import { ghlFetch, GHL_DCGAI_LOCATION_ID } from './ghl-client'
import {
  SCHEDULED_BLOG_POSTS,
  type ScheduledBlogEntry,
} from '../scheduled-blog.config'

const DCGAI_BLOG_ID = 'SBVkGP26oyLg4Mikwe4d'

export interface ScheduledPublishItem {
  name: string
  slug: string
  date: string
  postId: string
  url: string
  status: 'published' | 'would_publish' | 'already_published' | 'pending' | 'error'
  error?: string
}

export interface ScheduledPublishSummary {
  today: string
  dryRun: boolean
  publishedNow: ScheduledPublishItem[]
  wouldPublish: ScheduledPublishItem[]
  alreadyPublished: ScheduledPublishItem[]
  pending: ScheduledPublishItem[]
  errors: ScheduledPublishItem[]
}

interface BlogListResponse {
  blogs?: Array<{ _id?: string; urlSlug?: string; status?: string }>
  posts?: Array<{ _id?: string; urlSlug?: string; status?: string }>
  data?: Array<{ _id?: string; urlSlug?: string; status?: string }>
}

const publicUrl = (slug: string) => `https://digital-code-growth.com/post/${slug}`

/** Date du jour au format YYYY-MM-DD en UTC. */
function todayUtc(reference?: string): string {
  if (reference && /^\d{4}-\d{2}-\d{2}$/.test(reference)) return reference
  return new Date().toISOString().slice(0, 10)
}

/** Récupère les slugs des posts déjà PUBLISHED (les DRAFT ne sont pas listés). */
async function fetchPublishedSlugs(): Promise<Set<string>> {
  const res = await ghlFetch<BlogListResponse>(
    `/blogs/posts/all?locationId=${GHL_DCGAI_LOCATION_ID}&blogId=${DCGAI_BLOG_ID}&limit=50&offset=0`,
  )
  const list = res.blogs ?? res.posts ?? res.data ?? []
  const slugs = new Set<string>()
  for (const p of list) {
    if (p.urlSlug) slugs.add(p.urlSlug)
  }
  return slugs
}

/** Notification Telegram best-effort (silencieuse si non configurée). */
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
    // best-effort : une notif ratée ne doit jamais bloquer la publication.
  }
}

const toItem = (
  e: ScheduledBlogEntry,
  status: ScheduledPublishItem['status'],
  error?: string,
): ScheduledPublishItem => ({
  name: e.name,
  slug: e.slug,
  date: e.date,
  postId: e.postId,
  url: publicUrl(e.slug),
  status,
  ...(error ? { error } : {}),
})

/**
 * Fait passer en ligne les articles dont la date est arrivée.
 *
 * @param opts.referenceDate  Force la date "du jour" (YYYY-MM-DD) — sert aux tests.
 * @param opts.dryRun         Si true, ne publie rien : renvoie seulement ce qui
 *                            SERAIT publié. Sert à vérifier sans effet de bord.
 */
export async function publishDueScheduledBlogPosts(
  opts: { referenceDate?: string; dryRun?: boolean } = {},
): Promise<ScheduledPublishSummary> {
  const today = todayUtc(opts.referenceDate)
  const dryRun = opts.dryRun ?? false

  const summary: ScheduledPublishSummary = {
    today,
    dryRun,
    publishedNow: [],
    wouldPublish: [],
    alreadyPublished: [],
    pending: [],
    errors: [],
  }

  const publishedSlugs = await fetchPublishedSlugs()

  for (const entry of SCHEDULED_BLOG_POSTS) {
    // Déjà en ligne → on saute (idempotence).
    if (publishedSlugs.has(entry.slug)) {
      summary.alreadyPublished.push(toItem(entry, 'already_published'))
      continue
    }
    // Date pas encore arrivée → en attente.
    if (entry.date > today) {
      summary.pending.push(toItem(entry, 'pending'))
      continue
    }
    // Due et pas encore publié.
    if (dryRun) {
      summary.wouldPublish.push(toItem(entry, 'would_publish'))
      continue
    }
    try {
      // publishedAt OBLIGATOIRE : sans lui, le thème du blog affiche
      // "Publié le NaN/NaN/NaN" (le champ date est vide). On le met au
      // moment réel de la publication.
      await ghlFetch(`/blogs/posts/${entry.postId}`, {
        method: 'PUT',
        body: {
          ...entry.payload,
          status: 'PUBLISHED',
          publishedAt: new Date().toISOString(),
        },
      })
      const item = toItem(entry, 'published')
      summary.publishedNow.push(item)
      await notify(
        `✅ DCG AI — nouvel article en ligne :\n\n${String(entry.payload.title ?? entry.name)}\n${item.url}`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      summary.errors.push(toItem(entry, 'error', message))
    }
  }

  return summary
}
