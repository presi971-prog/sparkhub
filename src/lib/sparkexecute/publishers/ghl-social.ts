/**
 * Publisher Social Planner GHL — publie un run SparkExecute sur les comptes
 * sociaux connectés à GHL (LinkedIn, Instagram, Facebook, Google Business
 * Profile).
 *
 * Doc officielle :
 *   - https://marketplace.gohighlevel.com/docs/ghl/social-planner/post/index.html
 *   - https://marketplace.gohighlevel.com/docs/ghl/social-planner/social-media-posting-api/index.html
 *
 * Workflow :
 *  - L'utilisateur passe la liste des plateformes ET le mapping
 *    {platform: accountId[]} (les accountId GHL viennent de l'API
 *    /social-media-posting/oauth/{locationId}/accounts).
 *  - On boucle plateforme par plateforme. Si une échoue, on continue.
 *  - Retour = un tableau de résultats par plateforme.
 *
 * R0 : on adapte le contenu à la plateforme (longueur max + hashtags).
 *
 * Limites V1.1 :
 *  - On publie en immédiat ou en différé (scheduledAt), pas de drafts.
 *  - On ne supporte qu'une image par post (pas de carousels).
 *  - Format de body Social Planner GHL exact : à valider en réel lors du 1er test.
 */

import {
  GHL_DCGAI_LOCATION_ID,
  GhlApiError,
  ghlFetch,
} from './ghl-client'
import type { SocialPlatform, SparkexecuteRun } from '../types'

/** Limites pratiques par plateforme (sources : docs officielles + GHL Social Planner). */
const PLATFORM_TEXT_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  google_business: 1500,
  // Réservés V1.2 — limites placeholder.
  youtube: 5000,
  tiktok: 2200,
  threads: 500,
}

/** Mapping des noms de plateforme GHL Social Planner. */
const PLATFORM_GHL_TYPE: Record<SocialPlatform, string> = {
  linkedin: 'linkedin',
  instagram: 'instagram',
  facebook: 'facebook',
  google_business: 'gmb',
  youtube: 'youtube',
  tiktok: 'tiktok',
  threads: 'threads',
}

/** Options de publication Social Planner. */
export interface PublishSocialOptions {
  /** Liste des plateformes ciblées. */
  platforms: SocialPlatform[]

  /**
   * Mapping accountId par plateforme. Au moins une entrée par plateforme
   * ciblée — sinon la plateforme est skip avec une erreur claire.
   */
  accountIds: Partial<Record<SocialPlatform, string[]>>

  /**
   * Date de publication programmée (ISO 8601). Si absent → publication
   * immédiate. Si fournie + future, GHL planifie le post.
   */
  scheduledAt?: string
}

/** Résultat par plateforme. */
export interface PublishSocialItemResult {
  platform: SocialPlatform
  post_id?: string
  post_url?: string
  scheduled?: boolean
  error?: string
  raw_response?: unknown
}

/**
 * Publie le run sur toutes les plateformes demandées (loop séquentiel,
 * 1 appel par plateforme). Une plateforme qui plante ne bloque pas les
 * autres : on continue et on retourne l'erreur dans son item.
 */
export async function publishToSocialPlanner(
  run: SparkexecuteRun,
  options: PublishSocialOptions,
): Promise<PublishSocialItemResult[]> {
  if (!options.platforms || options.platforms.length === 0) {
    return []
  }

  const results: PublishSocialItemResult[] = []

  for (const platform of options.platforms) {
    const accounts = options.accountIds[platform] ?? []
    if (accounts.length === 0) {
      results.push({
        platform,
        error: `Aucun compte ${PLATFORM_GHL_TYPE[platform]} connecté dans GHL Social Planner.`,
      })
      continue
    }

    try {
      const result = await publishOnePlatform(run, platform, accounts, options.scheduledAt)
      results.push(result)
    } catch (err) {
      const message =
        err instanceof GhlApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erreur inconnue'
      results.push({
        platform,
        error: message,
      })
    }
  }

  return results
}

/** Publie sur 1 plateforme (1 appel POST par plateforme). */
async function publishOnePlatform(
  run: SparkexecuteRun,
  platform: SocialPlatform,
  accountIds: string[],
  scheduledAt?: string,
): Promise<PublishSocialItemResult> {
  const summary = adaptContentForPlatform(run, platform)
  const mediaUrl = run.output?.image_url

  // Doc GHL Social Planner — POST /social-media-posting/{locationId}/posts
  // TODO V1.1.1: vérifier le format exact du body avec un test en réel.
  // La doc indique grosso modo :
  //   { type: "post", accountIds: [...], summary: "...", media: [{ type, url }], scheduledAt? }
  const body: Record<string, unknown> = {
    type: 'post',
    accountIds,
    summary,
  }

  if (mediaUrl) {
    body.media = [
      {
        type: 'image',
        url: mediaUrl,
        alt: run.output?.alt_text ?? '',
      },
    ]
  }

  if (scheduledAt) {
    body.scheduledAt = scheduledAt
  }

  // Certains champs sont spécifiques à certaines plateformes (ex : Google
  // Business demande un actionType ; Instagram demande mediaType=REELS pour
  // les vidéos). En V1.1, on s'en tient au cas standard "image + texte".
  if (platform === 'google_business') {
    body.gmbActionType = 'CALL'
  }

  const endpoint = `/social-media-posting/${GHL_DCGAI_LOCATION_ID}/posts`
  const response = await ghlFetch<GhlSocialPostResponse>(endpoint, {
    method: 'POST',
    body,
  })

  const postId =
    response?.data?._id ??
    response?.data?.id ??
    response?._id ??
    response?.id

  const isScheduled = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()

  return {
    platform,
    post_id: postId ?? undefined,
    post_url: response?.data?.url ?? response?.url ?? undefined,
    scheduled: isScheduled,
    raw_response: response,
  }
}

interface GhlSocialPostResponse {
  data?: {
    _id?: string
    id?: string
    url?: string
    [key: string]: unknown
  }
  _id?: string
  id?: string
  url?: string
}

/**
 * Adapte le texte du run au format de la plateforme cible.
 *
 *  - LinkedIn : texte tel quel, max 3000 chars, hashtags en queue.
 *  - Instagram : caption + hashtags inclus en queue (V1.1 choix simple).
 *  - Facebook : texte complet (63k chars OK), hashtags en queue.
 *  - Google Business : résumé court (1500 chars max), pas de hashtags.
 */
function adaptContentForPlatform(
  run: SparkexecuteRun,
  platform: SocialPlatform,
): string {
  const baseText = (run.output?.content ?? '').trim()
  const tags = run.output?.hashtags ?? []
  const tagLine =
    tags.length > 0
      ? tags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
      : ''

  const limit = PLATFORM_TEXT_LIMITS[platform]
  const reserveForTags = tagLine.length > 0 ? tagLine.length + 2 : 0

  let body = baseText
  // Pour Google Business : on prend la 1ère partie seulement et pas de hashtags.
  if (platform === 'google_business') {
    return truncateNicely(body, limit)
  }

  // Truncate proprement au mot près si nécessaire.
  if (body.length + reserveForTags > limit) {
    body = truncateNicely(body, limit - reserveForTags)
  }

  if (tagLine.length === 0) return body
  return `${body}\n\n${tagLine}`
}

/** Tronque au mot le plus proche pour éviter de couper en plein milieu. */
function truncateNicely(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  const slice = text.slice(0, maxLen)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice) + '…'
}

// ============================================================
// Listing des comptes connectés
// ============================================================

/** Compte social connecté dans GHL Social Planner. */
export interface SocialAccount {
  id: string
  name: string
  platform: SocialPlatform
  /** Avatar URL si dispo. */
  avatarUrl?: string
}

/** Réponse groupée par plateforme. */
export type SocialAccountsByPlatform = Partial<Record<SocialPlatform, SocialAccount[]>>

/**
 * Liste les comptes sociaux connectés à GHL Social Planner pour la location
 * DCG AI. Sert à :
 *   - afficher dans le modal Publier : "LinkedIn ✅ connecté" ou "❌ non connecté"
 *   - peupler le mapping platform → accountId lors de la publication.
 *
 * Doc : GET /social-media-posting/oauth/{locationId}/accounts
 * TODO V1.1.1: vérifier le path exact (path alternatif documenté :
 *   /social-media-posting/{locationId}/accounts).
 */
export async function listConnectedSocialAccounts(): Promise<SocialAccountsByPlatform> {
  let response: GhlSocialAccountsResponse
  try {
    // Endpoint correct (testé : renvoie les comptes sous `results.accounts`).
    response = await ghlFetch<GhlSocialAccountsResponse>(
      `/social-media-posting/${GHL_DCGAI_LOCATION_ID}/accounts`,
    )
  } catch (err) {
    if (err instanceof GhlApiError && err.status === 404) {
      // Fallback legacy : ancien path /oauth/.
      response = await ghlFetch<GhlSocialAccountsResponse>(
        `/social-media-posting/oauth/${GHL_DCGAI_LOCATION_ID}/accounts`,
      )
    } else {
      throw err
    }
  }

  // ⚠️ La réponse range les comptes sous `results.accounts` (pas `accounts`
  // ni `data` au 1er niveau) — c'est ce qui faisait croire "compte non connecté".
  const accounts =
    response?.results?.accounts ?? response?.accounts ?? response?.data ?? []
  const grouped: SocialAccountsByPlatform = {}

  for (const account of accounts) {
    const rawPlatform = (account.platform ?? account.type ?? '').toString().toLowerCase()
    const normalized = normalizePlatform(rawPlatform)
    if (!normalized) continue

    if (!grouped[normalized]) {
      grouped[normalized] = []
    }
    grouped[normalized]!.push({
      id: account._id ?? account.id ?? '',
      name: account.name ?? account.profileName ?? 'Compte connecté',
      platform: normalized,
      avatarUrl: account.avatar ?? account.profileImage,
    })
  }

  return grouped
}

interface GhlSocialAccountsResponse {
  results?: { accounts?: GhlSocialAccountRaw[] }
  accounts?: GhlSocialAccountRaw[]
  data?: GhlSocialAccountRaw[]
}

interface GhlSocialAccountRaw {
  _id?: string
  id?: string
  platform?: string
  type?: string
  name?: string
  profileName?: string
  avatar?: string
  profileImage?: string
}

/** Mappe la valeur GHL brute vers notre enum SocialPlatform. */
function normalizePlatform(raw: string): SocialPlatform | null {
  switch (raw) {
    case 'linkedin':
      return 'linkedin'
    case 'instagram':
      return 'instagram'
    case 'facebook':
      return 'facebook'
    case 'gmb':
    case 'google_business':
    case 'google-business':
      return 'google_business'
    case 'youtube':
      return 'youtube'
    case 'tiktok':
      return 'tiktok'
    case 'threads':
      return 'threads'
    default:
      return null
  }
}
