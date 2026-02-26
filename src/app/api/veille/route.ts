import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

  // Parse query params
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const vertical = searchParams.get('vertical')
  const format = searchParams.get('format')
  const status = searchParams.get('status') || 'new'
  const minScore = parseInt(searchParams.get('minScore') || '0')
  const sort = searchParams.get('sort') || 'ai_score'
  const order = searchParams.get('order') || 'desc'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '24')

  // Build query
  let query = supabase
    .from('veille_posts')
    .select('*', { count: 'exact' })

  if (platform && platform !== 'all') {
    query = query.eq('platform', platform)
  }
  if (vertical && vertical !== 'all') {
    query = query.contains('vertical_tags', [vertical])
  }
  if (format && format !== 'all') {
    query = query.eq('format', format)
  }
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (minScore > 0) {
    query = query.gte('ai_score', minScore)
  }

  // Sort
  const ascending = order === 'asc'
  if (sort === 'ai_score') {
    query = query.order('ai_score', { ascending, nullsFirst: false })
  } else if (sort === 'collected_at') {
    query = query.order('collected_at', { ascending })
  } else if (sort === 'published_at') {
    query = query.order('published_at', { ascending, nullsFirst: false })
  }

  // Pagination
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    posts: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  })
}
