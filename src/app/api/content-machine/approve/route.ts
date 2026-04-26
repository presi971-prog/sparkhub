import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/content-machine/supabase-admin'

type Action = 'approve' | 'reject' | 'modify'

interface ApproveRequest {
  contentId: string
  action: Action
  newText?: string
}

const STATUS_MAP: Record<Action, string> = {
  approve: 'approved',
  reject: 'rejected',
  modify: 'modified',
}

export async function PATCH(req: Request) {
  try {
    const body: ApproveRequest = await req.json()
    const { contentId, action, newText } = body

    if (!contentId || !action) {
      return NextResponse.json(
        { error: 'contentId et action sont requis' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject', 'modify'].includes(action)) {
      return NextResponse.json(
        { error: 'action invalide. Valeurs acceptees : approve, reject, modify' },
        { status: 400 }
      )
    }

    if (action === 'modify' && !newText) {
      return NextResponse.json(
        { error: 'newText est requis pour l\'action modify' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabase()

    // Verifier que le contenu existe
    const { data: existing, error: fetchError } = await supabase
      .from('cm_contents')
      .select('id, status')
      .eq('id', contentId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: `Contenu "${contentId}" non trouve` },
        { status: 404 }
      )
    }

    // Construire la mise a jour
    const updateData: Record<string, unknown> = {
      status: STATUS_MAP[action],
    }

    // Schema cm_contents : approved_at (pas reviewed_at), text_content (pas text)
    if (action === 'approve') {
      updateData.approved_at = new Date().toISOString()
    }

    if (action === 'modify' && newText) {
      updateData.text_content = newText
    }

    // Appliquer la mise a jour
    const { data: updated, error: updateError } = await supabase
      .from('cm_contents')
      .update(updateData)
      .eq('id', contentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Erreur mise a jour: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Contenu ${STATUS_MAP[action]} avec succes`,
      content: updated,
    })
  } catch (error) {
    console.error('[content-machine/approve] Erreur:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
