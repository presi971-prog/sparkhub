/**
 * Publisher Concours SPP — publie un article sur le BLOG du site Concours SPP
 * (projet-B), via son endpoint machine-à-machine sécurisé par secret partagé.
 *
 * Contrairement au publisher GHL (DCG AI), le blog Concours SPP rend du
 * MARKDOWN (react-markdown + remark-gfm) : on lui envoie donc le markdown brut,
 * pas du HTML. On retire juste le H1 (le titre est affiché à part) et le bloc
 * Schema JSON-LD (la page Concours SPP génère le sien).
 *
 * Par sécurité (public d'experts), on publie en BROUILLON par défaut : Thierry
 * relit dans l'admin avant la mise en ligne.
 */

import type { SparkexecuteRun } from '../types'

const CONCOURS_SPP_BASE = 'https://concours-spp.digital-code-growth.com'

export interface PublishConcoursSppOptions {
  /** 'published' pour mettre en ligne directement, sinon 'draft' (défaut). */
  status?: 'draft' | 'published'
  /** Catégorie blog Concours SPP. Défaut 'conseil'. */
  category?: 'actualite' | 'conseil' | 'reglementation' | 'formation'
  /** Code formation ciblé (ex: 'caporal_externe'). Optionnel. */
  formationCode?: string
  tags?: string[]
}

export interface PublishConcoursSppResult {
  post_id: string
  post_url: string | null
  raw_response: unknown
}

/** Retire le bloc Schema.org ```json … ``` (la page SPP génère son propre JSON-LD). */
function stripSchemaJsonLd(markdown: string): string {
  return markdown
    .replace(/```json\s*\{[\s\S]*?"@context"[\s\S]*?\}\s*```/gi, '')
    .trim()
}

/** Extrait le 1er titre H1 markdown, et renvoie {title, body sans ce H1}. */
function splitH1(markdown: string): { title: string | null; body: string } {
  const lines = markdown.split('\n')
  const idx = lines.findIndex((l) => /^#\s+\S/.test(l))
  if (idx === -1) return { title: null, body: markdown }
  const title = lines[idx].replace(/^#\s+/, '').trim()
  lines.splice(idx, 1)
  return { title, body: lines.join('\n').trim() }
}

/** Premier paragraphe non-vide, tronqué, pour l'extrait. */
function firstParagraph(markdown: string, max = 200): string {
  const para = markdown
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('```') && !l.startsWith('|'))
  if (!para) return ''
  const clean = para.replace(/[*_>`#]/g, '').trim()
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}

export async function publishToConcoursSppBlog(
  run: SparkexecuteRun,
  options: PublishConcoursSppOptions = {},
): Promise<PublishConcoursSppResult> {
  const secret = process.env.CONCOURS_SPP_PUBLISH_SECRET
  if (!secret) {
    throw new Error(
      'CONCOURS_SPP_PUBLISH_SECRET manquant : impossible de publier sur le site Concours SPP.',
    )
  }

  const rawMarkdown = run.output?.content ?? ''
  const withoutSchema = stripSchemaJsonLd(rawMarkdown)
  const { title: h1, body } = splitH1(withoutSchema)
  const title = h1 ?? run.input_brief?.sujet?.trim() ?? 'Article sans titre'

  if (!body || body.trim().length < 50) {
    throw new Error('Le contenu de cet article est trop court pour être publié.')
  }

  const payload = {
    title,
    content: body,
    excerpt: firstParagraph(body),
    cover_image_url: run.output?.image_url ?? null,
    formation_code: options.formationCode ?? null,
    category: options.category ?? 'conseil',
    tags: options.tags ?? run.output?.hashtags ?? run.input_brief?.mots_cles ?? [],
    // Brouillon par défaut : relecture avant mise en ligne (public d'experts).
    status: options.status ?? 'draft',
  }

  const res = await fetch(`${CONCOURS_SPP_BASE}/api/blog/external-publish`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-publish-secret': secret,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  })

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    slug?: string
    url?: string
    error?: string
  }

  if (!res.ok || !data.id) {
    throw new Error(
      `Publication Concours SPP échouée (${res.status}) : ${data.error ?? 'réponse invalide'}`,
    )
  }

  return {
    post_id: data.id,
    post_url: data.url ?? (data.slug ? `${CONCOURS_SPP_BASE}/blog/${data.slug}` : null),
    raw_response: data,
  }
}
