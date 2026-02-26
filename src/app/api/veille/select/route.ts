import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((profile as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
  }

  const body = await request.json()
  const { postId, action, notes } = body

  if (!postId || !action) {
    return NextResponse.json({ error: 'postId et action requis' }, { status: 400 })
  }

  if (action === 'select') {
    // Update post status
    const { error: updateError } = await supabase
      .from('veille_posts')
      .update({ status: 'selected' })
      .eq('id', postId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create selection record
    const { error: insertError } = await supabase
      .from('veille_selections')
      .insert({
        post_id: postId,
        notes: notes || null,
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'selected' })
  }

  if (action === 'dismiss') {
    const { error } = await supabase
      .from('veille_posts')
      .update({ status: 'dismissed' })
      .eq('id', postId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'dismissed' })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
