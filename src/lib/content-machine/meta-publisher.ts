/**
 * Meta Graph API wrapper — Facebook Page + Instagram Business publishing.
 *
 * Variables d'env requises (Vercel) :
 * - META_PAGE_ACCESS_TOKEN : Page Access Token long-lived (jamais expire pour les pages)
 * - META_PAGE_ID : ID de la page Facebook (ex Dom Com Digital Expert)
 * - META_IG_BUSINESS_ID : ID du compte Instagram Business lie a la page
 */

const GRAPH_VERSION = 'v21.0'
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Variable d'env manquante : ${name}`)
  return v
}

interface FbPhotoResponse {
  id?: string
  post_id?: string
  error?: { message: string }
}

interface IgContainerResponse {
  id?: string
  error?: { message: string }
}

interface IgPublishResponse {
  id?: string
  error?: { message: string }
}

/**
 * Publie une photo + texte sur la Page Facebook.
 * Retourne l'ID du post.
 */
export async function publishToFacebook(params: {
  imageUrl: string
  caption: string
}): Promise<{ postId: string }> {
  const pageId = requireEnv('META_PAGE_ID')
  const token = requireEnv('META_PAGE_ACCESS_TOKEN')

  const body = new URLSearchParams({
    url: params.imageUrl,
    caption: params.caption,
    published: 'true',
    access_token: token,
  })

  const res = await fetch(`${GRAPH}/${pageId}/photos`, {
    method: 'POST',
    body,
  })
  const json = (await res.json()) as FbPhotoResponse

  if (!res.ok || json.error) {
    throw new Error(`Facebook publish failed: ${json.error?.message || res.statusText}`)
  }

  // L'API renvoie soit "post_id" (combine photo+post) soit "id" (photo seul)
  const postId = json.post_id || json.id
  if (!postId) throw new Error('Facebook: aucun post_id retourne')

  return { postId }
}

/**
 * Publie une photo + caption sur Instagram Business.
 * Etape 1 : creer un container media. Etape 2 : publier.
 * L'image doit etre publiquement accessible via URL (Supabase public bucket OK).
 */
export async function publishToInstagram(params: {
  imageUrl: string
  caption: string
}): Promise<{ postId: string }> {
  const igId = requireEnv('META_IG_BUSINESS_ID')
  const token = requireEnv('META_PAGE_ACCESS_TOKEN')

  // 1. Creer le container
  const createBody = new URLSearchParams({
    image_url: params.imageUrl,
    caption: params.caption,
    access_token: token,
  })
  const createRes = await fetch(`${GRAPH}/${igId}/media`, {
    method: 'POST',
    body: createBody,
  })
  const createJson = (await createRes.json()) as IgContainerResponse
  if (!createRes.ok || createJson.error || !createJson.id) {
    throw new Error(`Instagram container failed: ${createJson.error?.message || createRes.statusText}`)
  }

  // 2. Publier le container
  const publishBody = new URLSearchParams({
    creation_id: createJson.id,
    access_token: token,
  })
  const publishRes = await fetch(`${GRAPH}/${igId}/media_publish`, {
    method: 'POST',
    body: publishBody,
  })
  const publishJson = (await publishRes.json()) as IgPublishResponse
  if (!publishRes.ok || publishJson.error || !publishJson.id) {
    throw new Error(`Instagram publish failed: ${publishJson.error?.message || publishRes.statusText}`)
  }

  return { postId: publishJson.id }
}
