import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { publishToFacebook, publishToInstagram } from '@/lib/content-machine/meta-publisher'

interface PublishRequest {
  contentId: string
  targets?: Array<'facebook' | 'instagram'>
}

interface ContentRow {
  id: string
  status: string
  text_content: string | null
  brand_id: string
  cm_assets: Array<{ public_url: string | null; type: string; position: number }>
}

export async function POST(req: Request) {
  let body: PublishRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const { contentId, targets = ['facebook', 'instagram'] } = body
  if (!contentId) return NextResponse.json({ error: 'contentId requis' }, { status: 400 })

  const supabase = createAdminSupabase()

  // Charger le contenu + ses assets
  const { data, error } = await supabase
    .from('cm_contents')
    .select('id,status,text_content,brand_id,cm_assets(public_url,type,position)')
    .eq('id', contentId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: `Contenu ${contentId} introuvable` }, { status: 404 })
  }

  const content = data as unknown as ContentRow

  if (content.status !== 'approved') {
    return NextResponse.json(
      { error: `Statut "${content.status}" — seul un contenu "approved" peut etre publie` },
      { status: 400 },
    )
  }

  const image = (content.cm_assets || [])
    .filter((a) => a.type === 'image' && a.public_url)
    .sort((a, b) => a.position - b.position)[0]

  if (!image?.public_url) {
    return NextResponse.json({ error: 'Aucune image associee au contenu' }, { status: 400 })
  }

  const caption = content.text_content || ''

  // Marquer en publishing
  await supabase
    .from('cm_contents')
    .update({ status: 'publishing' })
    .eq('id', contentId)

  const results: Record<string, { ok: boolean; postId?: string; error?: string }> = {}

  if (targets.includes('facebook')) {
    try {
      const { postId } = await publishToFacebook({ imageUrl: image.public_url, caption })
      results.facebook = { ok: true, postId }
    } catch (e) {
      results.facebook = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  if (targets.includes('instagram')) {
    try {
      const { postId } = await publishToInstagram({ imageUrl: image.public_url, caption })
      results.instagram = { ok: true, postId }
    } catch (e) {
      results.instagram = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const fbOk = results.facebook?.ok
  const igOk = results.instagram?.ok
  const allOk = Object.values(results).every((r) => r.ok)
  const noneOk = Object.values(results).every((r) => !r.ok)

  const errors = Object.entries(results)
    .filter(([, r]) => !r.ok)
    .map(([k, r]) => `${k}: ${r.error}`)
    .join(' | ')

  await supabase
    .from('cm_contents')
    .update({
      status: noneOk ? 'publish_failed' : 'published',
      published_at: noneOk ? null : new Date().toISOString(),
      fb_post_id: fbOk ? results.facebook?.postId : null,
      ig_post_id: igOk ? results.instagram?.postId : null,
      publish_error: errors || null,
    })
    .eq('id', contentId)

  return NextResponse.json({
    contentId,
    status: noneOk ? 'publish_failed' : 'published',
    results,
    allOk,
  })
}
