/**
 * Validation Telegram des articles de blog Concours SPP : Thierry tape sur le
 * lien ✅ Publier ou ❌ Rejeter reçu sur Telegram, ce endpoint bascule le
 * brouillon côté site Concours SPP (external-set-status, secret partagé) et
 * met à jour cm_contents. Réponse = petite page HTML lisible sur téléphone.
 * Jeton signé par article et par action (voir blog-validation.ts), idempotent.
 */

import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { blogValidationToken } from '@/lib/content-machine/blog-validation'

const CONCOURS_SPP_BASE = 'https://concours-spp.digital-code-growth.com'

function htmlPage(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:480px;margin:15vh auto 0;padding:0 20px;text-align:center;color:#1a1a1a}h1{font-size:1.4rem}p{color:#555;line-height:1.5}a{color:#B91C1C}</style>
</head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const contentId = url.searchParams.get('content')
  const action = url.searchParams.get('action')
  const token = url.searchParams.get('token')

  if (!contentId || (action !== 'publish' && action !== 'reject') || !token) {
    return htmlPage('Lien invalide', 'Il manque un paramètre dans ce lien.', 400)
  }
  if (token !== blogValidationToken(contentId, action)) {
    return htmlPage('Lien invalide', 'Ce lien de validation n’est pas reconnu.', 401)
  }

  const supabase = createAdminSupabase()
  const { data: row, error } = await supabase
    .from('cm_contents')
    .select('id, status, push_results')
    .eq('id', contentId)
    .maybeSingle()

  if (error || !row) {
    return htmlPage('Article introuvable', 'Cet article n’existe pas (ou plus) dans la machine.', 404)
  }

  const blog = (row.push_results ?? {}).blog as { post_id?: number; url?: string } | undefined
  if (!blog?.post_id) {
    return htmlPage('Article incomplet', 'Aucun brouillon lié à cette entrée : rien à valider.', 409)
  }

  // Idempotence : re-taper un lien déjà traité ne refait rien.
  if (row.status === 'approved' && action === 'publish') {
    return htmlPage('Déjà publié ✅', `Cet article est déjà en ligne : <a href="${blog.url}">${blog.url}</a>`)
  }
  if (row.status === 'rejected' && action === 'reject') {
    return htmlPage('Déjà rejeté ❌', 'Cet article était déjà rejeté, il reste en brouillon.')
  }

  const secret = process.env.CONCOURS_SPP_PUBLISH_SECRET
  if (!secret) {
    return htmlPage('Erreur de configuration', 'CONCOURS_SPP_PUBLISH_SECRET manquant côté machine.', 500)
  }

  const targetStatus = action === 'publish' ? 'published' : 'draft'
  const res = await fetch(`${CONCOURS_SPP_BASE}/api/blog/external-set-status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-publish-secret': secret },
    body: JSON.stringify({ id: blog.post_id, status: targetStatus }),
    signal: AbortSignal.timeout(30_000),
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok) {
    return htmlPage(
      'Échec côté site',
      `Le site Concours SPP a répondu ${res.status} : ${data.error ?? 'erreur inconnue'}. Réessaie dans une minute.`,
      502,
    )
  }

  const now = new Date().toISOString()
  await supabase
    .from('cm_contents')
    .update(
      action === 'publish'
        ? {
            status: 'approved',
            approved_at: now,
            pushed_at: now,
            push_results: { blog: { ...blog, url: data.url ?? blog.url, validated: 'published' } },
          }
        : { status: 'rejected', push_results: { blog: { ...blog, validated: 'rejected' } } },
    )
    .eq('id', contentId)

  if (action === 'publish') {
    const liveUrl = data.url ?? blog.url ?? ''
    return htmlPage('Article publié ✅', `Il est en ligne : <a href="${liveUrl}">${liveUrl}</a>`)
  }
  return htmlPage('Article rejeté ❌', 'Il reste en brouillon sur le site, rien n’a été publié.')
}
