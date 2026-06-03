/**
 * Routes SparkExecute — GET / PATCH / DELETE sur un run précis.
 *
 *   GET    /api/sparkexecute/runs/[id] : récupère un run (avec son output complet)
 *   PATCH  /api/sparkexecute/runs/[id] : édite l'output (validation manuelle, ajustements)
 *   DELETE /api/sparkexecute/runs/[id] : archive (soft delete, statut = 'archived')
 */

import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

import { createClient } from '@/lib/supabase/server'
import type {
  RunOutput,
  RunStatus,
  SparkexecuteRun,
} from '@/lib/sparkexecute/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface PatchRunPayload {
  output?: RunOutput
  input_brief?: SparkexecuteRun['input_brief']
}

const RUN_COLUMNS =
  'id, user_id, task_id, type, framework_used, input_brief, output, status, cost_usd, tokens_input, tokens_output, error_message, metadata, created_at, validated_at, published_at, updated_at'

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
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('id', id)
    .maybeSingle<SparkexecuteRun>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: Request, context: RouteContext) {
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

  let payload: PatchRunPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  // On charge le run existant pour pouvoir merger l'output proprement.
  const { data: existing, error: loadError } = await supabase
    .from('sparkexecute_runs')
    .select(RUN_COLUMNS)
    .eq('id', id)
    .maybeSingle<SparkexecuteRun>()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Run introuvable' }, { status: 404 })
  }

  // Interdiction d'éditer un run en cours de génération ou archivé.
  if (existing.status === 'generating') {
    return NextResponse.json(
      {
        error:
          "Ce run est en cours de génération. Attends la fin avant de l'éditer.",
      },
      { status: 409 },
    )
  }
  if (existing.status === 'archived') {
    return NextResponse.json(
      { error: 'Ce run est archivé, il ne peut plus être édité.' },
      { status: 409 },
    )
  }

  const patch: Record<string, unknown> = {}

  if (payload.output && typeof payload.output === 'object') {
    // Merge superficiel : on prend l'output existant et on écrase les champs fournis.
    // Permet à l'UI d'envoyer juste { content: "nouveau texte" } sans reset le reste.
    patch.output = { ...existing.output, ...payload.output }
  }

  if (payload.input_brief && typeof payload.input_brief === 'object') {
    patch.input_brief = { ...existing.input_brief, ...payload.input_brief }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Aucun champ valide à mettre à jour' },
      { status: 400 },
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('sparkexecute_runs')
    .update(patch)
    .eq('id', id)
    .select(RUN_COLUMNS)
    .single<SparkexecuteRun>()

  if (updateError) {
    Sentry.captureException(updateError, {
      tags: { feature: 'sparkexecute', step: 'run-update' },
    })
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, context: RouteContext) {
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

  // Logique style corbeille : par défaut soft delete (status='archived', récupérable).
  // Si l'URL contient ?permanent=true, on fait un vrai DELETE de la base (irréversible).
  const url = new URL(_req.url)
  const isPermanent = url.searchParams.get('permanent') === 'true'

  if (isPermanent) {
    const { error } = await supabase
      .from('sparkexecute_runs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, permanently_deleted: true })
  }

  // Soft delete : passe en 'archived'. L'utilisateur peut le retrouver dans l'onglet Archivés.
  const { data, error } = await supabase
    .from('sparkexecute_runs')
    .update({ status: 'archived' as RunStatus })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, status')
    .maybeSingle<{ id: string; status: RunStatus }>()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Livrable introuvable' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, run_id: data.id, status: data.status })
}
