/**
 * Mapping des comptes Social Planner GHL par marque Content Machine.
 *
 * Les IDs sont récupérés via GET /social-media-posting/{locationId}/accounts.
 * Stockés ici en dur car stables dans le sous-compte DCG AI (15W1kS8V6KqgTPhtzaPZ).
 * Si on connecte de nouveaux comptes plus tard, ajouter les IDs ici.
 */
export const GHL_ACCOUNT_IDS: Record<string, string[]> = {
  'dcg-ai': [
    '69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104041555416160_page', // Facebook Dom Com Digital Expert
    '69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841450347721638', // Instagram dom_com_digital_expert
    '69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_74095125_page', // LinkedIn Page DOM-COM DIGITAL EXPERT
    '69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_TtEbx3naQG_profile', // LinkedIn Profile Thierry TRIVAL-FAULECH
    '69eff4f21cb49d7528076453_15W1kS8V6KqgTPhtzaPZ_2559155615730291622', // Google Business Digital Code Growth
  ],
  cobeone: [
    '69eff38b1cb49d39b605e633_15W1kS8V6KqgTPhtzaPZ_104535042544769_page', // Facebook Cobeone
    '69eff3ee5e7fe87daffe93ca_15W1kS8V6KqgTPhtzaPZ_17841457370822309', // Instagram cobeone_
    '69eff525a0fa2223c19c2cf7_15W1kS8V6KqgTPhtzaPZ_93089817_page', // LinkedIn Page COBEONE
  ],
}

const GHL_BASE = 'https://services.leadconnectorhq.com'

interface GHLPostBody {
  type: 'post'
  accountIds: string[]
  summary: string
  userId: string
  status: 'draft' | 'scheduled'
  media?: Array<{ url: string; type: 'image' | 'video' }>
  scheduleDate?: string
}

export interface GHLPostResult {
  postId: string
  status: string
  accountIds: string[]
  raw: unknown
}

/**
 * Cree un post dans le Social Planner GHL.
 * Par defaut en draft : visible dans GHL Social Planner UI, pas publie automatiquement.
 * Pass scheduleDate (ISO) + status='scheduled' pour publier a une heure precise.
 */
export async function createGHLSocialPost(args: {
  brandSlug: string
  text: string
  imageUrl?: string | null
  status?: 'draft' | 'scheduled'
  scheduleDate?: string
  overrideAccountIds?: string[]
}): Promise<GHLPostResult> {
  const pit = process.env.GHL_SOCIAL_PIT
  const locationId = process.env.GHL_LOCATION_ID
  const userId = process.env.GHL_USER_ID

  if (!pit) throw new Error('GHL_SOCIAL_PIT manquant dans les variables d env')
  if (!locationId) throw new Error('GHL_LOCATION_ID manquant')
  if (!userId) throw new Error('GHL_USER_ID manquant')

  const accountIds =
    args.overrideAccountIds && args.overrideAccountIds.length > 0
      ? args.overrideAccountIds
      : GHL_ACCOUNT_IDS[args.brandSlug]

  if (!accountIds || accountIds.length === 0) {
    throw new Error(`Aucun compte Social Planner mappe pour la marque "${args.brandSlug}"`)
  }

  const body: GHLPostBody = {
    type: 'post',
    accountIds,
    summary: args.text,
    userId,
    status: args.status || 'draft',
  }

  if (args.imageUrl) {
    body.media = [{ url: args.imageUrl, type: 'image' }]
  }
  if (args.scheduleDate) {
    body.scheduleDate = args.scheduleDate
  }

  const response = await fetch(
    `${GHL_BASE}/social-media-posting/${locationId}/posts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${pit}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`GHL API ${response.status}: ${errBody.slice(0, 500)}`)
  }

  const data = await response.json()
  const post = data?.results?.post

  if (!post?._id) {
    throw new Error('Reponse GHL invalide: post._id manquant')
  }

  return {
    postId: post._id,
    status: post.status,
    accountIds: post.accountIds,
    raw: post,
  }
}
