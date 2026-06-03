/**
 * Publisher Blog GHL — publie un run SparkExecute (article_seo, article_long,
 * article_court, faq) sur le blog DCG AI via l'API GHL Blogs.
 *
 * Doc officielle : https://marketplace.gohighlevel.com/docs/ghl/blogs/
 *
 * R0 critique : NE JAMAIS mettre `<img>` hero au début du `rawHTML` quand
 * `imageUrl` est défini (sinon doublon visuel garanti sur le rendu blog
 * GHL). Cf. mémoire r0-ghl-blog-pas-de-hero-dans-rawhtml.md.
 *
 * R0 sécurité : le PIT GHL est lu côté serveur via ghl-client (jamais
 * exposé côté client).
 */

import {
  GHL_DCGAI_LOCATION_ID,
  GhlApiError,
  ghlFetch,
} from './ghl-client'
import {
  extractFirstParagraph,
  extractH1,
  markdownToHtml,
  slugify,
} from './markdown'
import type { SparkexecuteRun } from '../types'

/** Options de publication blog. */
export interface PublishBlogOptions {
  /** ID de la catégorie blog GHL (obtenu via GET /blogs/categories). */
  categoryId?: string

  /** ID de l'auteur GHL (obtenu via GET /blogs/authors). */
  authorId?: string

  /** Tags blog libres (string[]). */
  tags?: string[]

  /** Date de publication ISO (default: maintenant). */
  publishedAt?: string

  /** Si fourni, override le blog_id (sinon récupéré via GET /blogs/site/{locationId}/all). */
  blogId?: string
}

/** Résultat d'une publication blog réussie. */
export interface PublishBlogResult {
  post_id: string
  post_url?: string
  raw_response: unknown
}

/**
 * Publie un article (run SparkExecute) sur le blog DCG AI via GHL.
 *
 * Workflow :
 *  1) Si pas de blogId fourni, on récupère le premier blog de la location.
 *  2) On convertit le markdown du run en HTML propre.
 *  3) On POST /blogs/posts avec le payload structuré.
 *  4) On retourne post_id + post_url (si dispo).
 *
 * Throws GhlApiError si l'appel échoue (le caller gère le mapping en
 * publication 'failed' dans Supabase).
 */
export async function publishToGhlBlog(
  run: SparkexecuteRun,
  options: PublishBlogOptions = {},
): Promise<PublishBlogResult> {
  // 1) Récupère le blog cible.
  const blogId = options.blogId ?? (await resolveDefaultBlogId())

  // 2) Convertit le markdown → HTML.
  // On passe `stripH1: true` parce que GHL affiche déjà son propre H1
  // depuis le champ `title`. Garder le H1 dans le rawHTML créerait un
  // doublon visible sur la page de l'article.
  // R0 critique : on STRIP TOUT bloc Schema.org JSON-LD du markdown
  // AVANT conversion, puis on l'injecte proprement en `<script>` à la fin
  // du HTML. Évite définitivement le bug "Schema JSON-LD visible en
  // bloc noir".
  const rawMarkdownOriginal = run.output?.content ?? ''
  const { stripped: rawMarkdown, jsonLdScript } = stripSchemaJsonLd(rawMarkdownOriginal)
  let htmlContent = markdownToHtml(rawMarkdown, { stripH1: true })
  if (jsonLdScript) {
    htmlContent = htmlContent + '\n' + jsonLdScript
  }
  if (!htmlContent || htmlContent.trim().length < 50) {
    throw new Error(
      'Le contenu de cet article est trop court pour être publié.',
    )
  }

  // 3) Construit le payload.
  // R0 anti-doublon : on N'INSÈRE PAS d'image hero dans rawHTML, c'est
  // `imageUrl` qui s'en occupe côté GHL.
  // Pour le titre on prend d'abord le H1 du markdown (le VRAI titre
  // rédactionnel choisi par Claude), pas le sujet du brief qui est juste
  // une consigne de rédaction.
  const title =
    extractH1(rawMarkdown) ??
    run.input_brief?.sujet?.trim() ??
    'Article sans titre'
  const description = extractFirstParagraph(htmlContent, 155)
  const publishedAt = options.publishedAt ?? new Date().toISOString()
  const urlSlug = slugify(title)

  const payload: Record<string, unknown> = {
    locationId: GHL_DCGAI_LOCATION_ID,
    blogId,
    title,
    rawHTML: htmlContent,
    status: 'PUBLISHED',
    publishedAt,
    urlSlug,
    description,
    categories: options.categoryId ? [options.categoryId] : [],
    tags: options.tags ?? run.input_brief?.mots_cles ?? [],
  }

  // imageUrl : optionnel — uniquement si l'utilisateur a une image associée.
  if (run.output?.image_url) {
    payload.imageUrl = run.output.image_url
    if (run.output?.alt_text) {
      payload.imageAltText = run.output.alt_text
    }
  }

  // authorId : optionnel mais recommandé par la doc.
  if (options.authorId) {
    payload.author = options.authorId
  }

  // 4) POST /blogs/posts
  let response: GhlBlogPostResponse
  try {
    response = await ghlFetch<GhlBlogPostResponse>('/blogs/posts', {
      method: 'POST',
      body: payload,
    })
  } catch (err) {
    if (err instanceof GhlApiError) throw err
    throw err
  }

  // GHL renvoie { data: { _id, ... } } ou { blogPost: { _id } } selon les versions.
  // On extrait l'ID de façon défensive.
  const postId = extractPostId(response)
  if (!postId) {
    throw new Error(
      "GHL n'a pas renvoyé d'identifiant de post. La publication a peut-être réussi quand même — vérifie dans GHL.",
    )
  }

  return {
    post_id: postId,
    post_url: extractPostUrl(response, urlSlug),
    raw_response: response,
  }
}

/**
 * Blog ID DCG AI hardcodé (V1.1).
 * Source : api-keys.md → "Blog ID : SBVkGP26oyLg4Mikwe4d".
 * Confirmé par les 13 articles publiés via cette même API les 29-30/05/2026.
 *
 * En V1.1.1, on ajoutera la résolution dynamique via GET /blogs (l'endpoint
 * `/blogs/site/{loc}/all` retourne 404 sur cette location — possiblement
 * dépréciée ou réservée aux funnels).
 */
const DCGAI_BLOG_ID = 'SBVkGP26oyLg4Mikwe4d'

async function resolveDefaultBlogId(): Promise<string> {
  return DCGAI_BLOG_ID
}

/**
 * Détecte et retire de façon agressive TOUT bloc Schema.org JSON-LD du
 * markdown, quel que soit son format (avec ou sans triple-backticks).
 *
 * Retourne :
 *   - `stripped` : le markdown sans le bloc JSON-LD
 *   - `jsonLdScript` : le script `<script type="application/ld+json">…</script>`
 *     à injecter à la fin du HTML (vide si aucun Schema trouvé)
 *
 * Si plusieurs blocs Schema.org existent, on les concatène tous dans
 * `jsonLdScript`.
 */
function stripSchemaJsonLd(markdown: string): { stripped: string; jsonLdScript: string } {
  const scripts: string[] = []
  let result = markdown.replace(/\r\n/g, '\n')

  // 1) Blocs ```json ... ``` ou ```json-ld ... ``` qui contiennent schema.org.
  result = result.replace(
    /```(?:json|json-ld|jsonld|ld\+json)\s*\n([\s\S]*?)\n```/gi,
    (_match, content: string) => {
      if (/["']@context["']\s*:\s*["'][^"']*schema\.org/i.test(content)) {
        const safe = content.replace(/<\/script/gi, '<\\/script')
        scripts.push(`<script type="application/ld+json">${safe}</script>`)
        return ''
      }
      return _match
    },
  )

  // 2) Blocs JSON BRUTS (sans backticks) commençant par `{` et contenant
  //    `@context schema.org`. On parcourt ligne par ligne et on cherche
  //    la fermeture par compteur d'accolades.
  const lines = result.split('\n')
  const kept: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^\s*\{\s*$/.test(line) || /^\s*\{\s*"/.test(line)) {
      const lookahead = lines.slice(i, Math.min(i + 30, lines.length)).join('\n')
      if (/["']@context["']\s*:\s*["'][^"']*schema\.org/i.test(lookahead)) {
        let depth = 0
        let end = i
        for (let j = i; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') depth++
            else if (ch === '}') depth--
          }
          if (depth === 0) {
            end = j
            break
          }
        }
        const block = lines.slice(i, end + 1).join('\n')
        const safe = block.replace(/<\/script/gi, '<\\/script')
        scripts.push(`<script type="application/ld+json">${safe}</script>`)
        i = end + 1
        continue
      }
    }
    kept.push(line)
    i++
  }

  return {
    stripped: kept.join('\n').trim(),
    jsonLdScript: scripts.join('\n'),
  }
}

interface GhlBlogPostResponse {
  data?: {
    _id?: string
    id?: string
    urlSlug?: string
    [key: string]: unknown
  }
  blogPost?: {
    _id?: string
    id?: string
    urlSlug?: string
  }
  _id?: string
  id?: string
}

function extractPostId(response: GhlBlogPostResponse): string | null {
  return (
    response?.data?._id ??
    response?.data?.id ??
    response?.blogPost?._id ??
    response?.blogPost?.id ??
    response?._id ??
    response?.id ??
    null
  )
}

/**
 * Construit l'URL publique du post si on peut. GHL ne renvoie pas toujours
 * l'URL complète. Sur DCG AI, le pattern est :
 *   https://digital-code-growth.com/post/{urlSlug}
 *
 * (Confirmé sur les 13 articles publiés les 29-30/05/2026 — ex :
 *  /post/agence-ia-guadeloupe-comment-choisir.)
 *
 * On retourne undefined si on n'est pas sûr — l'UI affichera juste "publié"
 * sans lien externe.
 */
function extractPostUrl(
  response: GhlBlogPostResponse,
  fallbackSlug: string,
): string | undefined {
  const slug =
    response?.data?.urlSlug ??
    response?.blogPost?.urlSlug ??
    fallbackSlug

  if (!slug) return undefined
  return `https://digital-code-growth.com/post/${slug}`
}
