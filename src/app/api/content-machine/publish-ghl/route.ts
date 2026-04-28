import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'
import { createGHLSocialPost } from '@/lib/content-machine/ghl-social'

interface PublishRequest {
  contentId: string
  scheduleDate?: string // ISO. Si fourni → status='scheduled'. Sinon → 'draft' (visible dans GHL Social Planner).
  overrideAccountIds?: string[]
}

export async function POST(req: Request) {
  try {
    const body: PublishRequest = await req.json()
    const { contentId, scheduleDate, overrideAccountIds } = body

    if (!contentId) {
      return NextResponse.json({ error: 'contentId requis' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    const { data: content, error: fetchError } = await supabase
      .from('cm_contents')
      .select('id, text_content, status, brand:cm_brands(id, slug, name), assets:cm_assets(public_url, type, position)')
      .eq('id', contentId)
      .single()

    if (fetchError || !content) {
      return NextResponse.json(
        { error: `Contenu ${contentId} non trouve` },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brand = (content.brand as any) as { slug: string; name: string } | null
    if (!brand?.slug) {
      return NextResponse.json(
        { error: 'Marque associee au contenu introuvable' },
        { status: 422 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assets = (content.assets as any[]) || []
    const firstImage = assets
      .filter((a) => a.type === 'image')
      .sort((a, b) => (a.position || 0) - (b.position || 0))[0]

    const result = await createGHLSocialPost({
      brandSlug: brand.slug,
      text: content.text_content || '',
      imageUrl: firstImage?.public_url || null,
      status: scheduleDate ? 'scheduled' : 'draft',
      scheduleDate,
      overrideAccountIds,
    })

    // Marquer le contenu comme publie + stocker l'ID GHL pour traçabilite
    const { error: updateError } = await supabase
      .from('cm_contents')
      .update({
        status: scheduleDate ? 'publishing' : 'approved',
        published_at: scheduleDate ? null : new Date().toISOString(),
        publish_error: null,
      })
      .eq('id', contentId)

    if (updateError) {
      console.warn('[publish-ghl] update cm_contents echoue:', updateError.message)
    }

    return NextResponse.json({
      message: scheduleDate
        ? `Post planifie dans GHL Social Planner pour ${scheduleDate}`
        : 'Post pousse dans GHL Social Planner (brouillon — finalise dans Marketing → Social Planner)',
      ghlPostId: result.postId,
      ghlStatus: result.status,
      accountsCount: result.accountIds.length,
    })
  } catch (error) {
    console.error('[content-machine/publish-ghl] Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
