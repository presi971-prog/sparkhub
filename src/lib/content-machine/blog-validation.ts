/**
 * Validation Telegram des articles de blog Concours SPP (décision 20/07/2026,
 * suite à l'incident « dissertation » du 18/07) : la machine publie l'article
 * en BROUILLON sur le site, envoie le texte complet sur Telegram avec deux
 * liens signés (Publier / Rejeter), et l'article ne passe en ligne que quand
 * Thierry tape sur Publier. Aucune lecture des réponses Telegram (pas de
 * getUpdates : d'autres systèmes consomment déjà ce bot) : tout passe par les
 * liens, traités par /api/content-machine/blog-validate.
 */

import { createHash } from 'crypto'

/** Domaine live de la triade SparkGrowth (branche spark-compta-setup). */
export const SPARKGROWTH_BASE = 'https://sparkgrowth.digital-code-growth.com'

export type BlogValidationAction = 'publish' | 'reject'

/**
 * Jeton signé par article ET par action : le secret (CRON_SECRET) n'apparaît
 * jamais dans l'URL, et un lien « Rejeter » ne peut pas servir à publier.
 */
export function blogValidationToken(contentId: string, action: BlogValidationAction): string {
  const secret = process.env.CRON_SECRET ?? ''
  return createHash('sha256')
    .update(`${secret}:${contentId}:${action}`)
    .digest('hex')
    .slice(0, 32)
}

export function blogValidationUrl(contentId: string, action: BlogValidationAction): string {
  const token = blogValidationToken(contentId, action)
  return `${SPARKGROWTH_BASE}/api/content-machine/blog-validate?content=${contentId}&action=${action}&token=${token}`
}

/** Envoi Telegram simple (même bot/chat que le digest de 6h GP). */
export async function sendTelegramText(text: string): Promise<{ ok: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!botToken || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant' }
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (!r.ok) {
      return { ok: false, error: `Telegram HTTP ${r.status}: ${(await r.text()).slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau Telegram' }
  }
}

/**
 * Envoie l'article complet sur Telegram (découpé sous la limite des 4096
 * caractères) puis le message de validation avec les deux liens.
 */
export async function sendBlogValidationRequest(
  contentId: string,
  title: string,
  markdown: string,
): Promise<{ ok: boolean; error?: string }> {
  const CHUNK = 3500
  const chunks: string[] = []
  for (let i = 0; i < markdown.length; i += CHUNK) {
    chunks.push(markdown.slice(i, i + CHUNK))
  }

  for (let i = 0; i < chunks.length; i++) {
    const header =
      chunks.length > 1
        ? `📝 BLOG SPP À VALIDER (${i + 1}/${chunks.length}) — ${title}`
        : `📝 BLOG SPP À VALIDER — ${title}`
    const r = await sendTelegramText(`${header}\n\n${chunks[i]}`)
    if (!r.ok) return r
  }

  return sendTelegramText(
    `Valider « ${title} » ?\n\n` +
      `✅ PUBLIER :\n${blogValidationUrl(contentId, 'publish')}\n\n` +
      `❌ REJETER (reste en brouillon) :\n${blogValidationUrl(contentId, 'reject')}`,
  )
}
