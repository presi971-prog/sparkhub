/**
 * Route SparkExecute — valider un brouillon.
 *
 *   POST /api/sparkexecute/runs/[id]/validate
 *
 * Passe le run de 'draft' à 'validated' et tague validated_at.
 * Refuse si le run n'est pas en 'draft' (déjà validé, archivé, en cours…).
 */

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import type { RunStatus, SparkexecuteRun } from '@/lib/sparkexecute/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, context: RouteContext) {
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

  const { data: existing, error: loadError } = await supabase
    .from('sparkexecute_runs')
    .select('id, status')
    .eq('id', id)
    .maybeSingle<Pick<SparkexecuteRun, 'id' | 'status'>>()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
  }
  if (existing.status !== 'draft') {
    return NextResponse.json(
      {
        error: `Ce run est au statut "${existing.status}", on ne peut valider qu'un brouillon.`,
      },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('sparkexecute_runs')
    .update({
      status: 'validated' as RunStatus,
      validated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, validated_at')
    .single<Pick<SparkexecuteRun, 'id' | 'status' | 'validated_at'>>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
