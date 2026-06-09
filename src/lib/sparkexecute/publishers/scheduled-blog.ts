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
 * Idempotence : on vérifie si la PAGE PUBLIQUE de l'article répond déjà (HTTP
 * 200 = déjà publié, 404 = encore brouillon) et on saute ceux déjà en ligne.
 * (On n'utilise PAS GET /blogs/posts/all : cet endpoint renvoie 0 sur ce blog,
 * il est inutilisable pour détecter les publiés.)
 *
 * R0 : pas d'<img> hero dans le rawHTML (l'en-tête passe par imageUrl) — déjà
 * garanti à la génération du payload (cf scheduled-blog.config.ts). Et on envoie
 * TOUJOURS `publishedAt`, sinon le thème blog affiche "Publié le NaN/NaN/NaN".
 */

import { ghlFetch } from './ghl-client'
import {
  SCHEDULED_BLOG_POSTS,
  type ScheduledBlogEntry,
} from '../scheduled-blog.config'

const PUBLIC_BASE = 'https://digital-code-growth.com/post/'

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

const publicUrl = (slug: string) => `${PUBLIC_BASE}${slug}`

/** Date du jour au format YYYY-MM-DD en UTC. */
function todayUtc(reference?: string): string {
  if (reference && /^\d{4}-\d{2}-\d{2}$/.test(reference)) return reference
  return new Date().toISOString().slice(0, 10)
}

/**
 * Vérifie si un article est DÉJÀ publié en regardant sa page publique.
 * 200 = en ligne (publié) ; 404 = pas encore (brouillon). Fiable et sans
 * dépendre de l'API liste GHL (cassée sur ce blog).
 */
async function isPublished(slug: string): Promise<boolean> {
  try {
    const res = await fetch(publicUrl(slug), { method: 'GET', cache: 'no-store' })
    return res.status === 200
  } catch {
    // En cas de doute réseau, on répond "pas publié" : au pire on re-tente la
    // publication (idempotent côté GHL), jamais de doublon visible.
    return false
  }
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

  for (const entry of SCHEDULED_BLOG_POSTS) {
    // Date pas encore arrivée → en attente, rien à vérifier.
    if (entry.date > today) {
      summary.pending.push(toItem(entry, 'pending'))
      continue
    }
    // Date arrivée : déjà en ligne ? (idempotence via page publique)
    if (await isPublished(entry.slug)) {
      summary.alreadyPublished.push(toItem(entry, 'already_published'))
      continue
    }
    // Due et pas encore publié.
    if (dryRun) {
      summary.wouldPublish.push(toItem(entry, 'would_publish'))
      continue
    }
    try {
      // publishedAt OBLIGATOIRE : sans lui, le thème affiche "Publié le NaN".
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
