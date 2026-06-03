/**
 * Route SparkExecute — liste les publications d'un run.
 *
 *   GET /api/sparkexecute/runs/[id]/publications
 *
 * Sert à l'UI run-detail-view pour afficher la section "Publications" sous
 * l'output : 1 ligne par tentative (plateforme + statut + lien externe si dispo).
 *
 * Auth via RLS (un user ne voit que ses propres publications).
 */

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { SparkexecutePublication } from '@/lib/sparkexecute/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const COLUMNS =
  'id, run_id, user_id, platform, external_id, external_url, status, scheduled_at, published_at, error_message, metadata, created_at'

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sparkexecute_publications')
    .select(COLUMNS)
    .eq('run_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    publications: (data ?? []) as SparkexecutePublication[],
  })
}
